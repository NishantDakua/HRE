export const CATEGORIES = [
  "BANQUET_SPACE",
  "CHAIRS_TABLES",
  "VEHICLES",
  "KITCHEN",
  "AV_EQUIPMENT",
  "PARKING",
  "LINEN_DECOR",
] as const;

export type ResourceCategory = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<ResourceCategory, string> = {
  BANQUET_SPACE: "Banquet Space",
  CHAIRS_TABLES: "Chairs & Tables",
  VEHICLES: "Vehicles",
  KITCHEN: "Kitchen Capacity",
  AV_EQUIPMENT: "AV Equipment",
  PARKING: "Parking",
  LINEN_DECOR: "Linen & Decor",
};

export const AREAS = ["Andheri", "Bandra", "Powai", "Lower Parel", "Juhu", "Vashi"] as const;
export type Area = (typeof AREAS)[number];

export type Role = "seeker" | "provider";
export type PriceUnit = "HOUR" | "DAY" | "UNIT";
export type BookingStatus =
  | "PENDING"
  | "COUNTERED"
  | "ACCEPTED"
  | "CONFIRMED"
  | "IN_USE"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export interface ListingPhoto {
  position: "FRONT" | "SIDE" | "IN_PLACE";
  url: string;
}

export interface Business {
  id: string;
  name: string;
  type: string;
  area: string;
  address: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
}

export interface Resource {
  id: string;
  businessId: string;
  title: string;
  category: ResourceCategory;
  description: string;
  price: number;
  unit: PriceUnit;
  quantity: number;
  available: number;
  unitLabel: string;
  delivers: boolean;
  deposit?: number;
  photos?: ListingPhoto[];
  status: "ACTIVE" | "PAUSED";
  tags: string[];
}

export interface ResourceWithBusiness extends Resource {
  business: Business;
}

export interface MyResource extends ResourceWithBusiness {
  utilisation: number;
  pendingRequests: number;
}

export interface BookingLine {
  resourceId: string;
  providerId: string;
  quantity: number;
  agreedPrice: number;
  resource: Resource;
  listPrice: number;
}

export interface NegotiationOffer {
  id: string;
  round: number;
  price: number;
  quantity: number;
  message: string;
  status: string;
  createdAt: string;
}

export interface BookingDetail {
  id: string;
  ref: string;
  title: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  total: number;
  note?: string;
  seeker: Business;
  provider: Business;
  lines: BookingLine[];
  offers: NegotiationOffer[];
  distanceKm: number;
}

export interface AnalyticsSummary {
  range: "7d" | "30d" | "90d";
  earned: number;
  spent: number;
  bookings: number;
  utilisation: number;
  pendingRequests: number;
  avgResponseMins: number;
  activeRequests: number;
  byCategory: { category: ResourceCategory; bookings: number; revenue: number }[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface ParsedRequest {
  items: { category: ResourceCategory; quantity: number; label: string }[];
  area?: Area;
  budget?: number;
}

export type HandoverPhase = "DISPATCH" | "RECEIPT" | "RETURN" | "CLOSED";

export interface HandoverContract {
  id: string;
  bookingId: string;
  ref: string;
  title: string;
  provider: { id: string; name: string };
  seeker: { id: string; name: string };
  lines: { title: string; quantity: number; agreedPrice: number; unitLabel: string }[];
  rentTotal: number;
  deposit: number;
  phase: HandoverPhase;
  arrivedAt: string | null;
  returnedAt: string | null;
  seekerApprovedAt: string | null;
  providerApprovedAt: string | null;
  windowOpen: boolean;
  signatures: { role: "PROVIDER" | "SEEKER"; purpose: "DISPATCH" | "RECEIPT"; signedAt: string }[];
  disputes: {
    id: string;
    nature: string;
    note: string;
    status: "OPEN" | "AGREED";
    seekerAgreed: boolean;
    providerAgreed: boolean;
    refund: number;
  }[];
  settlement: { rentDue: number; damageDue: number; refund: number; deposit: number };
  viewerRole: "PROVIDER" | "SEEKER" | null;
}

export interface UnitSummary {
  dispatched: { code: string; label: string; status: string }[];
  received: { code: string; label: string }[];
  returned: { code: string; label: string }[];
  missingOnArrival: { code: string; label: string }[];
  missingOnReturn: { code: string; label: string }[];
}

export interface ListingUnits {
  id: string;
  title: string;
  quantity: number;
  available: number;
  unitLabel: string;
  units: { id: string; code: string; label: string; status: string }[];
}

export const RECEIPT_NATURES = [
  ["SHORT_DELIVERY", "Short delivery"],
  ["DAMAGED_ON_ARRIVAL", "Damaged on arrival"],
  ["WRONG_ITEMS", "Wrong items"],
  ["OTHER", "Other"],
] as const;

export const RETURN_NATURES = [
  ["DAMAGED_ON_RETURN", "Damaged on return"],
  ["MISSING_ON_RETURN", "Missing on return"],
  ["OTHER", "Other"],
] as const;
