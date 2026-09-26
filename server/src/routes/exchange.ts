import { Router } from 'express';
import { PrismaClient, type ExchangeBusiness, type ExchangeListing, type ExchangeBooking, type ExchangeOffer, type ExchangeReview } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

const SEEKER_ID = 'b02';
const PROVIDER_ID = 'b09';
const ACTIVE = ['PENDING', 'COUNTERED'];
const AREAS = ['Andheri', 'Bandra', 'Powai', 'Lower Parel', 'Juhu', 'Vashi'] as const;
const AREA_ANCHOR: Record<(typeof AREAS)[number], string> = {
  Andheri: 'b09',
  Bandra: 'b02',
  Powai: 'b03',
  'Lower Parel': 'b04',
  Juhu: 'b05',
  Vashi: 'b06',
};

const listingInclude = { business: true } as const;
const bookingInclude = {
  seeker: true,
  items: { include: { resource: true } },
  offers: { orderBy: { round: 'asc' as const } },
  reviews: true,
};

type ListingRow = ExchangeListing & { business: ExchangeBusiness };
type BookingRow = ExchangeBooking & {
  seeker: ExchangeBusiness;
  items: { id: string; resourceId: string; providerId: string; quantity: number; agreedPrice: number; resource: ExchangeListing }[];
  offers: ExchangeOffer[];
  reviews: ExchangeReview[];
};

function businessJson(business: ExchangeBusiness) {
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

function listingJson(row: ListingRow) {
  const listing = {
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
  };
  return { ...listing, business: businessJson(row.business) };
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

async function bookingDetail(row: BookingRow) {
  const providers = await prisma.exchangeBusiness.findMany({
    where: { id: { in: row.items.map((item) => item.providerId) } },
  });
  const provider = providers.find((item) => item.id === row.items[0]?.providerId) ?? row.seeker;
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
      resource: {
        id: item.resource.id,
        businessId: item.resource.businessId,
        title: item.resource.title,
        category: item.resource.category,
        description: item.resource.description,
        price: item.resource.price,
        unit: item.resource.unit,
        quantity: item.resource.quantity,
        available: item.resource.available,
        unitLabel: item.resource.unitLabel,
        minRentalHours: item.resource.minRentalHours,
        tags: item.resource.tags,
        delivers: item.resource.delivers,
        status: item.resource.status,
      },
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

router.get('/resources/mine', async (_req, res) => {
  const rows = await prisma.exchangeListing.findMany({
    where: { businessId: PROVIDER_ID },
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
  const body = req.body ?? {};
  const id = `r${Date.now().toString(36)}`;
  const row = await prisma.exchangeListing.create({
    data: {
      id,
      businessId: PROVIDER_ID,
      title: body.title,
      category: body.category,
      description: body.description ?? '',
      price: Number(body.price),
      unit: body.unit,
      quantity: Number(body.quantity),
      available: Number(body.available ?? body.quantity),
      unitLabel: body.unitLabel ?? 'units',
      minRentalHours: Number(body.minRentalHours ?? 1),
      capacity: body.capacity ?? null,
      tags: body.tags ?? [],
      delivers: Boolean(body.delivers),
      deliveryBase: body.deliveryBase ?? null,
      deliveryPerKm: body.deliveryPerKm ?? null,
      status: body.status ?? 'ACTIVE',
      conditions: body.conditions ?? [],
      cancellation: body.cancellation ?? null,
      deposit: body.deposit ?? null,
    },
    include: listingInclude,
  });
  res.status(201).json(listingJson(row));
});

router.patch('/resources/:id', async (req, res) => {
  const patch = req.body ?? {};
  const existing = await prisma.exchangeListing.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Resource not found' });
  const row = await prisma.exchangeListing.update({
    where: { id: req.params.id },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.price !== undefined ? { price: Number(patch.price) } : {}),
      ...(patch.quantity !== undefined ? { quantity: Number(patch.quantity) } : {}),
      ...(patch.available !== undefined ? { available: Number(patch.available) } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
    },
    include: listingInclude,
  });
  res.json(listingJson(row));
});

router.post('/matches', async (req, res) => {
  const requirement = req.body ?? {};
  const originId = requirement.area ? AREA_ANCHOR[requirement.area as (typeof AREAS)[number]] : SEEKER_ID;
  const origin = await prisma.exchangeBusiness.findUnique({ where: { id: originId ?? SEEKER_ID } });
  const rows = await prisma.exchangeListing.findMany({
    where: { category: requirement.category, available: { gt: 0 }, status: 'ACTIVE' },
    include: listingInclude,
  });
  if (!origin || rows.length === 0) return res.json([]);

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
  const role = req.query.role === 'provider' ? 'provider' : 'seeker';
  const rows = await prisma.exchangeBooking.findMany({
    where:
      role === 'seeker'
        ? { seekerId: SEEKER_ID }
        : { items: { some: { providerId: PROVIDER_ID } } },
    include: bookingInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json(await Promise.all(rows.map((row) => bookingDetail(row))));
});

router.get('/bookings/:id', async (req, res) => {
  const row = await prisma.exchangeBooking.findUnique({
    where: { id: req.params.id },
    include: bookingInclude,
  });
  if (!row) return res.status(404).json({ error: 'Booking not found' });
  res.json(await bookingDetail(row));
});

router.post('/bookings', async (req, res) => {
  const input = req.body ?? {};
  const listing = await prisma.exchangeListing.findUnique({ where: { id: input.resourceId } });
  if (!listing) return res.status(404).json({ error: 'Resource not found' });
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
      seekerId: SEEKER_ID,
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
          fromBusinessId: SEEKER_ID,
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
        seekerId: SEEKER_ID,
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
  const row = await prisma.exchangeBooking.findUnique({
    where: { id: req.params.id },
    include: bookingInclude,
  });
  if (!row) return res.status(404).json({ error: 'Booking not found' });
  const action = req.body?.action;
  const next = action === 'accept' ? 'ACCEPTED' : action === 'reject' ? 'REJECTED' : 'COUNTERED';
  if (action === 'counter' && req.body?.price !== undefined) {
    const item = row.items[0];
    await prisma.exchangeOffer.create({
      data: {
        id: `o-${row.id}-${row.offers.length + 1}`,
        bookingId: row.id,
        resourceId: item.resourceId,
        fromBusinessId: req.body.as === 'seeker' ? row.seekerId : item.providerId,
        toBusinessId: req.body.as === 'seeker' ? item.providerId : row.seekerId,
        round: row.offers.length + 1,
        price: Number(req.body.price),
        quantity: item.quantity,
        message: req.body.message ?? 'Counter-offer',
        status: 'OPEN',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }
  const updated = await prisma.exchangeBooking.update({
    where: { id: row.id },
    data: { status: next },
    include: bookingInclude,
  });
  res.json(await bookingDetail(updated));
});

router.post('/bookings/:id/reviews', async (req, res) => {
  const row = await prisma.exchangeBooking.findUnique({ where: { id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Booking not found' });
  if (row.status !== 'COMPLETED') {
    return res.status(400).json({ error: 'Only completed bookings can be reviewed' });
  }
  const as = req.body?.as === 'provider' ? 'provider' : 'seeker';
  await prisma.exchangeReview.create({
    data: {
      bookingId: row.id,
      byBusinessId: as === 'seeker' ? SEEKER_ID : PROVIDER_ID,
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

router.get('/saved-searches', async (_req, res) => {
  const rows = await prisma.exchangeSavedSearch.findMany({ orderBy: { createdAt: 'desc' } });
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

router.get('/notifications', async (_req, res) => {
  const rows = await prisma.exchangeNotification.findMany({ orderBy: { createdAt: 'desc' } });
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
  const range = String(req.query.range ?? '30d');
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const bookings = await prisma.exchangeBooking.findMany({
    where: { status: { notIn: ['CANCELLED', 'REJECTED'] } },
    include: { items: { include: { resource: true } } },
  });
  const inRange = bookings.filter((booking) => booking.createdAt >= start);
  const earnedOf = (booking: (typeof bookings)[number]) =>
    booking.items.filter((item) => item.providerId === PROVIDER_ID).reduce((sum, item) => sum + item.agreedPrice * item.quantity, 0);
  const spentOf = (booking: (typeof bookings)[number]) => (booking.seekerId === SEEKER_ID ? booking.total : 0);
  const provider = await prisma.exchangeBusiness.findUnique({ where: { id: PROVIDER_ID } });
  const mine = await prisma.exchangeListing.findMany({ where: { businessId: PROVIDER_ID } });
  const byCategory = new Map<string, { bookings: number; revenue: number }>();
  for (const booking of bookings) {
    for (const item of booking.items) {
      const row = byCategory.get(item.resource.category) ?? { bookings: 0, revenue: 0 };
      row.bookings += 1;
      row.revenue += item.agreedPrice * item.quantity;
      byCategory.set(item.resource.category, row);
    }
  }
  const series = Array.from({ length: days }, (_, index) => {
    const day = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    const onDay = bookings.filter((booking) => booking.createdAt.toISOString().slice(0, 10) === key);
    return {
      date: key,
      earned: onDay.reduce((sum, booking) => sum + earnedOf(booking), 0),
      spent: onDay.reduce((sum, booking) => sum + spentOf(booking), 0),
    };
  });
  res.json({
    range,
    earned: inRange.filter((booking) => !ACTIVE.includes(booking.status)).reduce((sum, booking) => sum + earnedOf(booking), 0),
    spent: inRange.reduce((sum, booking) => sum + spentOf(booking), 0),
    bookings: inRange.filter((booking) => booking.seekerId === SEEKER_ID || booking.items.some((item) => item.providerId === PROVIDER_ID)).length,
    doubleBookings: 0,
    utilisation: mine.length ? mine.reduce((sum, listing) => sum + (listing.quantity ? (listing.quantity - listing.available) / listing.quantity : 0), 0) / mine.length : 0,
    pendingRequests: bookings.filter((booking) => ACTIVE.includes(booking.status) && booking.items.some((item) => item.providerId === PROVIDER_ID)).length,
    avgResponseMins: provider?.avgResponseMins ?? 0,
    activeRequests: bookings.filter((booking) => booking.seekerId === SEEKER_ID && ['PENDING', 'COUNTERED', 'ACCEPTED', 'CONFIRMED', 'IN_USE'].includes(booking.status)).length,
    byCategory: [...byCategory].map(([category, value]) => ({ category, ...value })),
    series,
  });
});

router.get('/analytics/report', async (req, res) => {
  const from = String(req.query.from ?? new Date().toISOString().slice(0, 10));
  const to = String(req.query.to ?? from);
  const summary = await prisma.exchangeBooking.findMany({
    where: { status: { notIn: ['CANCELLED', 'REJECTED'] } },
    include: { items: { include: { resource: true } } },
  });
  const totals = {
    earned: summary.reduce((sum, booking) => sum + booking.items.filter((item) => item.providerId === PROVIDER_ID).reduce((inner, item) => inner + item.agreedPrice * item.quantity, 0), 0),
    spent: summary.filter((booking) => booking.seekerId === SEEKER_ID).reduce((sum, booking) => sum + booking.total, 0),
    bookings: summary.length,
    requests: summary.length,
    acceptanceRate: summary.length ? summary.filter((booking) => !ACTIVE.includes(booking.status)).length / summary.length : 0,
    utilisation: 0.42,
  };
  res.json({
    from,
    to,
    bucket: 'day',
    totals,
    previous: totals,
    series: [{ date: from, earned: totals.earned, spent: totals.spent, bookings: totals.bookings }],
    utilisationByCategory: [],
    heatmap: AREAS.flatMap((area) => Array.from({ length: 7 }, (_, weekday) => ({ area, weekday, requests: 0 }))),
    topCategories: [],
    acceptance: [{ date: from, accepted: totals.bookings, total: totals.requests, rate: totals.acceptanceRate }],
  });
});

export default router;
