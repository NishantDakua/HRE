import type { BookingDetail, BookingStatus, NegotiationOffer, RespondBookingInput } from "./types";

/** Requests a provider can still act on. */
export const ACTIONABLE: BookingStatus[] = ["PENDING", "COUNTERED"];

/** Seeker requests that are still in flight. */
export const IN_FLIGHT: BookingStatus[] = ["PENDING", "COUNTERED", "ACCEPTED", "CONFIRMED", "IN_USE"];

const NEXT: Record<RespondBookingInput["action"], BookingStatus> = {
  accept: "ACCEPTED",
  reject: "REJECTED",
  counter: "COUNTERED",
};

/** What a booking looks like after a response — used for optimistic updates. */
export function applyResponse(b: BookingDetail, input: RespondBookingInput): BookingDetail {
  if (b.id !== input.id) return b;
  const openIdx = input.offerId
    ? b.offers.findIndex((o) => o.id === input.offerId)
    : b.offers.map((o) => (o.resourceId === b.items[0]?.resourceId ? o.status : null)).lastIndexOf("OPEN");

  if (input.action !== "counter" || input.price === undefined) {
    const nextOfferStatus = input.action === "accept" ? "ACCEPTED" : "REJECTED";
    const offers = b.offers.map((o, i) => (i === openIdx ? { ...o, status: nextOfferStatus as NegotiationOffer["status"] } : o));
    const price = input.action === "accept" && openIdx >= 0 ? b.offers[openIdx].price : undefined;
    return withPrice({ ...b, status: NEXT[input.action], offers }, price);
  }

  const me = input.as === "seeker" ? b.seekerId : b.provider.id;
  const last = b.offers.at(-1);
  const optimistic: NegotiationOffer = {
    id: `optimistic-${Date.now()}`,
    bookingId: b.id,
    resourceId: b.items[0].resourceId,
    fromBusinessId: me,
    toBusinessId: me === b.seekerId ? b.provider.id : b.seekerId,
    round: (last?.round ?? 0) + 1,
    price: input.price,
    quantity: b.items[0].quantity,
    message: input.message ?? "",
    status: "OPEN",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  };
  const offers = [...b.offers.map((o) => (o.status === "OPEN" ? { ...o, status: "COUNTERED" as const } : o)), optimistic];
  return withPrice({ ...b, status: "COUNTERED", offers }, input.price);
}

function withPrice(b: BookingDetail, price?: number): BookingDetail {
  if (price === undefined) return b;
  const base = (xs: { agreedPrice: number; quantity: number }[]) => xs.reduce((s, x) => s + x.agreedPrice * x.quantity, 0);
  // Keep the duration multiplier baked into total; only the primary (negotiated) line changes.
  const multiplier = base(b.items) ? b.total / base(b.items) : 1;
  const items = b.items.map((i, idx) => (idx === 0 ? { ...i, agreedPrice: price } : i));
  const lines = b.lines.map((l, idx) => (idx === 0 ? { ...l, agreedPrice: price } : l));
  return { ...b, items, lines, total: Math.round(base(items) * multiplier) };
}
