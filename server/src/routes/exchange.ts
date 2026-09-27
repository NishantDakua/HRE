import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { type ExchangeBusiness, type ExchangeListing, type ExchangeBooking, type ExchangeOffer, type ExchangeReview } from '@prisma/client';
import { buildLiveReport, liveSummary, type LiveDeal } from '../exchange/report.js';
import { ensureContracts } from '../exchange/contracts.js';
import { PhotoError, storeListingPhotos } from '../exchange/photos.js';

import { prisma } from '../exchange/db.js';
import { actorBusiness, requireActor } from '../exchange/actor.js';

export { prisma };
const router: Router = Router();

for (const method of ['get', 'post', 'patch'] as const) {
  const original = router[method].bind(router);
  router[method] = ((path: string, handler: Parameters<typeof original>[1]) =>
    original(path, async (req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        next(error);
      }
    })) as typeof router.get;
}

const ACTIVE = ['PENDING', 'COUNTERED'];
export const AREAS = ['Andheri', 'Bandra', 'Powai', 'Lower Parel', 'Juhu', 'Vashi'] as const;
export type Area = (typeof AREAS)[number];
/** Neighbourhood centres: where a new business is placed, and the origin for anonymous matching. */
export const AREA_CENTER: Record<Area, { lat: number; lng: number }> = {
  Andheri: { lat: 19.1136, lng: 72.8697 },
  Bandra: { lat: 19.0596, lng: 72.8295 },
  Powai: { lat: 19.1176, lng: 72.906 },
  'Lower Parel': { lat: 18.9986, lng: 72.8302 },
  Juhu: { lat: 19.1075, lng: 72.8263 },
  Vashi: { lat: 19.0771, lng: 72.9986 },
};


function isParty(row: { seekerId: string; items: { providerId: string }[] }, businessId: string) {
  return row.seekerId === businessId || row.items.some((item) => item.providerId === businessId);
}

async function dealsFor(businessId: string): Promise<LiveDeal[]> {
  const rows = await prisma.exchangeBooking.findMany({
    where: {
      OR: [{ seekerId: businessId }, { items: { some: { providerId: businessId } } }],
    },
    include: {
      seeker: true,
      items: { include: { resource: true } },
      offers: { orderBy: { round: 'asc' } },
    },
  });
  const businesses = new Map((await prisma.exchangeBusiness.findMany()).map((business) => [business.id, business]));
  return rows.map((row) => ({
    createdAt: row.createdAt,
    startAt: row.startAt,
    status: row.status,
    seekerId: row.seekerId,
    seekerArea: row.seeker.area,
    total: row.total,
    offers: row.offers.map((offer) => ({ fromBusinessId: offer.fromBusinessId, status: offer.status })),
    items: row.items.map((item) => ({
      providerId: item.providerId,
      category: item.resource.category,
      agreedPrice: item.agreedPrice,
      quantity: item.quantity,
      area: businesses.get(item.providerId)?.area ?? row.seeker.area,
    })),
  }));
}

const listingInclude = { business: true, photos: true } as const;

const CATEGORIES = ['BANQUET_SPACE', 'CHAIRS_TABLES', 'VEHICLES', 'KITCHEN', 'AV_EQUIPMENT', 'PARKING', 'LINEN_DECOR'] as const;
const money = z.coerce.number().finite().nonnegative();
const count = z.coerce.number().int().nonnegative();
const optionalMoney = z.union([money, z.null()]).optional();

/** Everything a provider may set on a listing (the client's CreateResourceInput). */
const listingFields = z.object({
  title: z.string().trim().min(3, 'Give the listing a title').max(120),
  category: z.enum(CATEGORIES),
  description: z.string().trim().max(2000).default(''),
  price: money.refine((n) => n > 0, 'Price must be more than zero'),
  unit: z.enum(['HOUR', 'DAY', 'UNIT']),
  quantity: count.refine((n) => n > 0, 'Quantity must be at least 1'),
  available: count.optional(),
  unitLabel: z.string().trim().min(1).max(40).default('units'),
  minRentalHours: count.default(1),
  capacity: z.union([count, z.null()]).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  delivers: z.coerce.boolean().default(false),
  deliveryBase: optionalMoney,
  deliveryPerKm: optionalMoney,
  status: z.enum(['ACTIVE', 'PAUSED']).default('ACTIVE'),
  conditions: z.array(z.string().trim().max(200)).max(20).default([]),
  cancellation: z.union([z.enum(['FLEXIBLE', 'MODERATE', 'STRICT']), z.null()]).optional(),
  deposit: optionalMoney,
  photos: z.array(z.object({ position: z.string(), dataUrl: z.string() })).optional(),
});
const listingPatch = listingFields.partial().extend({
  // No defaults on a patch: absent means unchanged.
  description: z.string().trim().max(2000).optional(),
  unitLabel: z.string().trim().min(1).max(40).optional(),
  minRentalHours: count.optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  delivers: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'PAUSED']).optional(),
  conditions: z.array(z.string().trim().max(200)).max(20).optional(),
});

function invalid(res: Response, error: z.ZodError) {
  return res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid listing', code: 'VALIDATION', issues: error.issues });
}
const bookingInclude = {
  seeker: true,
  items: { include: { resource: { include: { photos: true } } } },
  offers: { orderBy: { round: 'asc' as const } },
  reviews: true,
};

type ListingRow = ExchangeListing & {
  business: ExchangeBusiness;
  photos: { position: string; url: string }[];
};
type BookingRow = ExchangeBooking & {
  seeker: ExchangeBusiness;
  items: { id: string; resourceId: string; providerId: string; quantity: number; agreedPrice: number; resource: ExchangeListing & { photos: { position: string; url: string }[] } }[];
  offers: ExchangeOffer[];
  reviews: ExchangeReview[];
};

export function businessJson(business: ExchangeBusiness) {
  return {
    id: business.id,
    name: business.name,
    type: business.type,
    area: business.area,
    address: business.address,
    lat: business.lat,
    lng: business.lng,
    rating: business.rating,
    reviewCount: business.reviewCount,
    responseRate: business.responseRate,
    avgResponseMins: business.avgResponseMins,
    fulfillmentRate: business.fulfillmentRate,
    verified: business.verified,
    joinedAt: business.joinedAt.toISOString(),
  };
}

/** A listing in the client's Resource shape (without its business). */
function resourceJson(row: Omit<ListingRow, 'business'>) {
  return {
    id: row.id,
    businessId: row.businessId,
    title: row.title,
    category: row.category,
    description: row.description,
    price: row.price,
    unit: row.unit,
    quantity: row.quantity,
    available: row.available,
    unitLabel: row.unitLabel,
    minRentalHours: row.minRentalHours,
    capacity: row.capacity ?? undefined,
    tags: row.tags,
    delivers: row.delivers,
    deliveryBase: row.deliveryBase ?? undefined,
    deliveryPerKm: row.deliveryPerKm ?? undefined,
    status: row.status,
    conditions: row.conditions.length ? row.conditions : undefined,
    cancellation: row.cancellation ?? undefined,
    deposit: row.deposit ?? undefined,
    photos: ['FRONT', 'SIDE', 'IN_PLACE']
      .map((position) => row.photos.find((photo) => photo.position === position))
      .filter((photo): photo is { position: string; url: string } => Boolean(photo))
      .map((photo) => ({ position: photo.position, url: photo.url })),
  };
}

function listingJson(row: ListingRow) {
  return { ...resourceJson(row), business: businessJson(row.business) };
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function weightedTotal(score: Record<string, number>, urgent = false) {
  const weights = urgent
    ? { price: 0.1, distance: 0.3, availability: 0.2, capacity: 0.15, reliability: 0.25 }
    : { price: 0.25, distance: 0.2, availability: 0.15, capacity: 0.2, reliability: 0.2 };
  return Math.round(
    Object.entries(weights).reduce((sum, [key, weight]) => sum + score[key] * weight, 0) * 100
  );
}

async function bookingDetail(row: BookingRow, businesses?: Map<string, ExchangeBusiness>) {
  const provider =
    businesses?.get(row.items[0]?.providerId ?? '') ??
    (await prisma.exchangeBusiness.findUnique({ where: { id: row.items[0]?.providerId ?? '' } })) ??
    row.seeker;
  return {
    id: row.id,
    ref: row.ref,
    seekerId: row.seekerId,
    title: row.title,
    status: row.status,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    total: row.total,
    createdAt: row.createdAt.toISOString(),
    urgent: row.urgent || undefined,
    note: row.note ?? undefined,
    reviews: row.reviews.map((review) => ({
      byBusinessId: review.byBusinessId,
      rating: review.rating,
      text: review.text,
      tags: review.tags,
      createdAt: review.createdAt.toISOString(),
    })),
    seeker: businessJson(row.seeker),
    provider: businessJson(provider),
    lines: row.items.map((item) => ({
      resourceId: item.resourceId,
      providerId: item.providerId,
      quantity: item.quantity,
      agreedPrice: item.agreedPrice,
      listPrice: item.resource.price,
      resource: resourceJson(item.resource),
    })),
    items: row.items.map((item) => ({
      resourceId: item.resourceId,
      providerId: item.providerId,
      quantity: item.quantity,
      agreedPrice: item.agreedPrice,
    })),
    offers: row.offers.map((offer) => ({
      id: offer.id,
      bookingId: offer.bookingId,
      resourceId: offer.resourceId,
      fromBusinessId: offer.fromBusinessId,
      toBusinessId: offer.toBusinessId,
      round: offer.round,
      price: offer.price,
      quantity: offer.quantity,
      message: offer.message,
      status: offer.status,
      createdAt: offer.createdAt.toISOString(),
      expiresAt: offer.expiresAt.toISOString(),
    })),
    distanceKm: Math.round(distanceKm(row.seeker, provider) * 10) / 10,
  };
}

router.get('/resources', async (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const category = req.query.category ? String(req.query.category) : undefined;
  const area = req.query.area ? String(req.query.area) : undefined;
  const maxPrice = req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;
  const availableOnly = req.query.availableOnly === 'true' || req.query.availableOnly === '1';
  const sort = String(req.query.sort ?? '');

  const rows = await prisma.exchangeListing.findMany({
    where: {
      status: 'ACTIVE',
      ...(category ? { category } : {}),
      ...(maxPrice !== undefined && !Number.isNaN(maxPrice) ? { price: { lte: maxPrice } } : {}),
      ...(availableOnly ? { available: { gt: 0 } } : {}),
      ...(area ? { business: { area } } : {}),
    },
    include: listingInclude,
  });

  let list = rows.map((row) => listingJson(row));
  if (q) {
    list = list.filter((row) =>
      `${row.title} ${row.description} ${row.business.name} ${row.tags.join(' ')}`.toLowerCase().includes(q)
    );
  }
  if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
  if (sort === 'rating') list.sort((a, b) => b.business.rating - a.business.rating);
  res.json(list);
});

router.get('/resources/mine', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const rows = await prisma.exchangeListing.findMany({
    where: { businessId: actor.id },
    include: listingInclude,
  });
  const pending = await prisma.exchangeBooking.findMany({
    where: { status: { in: ACTIVE } },
    include: { items: true },
  });
  res.json(
    rows.map((row) => ({
      ...listingJson(row),
      utilisation: row.quantity ? Math.min(1, (row.quantity - row.available) / row.quantity) : 0,
      pendingRequests: pending.filter((booking) => booking.items.some((item) => item.resourceId === row.id)).length,
    }))
  );
});

router.get('/resources/:id/availability', async (req, res) => {
  const listing = await prisma.exchangeListing.findUnique({ where: { id: req.params.id } });
  if (!listing) return res.status(404).json({ error: 'Resource not found' });
  const bookings = await prisma.exchangeBooking.findMany({
    where: {
      status: { notIn: ['CANCELLED', 'REJECTED', 'COMPLETED'] },
      items: { some: { resourceId: listing.id } },
    },
    include: { items: true },
  });
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 60 * 24 * 60 * 60 * 1000);
  res.json({
    resourceId: listing.id,
    quantity: listing.quantity,
    from: from.toISOString(),
    to: to.toISOString(),
    blocks: bookings.flatMap((booking) =>
      booking.items
        .filter((item) => item.resourceId === listing.id)
        .map((item) => ({
          startAt: booking.startAt.toISOString(),
          endAt: booking.endAt.toISOString(),
          quantity: item.quantity,
        }))
    ),
  });
});

router.get('/resources/:id', async (req, res) => {
  const row = await prisma.exchangeListing.findUnique({
    where: { id: req.params.id },
    include: listingInclude,
  });
  if (!row) return res.status(404).json({ error: 'Resource not found' });
  res.json(listingJson(row));
});

router.post('/resources', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const parsed = listingFields.safeParse(req.body ?? {});
  if (!parsed.success) return invalid(res, parsed.error);
  const body = parsed.data;
  const id = `r${Date.now().toString(36)}`;
  let photos;
  try {
    photos = await storeListingPhotos(id, body.photos ?? []);
  } catch (error) {
    if (error instanceof PhotoError) return res.status(error.status).json({ error: error.message });
    throw error;
  }
  const row = await prisma.exchangeListing.create({
    data: {
      id,
      businessId: actor.id,
      title: body.title,
      category: body.category,
      description: body.description,
      price: body.price,
      unit: body.unit,
      quantity: body.quantity,
      available: Math.min(body.available ?? body.quantity, body.quantity),
      unitLabel: body.unitLabel,
      minRentalHours: body.minRentalHours,
      capacity: body.capacity ?? null,
      tags: body.tags,
      delivers: body.delivers,
      deliveryBase: body.deliveryBase ?? null,
      deliveryPerKm: body.deliveryPerKm ?? null,
      status: body.status,
      conditions: body.conditions,
      cancellation: body.cancellation ?? null,
      deposit: body.deposit ?? null,
      photos: { create: photos },
    },
    include: listingInclude,
  });
  res.status(201).json(listingJson(row));
});

router.patch('/resources/:id', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const parsed = listingPatch.safeParse(req.body ?? {});
  if (!parsed.success) return invalid(res, parsed.error);
  const { photos: newPhotos, ...patch } = parsed.data;
  const existing = await prisma.exchangeListing.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.businessId !== actor.id) return res.status(404).json({ error: 'Resource not found' });
  if (newPhotos) {
    try {
      const photos = await storeListingPhotos(existing.id, newPhotos);
      await prisma.exchangeListingPhoto.deleteMany({ where: { listingId: existing.id } });
      await prisma.exchangeListingPhoto.createMany({ data: photos.map((photo) => ({ ...photo, listingId: existing.id })) });
    } catch (error) {
      if (error instanceof PhotoError) return res.status(error.status).json({ error: error.message });
      throw error;
    }
  }
  const row = await prisma.exchangeListing.update({
    where: { id: req.params.id },
    // Every field the client can edit; undefined keys are left unchanged by Prisma.
    data: patch,
    include: listingInclude,
  });
  res.json(listingJson(row));
});

router.post('/matches', async (req, res) => {
  const requirement = req.body ?? {};
  const actor = await actorBusiness(req);
  // Same origin the client draws on the map: the chosen area, else the business's own address, else Bandra.
  const area = (AREAS as readonly string[]).includes(requirement.area) ? (requirement.area as Area) : null;
  const origin = area ? AREA_CENTER[area] : actor ?? AREA_CENTER.Bandra;
  const rows = await prisma.exchangeListing.findMany({
    where: {
      category: requirement.category,
      available: { gt: 0 },
      status: 'ACTIVE',
      // Never offer someone their own listings.
      ...(actor ? { businessId: { not: actor.id } } : {}),
    },
    include: listingInclude,
  });
  if (rows.length === 0) return res.json([]);

  const hours = Math.max(1, (new Date(requirement.endAt).getTime() - new Date(requirement.startAt).getTime()) / 36e5);
  const prices = rows.map((row) => row.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const results = rows.map((row) => {
    const resource = listingJson(row);
    const km = distanceKm(origin, row.business);
    const fulfils = Math.min(row.available, Number(requirement.quantity) || 1);
    const units = row.unit === 'HOUR' ? hours : row.unit === 'DAY' ? Math.ceil(hours / 24) : 1;
    const rental = Math.round(row.price * fulfils * units);
    const delivery = row.delivers ? Math.round((row.deliveryBase ?? 150) + km * (row.deliveryPerKm ?? 60)) : 0;
    const score = {
      price: maxP === minP ? 1 : 1 - (row.price - minP) / (maxP - minP),
      distance: Math.max(0, 1 - km / 30),
      availability: row.available / row.quantity,
      capacity: fulfils / (Number(requirement.quantity) || 1),
      reliability: (row.business.fulfillmentRate + row.business.responseRate) / 2,
    };
    return {
      resource,
      distanceKm: Math.round(km * 10) / 10,
      rental,
      delivery,
      landed: rental + delivery,
      fulfils,
      score,
      total: weightedTotal(score, Boolean(requirement.urgent)),
    };
  });
  const budget = requirement.budget === undefined ? undefined : Number(requirement.budget);
  res.json(
    results
      .filter((match) => budget === undefined || Number.isNaN(budget) || match.landed <= budget * 1.25)
      .sort((a, b) => b.total - a.total)
  );
});

router.post('/requests/parse', (req, res) => {
  const raw = String(req.body?.text ?? '');
  const keywords: [RegExp, string, string][] = [
    [/chairs?|tables?/i, 'CHAIRS_TABLES', 'Chairs'],
    [/projectors?|speakers?|\bpa\b|mics?|led|screens?/i, 'AV_EQUIPMENT', 'AV'],
    [/vans?|reefer|shuttle|coach|tempo/i, 'VEHICLES', 'Vehicle'],
    [/hall|ballroom|banquet|lawn|terrace/i, 'BANQUET_SPACE', 'Space'],
    [/kitchen|tandoor|cold storage|plating/i, 'KITCHEN', 'Kitchen'],
    [/parking|valet/i, 'PARKING', 'Parking'],
    [/linen|decor|flowers?|backdrop/i, 'LINEN_DECOR', 'Decor'],
  ];
  const items = raw.split(/[+,&]| and /i).flatMap((part) => {
    const hit = keywords.find(([pattern]) => pattern.test(part));
    if (!hit) return [];
    const quantity = Number(part.match(/(\d+)/)?.[1] ?? 1);
    return [{ category: hit[1], quantity, label: `${hit[2]} ×${quantity}` }];
  });
  const area = AREAS.find((name) => raw.toLowerCase().includes(name.toLowerCase()));
  const budgetMatch = raw.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  const found = [items.length > 0, Boolean(area), Boolean(budgetMatch)].filter(Boolean).length;
  res.json({
    raw,
    items,
    area,
    budget: budgetMatch ? Math.round(Number(budgetMatch[1]) * 1000) : undefined,
    confidence: found / 4,
  });
});

router.get('/bookings', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const role = req.query.role === 'provider' ? 'provider' : 'seeker';
  const rows = await prisma.exchangeBooking.findMany({
    where:
      role === 'seeker'
        ? { seekerId: actor.id }
        : { items: { some: { providerId: actor.id } } },
    include: bookingInclude,
    orderBy: { createdAt: 'desc' },
  });
  const businesses = new Map(
    (await prisma.exchangeBusiness.findMany()).map((business) => [business.id, business])
  );
  res.json(await Promise.all(rows.map((row) => bookingDetail(row, businesses))));
});

router.get('/bookings/:id', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const row = await prisma.exchangeBooking.findUnique({
    where: { id: req.params.id },
    include: bookingInclude,
  });
  if (!row || !isParty(row, actor.id)) return res.status(404).json({ error: 'Booking not found' });
  res.json(await bookingDetail(row));
});

router.post('/bookings', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const input = req.body ?? {};
  const listing = await prisma.exchangeListing.findUnique({ where: { id: input.resourceId } });
  if (!listing) return res.status(404).json({ error: 'Resource not found' });
  if (listing.businessId === actor.id) return res.status(400).json({ error: 'You already own this resource' });
  const quantity = Number(input.quantity);
  if (quantity > listing.available) {
    return res.status(409).json({
      message:
        listing.available === 0
          ? `${listing.title} was just booked for those hours`
          : `Only ${listing.available} ${listing.unitLabel} left for those hours`,
      alternatives: [],
      remaining: listing.available,
    });
  }
  const price = Number(input.offerPrice ?? listing.price);
  const id = `bk${Date.now().toString(36)}`;
  const ref = `SPR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const created = new Date();
  const row = await prisma.exchangeBooking.create({
    data: {
      id,
      ref,
      seekerId: actor.id,
      title: input.title ?? listing.title,
      status: 'PENDING',
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      total: price * quantity,
      note: input.note ?? null,
      createdAt: created,
      items: {
        create: [{ resourceId: listing.id, providerId: listing.businessId, quantity, agreedPrice: price }],
      },
      offers: {
        create: [{
          id: `o-${id}-1`,
          resourceId: listing.id,
          fromBusinessId: actor.id,
          toBusinessId: listing.businessId,
          round: 1,
          price,
          quantity,
          message: input.note ?? `Request for ${(input.title ?? listing.title).toLowerCase()}.`,
          status: 'OPEN',
          createdAt: created,
          expiresAt: new Date(created.getTime() + 24 * 60 * 60 * 1000),
        }],
      },
    },
    include: bookingInclude,
  });
  res.status(201).json(await bookingDetail(row));
});

router.post('/bookings/bundle', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const input = req.body ?? {};
  const created: Awaited<ReturnType<typeof bookingDetail>>[] = [];
  for (const [index, item] of (input.items ?? []).entries()) {
    const listing = await prisma.exchangeListing.findUnique({ where: { id: item.resourceId } });
    if (!listing) continue;
    const id = `bk${Date.now().toString(36)}${index}`;
    const row = await prisma.exchangeBooking.create({
      data: {
        id,
        ref: `SPR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        seekerId: actor.id,
        title: input.title ?? listing.title,
        status: 'PENDING',
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        total: listing.price * Number(item.quantity),
        createdAt: new Date(),
        items: {
          create: [{
            resourceId: listing.id,
            providerId: listing.businessId,
            quantity: Number(item.quantity),
            agreedPrice: listing.price,
          }],
        },
      },
      include: bookingInclude,
    });
    created.push(await bookingDetail(row));
  }
  res.status(201).json(created);
});

router.post('/bookings/:id/respond', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const row = await prisma.exchangeBooking.findUnique({
    where: { id: req.params.id },
    include: bookingInclude,
  });
  if (!row || !isParty(row, actor.id)) return res.status(404).json({ error: 'Booking not found' });
  const action = req.body?.action;
  const next = action === 'accept' ? 'ACCEPTED' : action === 'reject' ? 'REJECTED' : 'COUNTERED';
  const item = row.items[0];
  const asSeeker = actor.id === row.seekerId;
  if (action === 'counter' && req.body?.price !== undefined) {
    await prisma.exchangeOffer.updateMany({
      where: { bookingId: row.id, status: 'OPEN' },
      data: { status: 'COUNTERED' },
    });
    await prisma.exchangeOffer.create({
      data: {
        id: `o-${row.id}-${row.offers.length + 1}`,
        bookingId: row.id,
        resourceId: item.resourceId,
        fromBusinessId: actor.id,
        toBusinessId: asSeeker ? item.providerId : row.seekerId,
        round: row.offers.length + 1,
        price: Number(req.body.price),
        quantity: item.quantity,
        message: req.body.message ?? 'Counter-offer',
        status: 'OPEN',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    await prisma.exchangeBookingItem.update({
      where: { id: item.id },
      data: { agreedPrice: Number(req.body.price) },
    });
  }
  const updated = await prisma.exchangeBooking.update({
    where: { id: row.id },
    data: { status: next },
    include: bookingInclude,
  });
  if (next === 'ACCEPTED') await ensureContracts(prisma, updated.id);
  res.json(await bookingDetail(updated));
});

router.post('/bookings/:id/reviews', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const row = await prisma.exchangeBooking.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!row || !isParty(row, actor.id)) return res.status(404).json({ error: 'Booking not found' });
  if (row.status !== 'COMPLETED') {
    return res.status(400).json({ error: 'Only completed bookings can be reviewed' });
  }
  await prisma.exchangeReview.create({
    data: {
      bookingId: row.id,
      byBusinessId: actor.id,
      rating: Number(req.body?.rating ?? 5),
      text: String(req.body?.text ?? ''),
      tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
      createdAt: new Date(),
    },
  });
  const updated = await prisma.exchangeBooking.findUniqueOrThrow({
    where: { id: row.id },
    include: bookingInclude,
  });
  res.status(201).json(await bookingDetail(updated));
});

router.get('/saved-searches', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const rows = await prisma.exchangeSavedSearch.findMany({
    where: { businessId: actor.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      query: row.query,
      createdAt: row.createdAt.toISOString(),
      newMatches: row.newMatches,
    }))
  );
});

router.get('/notifications', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const rows = await prisma.exchangeNotification.findMany({
    where: { businessId: actor.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      read: row.read,
    }))
  );
});

router.get('/analytics', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const range = String(req.query.range ?? '30d');
  const [deals, listings] = await Promise.all([
    dealsFor(actor.id),
    prisma.exchangeListing.findMany({ where: { businessId: actor.id } }),
  ]);
  res.json(liveSummary(range, actor.id, deals, listings, actor.avgResponseMins));
});

router.get('/analytics/report', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const today = new Date();
  const fallbackTo = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const from = String(req.query.from ?? fallbackTo);
  const to = String(req.query.to ?? from);
  const [deals, listings] = await Promise.all([
    dealsFor(actor.id),
    prisma.exchangeListing.findMany({ where: { businessId: actor.id } }),
  ]);
  res.json(buildLiveReport(from, to, actor.id, deals, listings));
});

export default router;
