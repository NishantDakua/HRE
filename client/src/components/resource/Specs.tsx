import { Check, Clock, Truck } from "lucide-react";
import { PriceTag } from "@/components/PriceTag";
import { CATEGORY_LABEL, type ResourceCategory, type ResourceWithBusiness } from "@/lib/types";
import { formatINR } from "@/lib/utils";

const CATEGORY_CONDITIONS: Record<ResourceCategory, string[]> = {
  BANQUET_SPACE: ["Setup and teardown count towards rental hours.", "In-house security and housekeeping included.", "Outside caterers allowed with a kitchen-use fee."],
  CHAIRS_TABLES: ["Return clean and stacked; damage billed at replacement cost.", "Count verified at pickup and return."],
  VEHICLES: ["Includes driver; tolls and parking billed at actuals.", "Fuel included up to 80 km per day."],
  KITCHEN: ["FSSAI-compliant use only; bring your own consumables.", "Deep clean required before handover."],
  AV_EQUIPMENT: ["On-site technician for the first hour of setup.", "No third-party rigging without approval."],
  PARKING: ["Vehicles must display the event pass.", "Provider isn't liable for contents of vehicles."],
  LINEN_DECOR: ["Laundry included; stains beyond normal use billed.", "Fresh florals are best-effort on availability."],
};

const GENERAL_CONDITIONS = [
  "Free cancellation up to 24 hours before start.",
  "Payment released to the provider after handover.",
];

export function Specs({ resource: r }: { resource: ResourceWithBusiness }) {
  const rows = [
    { dt: "Category", dd: CATEGORY_LABEL[r.category] },
    { dt: "Total stock", dd: `${formatINR(r.quantity)} ${r.unitLabel}` },
    ...(r.capacity ? [{ dt: "Capacity", dd: `${formatINR(r.capacity)} guests` }] : []),
    { dt: "Min rental", dd: `${r.minRentalHours} hours` },
    {
      dt: "Delivery",
      dd: r.delivers ? `₹${formatINR(r.deliveryBase ?? 0)} + ₹${formatINR(r.deliveryPerKm ?? 0)}/km` : "On-site / pickup only",
    },
  ];

  return (
    <section className="space-y-4" aria-labelledby="specs-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="specs-title" className="font-sans text-base font-medium tracking-normal text-text">
          Specs
        </h2>
        <PriceTag amount={r.price} unit={r.unit} size="sm" />
      </div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border text-sm sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.dt} className="bg-card px-4 py-3">
            <dt className="text-xs text-muted">{row.dt}</dt>
            <dd className="mt-1 font-mono text-[13px] tabular-nums text-text">{row.dd}</dd>
          </div>
        ))}
      </dl>
      {r.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {r.tags.map((t) => (
            <li key={t} className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-muted">
              {t}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Conditions({ resource: r }: { resource: ResourceWithBusiness }) {
  const items = [...CATEGORY_CONDITIONS[r.category], ...GENERAL_CONDITIONS];
  return (
    <section className="space-y-3" aria-labelledby="conditions-title">
      <h2 id="conditions-title" className="font-sans text-base font-medium tracking-normal text-text">
        Conditions
      </h2>
      <ul className="space-y-2 text-sm text-text/85">
        <li className="flex gap-2.5">
          <Clock className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
          Minimum rental {r.minRentalHours} hours per booking.
        </li>
        <li className="flex gap-2.5">
          <Truck className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
          {r.delivers
            ? `Delivered to your venue: ₹${formatINR(r.deliveryBase ?? 0)} flat + ₹${formatINR(r.deliveryPerKm ?? 0)} per km.`
            : "No delivery — use on-site or arrange pickup."}
        </li>
        {items.map((c) => (
          <li key={c} className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
            {c}
          </li>
        ))}
      </ul>
    </section>
  );
}
