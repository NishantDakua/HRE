import { addDays, addHours, differenceInMinutes, isBefore, set, startOfDay, subMinutes } from "date-fns";
import { z } from "zod";
import { remainingDuring, type PreparedAvailability } from "@/lib/availability";
import { isLocal, parseLocal, toLocal } from "@/lib/datetime";
import { AREAS, AREA_CENTER } from "@/lib/geo";
import type { Area, ResourceWithBusiness } from "@/lib/types";
import { distanceKm } from "@/lib/utils";

export interface RequestValues {
  start: string; // yyyy-MM-dd'T'HH:mm
  end: string;
  quantity: number;
  delivery: boolean;
  deliverTo: Area;
  counter?: number;
  note?: string;
}

/**
 * Built per resource; `getAvailability` is read at validation time so the
 * schema always checks against the latest calendar.
 */
export function makeRequestSchema(r: ResourceWithBusiness, getAvailability: () => PreparedAvailability | undefined) {
  return z
    .object({
      start: z
        .string()
        .refine(isLocal, "Pick a start")
        .refine((v) => !isLocal(v) || !isBefore(parseLocal(v), subMinutes(new Date(), 5)), "Start is in the past"),
      end: z.string().refine(isLocal, "Pick an end"),
      quantity: z
        .number({ invalid_type_error: "Enter a quantity" })
        .int("Whole units only")
        .min(1, "At least 1")
        .max(r.quantity, `They only have ${r.quantity} ${r.unitLabel}`),
      delivery: z.boolean(),
      deliverTo: z.enum(AREAS as [Area, ...Area[]]),
      counter: z
        .number({ invalid_type_error: "Enter a number" })
        .positive("Must be positive")
        .lt(r.price, "A counter should be below the list price")
        .gte(Math.ceil(r.price * 0.3), `Below ₹${Math.ceil(r.price * 0.3)} is unlikely to be accepted`)
        .optional(),
      note: z.string().trim().max(500, "Keep notes under 500 characters").optional(),
    })
    .superRefine((v, ctx) => {
      if (v.delivery && !r.delivers) ctx.addIssue({ code: "custom", path: ["delivery"], message: "This provider doesn't deliver" });
      if (!isLocal(v.start) || !isLocal(v.end)) return;
      const start = parseLocal(v.start);
      const end = parseLocal(v.end);
      if (!isBefore(start, end)) {
        ctx.addIssue({ code: "custom", path: ["end"], message: "End must be after start" });
        return;
      }
      if (differenceInMinutes(end, start) < r.minRentalHours * 60) {
        ctx.addIssue({ code: "custom", path: ["end"], message: `Minimum rental is ${r.minRentalHours}h` });
        return;
      }
      const av = getAvailability();
      if (av && Number.isFinite(v.quantity)) {
        const remaining = remainingDuring(av, start, end);
        if (v.quantity > remaining) {
          ctx.addIssue({
            code: "custom",
            path: ["quantity"],
            message: remaining === 0 ? "Fully booked for those hours" : `Only ${remaining} free for those hours`,
          });
        }
      }
    });
}

export function defaultRequest(r: ResourceWithBusiness): RequestValues {
  const start = set(addDays(startOfDay(new Date()), 1), { hours: 18 });
  return {
    start: toLocal(start),
    end: toLocal(addHours(start, Math.max(r.minRentalHours, 4))),
    quantity: 1,
    delivery: r.delivers,
    deliverTo: "Bandra",
  };
}

export interface Quote {
  hours: number;
  units: number;
  unitPrice: number;
  rental: number;
  listRental: number;
  savings: number;
  km: number;
  delivery: number;
  total: number;
}

/** Live price for the current form values (tolerates partial/invalid input). */
export function quote(r: ResourceWithBusiness, v: Partial<RequestValues>): Quote {
  const valid = !!v.start && !!v.end && isLocal(v.start) && isLocal(v.end);
  const minutes = valid ? Math.max(0, differenceInMinutes(parseLocal(v.end!), parseLocal(v.start!))) : 0;
  const hours = Math.ceil(minutes / 60);
  const units = r.unit === "HOUR" ? hours : r.unit === "DAY" ? Math.max(1, Math.ceil(hours / 24)) : 1;
  const qty = Number.isFinite(v.quantity) && (v.quantity ?? 0) > 0 ? v.quantity! : 0;
  const counter = v.counter !== undefined && Number.isFinite(v.counter) && v.counter > 0 ? v.counter : undefined;
  const unitPrice = counter ?? r.price;
  const listRental = r.price * qty * units;
  const rental = unitPrice * qty * units;
  const km = v.deliverTo ? distanceKm(AREA_CENTER[v.deliverTo], r.business) : 0;
  const delivery = v.delivery && r.delivers ? Math.round((r.deliveryBase ?? 0) + km * (r.deliveryPerKm ?? 0)) : 0;
  return {
    hours,
    units,
    unitPrice,
    rental,
    listRental,
    savings: listRental - rental,
    km: Math.round(km * 10) / 10,
    delivery,
    total: rental + delivery,
  };
}
