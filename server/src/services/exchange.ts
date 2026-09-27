import { PrismaClient, type ExchangeBusiness, type ExchangeListing, type ExchangeBooking, type ExchangeOffer, type ExchangeReview } from '@prisma/client';
import { ensureContracts } from '../exchange/contracts.js';

export const prisma = new PrismaClient();

export const SEEKER_ID = 'b02';
export const PROVIDER_ID = 'b09';
export const ACTIVE = ['PENDING', 'COUNTERED'];
export const AREAS = ['Andheri', 'Bandra', 'Powai', 'Lower Parel', 'Juhu', 'Vashi'] as const;
export type Area = (typeof AREAS)[number];
export const CATEGORIES = ['BANQUET_SPACE', 'CHAIRS_TABLES', 'VEHICLES', 'KITCHEN', 'AV_EQUIPMENT', 'PARKING', 'LINEN_DECOR'] as const;
const AREA_ANCHOR: Record<Area, string> = {
  Andheri: 'b09',
  Bandra: 'b02',
  Powai: 'b03',
  'Lower Parel': 'b04',
  Juhu: 'b05',
  Vashi: 'b06',
};

export const listingInclude = { business: true } as const;
export const bookingInclude = {
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

export function listingJson(row: ListingRow) {
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

export async function bookingDetail(row: BookingRow) {
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

export type BookingDetail = Awaited<ReturnType<typeof bookingDetail>>;

export interface MatchRequirement {
  category: string;
  quantity: number;
  startAt: string;
  endAt: string;
  area?: Area;
  budget?: number;
  urgent?: boolean;
}

export async function findMatches(requirement: MatchRequirement, originBusinessId?: string) {
  const originId = originBusinessId ?? (requirement.area ? AREA_ANCHOR[requirement.area] : SEEKER_ID);
  const origin = await prisma.exchangeBusiness.findUnique({ where: { id: originId ?? SEEKER_ID } });
  const rows = await prisma.exchangeListing.findMany({
    where: { category: requirement.category, available: { gt: 0 }, status: 'ACTIVE' },
    include: listingInclude,
  });
  if (!origin || rows.length === 0) return [];

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
  return results
    .filter((match) => budget === undefined || Number.isNaN(budget) || match.landed <= budget * 1.25)
    .sort((a, b) => b.total - a.total);
}

export async function listBookings(role: 'seeker' | 'provider', businessId = SEEKER_ID) {
  const rows = await prisma.exchangeBooking.findMany({
    where: role === 'seeker' ? { seekerId: businessId } : { items: { some: { providerId: businessId } } },
    include: bookingInclude,
    orderBy: { createdAt: 'desc' },
  });
  return Promise.all(rows.map((row) => bookingDetail(row)));
}

/** How many billable units a rental window covers: hours for HOUR pricing, days for DAY, 1 for UNIT. */
export function rentalUnits(unit: string, startAt: string, endAt: string) {
  const hours = Math.max(0, (new Date(endAt).getTime() - new Date(startAt).getTime()) / 36e5);
  return unit === 'HOUR' ? hours : unit === 'DAY' ? Math.ceil(hours / 24) : 1;
}

export interface CreateBookingInput {
  resourceId: string;
  quantity: number;
  startAt: string;
  endAt: string;
  offerPrice?: number;
  title?: string;
  note?: string;
}

export type CreateBookingResult =
  | { ok: true; booking: BookingDetail }
  | { ok: false; status: 404; error: string }
  | { ok: false; status: 409; message: string; remaining: number };

export async function createBooking(input: CreateBookingInput, seekerId = SEEKER_ID): Promise<CreateBookingResult> {
  const listing = await prisma.exchangeListing.findUnique({ where: { id: input.resourceId } });
  if (!listing) return { ok: false, status: 404, error: 'Resource not found' };
  if (listing.businessId === seekerId) return { ok: false, status: 404, error: 'You already own this resource' };
  const quantity = Number(input.quantity);
  if (quantity > listing.available) {
    return {
      ok: false,
      status: 409,
      message:
        listing.available === 0
          ? `${listing.title} was just booked for those hours`
          : `Only ${listing.available} ${listing.unitLabel} left for those hours`,
      remaining: listing.available,
    };
  }
  const price = Number(input.offerPrice ?? listing.price);
  const total = Math.round(price * quantity * rentalUnits(listing.unit, input.startAt, input.endAt));
  const id = `bk${Date.now().toString(36)}`;
  const ref = `SPR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const created = new Date();
  const row = await prisma.exchangeBooking.create({
    data: {
      id,
      ref,
      seekerId,
      title: input.title ?? listing.title,
      status: 'PENDING',
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      total,
      note: input.note ?? null,
      createdAt: created,
      items: {
        create: [{ resourceId: listing.id, providerId: listing.businessId, quantity, agreedPrice: price }],
      },
      offers: {
        create: [{
          id: `o-${id}-1`,
          resourceId: listing.id,
          fromBusinessId: seekerId,
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
  return { ok: true, booking: await bookingDetail(row) };
}

export interface RespondInput {
  action: 'accept' | 'reject' | 'counter';
  price?: number;
  message?: string;
  as?: 'seeker' | 'provider';
}

export async function respondToBooking(id: string, input: RespondInput, businessId?: string): Promise<BookingDetail | null> {
  const row = await prisma.exchangeBooking.findUnique({ where: { id }, include: bookingInclude });
  if (!row) return null;
  const actorId = businessId ?? (input.as === 'seeker' ? row.seekerId : row.items[0]?.providerId);
  if (!actorId || (row.seekerId !== actorId && !row.items.some((item) => item.providerId === actorId))) return null;
  const next = input.action === 'accept' ? 'CONFIRMED' : input.action === 'reject' ? 'REJECTED' : 'COUNTERED';
  const item = row.items[0];
  if (input.action === 'counter' && input.price !== undefined && item) {
    const asSeeker = actorId === row.seekerId;
    await prisma.exchangeOffer.updateMany({
      where: { bookingId: row.id, status: 'OPEN' },
      data: { status: 'COUNTERED' },
    });
    await prisma.exchangeOffer.create({
      data: {
        id: `o-${row.id}-${row.offers.length + 1}`,
        bookingId: row.id,
        resourceId: item.resourceId,
        fromBusinessId: actorId,
        toBusinessId: asSeeker ? item.providerId : row.seekerId,
        round: row.offers.length + 1,
        price: Number(input.price),
        quantity: item.quantity,
        message: input.message ?? 'Counter-offer',
        status: 'OPEN',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    await prisma.exchangeBookingItem.update({
      where: { id: item.id },
      data: { agreedPrice: Number(input.price) },
    });
  }
  const updated = await prisma.exchangeBooking.update({
    where: { id: row.id },
    data: { status: next },
    include: bookingInclude,
  });
  if (next === 'CONFIRMED') await ensureContracts(prisma, updated.id);
  return bookingDetail(updated);
}
