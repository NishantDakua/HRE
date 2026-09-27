/**
 * On-demand demo data for DEMO_EMAILS businesses that already exist (e.g. onboarded while the API
 * had a stale DEMO_EMAILS). Idempotent: every row has a deterministic id derived from the business
 * (listings also carry the "demo-seed" tag), so re-running only fills in what's missing.
 * Writes go through the demo-pack helpers, which produce the same rows as the API's create
 * listing / create booking / respond / review handlers. Existing rows are never changed.
 * Relay opportunities and Plan-B holds have no tables in the schema, so they're reported as skipped.
 *   pnpm demo:data
 */
import 'dotenv/config';
import type { ExchangeBusiness, ExchangeListing } from '@prisma/client';
import { prisma } from '../src/exchange/db.js';
import { createDeal, isDemoEmail, PROVIDER_LISTINGS, windowAt, type Deal } from '../src/exchange/demoPack.js';

const TAG = 'demo-seed';
const emails = (process.env.DEMO_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
if (!emails.length) {
  console.error('DEMO_EMAILS is empty (server/.env).');
  process.exit(1);
}

type Role = 'SEEKER' | 'PROVIDER' | 'BOTH';
interface Demo {
  email: string;
  business: ExchangeBusiness;
  role: Role;
}

const demos: Demo[] = [];
for (const email of emails) {
  const business = await prisma.exchangeBusiness.findFirst({ where: { ownerEmail: email, clerkUserId: { not: null } } });
  if (!business) {
    console.log(`${email}: no business yet (sign in and finish onboarding first) — skipped`);
    continue;
  }
  const user = await prisma.user.findUnique({ where: { clerkUserId: business.clerkUserId! }, select: { hreRole: true } });
  demos.push({ email, business, role: (user?.hreRole ?? 'BOTH') as Role });
}
const provides = (d: Demo) => d.role !== 'SEEKER';
const seeks = (d: Demo) => d.role !== 'PROVIDER';
const demoIds = demos.map((d) => d.business.id);

/** Non-demo businesses, one per area first, so the demand heatmap spreads out. */
const seeded = await prisma.exchangeBusiness.findMany({ where: { id: { notIn: demoIds } }, orderBy: { joinedAt: 'asc' } });
const byArea = [...new Map(seeded.map((b) => [b.area, b])).values()];
const spreadSeeded = [...byArea, ...seeded.filter((b) => !byArea.includes(b))];

const qty = (l: ExchangeListing, want: number) => Math.max(1, Math.min(want, l.quantity));
const counts = new Map<string, Record<string, number>>();
const bump = (biz: string, key: string) => {
  const c = counts.get(biz) ?? {};
  c[key] = (c[key] ?? 0) + 1;
  counts.set(biz, c);
};

/** Create the deal unless its marker id already exists. */
async function ensureDeal(owner: string, deal: Deal & { id: string }, kind: string) {
  if (await prisma.exchangeBooking.findUnique({ where: { id: deal.id }, select: { id: true } })) return bump(owner, `${kind} (existing)`);
  await createDeal(deal);
  bump(owner, kind);
  if (deal.review) bump(owner, 'reviews');
}

async function ensureListings(d: Demo) {
  const out: ExchangeListing[] = [];
  for (const [i, l] of PROVIDER_LISTINGS.entries()) {
    const id = `r-demo-${d.business.id}-${i}`;
    const found = await prisma.exchangeListing.findUnique({ where: { id } });
    if (found) {
      out.push(found);
      bump(d.business.id, 'listings (existing)');
      continue;
    }
    out.push(
      await prisma.exchangeListing.create({
        data: {
          id,
          businessId: d.business.id,
          ...l,
          tags: [...l.tags, TAG],
          available: l.quantity,
          capacity: 'capacity' in l ? l.capacity : null,
          deliveryBase: 'deliveryBase' in l ? l.deliveryBase : null,
          deliveryPerKm: 'deliveryPerKm' in l ? l.deliveryPerKm : null,
          status: 'ACTIVE',
          conditions: ['Return in the condition received', 'Damage billed at replacement cost'],
          cancellation: 'MODERATE',
          deposit: l.price * 2,
        },
      })
    );
    bump(d.business.id, 'listings');
  }
  return out;
}

const REVIEWS = [
  { rating: 5, text: 'Arrived early and spotless. Will book again.', tags: ['On time', 'As described'] },
  { rating: 5, text: 'Held temperature all day; the driver was great.', tags: ['Cold chain', 'Friendly'] },
  { rating: 4, text: 'Lovely space; parking was a bit tight.', tags: ['Clean', 'Good value'] },
  { rating: 5, text: 'Crisp sound and set up in twenty minutes.', tags: ['Professional'] },
  { rating: 4, text: 'Good condition, easy pickup.', tags: ['As described'] },
  { rating: 5, text: 'Exactly what we needed on short notice.', tags: ['Responsive'] },
];

// Providers first, so seekers can request their listings.
const listingsOf = new Map<string, ExchangeListing[]>();
for (const d of demos.filter(provides)) {
  const listings = await ensureListings(d);
  listingsOf.set(d.business.id, listings);
  const other = demos.filter((o) => o !== d && seeks(o)).map((o) => o.business);
  const seekers = [...other, ...spreadSeeded];
  if (!seekers.length) continue;
  const s = (i: number) => seekers[i % seekers.length];
  const l = (i: number) => listings[i % listings.length];
  const id = (k: string) => `bk-demo-${d.business.id}-${k}`;
  const titles = ['Anniversary gala', 'Airline crew meals', 'Product launch', 'Rooftop sundowner', 'Charity dinner', 'Board offsite'];

  // Six completed bookings over the last 60 days, with reviews: revenue, utilisation, heatmap.
  for (const [i, days] of [-55, -44, -33, -21, -12, -4].entries()) {
    const listing = l(i);
    await ensureDeal(d.business.id, {
      id: id(`done${i}`), seeker: s(i + 1), listing, title: titles[i], status: 'COMPLETED',
      quantity: qty(listing, [150, 2, 1, 2, 120, 80][i]), when: windowAt(days, [17, 5, 16, 17, 18, 11][i], 6),
      createdDaysAgo: -days + 6, review: REVIEWS[i],
    }, 'completed bookings');
  }
  // Four incoming requests: pending (one urgent), accepted, rejected.
  await ensureDeal(d.business.id, { id: id('in0'), seeker: s(0), listing: l(2), title: 'Wedding lunch — cold chain', status: 'PENDING', quantity: qty(l(2), 1), when: windowAt(1, 6, 8), createdDaysAgo: 0.1, urgent: true, note: 'Our reefer broke down — need it at 6am sharp.' }, 'incoming requests');
  await ensureDeal(d.business.id, { id: id('in1'), seeker: s(1), listing: l(0), title: 'Corporate offsite dinner', status: 'PENDING', quantity: qty(l(0), 120), when: windowAt(6, 18, 5), createdDaysAgo: 1 }, 'incoming requests');
  await ensureDeal(d.business.id, { id: id('in2'), seeker: s(2), listing: l(3), title: 'Sunday brunch live set', status: 'ACCEPTED', quantity: qty(l(3), 1), when: windowAt(9, 10, 6), createdDaysAgo: 2 }, 'incoming requests');
  await ensureDeal(d.business.id, { id: id('in3'), seeker: s(3), listing: l(4), title: 'Engagement dinner', status: 'REJECTED', quantity: qty(l(4), 60), when: windowAt(12, 17, 7), createdDaysAgo: 3 }, 'incoming requests');
  bump(d.business.id, 'relay/Plan-B skipped (no tables)');
}

for (const d of demos.filter(seeks)) {
  // Other demo providers' listings first (cross-linked demos), then seeded listings, one per provider.
  const demoListings = demos.filter((o) => o !== d && provides(o)).flatMap((o) => listingsOf.get(o.business.id) ?? []);
  const rest = await prisma.exchangeListing.findMany({ where: { status: 'ACTIVE', businessId: { notIn: demoIds } }, orderBy: { id: 'asc' }, take: 40 });
  const seen = new Set<string>();
  const spread = rest.filter((x) => !seen.has(x.businessId) && seen.add(x.businessId));
  const listings = [...demoListings, ...spread, ...rest];
  if (!listings.length) {
    bump(d.business.id, 'requests skipped (no listings to request)');
    continue;
  }
  const l = (i: number) => listings[i % listings.length];
  const id = (k: string) => `bk-demo-${d.business.id}-req${k}`;
  await ensureDeal(d.business.id, { id: id('0'), seeker: d.business, listing: l(0), title: 'Sangeet night', status: 'PENDING', quantity: qty(l(0), 80), when: windowAt(10, 18, 6), createdDaysAgo: 0.3 }, 'requests');
  await ensureDeal(d.business.id, { id: id('1'), seeker: d.business, listing: l(1), title: 'Corporate lunch', status: 'COUNTERED', quantity: qty(l(1), 2), when: windowAt(7, 11, 5), createdDaysAgo: 1, ask: Math.round(l(1).price * 0.85), counter: Math.round(l(1).price * 0.95), note: 'Could you do a little under list for a repeat order?' }, 'requests');
  await ensureDeal(d.business.id, { id: id('2'), seeker: d.business, listing: l(2), title: 'Poolside brunch', status: 'ACCEPTED', quantity: qty(l(2), 40), when: windowAt(5, 9, 6), createdDaysAgo: 3 }, 'requests');
  await ensureDeal(d.business.id, { id: id('3'), seeker: d.business, listing: l(3), title: 'Diwali staff party', status: 'COMPLETED', quantity: qty(l(3), 50), when: windowAt(-20, 18, 5), createdDaysAgo: 27, review: REVIEWS[0] }, 'requests');
  await ensureDeal(d.business.id, { id: id('4'), seeker: d.business, listing: l(4), title: 'Quarterly town hall', status: 'COMPLETED', quantity: qty(l(4), 1), when: windowAt(-41, 10, 6), createdDaysAgo: 48, review: REVIEWS[5] }, 'requests');
}

for (const d of demos) {
  const c = counts.get(d.business.id) ?? {};
  const summary = Object.entries(c).map(([k, n]) => `${k}: ${n}`).join(', ') || 'nothing to do';
  console.log(`${d.email} → ${d.business.name} (${d.business.id}, ${d.role}): ${summary}`);
}
if (!demos.some((d) => isDemoEmail(d.email))) console.log('No DEMO_EMAILS business found.');
await prisma.$disconnect();
