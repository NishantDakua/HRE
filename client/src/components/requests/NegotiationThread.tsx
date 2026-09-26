import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Hourglass, Send, X } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useRespondBooking } from "@/hooks/queries";
import { ACTIONABLE } from "@/lib/bookings";
import type { BookingDetail, NegotiationOffer, Role } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

function makeCounterSchema(list: number, last: number) {
  const min = Math.ceil(list * 0.3);
  const max = Math.round(list * 2);
  return z.object({
    price: z
      .number({ invalid_type_error: "Enter a price" })
      .int("Whole rupees only")
      .min(min, `At least ₹${formatINR(min)}`)
      .max(max, `At most ₹${formatINR(max)}`)
      .refine((v) => v !== last, "That's the current offer — accept it instead"),
    message: z.string().trim().max(200, "Keep it under 200 characters").optional(),
  });
}
type CounterValues = z.infer<ReturnType<typeof makeCounterSchema>>;

function Bubble({
  offer,
  mine,
  name,
  listPrice,
  canAccept,
  pending,
  onAccept,
}: {
  offer: NegotiationOffer;
  mine: boolean;
  name: string;
  listPrice: number;
  canAccept: boolean;
  pending: boolean;
  onAccept: () => void;
}) {
  const diff = Math.round(((offer.price - listPrice) / listPrice) * 100);
  const optimistic = offer.id.startsWith("optimistic");
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: optimistic ? 0.7 : 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className={cn("flex", mine ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "w-full max-w-[85%] rounded-2xl border px-4 py-3 shadow-card sm:max-w-[75%]",
          mine ? "rounded-br-sm border-primary/25 bg-peach/35" : "rounded-bl-sm border-border bg-card",
          offer.status === "ACCEPTED" && "border-available/50 bg-available/5"
        )}
      >
        <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
          <span>
            {mine ? "You" : name} · round {offer.round}
          </span>
          <StatusPill status={offer.status} className="h-5 px-2 text-[10px]" />
        </div>
        <p className="mt-2 font-mono text-lg tabular-nums text-text">
          ₹{formatINR(offer.price)}
          <span className="text-xs text-muted"> × {formatINR(offer.quantity)}</span>
          <span className="ml-2 text-sm text-muted">= ₹{formatINR(offer.price * offer.quantity)}</span>
        </p>
        <p className="font-mono text-[11px] text-muted">{diff === 0 ? "at list price" : `${diff > 0 ? "+" : ""}${diff}% vs list ₹${formatINR(listPrice)}`}</p>
        {offer.message && <p className="mt-2 text-sm leading-snug text-text/85">{offer.message}</p>}
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] text-muted">{optimistic ? "sending…" : formatDistanceToNowStrict(parseISO(offer.createdAt), { addSuffix: true })}</span>
          {canAccept && (
            <Button size="sm" onClick={onAccept} disabled={pending}>
              <Check /> Accept this offer
            </Button>
          )}
        </div>
      </div>
    </motion.li>
  );
}

export function NegotiationThread({ booking: b, mode }: { booking: BookingDetail; mode: Role }) {
  const respond = useRespondBooking();
  const me = mode === "seeker" ? b.seekerId : b.provider.id;
  const other = mode === "seeker" ? b.provider : b.seeker;
  // Price is negotiated on the primary line; other lines ride along at their agreed price.
  const line = b.lines[0];
  const offers = useMemo(() => b.offers.filter((o) => o.resourceId === line.resourceId), [b.offers, line.resourceId]);
  const last = offers.at(-1);
  const actionable = ACTIONABLE.includes(b.status);
  const theirOpen = last && last.status === "OPEN" && last.fromBusinessId !== me ? last : undefined;
  const waiting = actionable && last?.status === "OPEN" && last.fromBusinessId === me;

  const schema = useMemo(() => makeCounterSchema(line.listPrice, last?.price ?? line.agreedPrice), [line.listPrice, last?.price, line.agreedPrice]);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CounterValues>({ resolver: zodResolver(schema) });
  const price = watch("price");

  // Bring new offers into view as they arrive — but don't move the page on first render.
  const endRef = useRef<HTMLDivElement>(null);
  const seen = useRef(offers.length);
  useEffect(() => {
    if (offers.length > seen.current) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    seen.current = offers.length;
  }, [offers.length]);

  const onCounter = (v: CounterValues) => {
    respond.mutate({ id: b.id, action: "counter", price: v.price, message: v.message || undefined, as: mode });
    reset({ price: undefined, message: "" });
  };

  return (
    <section aria-labelledby="thread-title" className="flex min-h-0 flex-col">
      <h3 id="thread-title" className="eyebrow mb-3">
        Negotiation{b.lines.length > 1 && <span className="normal-case tracking-normal"> · {line.resource.title}</span>}
      </h3>
      <ol className="space-y-3" aria-live="polite">
        <AnimatePresence initial={false}>
          {offers.map((o) => (
            <Bubble
              key={o.id}
              offer={o}
              mine={o.fromBusinessId === me}
              name={other.name}
              listPrice={line.listPrice}
              canAccept={actionable && o.id === theirOpen?.id}
              pending={respond.isPending}
              onAccept={() => respond.mutate({ id: b.id, action: "accept", offerId: o.id, as: mode })}
            />
          ))}
        </AnimatePresence>
      </ol>
      <div ref={endRef} />

      {actionable ? (
        <form onSubmit={handleSubmit(onCounter)} noValidate className="mt-5 space-y-2 border-t border-border pt-4" aria-label="Counter-offer">
          {waiting && (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Hourglass className="size-3.5" /> Waiting for {other.name} — you can still revise.
            </p>
          )}
          <div className="flex flex-wrap items-start gap-2">
            <label className="w-[140px]">
              <span className="sr-only">Counter price per unit</span>
              <span className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted">₹</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder={formatINR(Math.round(((last?.price ?? line.listPrice) + line.listPrice) / 2))}
                  aria-invalid={!!errors.price}
                  className={cn(
                    "h-10 w-full rounded-full border bg-card pl-7 pr-3 font-mono text-sm text-text placeholder:text-muted/50",
                    errors.price ? "border-conflict/60" : "border-border"
                  )}
                  {...register("price", { valueAsNumber: true })}
                />
              </span>
            </label>
            <input
              type="text"
              placeholder="Add a note (optional)"
              aria-label="Message"
              className="h-10 min-w-0 flex-1 rounded-full border border-border bg-card px-4 text-sm text-text placeholder:text-muted/60"
              {...register("message")}
            />
            <Button type="submit" disabled={respond.isPending}>
              <Send /> Counter
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => respond.mutate({ id: b.id, action: "reject", as: mode })}
              disabled={respond.isPending}
              className="hover:bg-conflict/10 hover:text-conflict"
            >
              <X /> Decline
            </Button>
          </div>
          <p className="pl-3 font-mono text-[11px] text-muted">
            {errors.price?.message ? (
              <span className="text-conflict" role="alert">
                {errors.price.message}
              </span>
            ) : Number.isFinite(price) ? (
              `₹${formatINR(price)} × ${formatINR(line.quantity)} = ₹${formatINR(price * line.quantity)}`
            ) : (
              `List ₹${formatINR(line.listPrice)} per ${line.resource.unitLabel.replace(/s$/, "")}`
            )}
          </p>
          {errors.message && <p className="pl-3 text-xs text-conflict">{errors.message.message}</p>}
        </form>
      ) : (
        <p className="mt-5 border-t border-border pt-4 text-xs text-muted">Negotiation closed · {b.status.toLowerCase().replace("_", " ")}</p>
      )}
    </section>
  );
}
