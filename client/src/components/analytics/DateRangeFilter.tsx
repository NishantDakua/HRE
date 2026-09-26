import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  isAfter,
  isValid,
  parse,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DateRange } from "@/lib/types";
import { cn } from "@/lib/utils";

export const DAY_FMT = "yyyy-MM-dd";
const ymd = (d: Date) => format(d, DAY_FMT);
export const parseDay = (s: string) => parse(s, DAY_FMT, new Date());

export interface Preset {
  id: string;
  label: string;
  range: () => DateRange;
}

export const PRESETS: Preset[] = [
  { id: "7d", label: "7 days", range: () => ({ from: ymd(subDays(new Date(), 6)), to: ymd(new Date()) }) },
  { id: "30d", label: "30 days", range: () => ({ from: ymd(subDays(new Date(), 29)), to: ymd(new Date()) }) },
  { id: "90d", label: "90 days", range: () => ({ from: ymd(subDays(new Date(), 89)), to: ymd(new Date()) }) },
  { id: "mtd", label: "This month", range: () => ({ from: ymd(startOfMonth(new Date())), to: ymd(new Date()) }) },
  {
    id: "last-month",
    label: "Last month",
    range: () => {
      const m = subMonths(new Date(), 1);
      return { from: ymd(startOfMonth(m)), to: ymd(endOfMonth(m)) };
    },
  },
  { id: "ytd", label: "Year to date", range: () => ({ from: ymd(startOfYear(new Date())), to: ymd(new Date()) }) },
];

const day = z
  .string()
  .min(1, "Pick a date")
  .refine((s) => isValid(parseDay(s)), "Invalid date");

const customSchema = z
  .object({ from: day, to: day })
  .refine((v) => !isAfter(parseDay(v.to), new Date()), { path: ["to"], message: "Can't be in the future" })
  .refine((v) => !isAfter(parseDay(v.from), parseDay(v.to)), { path: ["to"], message: "End must be on or after start" })
  .refine((v) => differenceInCalendarDays(parseDay(v.to), parseDay(v.from)) < 366, { path: ["from"], message: "Up to one year at a time" });
type CustomValues = z.infer<typeof customSchema>;

export function describeRange(r: DateRange) {
  const from = parseDay(r.from);
  const to = parseDay(r.to);
  const sameYear = from.getFullYear() === to.getFullYear();
  return `${format(from, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`;
}

export function DateRangeFilter({ value, presetId, onChange }: { value: DateRange; presetId?: string; onChange: (r: DateRange, presetId?: string) => void }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomValues>({ resolver: zodResolver(customSchema), defaultValues: value });

  useEffect(() => {
    reset(value);
  }, [value, reset]);

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <div role="tablist" aria-label="Date range" className="flex max-w-full overflow-x-auto rounded-full border border-border bg-card p-0.5 [scrollbar-width:none]">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={presetId === p.id}
            onClick={() => {
              onChange(p.range(), p.id);
              setOpen(false);
            }}
            className={cn(
              "relative h-8 shrink-0 rounded-full px-3 text-xs transition-colors",
              presetId === p.id ? "text-paper" : "text-muted hover:text-text"
            )}
          >
            {presetId === p.id && <motion.span layoutId="range-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <span className="relative">{p.label}</span>
          </button>
        ))}
      </div>
      <Button size="sm" variant={presetId ? "outline" : "default"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Calendar /> {presetId ? "Custom" : describeRange(value)}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            noValidate
            onSubmit={handleSubmit((v) => {
              onChange(v, undefined);
              setOpen(false);
            })}
            className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,320px)] space-y-3 rounded-lg border border-border bg-card p-4 shadow-card"
            aria-label="Custom date range"
          >
            <div className="grid grid-cols-2 gap-2">
              {(["from", "to"] as const).map((k) => (
                <label key={k} className="space-y-1">
                  <span className="text-[11px] capitalize text-muted">{k}</span>
                  <input
                    type="date"
                    max={ymd(new Date())}
                    aria-invalid={!!errors[k]}
                    className={cn("h-9 w-full rounded-md border bg-paper px-2 font-mono text-xs text-text", errors[k] ? "border-conflict/60" : "border-border")}
                    {...register(k)}
                  />
                </label>
              ))}
            </div>
            {(errors.from || errors.to) && (
              <p className="text-xs text-conflict" role="alert">
                {errors.from?.message ?? errors.to?.message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Apply
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
