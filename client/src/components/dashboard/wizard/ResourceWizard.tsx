import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format, set, startOfDay } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarPlus, Check, Pencil, Plus, Trash2, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateResource, useUpdateResource } from "@/hooks/queries";
import { parseLocal, toLocal } from "@/lib/datetime";
import {
  CANCELLATION_LABEL,
  CANCELLATION_POLICIES,
  CATEGORY_LABEL,
  LISTING_PHOTO_LABEL,
  RESOURCE_CATEGORIES,
  type MyResource,
  type PriceUnit,
  type ResourceCategory,
} from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { PhotosStep } from "./PhotosStep";
import {
  conditionsSchema,
  detailsSchema,
  draftToInput,
  makeAvailabilitySchema,
  optionalNumber,
  pricingSchema,
  resourceToDraft,
  splitTags,
  type AvailabilityValues,
  type ConditionsValues,
  type DetailsValues,
  type PricingValues,
  type WizardDraft,
} from "./schemas";

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

const STEPS = ["Details", "Photos", "Pricing", "Availability", "Conditions", "Review"] as const;

const control = (invalid?: boolean) =>
  cn(
    "w-full rounded-md border bg-card px-3 text-sm text-text placeholder:text-muted/60 [color-scheme:light] focus-visible:border-primary/60",
    invalid ? "border-conflict/60" : "border-border"
  );

function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="flex items-baseline justify-between gap-2 text-xs text-muted">
        {label}
        {hint && <span className="text-muted/70">{hint}</span>}
      </span>
      {children}
      {error && (
        <span className="block text-xs text-conflict" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

function Footer({ step, onBack, next = "Continue", pending }: { step: number; onBack?: () => void; next?: string; pending?: boolean }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-6 flex items-center justify-between gap-3 border-t border-border bg-card px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-4 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0">
      {step > 0 ? (
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
      ) : (
        <span />
      )}
      <Button type="submit" disabled={pending}>
        {next}
        {next === "Continue" ? <ArrowRight /> : <Check />}
      </Button>
    </div>
  );
}

const UNIT_LABEL: Record<PriceUnit, string> = { HOUR: "per hour", DAY: "per day", UNIT: "per booking" };

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

function DetailsStep({ initial, onNext }: { initial?: DetailsValues; onNext: (v: DetailsValues) => void }) {
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: initial ?? { title: "", description: "", unitLabel: "", quantity: 1, tags: "" },
  });
  useEffect(() => {
    setFocus("title");
  }, [setFocus]);

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-4">
      <Field label="Title" error={errors.title?.message}>
        <input className={cn(control(!!errors.title), "h-10")} placeholder="Chiavari chairs — gold" {...register("title")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" error={errors.category?.message}>
          <select className={cn(control(!!errors.category), "h-10")} {...register("category")} defaultValue={initial?.category ?? ""}>
            <option value="" disabled>
              Pick one
            </option>
            {RESOURCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unit name" hint="shown as “12 chairs”" error={errors.unitLabel?.message}>
          <input className={cn(control(!!errors.unitLabel), "h-10")} placeholder="chairs" {...register("unitLabel")} />
        </Field>
      </div>
      <Field label="Description" hint="what's included, condition, access" error={errors.description?.message}>
        <textarea rows={3} className={cn(control(!!errors.description), "resize-y py-2")} data-lenis-prevent {...register("description")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Quantity you own" error={errors.quantity?.message}>
          <input type="number" inputMode="numeric" className={cn(control(!!errors.quantity), "h-10 font-mono")} {...register("quantity", { valueAsNumber: true })} />
        </Field>
        <Field label="Capacity" hint="optional · guests" error={errors.capacity?.message}>
          <input type="number" inputMode="numeric" className={cn(control(!!errors.capacity), "h-10 font-mono")} {...register("capacity", { setValueAs: optionalNumber })} />
        </Field>
        <Field label="Tags" hint="comma separated" error={errors.tags?.message}>
          <input className={cn(control(!!errors.tags), "h-10")} placeholder="gold, cushioned" {...register("tags")} />
        </Field>
      </div>
      <Footer step={0} />
    </form>
  );
}

function PricingStep({ initial, onNext, onBack }: { initial?: PricingValues; onNext: (v: PricingValues) => void; onBack: () => void }) {
  const {
    register,
    control: ctrl,
    handleSubmit,
    watch,
    setFocus,
    formState: { errors },
  } = useForm<PricingValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues: initial ?? { unit: "HOUR", minRentalHours: 4, delivers: false },
  });
  useEffect(() => {
    setFocus("price");
  }, [setFocus]);
  const [price, unit, minHours, delivers, base, perKm] = watch(["price", "unit", "minRentalHours", "delivers", "deliveryBase", "deliveryPerKm"]);
  const example =
    Number.isFinite(price) && price > 0
      ? price * (unit === "HOUR" ? Math.max(minHours || 1, 1) : 1) + (delivers ? (base ?? 0) + 5 * (perKm ?? 0) : 0)
      : undefined;

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price (₹)" error={errors.price?.message}>
          <input type="number" inputMode="numeric" className={cn(control(!!errors.price), "h-10 font-mono")} {...register("price", { valueAsNumber: true })} />
        </Field>
        <Field label="Charged" error={errors.unit?.message}>
          <select className={cn(control(!!errors.unit), "h-10")} {...register("unit")}>
            {(["HOUR", "DAY", "UNIT"] as const).map((u) => (
              <option key={u} value={u}>
                {UNIT_LABEL[u]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Minimum rental (h)" error={errors.minRentalHours?.message}>
          <input type="number" inputMode="numeric" className={cn(control(!!errors.minRentalHours), "h-10 font-mono")} {...register("minRentalHours", { valueAsNumber: true })} />
        </Field>
      </div>

      <div className="space-y-3 rounded-md border border-border bg-paper/60 p-4">
        <Controller
          control={ctrl}
          name="delivers"
          render={({ field }) => (
            <button type="button" role="switch" aria-checked={field.value} onClick={() => field.onChange(!field.value)} className="flex w-full items-center justify-between text-sm text-text">
              <span className="inline-flex items-center gap-2">
                <Truck className="size-4 text-muted" /> I can deliver to the venue
              </span>
              <span className={cn("relative h-5 w-9 rounded-full transition-colors", field.value ? "bg-peacock" : "bg-border")}>
                <span className={cn("absolute top-0.5 size-4 rounded-full bg-card shadow transition-all", field.value ? "left-[18px]" : "left-0.5")} />
              </span>
            </button>
          )}
        />
        <AnimatePresence initial={false}>
          {delivers && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="grid gap-4 pt-1 sm:grid-cols-2">
                <Field label="Flat fee (₹)" error={errors.deliveryBase?.message}>
                  <input type="number" inputMode="numeric" className={cn(control(!!errors.deliveryBase), "h-10 font-mono")} {...register("deliveryBase", { setValueAs: optionalNumber })} />
                </Field>
                <Field label="Per km (₹)" error={errors.deliveryPerKm?.message}>
                  <input type="number" inputMode="numeric" className={cn(control(!!errors.deliveryPerKm), "h-10 font-mono")} {...register("deliveryPerKm", { setValueAs: optionalNumber })} />
                </Field>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {example !== undefined && (
        <p className="rounded-md bg-mint/25 px-3 py-2 text-xs text-ink/80">
          A minimum booking of one unit{delivers ? ", delivered 5 km," : ""} comes to <span className="font-mono">₹{formatINR(Math.round(example))}</span>.
        </p>
      )}
      <Footer step={2} onBack={onBack} />
    </form>
  );
}

function AvailabilityStep({
  initial,
  quantity,
  unitLabel,
  onNext,
  onBack,
}: {
  initial?: AvailabilityValues;
  quantity: number;
  unitLabel: string;
  onNext: (v: AvailabilityValues) => void;
  onBack: () => void;
}) {
  const schema = useMemo(() => makeAvailabilitySchema(quantity), [quantity]);
  const {
    register,
    control: ctrl,
    handleSubmit,
    formState: { errors },
  } = useForm<AvailabilityValues>({ resolver: zodResolver(schema), defaultValues: initial ?? { blocks: [] } });
  const { fields, append, remove } = useFieldArray({ control: ctrl, name: "blocks" });

  const addBlock = () => {
    const start = set(addDays(startOfDay(new Date()), 1), { hours: 9 });
    append({ start: toLocal(start), end: toLocal(set(start, { hours: 18 })), quantity, reason: "" });
  };

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-4">
      <p className="text-sm text-muted">
        Block out times when some or all of your {unitLabel || "stock"} is unavailable — in-house events, maintenance, your own bookings
        elsewhere. Everything else is bookable.
      </p>

      {fields.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
          No blocks — fully bookable from day one.
        </div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {fields.map((f, i) => {
              const e = errors.blocks?.[i];
              return (
                <motion.li
                  key={f.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid gap-3 rounded-md border border-border bg-paper/60 p-3 sm:grid-cols-[1fr_1fr_90px_auto]"
                >
                  <Field label="From" error={e?.start?.message}>
                    <input type="datetime-local" className={cn(control(!!e?.start), "h-9 font-mono")} {...register(`blocks.${i}.start`)} />
                  </Field>
                  <Field label="To" error={e?.end?.message}>
                    <input type="datetime-local" className={cn(control(!!e?.end), "h-9 font-mono")} {...register(`blocks.${i}.end`)} />
                  </Field>
                  <Field label="Units" error={e?.quantity?.message}>
                    <input type="number" inputMode="numeric" className={cn(control(!!e?.quantity), "h-9 font-mono")} {...register(`blocks.${i}.quantity`, { valueAsNumber: true })} />
                  </Field>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`Remove block ${i + 1}`}
                    className="grid size-9 place-items-center self-end rounded-md text-muted hover:bg-conflict/10 hover:text-conflict"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <Field label="Reason (optional)" className="sm:col-span-4">
                    <input className={cn(control(), "h-9")} placeholder="In-house wedding" {...register(`blocks.${i}.reason`)} />
                  </Field>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
      {errors.blocks?.root?.message && <p className="text-xs text-conflict">{errors.blocks.root.message}</p>}
      {errors.blocks?.message && <p className="text-xs text-conflict">{errors.blocks.message}</p>}

      <Button type="button" variant="outline" size="sm" onClick={addBlock} disabled={fields.length >= 12}>
        <CalendarPlus /> Add block
      </Button>
      <Footer step={3} onBack={onBack} />
    </form>
  );
}

const SUGGESTED: Record<ResourceCategory, string[]> = {
  BANQUET_SPACE: ["Setup and teardown count towards rental hours", "Outside caterers allowed with a kitchen-use fee"],
  CHAIRS_TABLES: ["Return clean and stacked", "Damage billed at replacement cost"],
  VEHICLES: ["Includes driver; tolls at actuals", "Fuel included up to 80 km per day"],
  KITCHEN: ["FSSAI-compliant use only", "Deep clean required before handover"],
  AV_EQUIPMENT: ["Technician for the first hour of setup", "No third-party rigging"],
  PARKING: ["Vehicles must display the event pass"],
  LINEN_DECOR: ["Laundry included; heavy stains billed"],
};

function ConditionsStep({
  initial,
  category,
  onNext,
  onBack,
}: {
  initial?: ConditionsValues;
  category: ResourceCategory;
  onNext: (v: ConditionsValues) => void;
  onBack: () => void;
}) {
  const {
    register,
    control: ctrl,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ConditionsValues>({
    resolver: zodResolver(conditionsSchema),
    defaultValues: initial ?? { conditions: [], cancellation: "FLEXIBLE" },
  });
  const { fields, append, remove } = useFieldArray({ control: ctrl, name: "conditions" });
  const current = watch("conditions").map((c) => c.text);
  const policy = watch("cancellation");
  const suggestions = SUGGESTED[category].filter((s) => !current.includes(s));

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs text-muted">House rules seekers must accept</p>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {fields.map((f, i) => (
              <motion.li key={f.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2">
                <div className="flex-1">
                  <input className={cn(control(!!errors.conditions?.[i]?.text), "h-9")} {...register(`conditions.${i}.text`)} />
                  {errors.conditions?.[i]?.text && <p className="mt-1 text-xs text-conflict">{errors.conditions[i]?.text?.message}</p>}
                </div>
                <button type="button" onClick={() => remove(i)} aria-label="Remove condition" className="grid size-9 place-items-center rounded-md text-muted hover:bg-conflict/10 hover:text-conflict">
                  <X className="size-4" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => append({ text: s })}
              disabled={fields.length >= 8}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted hover:border-primary/50 hover:text-text"
            >
              <Plus className="size-3" /> {s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => append({ text: "" })}
            disabled={fields.length >= 8}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-text hover:border-primary/50"
          >
            <Plus className="size-3" /> Custom rule
          </button>
        </div>
        {errors.conditions?.message && <p className="text-xs text-conflict">{errors.conditions.message}</p>}
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs text-muted">Cancellation policy</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {CANCELLATION_POLICIES.map((p) => (
            <label
              key={p}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-md border p-3 text-xs text-text transition-colors",
                policy === p ? "border-primary/60 bg-primary/5" : "border-border bg-card hover:border-primary/30"
              )}
            >
              <input type="radio" value={p} className="mt-0.5 accent-[hsl(var(--terracotta))]" {...register("cancellation")} />
              <span>
                <span className="block font-medium">{p.charAt(0) + p.slice(1).toLowerCase()}</span>
                <span className="text-muted">{CANCELLATION_LABEL[p].split("— ")[1]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Security deposit (₹)" hint="optional · refunded after return" error={errors.deposit?.message} className="max-w-[220px]">
        <input type="number" inputMode="numeric" className={cn(control(!!errors.deposit), "h-10 font-mono")} {...register("deposit", { setValueAs: optionalNumber })} />
      </Field>
      <Footer step={4} onBack={onBack} />
    </form>
  );
}

function ReviewStep({
  draft,
  mode,
  pending,
  onEdit,
  onBack,
  onSubmit,
}: {
  draft: Required<WizardDraft>;
  mode: "create" | "edit";
  pending: boolean;
  onEdit: (step: number) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const { details: d, photos, pricing: p, availability: a, conditions: c } = draft;
  const sections: { step: number; title: string; rows: [string, string][] }[] = [
    {
      step: 0,
      title: "Details",
      rows: [
        ["Listing", d.title],
        ["Category", CATEGORY_LABEL[d.category]],
        ["Stock", `${formatINR(d.quantity)} ${d.unitLabel}${d.capacity ? ` · ${formatINR(d.capacity)} guests` : ""}`],
        ["Tags", splitTags(d.tags).join(", ") || "—"],
      ],
    },
    {
      step: 2,
      title: "Pricing",
      rows: [
        ["Price", `₹${formatINR(p.price)} ${UNIT_LABEL[p.unit]}`],
        ["Minimum", `${p.minRentalHours}h`],
        ["Delivery", p.delivers ? `₹${formatINR(p.deliveryBase ?? 0)} + ₹${formatINR(p.deliveryPerKm ?? 0)}/km` : "On-site / pickup"],
      ],
    },
    {
      step: 3,
      title: "Availability",
      rows: a.blocks.length
        ? a.blocks.map((b, i) => [`Block ${i + 1}`, `${format(parseLocal(b.start), "d MMM, h:mm a")} – ${format(parseLocal(b.end), "d MMM, h:mm a")} · ${b.quantity}`] as [string, string])
        : [["Blocks", "None — fully bookable"]],
    },
    {
      step: 4,
      title: "Conditions",
      rows: [
        ["Cancellation", CANCELLATION_LABEL[c.cancellation]],
        ["Deposit", c.deposit ? `₹${formatINR(c.deposit)}` : "None"],
        ["Rules", c.conditions.length ? c.conditions.map((x) => x.text).join(" · ") : "None"],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-border bg-paper/50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-sans text-sm font-medium tracking-normal text-text">Photos</h3>
          <button type="button" onClick={() => onEdit(1)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-text">
            <Pencil className="size-3" /> Edit
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <figure key={photo.position}>
              <img src={photo.dataUrl} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
              <figcaption className="mt-1 text-[11px] text-muted">{LISTING_PHOTO_LABEL[photo.position].title}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      {sections.map((s) => (
        <section key={s.title} className="rounded-md border border-border bg-paper/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-sans text-sm font-medium tracking-normal text-text">{s.title}</h3>
            <button type="button" onClick={() => onEdit(s.step)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-text">
              <Pencil className="size-3" /> Edit
            </button>
          </div>
          <dl className="grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-[120px_1fr]">
            {s.rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="text-text">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Footer step={5} onBack={onBack} next={pending ? "Saving…" : mode === "create" ? "Publish listing" : "Save changes"} pending={pending} />
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

interface ResourceWizardProps {
  open: boolean;
  onClose: () => void;
  /** Present = edit this listing; absent = create. */
  resource?: MyResource;
}

export function ResourceWizard({ open, onClose, resource }: ResourceWizardProps) {
  const mode = resource ? "edit" : "create";
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [draft, setDraft] = useState<WizardDraft>({});
  const create = useCreateResource();
  const update = useUpdateResource();
  const panelRef = useRef<HTMLDivElement>(null);

  // Fresh state every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDir(1);
    setDraft(resource ? resourceToDraft(resource) : {});
  }, [open, resource]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  const save = <K extends keyof WizardDraft>(key: K, next: number) => (v: NonNullable<WizardDraft[K]>) => {
    setDraft((d) => ({ ...d, [key]: v }));
    go(next);
  };

  const complete = draft.details && draft.photos?.every((photo) => photo.dataUrl) && draft.pricing && draft.availability && draft.conditions ? (draft as Required<WizardDraft>) : undefined;
  const pending = create.isPending || update.isPending;

  const submit = () => {
    if (!complete) return;
    const input = draftToInput(complete);
    if (resource) update.mutate({ id: resource.id, patch: input }, { onSuccess: onClose });
    else create.mutate(input, { onSuccess: onClose });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-ink/35 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            key="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wizard-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-0 z-[60] mx-auto flex h-[100dvh] max-w-2xl flex-col overflow-hidden border-border bg-card shadow-card-hover sm:inset-x-6 sm:bottom-auto sm:top-[6vh] sm:h-auto sm:max-h-[88vh] sm:rounded-[22px] sm:border"
          >
            <header className="border-b border-border px-5 pb-4 pt-5 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">{mode === "create" ? "New listing" : "Edit listing"}</p>
                  <h2 id="wizard-title" className="mt-1 text-2xl tracking-tightest text-ink">
                    {mode === "create" ? (
                      <>
                        List something <em>idle.</em>
                      </>
                    ) : (
                      resource?.title
                    )}
                  </h2>
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface hover:text-text">
                  <X className="size-4" />
                </button>
              </div>
              <ol className="mt-4 grid grid-cols-6 gap-1.5" aria-label="Steps">
                {STEPS.map((label, i) => {
                  const reachable = i <= step || (i === 5 && !!complete) || (mode === "edit" && !!complete);
                  return (
                    <li key={label}>
                      <button
                        type="button"
                        disabled={!reachable || i === step}
                        onClick={() => go(i)}
                        aria-current={i === step ? "step" : undefined}
                        className="group w-full text-left disabled:cursor-default"
                      >
                        <span className={cn("block h-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-border")} />
                        <span
                          className={cn(
                            "mt-1.5 hidden text-[11px] sm:block",
                            i === step ? "text-text" : reachable ? "text-muted group-hover:text-text" : "text-muted/60"
                          )}
                        >
                          {i + 1}. {label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </header>

            <div ref={panelRef} className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-6" data-lenis-prevent>
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <motion.div
                  key={step}
                  custom={dir}
                  initial={{ opacity: 0, x: dir * 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -28 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step === 0 && <DetailsStep initial={draft.details} onNext={save("details", 1)} />}
                  {step === 1 && <PhotosStep initial={draft.photos} onNext={save("photos", 2)} onBack={() => go(0)} />}
                  {step === 2 && <PricingStep initial={draft.pricing} onNext={save("pricing", 3)} onBack={() => go(1)} />}
                  {step === 3 && (
                    <AvailabilityStep
                      initial={draft.availability}
                      quantity={draft.details?.quantity ?? 1}
                      unitLabel={draft.details?.unitLabel ?? ""}
                      onNext={save("availability", 4)}
                      onBack={() => go(2)}
                    />
                  )}
                  {step === 4 && (
                    <ConditionsStep
                      initial={draft.conditions}
                      category={draft.details?.category ?? "CHAIRS_TABLES"}
                      onNext={save("conditions", 5)}
                      onBack={() => go(3)}
                    />
                  )}
                  {step === 5 && complete && (
                    <ReviewStep draft={complete} mode={mode} pending={pending} onEdit={go} onBack={() => go(4)} onSubmit={submit} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
