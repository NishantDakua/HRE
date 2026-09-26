import {
  addDays,
  addHours,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  formatISO,
  getISODay,
  parseISO,
  set,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { ConflictError } from "./api";
import { nearestFreeSlots, prepareAvailability, remainingDuring } from "./availability";
import {
  CURRENT_BUSINESS,
  bookings as seedBookings,
  businesses,
  notifications as seedNotifications,
  offers as seedOffers,
  resources as seedResources,
  savedSearches as seedSavedSearches,
} from "./mock";
import { distanceKm } from "./utils";
import { weightedTotal } from "./match";
import type {
  AnalyticsRange,
  AnalyticsReport,
  AnalyticsSummary,
  Area,
  Availability,
  AvailabilityBlock,
  Booking,
  BookingDetail,
  BookingStatus,
  BundleInput,
  CreateBookingInput,
  CreateResourceInput,
  DateRange,
  NegotiationOffer,
  OfferStatus,
  ReportTotals,
  ReviewInput,
  MatchResult,
  Notification,
  ParsedRequest,
  Requirement,
  MyResource,
  Resource,
  ResourceCategory,
  SavedSearch,
  UpdateResourceInput,
  ResourceFilters,
  ResourceWithBusiness,
  RespondBookingInput,
  Role,
} from "./types";

/*
 * In-memory stand-in for the Express API, used when VITE_USE_MOCK=true.
 * Mutations change this copy, so queries reflect them until reload.
 */

const DELAY = 400;
const wait = <T,>(value: T): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), DELAY));

const db = {
  resources: structuredClone(seedResources) as Resource[],
  bookings: structuredClone(seedBookings) as Booking[],
  notifications: structuredClone(seedNotifications) as Notification[],
  savedSearches: structuredClone(seedSavedSearches) as SavedSearch[],
  offers: structuredClone(seedOffers) as NegotiationOffer[],
};

/** Every booking's thread starts with the seeker's original request (round 1). */
function initialOffer(b: Booking): NegotiationOffer {
  const item = b.items[0];
  const status: OfferStatus =
    b.status === "PENDING" ? "OPEN" : b.status === "REJECTED" ? "REJECTED" : b.status === "CANCELLED" ? "EXPIRED" : b.status === "COUNTERED" ? "COUNTERED" : "ACCEPTED";
  return {
    id: `o-${b.id}-1`,
    bookingId: b.id,
    resourceId: item.resourceId,
    fromBusinessId: b.seekerId,
    toBusinessId: item.providerId,
    round: 1,
    price: item.agreedPrice,
    quantity: item.quantity,
    message: b.note ?? `Request for ${b.title.toLowerCase()}.`,
    status,
    createdAt: b.createdAt,
    expiresAt: formatISO(addHours(parseISO(b.createdAt), 24)),
  };
}
for (const b of db.bookings) {
  if (!db.offers.some((o) => o.bookingId === b.id)) db.offers.push(initialOffer(b));
}

/**
 * Dev aid: `localStorage.setItem("spare:mock-fail", "1")` makes mock mutations
 * fail, to exercise optimistic-update rollbacks. Remove the key to restore.
 */
function shouldFail() {
  try {
    return localStorage.getItem("spare:mock-fail") === "1";
  } catch {
    return false;
  }
}

function failLater<T>(): Promise<T> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("Simulated network error")), DELAY));
}

const ACTIVE_REQUEST: BookingStatus[] = ["PENDING", "COUNTERED"];

const businessById = new Map(businesses.map((b) => [b.id, b]));

function withBusiness(r: Resource): ResourceWithBusiness {
  const business = businessById.get(r.businessId);
  if (!business) throw new Error(`Unknown business ${r.businessId}`);
  return { ...r, business };
}

function notFound(what: string): never {
  throw new Error(`${what} not found`);
}

let seq = 100;
const nextId = (prefix: string) => `${prefix}${++seq}`;

/* ------------------------------------------------------------------ */
/* Resources                                                           */
/* ------------------------------------------------------------------ */

export function getResources(filters: ResourceFilters = {}) {
  const q = filters.q?.trim().toLowerCase();
  let list = db.resources.map(withBusiness).filter((r) => {
    if (r.status === "PAUSED") return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.area && r.business.area !== filters.area) return false;
    if (filters.maxPrice !== undefined && r.price > filters.maxPrice) return false;
    if (filters.availableOnly && r.available === 0) return false;
    if (q && !`${r.title} ${r.description} ${r.business.name} ${r.tags.join(" ")}`.toLowerCase().includes(q)) return false;
    return true;
  });
  if (filters.sort === "price_asc") list = list.sort((a, b) => a.price - b.price);
  if (filters.sort === "price_desc") list = list.sort((a, b) => b.price - a.price);
  if (filters.sort === "rating") list = list.sort((a, b) => b.business.rating - a.business.rating);
  return wait(list);
}

export function getResource(id: string) {
  const r = db.resources.find((x) => x.id === id) ?? notFound("Resource");
  return wait(withBusiness(r));
}

export function createResource(input: CreateResourceInput) {
  if (shouldFail()) return failLater<ResourceWithBusiness>();
  const resource: Resource = {
    ...input,
    id: nextId("r"),
    businessId: CURRENT_BUSINESS.provider,
    available: input.available ?? input.quantity,
    status: input.status ?? "ACTIVE",
  };
  db.resources.unshift(resource);
  return wait(withBusiness(resource));
}

export function updateResource({ id, patch }: UpdateResourceInput) {
  if (shouldFail()) return failLater<ResourceWithBusiness>();
  const resource = db.resources.find((r) => r.id === id) ?? notFound("Resource");
  Object.assign(resource, patch);
  if (patch.quantity !== undefined) resource.available = Math.min(resource.available, patch.quantity);
  return wait(withBusiness(resource));
}

/** Share of unit-hours booked over the next `days` days, counting 06:00-24:00. */
function utilisationOf(r: Resource, days = 14) {
  const p = prepareAvailability(availabilityOf(r));
  const from = startOfDay(new Date()).getTime();
  const to = from + days * 86_400_000;
  let unitHours = 0;
  for (const b of p.blocks) {
    const overlap = Math.min(b.e, to) - Math.max(b.s, from);
    if (overlap > 0) unitHours += (overlap / 3_600_000) * b.q;
  }
  return Math.min(1, unitHours / (r.quantity * days * 18));
}

export function getMyResources(): Promise<MyResource[]> {
  const me = CURRENT_BUSINESS.provider;
  return wait(
    db.resources
      .filter((r) => r.businessId === me)
      .map((r) => ({
        ...withBusiness(r),
        utilisation: utilisationOf(r),
        pendingRequests: db.bookings.filter((b) => ACTIVE_REQUEST.includes(b.status) && b.items.some((i) => i.resourceId === r.id)).length,
      }))
  );
}

const HORIZON_DAYS = 60;

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic "other customers'" bookings so every calendar has some texture. */
function syntheticBlocks(r: Resource, from: Date): AvailabilityBlock[] {
  const rand = seeded(Number(r.id.slice(1)) * 7919);
  const blocks: AvailabilityBlock[] = [];
  for (let d = 0; d < HORIZON_DAYS; d++) {
    if (rand() > 0.38) continue;
    const start = set(addDays(from, d), { hours: [9, 11, 14, 17, 18][Math.floor(rand() * 5)], minutes: 0 });
    const hours = Math.max(r.minRentalHours, 3 + Math.floor(rand() * 6));
    const share = r.quantity === 1 ? 1 : Math.max(1, Math.round(r.quantity * (0.2 + rand() * 0.8)));
    blocks.push({ startAt: formatISO(start), endAt: formatISO(addHours(start, hours)), quantity: share });
  }
  return blocks;
}

function availabilityOf(r: Resource): Availability {
  const from = startOfDay(new Date());
  const to = addDays(from, HORIZON_DAYS);
  const real = db.bookings
    .filter((b) => !["CANCELLED", "REJECTED", "COMPLETED"].includes(b.status))
    .flatMap((b) => b.items.filter((i) => i.resourceId === r.id).map((i) => ({ startAt: b.startAt, endAt: b.endAt, quantity: i.quantity })));
  return {
    resourceId: r.id,
    quantity: r.quantity,
    from: formatISO(from),
    to: formatISO(to),
    blocks: [...syntheticBlocks(r, from), ...real, ...(r.blackouts ?? [])],
  };
}

export function getAvailability(resourceId: string): Promise<Availability> {
  const r = db.resources.find((x) => x.id === resourceId) ?? notFound("Resource");
  return wait(availabilityOf(r));
}

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

const AREA_ANCHOR: Record<Area, string> = {
  Andheri: "b09",
  Bandra: "b02",
  Powai: "b03",
  "Lower Parel": "b04",
  Juhu: "b05",
  Vashi: "b06",
};

export function getMatches(req: Requirement): Promise<MatchResult[]> {
  const origin = businessById.get(req.area ? AREA_ANCHOR[req.area] : CURRENT_BUSINESS.seeker)!;
  const hours = Math.max(1, (parseISO(req.endAt).getTime() - parseISO(req.startAt).getTime()) / 36e5);
  const candidates = db.resources.filter((r) => r.category === req.category && r.available > 0).map(withBusiness);
  const prices = candidates.map((r) => r.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);

  const results = candidates.map((resource) => {
    const km = distanceKm(origin, resource.business);
    const fulfils = Math.min(resource.available, req.quantity);
    const units = resource.unit === "HOUR" ? hours : resource.unit === "DAY" ? Math.ceil(hours / 24) : 1;
    const rental = Math.round(resource.price * fulfils * units);
    const delivery = resource.delivers ? Math.round((resource.deliveryBase ?? 150) + km * (resource.deliveryPerKm ?? 60)) : 0;
    const landed = rental + delivery;
    const score = {
      price: maxP === minP ? 1 : 1 - (resource.price - minP) / (maxP - minP),
      distance: Math.max(0, 1 - km / 30),
      availability: resource.available / resource.quantity,
      capacity: fulfils / req.quantity,
      reliability: (resource.business.fulfillmentRate + resource.business.responseRate) / 2,
    };
    const total = weightedTotal(score, req.urgent);
    return { resource, distanceKm: Math.round(km * 10) / 10, rental, delivery, landed, fulfils, score, total };
  });

  return wait(
    results
      .filter((m) => req.budget === undefined || m.landed <= req.budget * 1.25)
      .sort((a, b) => b.total - a.total)
  );
}

const KEYWORDS: [RegExp, ResourceCategory, string][] = [
  [/chairs?|tables?/i, "CHAIRS_TABLES", "Chairs"],
  [/projectors?|speakers?|\bpa\b|mics?|led|screens?/i, "AV_EQUIPMENT", "AV"],
  [/vans?|reefer|shuttle|coach|tempo/i, "VEHICLES", "Vehicle"],
  [/hall|ballroom|banquet|lawn|terrace/i, "BANQUET_SPACE", "Space"],
  [/kitchen|tandoor|cold storage|plating/i, "KITCHEN", "Kitchen"],
  [/parking|valet/i, "PARKING", "Parking"],
  [/linen|decor|flowers?|backdrop/i, "LINEN_DECOR", "Decor"],
];

const AREAS: Area[] = ["Andheri", "Bandra", "Powai", "Lower Parel", "Juhu", "Vashi"];

/** Very small heuristic parser — the real one lives on the server. */
export function parseRequest(raw: string): Promise<ParsedRequest> {
  const items: ParsedRequest["items"] = [];
  for (const part of raw.split(/[+,&]| and /i)) {
    const hit = KEYWORDS.find(([re]) => re.test(part));
    if (!hit) continue;
    const qty = Number(part.match(/(\d+)/)?.[1] ?? 1);
    items.push({ category: hit[1], quantity: qty, label: `${hit[2]} ×${qty}` });
  }
  const area = AREAS.find((a) => raw.toLowerCase().includes(a.toLowerCase()));
  const budgetMatch = raw.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  const budget = budgetMatch ? Math.round(Number(budgetMatch[1]) * 1000) : undefined;

  const base = /tmrw|tomorrow/i.test(raw) ? addDays(new Date(), 1) : /sat/i.test(raw) ? nextWeekday(6) : undefined;
  const hours = raw.match(/(\d{1,2})\s*[–-]\s*(\d{1,2})\s*pm/i);
  let startAt: string | undefined;
  let endAt: string | undefined;
  if (base && hours) {
    const d = startOfDay(base);
    startAt = formatISO(new Date(d.getTime() + (Number(hours[1]) + 12) * 36e5));
    endAt = formatISO(new Date(d.getTime() + (Number(hours[2]) + 12) * 36e5));
  }

  const found = [items.length > 0, !!area, !!startAt, budget !== undefined].filter(Boolean).length;
  return wait({ raw, items, area, startAt, endAt, budget, confidence: found / 4 });
}

function nextWeekday(day: number) {
  const today = new Date();
  return addDays(today, ((day - today.getDay() + 7) % 7) || 7);
}

/* ------------------------------------------------------------------ */
/* Bookings                                                            */
/* ------------------------------------------------------------------ */

function detail(b: Booking): BookingDetail {
  const seeker = businessById.get(b.seekerId) ?? notFound("Seeker");
  const lines = b.items.map((i) => {
    const resource = db.resources.find((r) => r.id === i.resourceId) ?? notFound("Resource");
    return { ...i, resource, listPrice: resource.price };
  });
  const provider = businessById.get(b.items[0]?.providerId ?? "") ?? notFound("Provider");
  const offers = db.offers.filter((o) => o.bookingId === b.id).sort((x, y) => x.round - y.round);
  return { ...b, seeker, provider, lines, offers, distanceKm: Math.round(distanceKm(seeker, provider) * 10) / 10 };
}

export function getBookings(role: Role): Promise<BookingDetail[]> {
  const me = CURRENT_BUSINESS[role];
  const list = db.bookings.filter((b) => (role === "seeker" ? b.seekerId === me : b.items.some((i) => i.providerId === me)));
  return wait(list.map(detail));
}

export function getBooking(id: string): Promise<BookingDetail> {
  return wait(detail(db.bookings.find((b) => b.id === id) ?? notFound("Booking")));
}

export function createBooking(input: CreateBookingInput) {
  const resource = db.resources.find((r) => r.id === input.resourceId) ?? notFound("Resource");
  const prepared = prepareAvailability(availabilityOf(resource));
  const start = parseISO(input.startAt);
  const end = parseISO(input.endAt);
  const remaining = remainingDuring(prepared, start, end);
  if (input.quantity > remaining) {
    // Mirrors the API's 409 so the UI handles both paths the same way.
    return new Promise<Booking>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new ConflictError(
              remaining === 0
                ? `${resource.title} was just booked for those hours`
                : `Only ${remaining} ${resource.unitLabel} left for those hours`,
              nearestFreeSlots(prepared, start, end, input.quantity),
              remaining
            )
          ),
        DELAY
      )
    );
  }
  const price = input.offerPrice ?? resource.price;
  const booking: Booking = {
    id: nextId("bk"),
    ref: `SPR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    seekerId: CURRENT_BUSINESS.seeker,
    title: input.title ?? resource.title,
    status: "PENDING",
    items: [{ resourceId: resource.id, providerId: resource.businessId, quantity: input.quantity, agreedPrice: price }],
    startAt: input.startAt,
    endAt: input.endAt,
    total: price * input.quantity,
    createdAt: new Date().toISOString(),
    note: input.note,
  };
  db.bookings.unshift(booking);
  db.offers.push(initialOffer(booking));
  return wait(booking);
}

export async function createBundle(input: BundleInput) {
  const created: Booking[] = [];
  for (const item of input.items) {
    created.push(await createBooking({ ...item, startAt: input.startAt, endAt: input.endAt, title: input.title }));
  }
  return created;
}

const NEXT_STATUS: Record<RespondBookingInput["action"], BookingStatus> = {
  accept: "ACCEPTED",
  reject: "REJECTED",
  counter: "COUNTERED",
};

/** Negotiation thread for a booking's primary line (the one that gets countered). */
const threadOf = (bookingId: string) => {
  const primary = db.bookings.find((b) => b.id === bookingId)?.items[0]?.resourceId;
  return db.offers.filter((o) => o.bookingId === bookingId && o.resourceId === primary).sort((a, b) => a.round - b.round);
};

/** Re-price the negotiated (primary) line; other lines keep their agreed price. */
function setPrice(booking: Booking, price: number) {
  const base = (items: Booking["items"]) => items.reduce((s, i) => s + i.agreedPrice * i.quantity, 0);
  // Totals carry a duration multiplier (e.g. hours) — preserve it.
  const multiplier = base(booking.items) ? booking.total / base(booking.items) : 1;
  booking.items = booking.items.map((i, idx) => (idx === 0 ? { ...i, agreedPrice: price } : i));
  booking.total = Math.round(base(booking.items) * multiplier);
}

function addOffer(booking: Booking, from: string, price: number, message?: string): NegotiationOffer {
  const thread = threadOf(booking.id);
  thread.filter((o) => o.status === "OPEN").forEach((o) => (o.status = "COUNTERED"));
  const item = booking.items[0];
  const offer: NegotiationOffer = {
    id: nextId("o"),
    bookingId: booking.id,
    resourceId: item.resourceId,
    fromBusinessId: from,
    toBusinessId: from === booking.seekerId ? item.providerId : booking.seekerId,
    round: (thread.at(-1)?.round ?? 0) + 1,
    price,
    quantity: item.quantity,
    message: message ?? "",
    status: "OPEN",
    createdAt: new Date().toISOString(),
    expiresAt: formatISO(addHours(new Date(), 24)),
  };
  db.offers.push(offer);
  booking.status = "COUNTERED";
  setPrice(booking, price);
  return offer;
}

/**
 * Simulated counterparty so polling has something to show: ~8s after you
 * counter, the other side accepts if you're within 8% of their last price,
 * otherwise meets you halfway.
 */
function scheduleCounterparty(bookingId: string, myOfferId: string) {
  setTimeout(() => {
    const booking = db.bookings.find((b) => b.id === bookingId);
    const thread = threadOf(bookingId);
    const mine = thread.at(-1);
    if (!booking || booking.status !== "COUNTERED" || mine?.id !== myOfferId || mine.status !== "OPEN") return;
    const theirs = [...thread].reverse().find((o) => o.fromBusinessId !== mine.fromBusinessId);
    const anchor = theirs?.price ?? booking.items[0].agreedPrice;
    if (Math.abs(mine.price - anchor) / anchor <= 0.08) {
      mine.status = "ACCEPTED";
      booking.status = "ACCEPTED";
      setPrice(booking, mine.price);
    } else {
      const midpoint = Math.round((mine.price + anchor) / 2 / 10) * 10;
      addOffer(booking, mine.toBusinessId, midpoint, "Let's meet in the middle.");
    }
  }, 8000);
}

export function respondBooking({ id, action, price, message, as = "provider", offerId }: RespondBookingInput): Promise<BookingDetail> {
  if (shouldFail()) return failLater();
  const booking = db.bookings.find((b) => b.id === id) ?? notFound("Booking");
  if (!ACTIVE_REQUEST.includes(booking.status)) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${booking.ref} is already ${booking.status.toLowerCase()}`)), DELAY)
    );
  }
  const me = as === "seeker" ? booking.seekerId : booking.items[0].providerId;
  const thread = threadOf(booking.id);
  const open = offerId ? thread.find((o) => o.id === offerId) : [...thread].reverse().find((o) => o.status === "OPEN");

  if (action === "accept") {
    if (open) {
      open.status = "ACCEPTED";
      setPrice(booking, open.price);
    }
    booking.status = NEXT_STATUS.accept;
  } else if (action === "reject") {
    if (open) open.status = "REJECTED";
    booking.status = NEXT_STATUS.reject;
  } else if (price !== undefined) {
    const mine = addOffer(booking, me, price, message);
    scheduleCounterparty(booking.id, mine.id);
  }
  return wait(detail(booking));
}

export function submitReview({ bookingId, as, rating, text, tags }: ReviewInput): Promise<BookingDetail> {
  if (shouldFail()) return failLater();
  const booking = db.bookings.find((b) => b.id === bookingId) ?? notFound("Booking");
  if (booking.status !== "COMPLETED") {
    return new Promise((_, reject) => setTimeout(() => reject(new Error("Only completed bookings can be reviewed")), DELAY));
  }
  const by = CURRENT_BUSINESS[as];
  booking.reviews = [...(booking.reviews ?? []).filter((r) => r.byBusinessId !== by), { byBusinessId: by, rating, text, tags, createdAt: new Date().toISOString() }];
  return wait(detail(booking));
}

/* ------------------------------------------------------------------ */
/* Analytics + notifications                                           */
/* ------------------------------------------------------------------ */

const RANGE_DAYS: Record<AnalyticsRange, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function getAnalytics(range: AnalyticsRange): Promise<AnalyticsSummary> {
  const days = RANGE_DAYS[range];
  const end = startOfDay(new Date());
  const start = subDays(end, days - 1);
  const live = db.bookings.filter((b) => !["CANCELLED", "REJECTED"].includes(b.status));
  const inRange = live.filter((b) => parseISO(b.createdAt) >= start);
  const me = CURRENT_BUSINESS.provider;

  const earnedOf = (b: Booking) => b.items.filter((i) => i.providerId === me).reduce((s, i) => s + i.agreedPrice * i.quantity, 0);
  const spentOf = (b: Booking) => (b.seekerId === CURRENT_BUSINESS.seeker ? b.total : 0);

  const series = eachDayOfInterval({ start, end }).map((day) => {
    const onDay = live.filter((b) => differenceInCalendarDays(parseISO(b.createdAt), day) === 0);
    return {
      date: format(day, "yyyy-MM-dd"),
      earned: onDay.reduce((s, b) => s + earnedOf(b), 0),
      spent: onDay.reduce((s, b) => s + spentOf(b), 0),
    };
  });

  const byCategory = new Map<ResourceCategory, { bookings: number; revenue: number }>();
  for (const b of live) {
    for (const i of b.items) {
      const r = db.resources.find((x) => x.id === i.resourceId);
      if (!r) continue;
      const row = byCategory.get(r.category) ?? { bookings: 0, revenue: 0 };
      row.bookings += 1;
      row.revenue += i.agreedPrice * i.quantity;
      byCategory.set(r.category, row);
    }
  }

  const mine = db.resources.filter((r) => r.businessId === me);
  const utilisation = mine.length ? mine.reduce((s, r) => s + utilisationOf(r), 0) / mine.length : 0;
  const provider = businessById.get(me);

  return wait({
    range,
    // Idle-to-income: agreed revenue from bookings the provider has accepted.
    earned: inRange.filter((b) => !ACTIVE_REQUEST.includes(b.status)).reduce((s, b) => s + earnedOf(b), 0),
    spent: inRange.reduce((s, b) => s + spentOf(b), 0),
    // Bookings this business took part in (as seeker or provider).
    bookings: inRange.filter((b) => b.seekerId === CURRENT_BUSINESS.seeker || b.items.some((i) => i.providerId === me)).length,
    pendingRequests: db.bookings.filter((b) => ACTIVE_REQUEST.includes(b.status) && b.items.some((i) => i.providerId === me)).length,
    avgResponseMins: provider?.avgResponseMins ?? 0,
    activeRequests: db.bookings.filter(
      (b) => b.seekerId === CURRENT_BUSINESS.seeker && ["PENDING", "COUNTERED", "ACCEPTED", "CONFIRMED", "IN_USE"].includes(b.status)
    ).length,
    doubleBookings: 0,
    utilisation,
    byCategory: [...byCategory].map(([category, v]) => ({ category, ...v })),
    series,
  });
}

/* ------------------------------------------------------------------ */
/* Analytics report (date range)                                       */
/* ------------------------------------------------------------------ */

const CATEGORY_TICKET: Record<ResourceCategory, number> = {
  BANQUET_SPACE: 42000,
  CHAIRS_TABLES: 9000,
  VEHICLES: 11000,
  KITCHEN: 16000,
  AV_EQUIPMENT: 14000,
  PARKING: 3500,
  LINEN_DECOR: 8000,
};
const CATEGORY_WEIGHT: [ResourceCategory, number][] = [
  ["CHAIRS_TABLES", 0.26],
  ["VEHICLES", 0.18],
  ["AV_EQUIPMENT", 0.15],
  ["KITCHEN", 0.13],
  ["BANQUET_SPACE", 0.12],
  ["LINEN_DECOR", 0.1],
  ["PARKING", 0.06],
];
const ANALYTICS_AREAS: Area[] = ["Andheri", "Bandra", "Powai", "Lower Parel", "Juhu", "Vashi"];
const AREA_WEIGHT = [0.24, 0.2, 0.14, 0.18, 0.14, 0.1];

interface MarketEvent {
  day: Date;
  category: ResourceCategory;
  area: Area;
  revenue: number;
  accepted: boolean;
  mine: boolean; // fulfilled by the demo provider
  spend: boolean; // requested by the demo seeker
  hours: number;
}

function pick<T>(rand: () => number, items: T[], weights: number[]): T {
  let x = rand();
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Deterministic synthetic marketplace activity for a day (stable across reloads). */
function eventsOn(day: Date): MarketEvent[] {
  const key = Number(format(day, "yyyyMMdd"));
  const rand = seeded(key);
  const weekend = getISODay(day) >= 5; // Fri–Sun are event-heavy
  const count = 3 + Math.floor(rand() * 5) + (weekend ? 4 : 0);
  return Array.from({ length: count }, () => {
    const category = pick(rand, CATEGORY_WEIGHT.map((c) => c[0]), CATEGORY_WEIGHT.map((c) => c[1]));
    return {
      day,
      category,
      area: pick(rand, ANALYTICS_AREAS, AREA_WEIGHT),
      revenue: Math.round((CATEGORY_TICKET[category] * (0.5 + rand())) / 10) * 10,
      accepted: rand() < (weekend ? 0.72 : 0.84),
      mine: rand() < 0.22,
      spend: rand() < 0.12,
      hours: 3 + Math.floor(rand() * 8),
    };
  });
}

function totalsOf(events: MarketEvent[], days: number): ReportTotals {
  const accepted = events.filter((e) => e.accepted);
  const hours = accepted.reduce((s, e) => s + e.hours, 0);
  return {
    earned: accepted.filter((e) => e.mine).reduce((s, e) => s + e.revenue, 0),
    spent: accepted.filter((e) => e.spend).reduce((s, e) => s + e.revenue, 0),
    bookings: accepted.length,
    requests: events.length,
    acceptanceRate: events.length ? accepted.length / events.length : 0,
    // Booked hours against a notional capacity of 10 listings × 18 bookable hours a day.
    utilisation: Math.min(1, hours / (days * 10 * 18)),
  };
}

export function getAnalyticsReport({ from, to }: DateRange): Promise<AnalyticsReport> {
  const start = startOfDay(parseISO(from));
  const end = startOfDay(parseISO(to));
  const days = eachDayOfInterval({ start, end });
  const length = days.length;
  const events = days.flatMap(eventsOn);
  const prevDays = eachDayOfInterval({ start: subDays(start, length), end: subDays(start, 1) });
  const previous = totalsOf(prevDays.flatMap(eventsOn), length);

  const bucket: AnalyticsReport["bucket"] = length > 45 ? "week" : "day";
  const bucketKey = (d: Date) => format(bucket === "week" ? startOfWeek(d, { weekStartsOn: 1 }) : d, "yyyy-MM-dd");
  const series = new Map<string, { earned: number; spent: number; bookings: number; accepted: number; total: number }>();
  for (const d of days) series.set(bucketKey(d), { earned: 0, spent: 0, bookings: 0, accepted: 0, total: 0 });
  for (const e of events) {
    const row = series.get(bucketKey(e.day))!;
    row.total += 1;
    if (!e.accepted) continue;
    row.accepted += 1;
    row.bookings += 1;
    if (e.mine) row.earned += e.revenue;
    if (e.spend) row.spent += e.revenue;
  }

  const byCat = new Map<ResourceCategory, { revenue: number; bookings: number; hours: number; total: number }>();
  for (const [c] of CATEGORY_WEIGHT) byCat.set(c, { revenue: 0, bookings: 0, hours: 0, total: 0 });
  for (const e of events) {
    const row = byCat.get(e.category)!;
    row.total += 1;
    if (!e.accepted) continue;
    row.bookings += 1;
    row.revenue += e.revenue;
    row.hours += e.hours;
  }
  const maxHours = Math.max(1, ...[...byCat.values()].map((v) => v.hours));

  const heat = new Map<string, number>();
  for (const e of events) {
    const k = `${e.area}|${getISODay(e.day) - 1}`;
    heat.set(k, (heat.get(k) ?? 0) + 1);
  }

  return wait({
    from,
    to,
    bucket,
    totals: totalsOf(events, length),
    previous,
    series: [...series].map(([date, v]) => ({ date, earned: v.earned, spent: v.spent, bookings: v.bookings })),
    utilisationByCategory: [...byCat].map(([category, v]) => ({ category, utilisation: Math.min(0.95, (v.hours / maxHours) * 0.78) })),
    heatmap: ANALYTICS_AREAS.flatMap((area) => Array.from({ length: 7 }, (_, weekday) => ({ area, weekday, requests: heat.get(`${area}|${weekday}`) ?? 0 }))),
    topCategories: [...byCat].map(([category, v]) => ({ category, revenue: v.revenue, bookings: v.bookings })).sort((a, b) => b.revenue - a.revenue),
    acceptance: [...series].map(([date, v]) => ({ date, accepted: v.accepted, total: v.total, rate: v.total ? v.accepted / v.total : 0 })),
  });
}

export function getSavedSearches() {
  return wait(db.savedSearches);
}

export function getNotifications() {
  return wait(db.notifications);
}

const subscribers = new Set<string>();

export function subscribeNewsletter(email: string) {
  subscribers.add(email.trim().toLowerCase());
  return wait({ subscribed: true });
}
