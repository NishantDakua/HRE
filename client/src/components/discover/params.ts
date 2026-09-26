import { addDays, addHours, format, formatISO, isBefore, set, startOfDay } from "date-fns";
import { z } from "zod";
import { AREAS } from "@/lib/geo";
import { RESOURCE_CATEGORIES, type Area, type Requirement, type ResourceCategory } from "@/lib/types";

/*
 * Discover state lives in the URL so searches are shareable and survive reloads.
 * Requirement: category, qty, area, from, to, budget, urgent
 * Filters:     maxKm, minPrice, maxPrice, minRating, delivery, verified
 */

import { LOCAL_FMT, isLocal, parseLocal } from "@/lib/datetime";
export { LOCAL_FMT, isLocal, isoToLocal, parseLocal } from "@/lib/datetime";

export function defaultWindow() {
  const start = set(addDays(startOfDay(new Date()), 1), { hours: 18 });
  return { from: format(start, LOCAL_FMT), to: format(addHours(start, 5), LOCAL_FMT) };
}

const num = (v: string | null) => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const isCategory = (v: string | null): v is ResourceCategory =>
  v !== null && (RESOURCE_CATEGORIES as readonly string[]).includes(v);
const isArea = (v: string | null): v is Area => v !== null && (AREAS as string[]).includes(v);

/* ------------------------------------------------------------------ */
/* Requirement                                                         */
/* ------------------------------------------------------------------ */

export const requirementSchema = z
  .object({
    // Optional in the type (the page can browse without one) but required to submit.
    category: z
      .enum(RESOURCE_CATEGORIES)
      .optional()
      .refine((v): boolean => v !== undefined, "Pick what you need"),
    quantity: z
      .number({ invalid_type_error: "Enter a quantity" })
      .int("Whole units only")
      .min(1, "At least 1")
      .max(5000, "That's a lot — split it up"),
    area: z.enum(AREAS as [Area, ...Area[]]).optional(),
    from: z.string().refine(isLocal, "Pick a start"),
    to: z.string().refine(isLocal, "Pick an end"),
    budget: z.number({ invalid_type_error: "Enter a number" }).positive("Budget must be positive").max(10_000_000).optional(),
    urgent: z.boolean(),
  })
  .refine((v) => !isLocal(v.from) || !isLocal(v.to) || isBefore(parseLocal(v.from), parseLocal(v.to)), {
    path: ["to"],
    message: "End must be after start",
  });

/** Requirement form values; category may be empty while browsing. */
export type RequirementDraft = z.infer<typeof requirementSchema>;

export function readRequirement(p: URLSearchParams): RequirementDraft {
  const window = defaultWindow();
  const from = p.get("from");
  const to = p.get("to");
  const category = p.get("category");
  const area = p.get("area");
  return {
    category: isCategory(category) ? category : undefined,
    quantity: Math.max(1, Math.round(num(p.get("qty")) ?? 1)),
    area: isArea(area) ? area : undefined,
    from: from && isLocal(from) ? from : window.from,
    to: to && isLocal(to) ? to : window.to,
    budget: num(p.get("budget")),
    urgent: p.get("urgent") === "1",
  };
}

export function writeRequirement(p: URLSearchParams, v: RequirementDraft): URLSearchParams {
  const next = new URLSearchParams(p);
  const put = (k: string, val: string | undefined) => (val === undefined || val === "" ? next.delete(k) : next.set(k, val));
  put("category", v.category);
  put("qty", String(v.quantity));
  put("area", v.area);
  put("from", v.from);
  put("to", v.to);
  put("budget", v.budget === undefined ? undefined : String(v.budget));
  put("urgent", v.urgent ? "1" : undefined);
  return next;
}

export function toRequirement(v: RequirementDraft): Requirement | null {
  if (!v.category || !isLocal(v.from) || !isLocal(v.to)) return null;
  return {
    category: v.category,
    quantity: v.quantity,
    area: v.area,
    startAt: formatISO(parseLocal(v.from)),
    endAt: formatISO(parseLocal(v.to)),
    budget: v.budget,
    urgent: v.urgent,
  };
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export const MAX_KM = 30;
export const RATING_STEPS = [0, 4, 4.3, 4.5] as const;

export const filterSchema = z
  .object({
    maxKm: z.number().min(1).max(MAX_KM),
    minPrice: z.number({ invalid_type_error: "Enter a number" }).min(0, "Can't be negative").optional(),
    maxPrice: z.number({ invalid_type_error: "Enter a number" }).min(0, "Can't be negative").optional(),
    minRating: z.number().min(0).max(5),
    delivery: z.boolean(),
    verified: z.boolean(),
  })
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    path: ["maxPrice"],
    message: "Max must be ≥ min",
  });

export type FilterValues = z.infer<typeof filterSchema>;

export const DEFAULT_FILTERS: FilterValues = { maxKm: MAX_KM, minRating: 0, delivery: false, verified: false };

export function readFilters(p: URLSearchParams): FilterValues {
  const km = num(p.get("maxKm"));
  const rating = num(p.get("minRating"));
  return {
    maxKm: km === undefined ? MAX_KM : Math.min(MAX_KM, Math.max(1, km)),
    minPrice: num(p.get("minPrice")),
    maxPrice: num(p.get("maxPrice")),
    minRating: rating === undefined ? 0 : Math.min(5, Math.max(0, rating)),
    delivery: p.get("delivery") === "1",
    verified: p.get("verified") === "1",
  };
}

export function writeFilters(p: URLSearchParams, v: FilterValues): URLSearchParams {
  const next = new URLSearchParams(p);
  const put = (k: string, val: string | undefined) => (val === undefined ? next.delete(k) : next.set(k, val));
  put("maxKm", v.maxKm >= MAX_KM ? undefined : String(v.maxKm));
  put("minPrice", v.minPrice === undefined ? undefined : String(v.minPrice));
  put("maxPrice", v.maxPrice === undefined ? undefined : String(v.maxPrice));
  put("minRating", v.minRating > 0 ? String(v.minRating) : undefined);
  put("delivery", v.delivery ? "1" : undefined);
  put("verified", v.verified ? "1" : undefined);
  return next;
}

export function countActiveFilters(v: FilterValues) {
  return [v.maxKm < MAX_KM, v.minPrice !== undefined, v.maxPrice !== undefined, v.minRating > 0, v.delivery, v.verified].filter(Boolean).length;
}

/** Empty inputs → undefined, everything else → number (NaN fails validation). */
export const optionalNumber = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(v));
