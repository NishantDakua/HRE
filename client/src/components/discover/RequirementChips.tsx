import { useEffect, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { differenceInHours } from "date-fns";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AREAS } from "@/lib/geo";
import { CATEGORY_LABEL, RESOURCE_CATEGORIES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isLocal, optionalNumber, parseLocal, requirementSchema, type RequirementDraft } from "./params";

function Chip({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label
      className={cn(
        "group flex h-12 items-center gap-2 rounded-full border bg-card pl-4 pr-3 shadow-card transition-colors focus-within:border-primary/60",
        error ? "border-conflict/60" : "border-border",
        className
      )}
      title={error}
    >
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-muted">{label}</span>
      {children}
    </label>
  );
}

const field =
  "min-w-0 bg-transparent font-mono text-sm text-text outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [color-scheme:light]";

interface RequirementChipsProps {
  values: RequirementDraft;
  onSubmit: (values: RequirementDraft) => void;
}

export function RequirementChips({ values, onSubmit }: RequirementChipsProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<RequirementDraft>({
    resolver: zodResolver(requirementSchema),
    defaultValues: values,
  });

  // URL is the source of truth: re-sync when it changes (parse, rail, back/forward).
  const key = JSON.stringify(values);
  useEffect(() => {
    reset(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reset]);

  const [from, to] = watch(["from", "to"]);
  const hours = isLocal(from) && isLocal(to) ? differenceInHours(parseLocal(to), parseLocal(from)) : undefined;
  const firstError = Object.values(errors)[0]?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Requirement">
      <div className="flex flex-wrap items-center gap-2.5">
        <Chip label="Need" error={errors.category?.message}>
          <select
            className={cn(field, "font-sans")}
            aria-invalid={!!errors.category}
            {...register("category", { setValueAs: (v) => (v === "" ? undefined : v) })}
          >
            <option value="">Pick a category</option>
            {RESOURCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Chip>

        <Chip label="Qty" error={errors.quantity?.message}>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            className={cn(field, "w-16")}
            aria-invalid={!!errors.quantity}
            {...register("quantity", { valueAsNumber: true })}
          />
        </Chip>

        <Chip label="Area" error={errors.area?.message}>
          <select className={cn(field, "font-sans")} {...register("area", { setValueAs: (v) => (v === "" ? undefined : v) })}>
            <option value="">Anywhere</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Chip>

        <Chip label="From" error={errors.from?.message}>
          <input type="datetime-local" className={cn(field, "w-[11.5rem]")} aria-invalid={!!errors.from} {...register("from")} />
        </Chip>

        <Chip label="To" error={errors.to?.message}>
          <input type="datetime-local" className={cn(field, "w-[11.5rem]")} aria-invalid={!!errors.to} {...register("to")} />
          {hours !== undefined && hours > 0 && <span className="shrink-0 font-mono text-[11px] text-muted">{hours}h</span>}
        </Chip>

        <Chip label="Budget ≤ ₹" error={errors.budget?.message}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="any"
            className={cn(field, "w-20 placeholder:text-muted/60")}
            aria-invalid={!!errors.budget}
            {...register("budget", { setValueAs: optionalNumber })}
          />
        </Chip>

        <Controller
          control={control}
          name="urgent"
          render={({ field: f }) => (
            <button
              type="button"
              role="switch"
              aria-checked={f.value}
              onClick={() => {
                f.onChange(!f.value);
                // Re-rank straight away if the rest of the requirement is valid.
                void handleSubmit(onSubmit, () => undefined)();
              }}
              className={cn(
                "flex h-12 items-center gap-2 rounded-full border px-4 text-sm shadow-card transition-colors",
                f.value ? "border-conflict/50 bg-conflict/10 text-conflict" : "border-border bg-card text-muted hover:text-text"
              )}
            >
              <span className={cn("relative h-4 w-7 rounded-full transition-colors", f.value ? "bg-conflict" : "bg-border")}>
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 600, damping: 35 }}
                  className={cn("absolute top-0.5 size-3 rounded-full bg-card", f.value ? "right-0.5" : "left-0.5")}
                />
              </span>
              <Zap className="size-3.5" />
              Urgent
            </button>
          )}
        />

        <Button type="submit" size="lg" variant={isDirty ? "default" : "outline"}>
          Find matches
          <ArrowRight />
        </Button>
      </div>
      {firstError && (
        <p role="alert" className="mt-2 pl-4 text-xs text-conflict">
          {firstError}
        </p>
      )}
    </form>
  );
}
