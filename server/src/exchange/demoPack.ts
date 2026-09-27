import { randomUUID } from 'node:crypto';
import type { ExchangeBusiness, ExchangeListing, HRERole } from '@prisma/client';
import { prisma } from './db.js';
import { ensureContracts } from './contracts.js';

/**
 * Demo pack for DEMO_EMAILS accounts: runs once, right after onboarding creates the business.
 * Writes only new rows (the demo business's listings, bookings on them or by it, offers, reviews,
 * notifications, contracts), using businesses already in the database as counterparties.
 * Relay, Plan-B holds and HELD backups have no tables in the schema, so they are not generated.
 */

export const isDemoEmail = (email: string | null | undefined) =>
  Boolean(email) &&
  (process.env.DEMO_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email!.toLowerCase());

const HOUR = 36e5;
const DAY = 24 * HOUR;
/** A window `days` from now (negative = past), starting at `hour`:00 local, lasting `hours`. */
export function windowAt(days: number, hour: number, hours: number) {
  const start = new Date(Date.now() + days * DAY);
  start.setHours(hour, 0, 0, 0);
  return { startAt: start, endAt: new Date(start.getTime() + hours * HOUR) };
}
const ref = () => `SPR-${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
let seq = 0;
const bookingId = () => `bk${Date.now().toString(36)}d${(seq++).toString(36)}`;

export interface Deal {
  /** Fixed id (demo:data uses these as idempotency markers); generated when omitted. */
  id?: string;
  seeker: ExchangeBusiness;
  listing: ExchangeListing;
  title: string;
  status: 'PENDING' | 'COUNTERED' | 'ACCEPTED' | 'CONFIRMED' | 'COMPLETED' | 'REJECTED';
  quantity: number;
  when: { startAt: Date; endAt: Date };
  createdDaysAgo: number;
  urgent?: boolean;
  note?: string;
  /** Per-unit price the seeker asks; the provider's counter follows when status is COUNTERED. */
  ask?: number;
  counter?: number;
  review?: { rating: number; text: string; tags: string[] };
}

/** Same rows POST /bookings (+ /respond, /reviews) would produce for this deal. */
export async function createDeal(d: Deal) {
  const id = d.id ?? bookingId();
  const created = new Date(Date.now() - d.createdDaysAgo * DAY);
  const provider = d.listing.businessId;
  const ask = d.ask ?? d.listing.price;
  const agreed = d.status === 'COUNTERED' ? d.counter ?? ask : ask;
  const offers = [
    {
      id: `o-${id}-1`,
      resourceId: d.listing.id,
      fromBusinessId: d.seeker.id,
      toBusinessId: provider,
      round: 1,
      price: ask,
      quantity: d.quantity,
      message: d.note ?? `Request for ${d.title.toLowerCase()}.`,
      status: d.status === 'PENDING' ? 'OPEN' : d.status === 'COUNTERED' ? 'COUNTERED' : d.status === 'REJECTED' ? 'REJECTED' : 'ACCEPTED',
      createdAt: created,
      expiresAt: new Date(created.getTime() + DAY),
    },
  ];
  if (d.status === 'COUNTERED') {
    offers.push({
      id: `o-${id}-2`,
      resourceId: d.listing.id,
      fromBusinessId: provider,
      toBusinessId: d.seeker.id,
      round: 2,
      price: agreed,
      quantity: d.quantity,
      message: 'Can do this if you pick up from our loading bay.',
      status: 'OPEN',
      createdAt: new Date(created.getTime() + 2 * HOUR),
      expiresAt: new Date(created.getTime() + 26 * HOUR),
    });
  }
  await prisma.exchangeBooking.create({
    data: {
      id,
      ref: ref(),
      seekerId: d.seeker.id,
      title: d.title,
      status: d.status,
      startAt: d.when.startAt,
      endAt: d.when.endAt,
      total: agreed * d.quantity,
      urgent: Boolean(d.urgent),
      note: d.note ?? null,
      createdAt: created,
      items: { create: [{ resourceId: d.listing.id, providerId: provider, quantity: d.quantity, agreedPrice: agreed }] },
      offers: { create: offers },
      ...(d.review
        ? { reviews: { create: [{ byBusinessId: d.seeker.id, ...d.review, createdAt: new Date(d.when.endAt.getTime() + 3 * HOUR) }] } }
        : {}),
    },
  });
  if (['ACCEPTED', 'CONFIRMED', 'COMPLETED'].includes(d.status)) await ensureContracts(prisma, id);
  return id;
}

async function notify(businessId: string, items: [title: string, body: string, hoursAgo: number][]) {
  await prisma.exchangeNotification.createMany({
    data: items.map(([title, body, hoursAgo], i) => ({
      id: `n-${businessId}-${Date.now().toString(36)}-${i}`,
      businessId,
      title,
      body,
      createdAt: new Date(Date.now() - hoursAgo * HOUR),
      read: i >= 3,
    })),
  });
}

/** The other demo account's business, when it has one on the wanted side. */
async function otherDemoBusiness(self: ExchangeBusiness, side: 'SEEKER' | 'PROVIDER') {
  const others = await prisma.exchangeBusiness.findMany({ where: { id: { not: self.id }, clerkUserId: { not: null } } });
  for (const b of others) {
    if (!isDemoEmail(b.ownerEmail)) continue;
    const user = await prisma.user.findUnique({ where: { clerkUserId: b.clerkUserId! }, select: { hreRole: true } });
    const role = user?.hreRole ?? 'BOTH';
    if (role === 'BOTH' || role === side) return b;
  }
  return null;
}

export const PROVIDER_LISTINGS = [
  { title: 'Chiavari chairs — gold', category: 'CHAIRS_TABLES', price: 35, unit: 'DAY', quantity: 200, unitLabel: 'chairs', minRentalHours: 4, tags: ['gold', 'cushioned'], delivers: true, deliveryBase: 250, deliveryPerKm: 30, description: 'Gold-finish chiavari chairs with ivory cushions. Stacked, cleaned and counted before every dispatch.' },
  { title: 'Banquet hall — 250 guests', category: 'BANQUET_SPACE', price: 4500, unit: 'HOUR', quantity: 1, unitLabel: 'hall', minRentalHours: 4, capacity: 250, tags: ['AC', 'stage'], delivers: false, description: 'Air-conditioned pillarless hall with a small stage, green room and service kitchen access.' },
  { title: 'Reefer van (1.5T)', category: 'VEHICLES', price: 1400, unit: 'HOUR', quantity: 2, unitLabel: 'vans', minRentalHours: 3, tags: ['cold chain', 'driver'], delivers: true, deliveryBase: 0, deliveryPerKm: 0, description: 'Refrigerated 1.5-tonne van holding 2–8°C, with a trained driver and temperature log.' },
  { title: 'PA system — 2kW', category: 'AV_EQUIPMENT', price: 2500, unit: 'DAY', quantity: 3, unitLabel: 'sets', minRentalHours: 4, tags: ['mics', 'mixer'], delivers: true, deliveryBase: 300, deliveryPerKm: 25, description: 'Two tops, two subs, a 12-channel mixer and four wireless mics. Set-up help on request.' },
  { title: 'Table linen — ivory', category: 'LINEN_DECOR', price: 18, unit: 'UNIT', quantity: 300, unitLabel: 'cloths', minRentalHours: 1, tags: ['ivory', 'pressed'], delivers: true, deliveryBase: 150, deliveryPerKm: 20, description: 'Pressed ivory tablecloths for rounds and banquet tables, laundered after every use.' },
] as const;

async function providerPack(me: ExchangeBusiness) {
  const listings: ExchangeListing[] = [];
  for (const [i, l] of PROVIDER_LISTINGS.entries()) {
    listings.push(
      await prisma.exchangeListing.create({
        data: {
          id: `r${Date.now().toString(36)}d${i}`,
          businessId: me.id,
          ...l,
          tags: [...l.tags],
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
  }
  const [chairs, hall, van, pa, linen] = listings;

  const other = await otherDemoBusiness(me, 'SEEKER');
  const pool = await prisma.exchangeBusiness.findMany({ where: { id: { not: me.id }, ...(other ? { NOT: { id: other.id } } : {}) }, take: 6, orderBy: { joinedAt: 'asc' } });
  const seekers = other ? [other, ...pool] : pool;
  if (!seekers.length) return;
  const s = (i: number) => seekers[i % seekers.length];

  // Incoming requests: 1 urgent, 1 countered with a thread.
  await createDeal({ seeker: s(0), listing: van, title: 'Wedding lunch — cold chain', status: 'PENDING', quantity: 1, when: windowAt(1, 6, 8), createdDaysAgo: 0.1, urgent: true, note: 'Our reefer broke down this morning — need it at 6am sharp.' });
  await createDeal({ seeker: s(1), listing: chairs, title: 'Corporate offsite dinner', status: 'COUNTERED', quantity: 120, when: windowAt(6, 18, 5), createdDaysAgo: 1, ask: 28, counter: 32, note: 'Can you do ₹28 a chair for 120?' });
  await createDeal({ seeker: s(2), listing: pa, title: 'Sunday brunch live set', status: 'PENDING', quantity: 1, when: windowAt(9, 10, 6), createdDaysAgo: 2 });
  await createDeal({ seeker: s(3), listing: linen, title: 'Engagement dinner', status: 'PENDING', quantity: 60, when: windowAt(12, 17, 7), createdDaysAgo: 0.5 });

  // Six done deals in the last 60 days: earnings, utilisation, reviews.
  const reviews = [
    { rating: 5, text: 'Chairs arrived early and spotless. Will book again.', tags: ['On time', 'As described'] },
    { rating: 5, text: 'Van held temperature the whole day, driver was great.', tags: ['Cold chain', 'Friendly'] },
    { rating: 4, text: 'Hall was lovely; parking was a bit tight.', tags: ['Clean', 'Good value'] },
    { rating: 5, text: 'Sound was crisp and set-up took twenty minutes.', tags: ['Professional'] },
  ];
  await createDeal({ seeker: s(1), listing: chairs, title: 'Anniversary gala', status: 'COMPLETED', quantity: 150, when: windowAt(-52, 17, 6), createdDaysAgo: 58, review: reviews[0] });
  await createDeal({ seeker: s(2), listing: van, title: 'Airline crew meals', status: 'COMPLETED', quantity: 2, when: windowAt(-38, 5, 8), createdDaysAgo: 41, review: reviews[1] });
  await createDeal({ seeker: s(3), listing: hall, title: 'Product launch', status: 'COMPLETED', quantity: 1, when: windowAt(-24, 16, 6), createdDaysAgo: 30, review: reviews[2] });
  await createDeal({ seeker: s(0), listing: pa, title: 'Rooftop sundowner', status: 'COMPLETED', quantity: 2, when: windowAt(-9, 17, 5), createdDaysAgo: 14, review: reviews[3] });
  await createDeal({ seeker: s(4), listing: linen, title: 'Charity dinner', status: 'CONFIRMED', quantity: 120, when: windowAt(3, 18, 6), createdDaysAgo: 6 });
  await createDeal({ seeker: s(5), listing: hall, title: 'Board offsite', status: 'CONFIRMED', quantity: 1, when: windowAt(8, 9, 8), createdDaysAgo: 4 });

  // The new business row is ours: reflect its reviews.
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await prisma.exchangeBusiness.update({
    where: { id: me.id },
    data: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length, responseRate: 0.94, avgResponseMins: 18, fulfillmentRate: 0.97 },
  });

  await notify(me.id, [
    ['Urgent request', `${s(0).name} needs a reefer van tomorrow at 6am.`, 2],
    ['Counter-offer pending', `${s(1).name} is waiting on your ₹32 counter for 120 chairs.`, 20],
    ['New request', `${s(3).name} asked for 60 tablecloths.`, 12],
    ['Booking confirmed', `Charity dinner with ${s(4).name} is confirmed.`, 140],
    ['New review', `${s(0).name} rated your PA system 5★.`, 190],
  ]);
}

async function seekerPack(me: ExchangeBusiness) {
  const other = await otherDemoBusiness(me, 'PROVIDER');
  const theirs = other ? await prisma.exchangeListing.findMany({ where: { businessId: other.id, status: 'ACTIVE' } }) : [];
  const rest = await prisma.exchangeListing.findMany({
    where: { status: 'ACTIVE', businessId: { notIn: [me.id, ...(other ? [other.id] : [])] } },
    orderBy: { id: 'asc' },
    take: 30,
  });
  // One listing per provider first, so the pack spans several businesses.
  const seen = new Set<string>();
  const spread = [...rest.filter((l) => !seen.has(l.businessId) && seen.add(l.businessId)), ...rest];
  const listings = [...theirs, ...spread];
  if (!listings.length) return;
  const l = (i: number) => listings[i % listings.length];
  const qty = (x: ExchangeListing, want: number) => Math.max(1, Math.min(want, x.quantity));

  await createDeal({ seeker: me, listing: l(0), title: 'Sangeet night', status: 'PENDING', quantity: qty(l(0), 80), when: windowAt(10, 18, 6), createdDaysAgo: 0.3 });
  await createDeal({ seeker: me, listing: l(1), title: 'Corporate lunch', status: 'COUNTERED', quantity: qty(l(1), 2), when: windowAt(7, 11, 5), createdDaysAgo: 1, ask: Math.round(l(1).price * 0.85), counter: Math.round(l(1).price * 0.95), note: 'Could you do a little under list for a repeat order?' });
  await createDeal({ seeker: me, listing: l(2), title: 'Poolside brunch', status: 'ACCEPTED', quantity: qty(l(2), 40), when: windowAt(5, 9, 6), createdDaysAgo: 3 });
  await createDeal({ seeker: me, listing: l(3), title: 'Wedding reception', status: 'CONFIRMED', quantity: qty(l(3), 1), when: windowAt(14, 17, 7), createdDaysAgo: 8 });
  await createDeal({ seeker: me, listing: l(4), title: 'Diwali staff party', status: 'COMPLETED', quantity: qty(l(4), 50), when: windowAt(-20, 18, 5), createdDaysAgo: 27, review: { rating: 5, text: 'Exactly as listed and delivered on time.', tags: ['On time', 'As described'] } });

  // A split bundle: one need, two providers, two legs (like POST /bookings/bundle).
  const legs = [l(5), l(6)].filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i);
  const when = windowAt(18, 12, 6);
  for (const leg of legs) {
    await createDeal({ seeker: me, listing: leg, title: 'Annual conference bundle', status: 'PENDING', quantity: qty(leg, 60), when, createdDaysAgo: 0.2 });
  }

  await notify(me.id, [
    ['Counter-offer received', `A provider countered on your corporate lunch request.`, 3],
    ['Request accepted', 'Your poolside brunch booking was accepted.', 30],
    ['Bundle sent', 'Your annual conference bundle went to 2 providers.', 5],
    ['Booking confirmed', 'Wedding reception is confirmed.', 150],
    ['Leave a review?', 'How did the Diwali staff party rental go?', 400],
  ]);
}

/** Once per business: skipped when it already has listings or bookings. */
export async function createDemoPack(business: ExchangeBusiness, role: HRERole) {
  const [listings, bookings] = await Promise.all([
    prisma.exchangeListing.count({ where: { businessId: business.id } }),
    prisma.exchangeBooking.count({ where: { OR: [{ seekerId: business.id }, { items: { some: { providerId: business.id } } }] } }),
  ]);
  if (listings || bookings) return;
  if (role === 'PROVIDER' || role === 'BOTH') await providerPack(business);
  if (role === 'SEEKER' || role === 'BOTH') await seekerPack(business);
}
