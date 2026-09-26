import { Router, type Request, type Response } from 'express';
import {
  ACTIVE,
  AREAS,
  PROVIDER_ID,
  SEEKER_ID,
  bookingDetail,
  bookingInclude,
  createBooking,
  findMatches,
  listBookings,
  listingInclude,
  listingJson,
  prisma,
  rentalUnits,
  respondToBooking,
  type Area,
} from '../services/exchange.js';

const router = Router();

/** Logs and converts any thrown error into a 500 with a readable message. */
function handle(label: string, fn: (req: Request, res: Response) => Promise<unknown> | unknown) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      console.error(`Error ${label}:`, error);
      if (!res.headersSent) res.status(500).json({ error: `Failed ${label}` });
    }
  };
}

router.get('/resources', handle('fetching resources', async (req, res) => {
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
}));

router.get('/resources/mine', handle('fetching my resources', async (_req, res) => {
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
}));

router.get('/resources/:id/availability', handle('fetching availability', async (req, res) => {
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
}));

router.get('/resources/:id', handle('fetching resource', async (req, res) => {
  const row = await prisma.exchangeListing.findUnique({
    where: { id: req.params.id },
    include: listingInclude,
  });
  if (!row) return res.status(404).json({ error: 'Resource not found' });
  res.json(listingJson(row));
}));

router.post('/resources', handle('creating resource', async (req, res) => {
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
}));

router.patch('/resources/:id', handle('updating resource', async (req, res) => {
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
}));

router.post('/matches', handle('finding matches', async (req, res) => {
  res.json(await findMatches(req.body ?? {}));
}));

router.post('/requests/parse', handle('parsing request', (req, res) => {
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
  const area = AREAS.find((name: Area) => raw.toLowerCase().includes(name.toLowerCase()));
  const budgetMatch = raw.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  const found = [items.length > 0, Boolean(area), Boolean(budgetMatch)].filter(Boolean).length;
  res.json({
    raw,
    items,
    area,
    budget: budgetMatch ? Math.round(Number(budgetMatch[1]) * 1000) : undefined,
    confidence: found / 4,
  });
}));

router.get('/bookings', handle('fetching bookings', async (req, res) => {
  res.json(await listBookings(req.query.role === 'provider' ? 'provider' : 'seeker'));
}));

router.get('/bookings/:id', handle('fetching booking', async (req, res) => {
  const row = await prisma.exchangeBooking.findUnique({
    where: { id: req.params.id },
    include: bookingInclude,
  });
  if (!row) return res.status(404).json({ error: 'Booking not found' });
  res.json(await bookingDetail(row));
}));

router.post('/bookings', handle('creating booking', async (req, res) => {
  const result = await createBooking(req.body ?? {});
  if (result.ok) return res.status(201).json(result.booking);
  if (result.status === 404) return res.status(404).json({ error: result.error });
  res.status(409).json({ message: result.message, alternatives: [], remaining: result.remaining });
}));

router.post('/bookings/bundle', handle('creating bundle booking', async (req, res) => {
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
        total: Math.round(listing.price * Number(item.quantity) * rentalUnits(listing.unit, input.startAt, input.endAt)),
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
}));

router.post('/bookings/:id/respond', handle('responding to booking', async (req, res) => {
  const updated = await respondToBooking(req.params.id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: 'Booking not found' });
  res.json(updated);
}));

router.post('/bookings/:id/reviews', handle('creating review', async (req, res) => {
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
}));

router.get('/saved-searches', handle('fetching saved searches', async (_req, res) => {
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
}));

router.get('/notifications', handle('fetching notifications', async (_req, res) => {
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
}));

router.get('/analytics', handle('fetching analytics', async (req, res) => {
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
}));

router.get('/analytics/report', handle('fetching analytics report', async (req, res) => {
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
}));

export default router;
