import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, RotateCcw, Truck } from "lucide-react";
import { CATEGORY_ICON } from "@/components/ResourceCard";
import { CATEGORY_LABEL, RESOURCE_CATEGORIES, type ResourceCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DEFAULT_FILTERS, MAX_KM, RATING_STEPS, countActiveFilters, filterSchema, optionalNumber, type FilterValues } from "./params";

interface FilterRailProps {
  values: FilterValues;
  category?: ResourceCategory;
  counts?: Partial<Record<ResourceCategory, number>>;
  onChange: (values: FilterValues) => void;
  onCategory: (category?: ResourceCategory) => void;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <legend className="eyebrow float-left mb-3 w-full">{title}</legend>
      <div className="clear-left space-y-3">{children}</div>
    </fieldset>
  );
}

function Toggle({
  checked,
  onChange,
  icon: Icon,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: typeof Truck;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-sm text-text"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="size-4 text-muted" strokeWidth={1.75} />
        {label}
      </span>
      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-peacock" : "bg-border")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-card shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
    </button>
  );
}

export function FilterRail({ values, category, counts, onChange, onCategory }: FilterRailProps) {
  const {
    register,
    control,
    watch,
    reset,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<FilterValues>({ resolver: zodResolver(filterSchema), defaultValues: values, mode: "onChange" });

  // URL → form (back/forward, reset elsewhere). Skip when the form already matches.
  const key = JSON.stringify(values);
  useEffect(() => {
    if (JSON.stringify(getValues()) !== key) reset(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Form → URL, debounced; only valid states are written.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    let timer = 0;
    const sub = watch((v) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const parsed = filterSchema.safeParse(v);
        if (parsed.success) onChangeRef.current(parsed.data);
        else void trigger();
      }, 250);
    });
    return () => {
      window.clearTimeout(timer);
      sub.unsubscribe();
    };
  }, [watch, trigger]);

  const maxKm = watch("maxKm");
  const active = countActiveFilters(values);

  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate aria-label="Filters" className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-sm font-medium tracking-normal text-text">
          Filters{active > 0 && <span className="ml-1.5 font-mono text-xs text-primary">({active})</span>}
        </h2>
        {active > 0 && (
          <button
            type="button"
            onClick={() => {
              reset(DEFAULT_FILTERS);
              onChange(DEFAULT_FILTERS);
            }}
            className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-text"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        )}
      </div>

      <Group title="Category">
        <ul className="-mx-2 space-y-0.5">
          {RESOURCE_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c];
            const selected = c === category;
            return (
              <li key={c}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onCategory(selected ? undefined : c)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    selected ? "bg-primary/10 text-primary" : "text-text/80 hover:bg-surface/60 hover:text-text"
                  )}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{CATEGORY_LABEL[c]}</span>
                  </span>
                  {counts?.[c] !== undefined && <span className="font-mono text-[11px] text-muted">{counts[c]}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Group>

      <Group title="Distance">
        <div className="flex items-baseline justify-between text-sm">
          <label htmlFor="maxKm" className="text-text/80">
            Within
          </label>
          <span className="font-mono tabular-nums text-text">{maxKm >= MAX_KM ? "any" : `${maxKm} km`}</span>
        </div>
        <input
          id="maxKm"
          type="range"
          min={1}
          max={MAX_KM}
          step={1}
          className="w-full accent-[hsl(var(--terracotta))]"
          {...register("maxKm", { valueAsNumber: true })}
        />
      </Group>

      <Group title="Price per unit (₹)">
        <div className="grid grid-cols-2 gap-2">
          {(["minPrice", "maxPrice"] as const).map((name) => (
            <label key={name} className="block">
              <span className="sr-only">{name === "minPrice" ? "Minimum price" : "Maximum price"}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder={name === "minPrice" ? "Min" : "Max"}
                aria-invalid={!!errors[name]}
                className={cn(
                  "h-9 w-full rounded-md border bg-card px-2.5 font-mono text-sm text-text placeholder:text-muted/60",
                  errors[name] ? "border-conflict/60" : "border-border"
                )}
                {...register(name, { setValueAs: optionalNumber })}
              />
            </label>
          ))}
        </div>
        {(errors.minPrice || errors.maxPrice) && (
          <p className="text-xs text-conflict">{errors.minPrice?.message ?? errors.maxPrice?.message}</p>
        )}
      </Group>

      <Group title="Minimum rating">
        <Controller
          control={control}
          name="minRating"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Minimum rating" className="grid grid-cols-4 gap-1 rounded-full border border-border bg-card p-0.5">
              {RATING_STEPS.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={field.value === r}
                  onClick={() => field.onChange(r)}
                  className={cn(
                    "h-7 rounded-full font-mono text-[11px] transition-colors",
                    field.value === r ? "bg-ink text-paper" : "text-muted hover:text-text"
                  )}
                >
                  {r === 0 ? "Any" : `${r}+`}
                </button>
              ))}
            </div>
          )}
        />
      </Group>

      <Group title="Provider">
        <Controller
          control={control}
          name="delivery"
          render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} icon={Truck} label="Delivers to venue" />}
        />
        <Controller
          control={control}
          name="verified"
          render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} icon={BadgeCheck} label="Verified only" />}
        />
      </Group>
    </form>
  );
}
