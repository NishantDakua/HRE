import type { MatchScore, ResourceWithBusiness } from "@/lib/types";
import type { FilterValues } from "./params";

/** A result row: a ranked match, or a plain listing while browsing without a requirement. */
export interface Row {
  resource: ResourceWithBusiness;
  distanceKm: number;
  score?: MatchScore;
  total?: number;
  rental?: number;
  delivery?: number;
  landed?: number;
  fulfils?: number;
}

export function applyFilters(rows: Row[], f: FilterValues): Row[] {
  return rows.filter(({ resource: r, distanceKm }) => {
    if (distanceKm > f.maxKm) return false;
    if (f.minPrice !== undefined && r.price < f.minPrice) return false;
    if (f.maxPrice !== undefined && r.price > f.maxPrice) return false;
    if (r.business.rating < f.minRating) return false;
    if (f.delivery && !r.delivers) return false;
    if (f.verified && !r.business.verified) return false;
    return true;
  });
}

export interface BundlePart {
  row: Row;
  quantity: number;
  cost: number;
}

export interface BundlePlan {
  parts: BundlePart[];
  covered: number;
  needed: number;
  total: number;
}

/**
 * When no single provider covers the quantity, greedily combine the best-ranked
 * ones (up to three). Cost is pro-rated rental for the share taken plus delivery.
 */
export function planBundle(rows: Row[], needed: number, maxProviders = 3): BundlePlan | null {
  const ranked = rows.filter((r) => (r.fulfils ?? 0) > 0 && r.rental !== undefined);
  if (ranked.length === 0 || ranked.some((r) => (r.fulfils ?? 0) >= needed)) return null;

  const parts: BundlePart[] = [];
  let remaining = needed;
  for (const row of ranked) {
    if (remaining <= 0 || parts.length === maxProviders) break;
    const fulfils = row.fulfils ?? 0;
    const quantity = Math.min(fulfils, remaining);
    const perUnit = (row.rental ?? 0) / fulfils;
    parts.push({ row, quantity, cost: Math.round(perUnit * quantity + (row.delivery ?? 0)) });
    remaining -= quantity;
  }
  if (parts.length < 2) return null;
  const covered = needed - Math.max(0, remaining);
  return { parts, covered, needed, total: parts.reduce((s, p) => s + p.cost, 0) };
}
