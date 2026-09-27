/* ------------------------------------------------------------------ */
/* Enums — UPPER_CASE to match Prisma                                  */
/* ------------------------------------------------------------------ */

export const BOOKING_STATUSES = [
  "PENDING",
  "COUNTERED",
  "ACCEPTED",
  "CONFIRMED",
  "IN_USE",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const RESOURCE_CATEGORIES = [
  "BANQUET_SPACE",
  "CHAIRS_TABLES",
  "VEHICLES",
  "KITCHEN",
  "AV_EQUIPMENT",
  "PARKING",
  "LINEN_DECOR",
] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const PRICE_UNITS = ["HOUR", "DAY", "UNIT"] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

export const OFFER_STATUSES = ["OPEN", "COUNTERED", "ACCEPTED", "REJECTED", "EXPIRED"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const LISTING_STATUSES = ["ACTIVE", "PAUSED"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_PHOTO_POSITIONS = ["FRONT", "SIDE", "IN_PLACE"] as const;
export type ListingPhotoPosition = (typeof LISTING_PHOTO_POSITIONS)[number];

export const LISTING_PHOTO_LABEL: Record<ListingPhotoPosition, { title: string; hint: string }> = {
  FRONT: { title: "Front", hint: "The whole item, straight on." },
  SIDE: { title: "Side", hint: "The same item from the side, so its depth shows." },
  IN_PLACE: { title: "Where it sits", hint: "The item in your space — a rack, hall, kitchen or van." },
};

export interface ListingPhoto {
  position: ListingPhotoPosition;
  url: string;
}

export const CANCELLATION_POLICIES = ["FLEXIBLE", "MODERATE", "STRICT"] as const;
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];

export const CANCELLATION_LABEL: Record<CancellationPolicy, string> = {
  FLEXIBLE: "Flexible — free until 24h before",
  MODERATE: "Moderate — free until 72h before",
  STRICT: "Strict — 50% refund until 7 days before",
};

export const CATEGORY_LABEL: Record<ResourceCategory, string> = {
  BANQUET_SPACE: "Banquet Space",
  CHAIRS_TABLES: "Chairs & Tables",
  VEHICLES: "Vehicles",
  KITCHEN: "Kitchen Capacity",
  AV_EQUIPMENT: "AV Equipment",
  PARKING: "Parking",
  LINEN_DECOR: "Linen & Decor",
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Pending",
  COUNTERED: "Countered",
  ACCEPTED: "Accepted",
  CONFIRMED: "Confirmed",
  IN_USE: "In use",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/* ------------------------------------------------------------------ */
/* Domain                                                              */
/* ------------------------------------------------------------------ */

export type Area = "Andheri" | "Bandra" | "Powai" | "Lower Parel" | "Juhu" | "Vashi";

export type BusinessType = "Hotel" | "Restaurant" | "Caterer" | "Banquet Hall";

export type Role = "provider" | "seeker";

/** What a business does on Spare, chosen at onboarding. BOTH gets the seeker/provider switch. */
export type BusinessRole = "SEEKER" | "PROVIDER" | "BOTH";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Business extends GeoPoint {
  id: string;
  name: string;
  type: BusinessType;
  area: Area;
  address: string;
  rating: number; // 0–5
  reviewCount: number;
  responseRate: number; // 0–1
  avgResponseMins: number;
  fulfillmentRate: number; // 0–1
  verified: boolean;
  joinedAt: string; // ISO date
}

export interface Resource {
  id: string;
  businessId: string;
  title: string;
  category: ResourceCategory;
  description: string;
  price: number; // INR
  unit: PriceUnit;
  quantity: number; // total units owned
  available: number; // units free for the queried window
  unitLabel: string; // e.g. "chairs", "sq ft", "van"
  minRentalHours: number;
  capacity?: number; // guests / covers / seats where relevant
  tags: string[];
  /** Provider can deliver to the venue (otherwise pickup / on-site only). */
  delivers: boolean;
  /** Delivery pricing when `delivers`: flat fee + per-km rate (INR). */
  deliveryBase?: number;
  deliveryPerKm?: number;
  /** Paused listings are hidden from search but keep their bookings. */
  status: ListingStatus;
  conditions?: string[];
  cancellation?: CancellationPolicy;
  /** Refundable security deposit (INR). */
  deposit?: number;
  /** Live shots from three positions. A downloaded catalogue image is not accepted. */
  photos?: ListingPhoto[];
  /** Provider's own unavailable windows (maintenance, in-house events). */
  blackouts?: AvailabilityBlock[];
}

/** Resources as returned by the API: always with their owning business. */
export interface ResourceWithBusiness extends Resource {
  business: Business;
}

export interface BookingItem {
  resourceId: string;
  providerId: string;
  quantity: number;
  agreedPrice: number; // INR, per unit
}

export interface Booking {
  id: string;
  ref: string; // human-readable, e.g. SPR-24A1
  seekerId: string;
  title: string;
  status: BookingStatus;
  items: BookingItem[];
  startAt: string; // ISO
  endAt: string; // ISO
  total: number; // INR
  createdAt: string;
  /** Seeker flagged this as needed within hours. */
  urgent?: boolean;
  note?: string;
  reviews?: Review[];
}

export interface Review {
  byBusinessId: string;
  rating: number; // 1–5
  text: string;
  tags: string[];
  createdAt: string;
}

export interface ReviewInput {
  bookingId: string;
  as: Role;
  rating: number;
  text: string;
  tags: string[];
}

export interface BookingLine extends BookingItem {
  resource: Resource;
  /** Provider's list price per unit (compare with agreedPrice). */
  listPrice: number;
}

/** Bookings as returned by the API: with seeker, resources and distance resolved. */
export interface BookingDetail extends Booking {
  seeker: Business;
  provider: Business;
  lines: BookingLine[];
  /** Negotiation thread, oldest first (round 1 = the original request). */
  offers: NegotiationOffer[];
  /** Seeker → provider distance (km). */
  distanceKm: number;
}

export interface NegotiationOffer {
  id: string;
  bookingId: string;
  resourceId: string;
  fromBusinessId: string;
  toBusinessId: string;
  round: number;
  price: number; // INR, per unit
  quantity: number;
  message: string;
  status: OfferStatus;
  createdAt: string;
  expiresAt: string;
}

export type StatusTone = "available" | "conflict" | "pending" | "primary" | "muted";

export interface MatchScore {
  price: number; // each 0–1
  distance: number;
  availability: number;
  capacity: number;
  reliability: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

/* ------------------------------------------------------------------ */
/* API contracts                                                       */
/* ------------------------------------------------------------------ */

export interface ResourceFilters {
  q?: string;
  category?: ResourceCategory;
  area?: Area;
  maxPrice?: number;
  availableOnly?: boolean;
  sort?: "relevance" | "price_asc" | "price_desc" | "rating";
}

export interface Requirement {
  category: ResourceCategory;
  quantity: number;
  area?: Area;
  startAt: string; // ISO
  endAt: string; // ISO
  budget?: number; // INR, total
  /** Weight distance, availability and reliability higher. */
  urgent?: boolean;
}

export interface MatchResult {
  resource: ResourceWithBusiness;
  distanceKm: number;
  /** Rental for the units this provider covers, over the requested window. */
  rental: number;
  /** Delivery to the venue (0 when pickup / on-site). */
  delivery: number;
  /** rental + delivery. */
  landed: number;
  /** How many units this provider can cover. */
  fulfils: number;
  score: MatchScore;
  total: number; // 0–100
  /** How far `landed` exceeds the requirement's budget (0 when within it or no budget). Ranked last. */
  overBudgetBy?: number;
}

export interface ParsedRequest {
  raw: string;
  items: { category: ResourceCategory; quantity: number; label: string }[];
  area?: Area;
  startAt?: string;
  endAt?: string;
  budget?: number;
  confidence: number; // 0–1
}

export interface CreateBookingInput {
  resourceId: string;
  quantity: number;
  startAt: string;
  endAt: string;
  title?: string;
  /** Counter-offer per unit (INR); omitted = list price. */
  offerPrice?: number;
  delivery?: boolean;
  deliverTo?: Area;
  note?: string;
}

export type BookingAction = "accept" | "reject" | "counter";

export interface RespondBookingInput {
  id: string;
  action: BookingAction;
  /** Which side is responding (defaults to provider). */
  as?: Role;
  /** Accept a specific offer from the thread (defaults to the latest open one). */
  offerId?: string;
  /** Required for "counter": proposed price per unit (INR). */
  price?: number;
  message?: string;
}

export type CreateResourceInput = Omit<Resource, "id" | "businessId" | "available" | "status" | "photos"> & {
  available?: number;
  status?: ListingStatus;
  /** JPEG data URLs captured in the listing camera, one per position. */
  photos?: { position: ListingPhotoPosition; dataUrl: string }[];
};

export interface UpdateResourceInput {
  id: string;
  patch: Partial<CreateResourceInput> & { status?: ListingStatus };
}

/** A provider's own listing with live stats. */
export interface MyResource extends ResourceWithBusiness {
  /** Share of unit-hours booked over the next 14 days (06:00–24:00). */
  utilisation: number;
  pendingRequests: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  /** Discover query string, e.g. "category=CHAIRS_TABLES&qty=150". */
  query: string;
  createdAt: string;
  newMatches: number;
}

export interface BundleInput {
  title: string;
  startAt: string;
  endAt: string;
  items: { resourceId: string; quantity: number }[];
}

/** A span of time during which `quantity` units are already booked. */
export interface AvailabilityBlock {
  startAt: string; // ISO
  endAt: string; // ISO
  quantity: number;
}

export interface Availability {
  resourceId: string;
  quantity: number;
  from: string; // ISO — window covered by `blocks`
  to: string;
  blocks: AvailabilityBlock[];
}

/** A free window suggested when a request conflicts. */
export interface SlotSuggestion {
  startAt: string;
  endAt: string;
  remaining: number;
}

export type AnalyticsRange = "7d" | "30d" | "90d";

/** Inclusive calendar range, yyyy-MM-dd. */
export interface DateRange {
  from: string;
  to: string;
}

export interface ReportTotals {
  earned: number;
  spent: number;
  bookings: number;
  requests: number;
  acceptanceRate: number; // 0–1
  utilisation: number; // 0–1
}

export interface AnalyticsReport extends DateRange {
  bucket: "day" | "week";
  totals: ReportTotals;
  /** Same-length period immediately before `from`. */
  previous: ReportTotals;
  series: { date: string; earned: number; spent: number; bookings: number }[];
  utilisationByCategory: { category: ResourceCategory; utilisation: number }[];
  /** weekday: 0 = Monday … 6 = Sunday */
  heatmap: { area: Area; weekday: number; requests: number }[];
  topCategories: { category: ResourceCategory; revenue: number; bookings: number }[];
  acceptance: { date: string; accepted: number; total: number; rate: number }[];
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  earned: number;
  spent: number;
  bookings: number;
  doubleBookings: number;
  utilisation: number; // 0–1
  /** Provider requests awaiting a response (PENDING / COUNTERED). */
  pendingRequests: number;
  /** Provider's average first-response time (minutes). */
  avgResponseMins: number;
  /** Seeker's requests still in flight. */
  activeRequests: number;
  byCategory: { category: ResourceCategory; bookings: number; revenue: number }[];
  series: { date: string; earned: number; spent: number }[];
}

export interface HandoverLine {
  resourceId: string;
  title: string;
  quantity: number;
  agreedPrice: number;
  unitLabel: string;
}

export interface HandoverSignature {
  role: "PROVIDER" | "SEEKER";
  purpose: "DISPATCH" | "RECEIPT";
  imageUrl: string;
  signedAt: string;
}

export type HandoverPhase = "DISPATCH" | "RECEIPT" | "RETURN" | "CLOSED";

export interface HandoverDispute {
  id: string;
  openedById: string;
  phase: "RECEIPT" | "RETURN";
  nature: string;
  fault: "PROVIDER" | "SEEKER";
  reason: string;
  note: string;
  receivedQuantity: number | null;
  damagedQuantity: number | null;
  severity: "MINOR" | "MODERATE" | "SEVERE" | null;
  status: "OPEN" | "AGREED";
  seekerAgreed: boolean;
  providerAgreed: boolean;
  rentDue: number;
  damageDue: number;
  refund: number;
  createdAt: string;
}

/** One printed contract between the seeker and a single provider on a request. */
export interface HandoverContract {
  id: string;
  bookingId: string;
  ref: string;
  title: string;
  provider: { id: string; name: string };
  seeker: { id: string; name: string };
  lines: HandoverLine[];
  terms: string[];
  cancellation: string | null;
  rentTotal: number;
  deposit: number;
  arrivedAt: string | null;
  returnedAt: string | null;
  seekerApprovedAt: string | null;
  providerApprovedAt: string | null;
  phase: HandoverPhase;
  booked: number;
  disputeWindowEndsAt: string | null;
  windowOpen: boolean;
  signatures: HandoverSignature[];
  scans: { businessId: string; role: "PROVIDER" | "SEEKER"; phase: string; scannedAt: string }[];
  disputes: HandoverDispute[];
  settlement: { rentDue: number; damageDue: number; refund: number; deposit: number; locked: boolean };
  qrDataUrl: string;
  viewerRole: "PROVIDER" | "SEEKER" | null;
  viewerHasScanned: boolean;
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

export interface MyBusiness extends Business {
  role: BusinessRole;
}

/** GET /api/me: the signed-in Clerk user and their business (null until onboarding). */
export interface Me {
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  };
  business: MyBusiness | null;
}

export interface OnboardingInput {
  name: string;
  type: BusinessType;
  area: Area;
  address?: string;
  role: BusinessRole;
}
