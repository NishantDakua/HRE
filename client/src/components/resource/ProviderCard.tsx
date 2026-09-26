import { format, parseISO } from "date-fns";
import { BadgeCheck, MapPin, MessageCircle, ShieldCheck, Star, Timer } from "lucide-react";
import type { Business } from "@/lib/types";
import { cn } from "@/lib/utils";

function Metric({ icon: Icon, label, value, hint }: { icon: typeof Star; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md bg-paper/70 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[11px] text-muted">
        <Icon className="size-3.5" strokeWidth={1.75} />
        {label}
      </dt>
      <dd className="mt-1 font-mono text-base tabular-nums text-text">
        {value}
        {hint && <span className="ml-1 text-[11px] text-muted">{hint}</span>}
      </dd>
    </div>
  );
}

export function ProviderCard({ business }: { business: Business }) {
  return (
    <section className="surface p-5" aria-labelledby="provider-name">
      <p className="eyebrow">Provided by</p>
      <div className="mt-3 flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sand font-display text-lg text-ink">{business.name.charAt(0)}</span>
        <div className="min-w-0">
          <h2 id="provider-name" className="flex items-center gap-1.5 font-sans text-base font-medium tracking-normal text-text">
            <span className="truncate">{business.name}</span>
            {business.verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified" />}
          </h2>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <MapPin className="size-3" /> {business.type} · {business.address}
          </p>
        </div>
      </div>

      <span
        className={cn(
          "mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
          business.verified ? "bg-available/10 text-available" : "bg-surface text-muted"
        )}
      >
        <ShieldCheck className="size-3.5" />
        {business.verified ? "Verified business · GST & FSSAI checked" : "Verification pending"}
      </span>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        <Metric icon={Star} label="Rating" value={business.rating.toFixed(1)} hint={`(${business.reviewCount})`} />
        <Metric icon={MessageCircle} label="Response rate" value={`${Math.round(business.responseRate * 100)}%`} />
        <Metric icon={Timer} label="Avg. response" value={`${business.avgResponseMins} min`} />
        <Metric icon={ShieldCheck} label="Fulfilment" value={`${Math.round(business.fulfillmentRate * 100)}%`} />
      </dl>
      <p className="mt-3 text-[11px] text-muted">On Spare since {format(parseISO(business.joinedAt), "MMMM yyyy")}</p>
    </section>
  );
}
