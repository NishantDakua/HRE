import { cn, formatINR } from "@/lib/utils";
import type { PriceUnit } from "@/lib/types";

const UNIT_LABEL: Record<PriceUnit, string> = {
  HOUR: "/hr",
  DAY: "/day",
  UNIT: "/unit",
};

interface PriceTagProps {
  amount: number;
  unit?: PriceUnit;
  size?: "sm" | "md" | "lg";
  /** Previous price, rendered struck-through (e.g. before a counter-offer). */
  was?: number;
  className?: string;
}

const SIZE = {
  sm: { value: "text-sm", sym: "text-xs", unit: "text-[11px]" },
  md: { value: "text-lg", sym: "text-sm", unit: "text-xs" },
  lg: { value: "text-3xl", sym: "text-lg", unit: "text-sm" },
} as const;

export function PriceTag({ amount, unit, size = "md", was, className }: PriceTagProps) {
  const s = SIZE[size];
  return (
    <span className={cn("inline-flex items-baseline gap-1 font-mono tabular-nums", className)}>
      <span className={cn(s.sym, "text-muted")}>₹</span>
      <span className={cn(s.value, "font-medium tracking-tight text-text")}>{formatINR(amount)}</span>
      {unit && <span className={cn(s.unit, "text-muted")}>{UNIT_LABEL[unit]}</span>}
      {was !== undefined && was !== amount && (
        <span className={cn(s.unit, "ml-1 text-muted line-through decoration-muted/60")}>₹{formatINR(was)}</span>
      )}
    </span>
  );
}
