import { formatISO, isBefore } from "date-fns";
import { z } from "zod";
import { isLocal, isoToLocal, parseLocal } from "@/lib/datetime";
import {
  CANCELLATION_POLICIES,
  PRICE_UNITS,
  RESOURCE_CATEGORIES,
  type CreateResourceInput,
  type MyResource,
} from "@/lib/types";

/* One schema per wizard step. */

const optionalInt = (label: string, max: number) =>
  z.number({ invalid_type_error: `Enter ${label}` }).int("Whole numbers only").positive(`${label} must be positive`).max(max).optional();

export const detailsSchema = z.object({
  title: z.string().trim().min(3, "At least 3 characters").max(80, "Keep it under 80 characters"),
  category: z.enum(RESOURCE_CATEGORIES, { errorMap: () => ({ message: "Pick a category" }) }),
  description: z.string().trim().min(20, "Tell seekers a bit more (20+ characters)").max(500, "Keep it under 500 characters"),
  unitLabel: z.string().trim().min(1, "e.g. chairs, vans, hall").max(24),
  quantity: z.number({ invalid_type_error: "Enter how many you have" }).int("Whole units only").min(1, "At least 1").max(10_000),
  capacity: optionalInt("capacity", 100_000),
  tags: z
    .string()
    .max(160)
    .refine((v) => splitTags(v).length <= 8, "Up to 8 tags")
    .refine((v) => splitTags(v).every((t) => t.length <= 20), "Each tag under 20 characters"),
});
export type DetailsValues = z.infer<typeof detailsSchema>;

export const pricingSchema = z
  .object({
    price: z.number({ invalid_type_error: "Enter a price" }).positive("Price must be positive").max(1_000_000),
    unit: z.enum(PRICE_UNITS),
    minRentalHours: z.number({ invalid_type_error: "Enter hours" }).int().min(1, "At least 1 hour").max(72, "Up to 72 hours"),
    delivers: z.boolean(),
    deliveryBase: z.number({ invalid_type_error: "Enter a fee" }).min(0).max(50_000).optional(),
    deliveryPerKm: z.number({ invalid_type_error: "Enter a rate" }).min(0).max(1_000).optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.delivers) return;
    if (v.deliveryBase === undefined) ctx.addIssue({ code: "custom", path: ["deliveryBase"], message: "Flat delivery fee required" });
    if (v.deliveryPerKm === undefined) ctx.addIssue({ code: "custom", path: ["deliveryPerKm"], message: "Per-km rate required" });
  });
export type PricingValues = z.infer<typeof pricingSchema>;

/** Blocks can't exceed the stock entered in step 1. */
export function makeAvailabilitySchema(maxQty: number) {
  return z.object({
    blocks: z
      .array(
        z
          .object({
            start: z.string().refine(isLocal, "Pick a start"),
            end: z.string().refine(isLocal, "Pick an end"),
            quantity: z
              .number({ invalid_type_error: "Enter units" })
              .int()
              .min(1, "At least 1")
              .max(maxQty, `You only list ${maxQty}`),
            reason: z.string().trim().max(60).optional(),
          })
          .refine((b) => !isLocal(b.start) || !isLocal(b.end) || isBefore(parseLocal(b.start), parseLocal(b.end)), {
            path: ["end"],
            message: "End must be after start",
          })
      )
      .max(12, "Up to 12 blocks — add more after publishing"),
  });
}
export type AvailabilityValues = z.infer<ReturnType<typeof makeAvailabilitySchema>>;

export const conditionsSchema = z.object({
  conditions: z.array(z.object({ text: z.string().trim().min(3, "Too short").max(140, "Keep it under 140 characters") })).max(8, "Up to 8 conditions"),
  cancellation: z.enum(CANCELLATION_POLICIES),
  deposit: z.number({ invalid_type_error: "Enter an amount" }).min(0).max(1_000_000).optional(),
});
export type ConditionsValues = z.infer<typeof conditionsSchema>;

export interface WizardDraft {
  details?: DetailsValues;
  pricing?: PricingValues;
  availability?: AvailabilityValues;
  conditions?: ConditionsValues;
}

export const splitTags = (v: string) =>
  v
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

/** Empty inputs → undefined, everything else → number (NaN fails validation). */
export const optionalNumber = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(v));

export function draftToInput(d: Required<WizardDraft>): CreateResourceInput {
  return {
    title: d.details.title,
    category: d.details.category,
    description: d.details.description,
    unitLabel: d.details.unitLabel,
    quantity: d.details.quantity,
    capacity: d.details.capacity,
    tags: splitTags(d.details.tags),
    price: d.pricing.price,
    unit: d.pricing.unit,
    minRentalHours: d.pricing.minRentalHours,
    delivers: d.pricing.delivers,
    deliveryBase: d.pricing.delivers ? d.pricing.deliveryBase : undefined,
    deliveryPerKm: d.pricing.delivers ? d.pricing.deliveryPerKm : undefined,
    blackouts: d.availability.blocks.map((b) => ({
      startAt: formatISO(parseLocal(b.start)),
      endAt: formatISO(parseLocal(b.end)),
      quantity: b.quantity,
    })),
    conditions: d.conditions.conditions.map((c) => c.text),
    cancellation: d.conditions.cancellation,
    deposit: d.conditions.deposit,
  };
}

export function resourceToDraft(r: MyResource): Required<WizardDraft> {
  return {
    details: {
      title: r.title,
      category: r.category,
      description: r.description,
      unitLabel: r.unitLabel,
      quantity: r.quantity,
      capacity: r.capacity,
      tags: r.tags.join(", "),
    },
    pricing: {
      price: r.price,
      unit: r.unit,
      minRentalHours: r.minRentalHours,
      delivers: r.delivers,
      deliveryBase: r.deliveryBase,
      deliveryPerKm: r.deliveryPerKm,
    },
    availability: {
      blocks: (r.blackouts ?? []).map((b) => ({ start: isoToLocal(b.startAt), end: isoToLocal(b.endAt), quantity: b.quantity })),
    },
    conditions: {
      conditions: (r.conditions ?? []).map((text) => ({ text })),
      cancellation: r.cancellation ?? "FLEXIBLE",
      deposit: r.deposit,
    },
  };
}
