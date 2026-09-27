import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Car,
  ChefHat,
  Clock,
  Flower2,
  MapPin,
  ParkingSquare,
  Armchair,
  Speaker,
  Star,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { cn, distanceKm } from "@/lib/utils";
import { CATEGORY_LABEL, type GeoPoint, type MatchScore, type ResourceCategory, type ResourceWithBusiness } from "@/lib/types";
import { PriceTag } from "./PriceTag";
import { StatusPill } from "./StatusPill";
import { MatchScoreBar } from "./MatchScoreBar";

export const CATEGORY_ICON: Record<ResourceCategory, LucideIcon> = {
  BANQUET_SPACE: Building2,
  CHAIRS_TABLES: Armchair,
  VEHICLES: Car,
  KITCHEN: ChefHat,
  AV_EQUIPMENT: Speaker,
  PARKING: ParkingSquare,
  LINEN_DECOR: Flower2,
};

interface ResourceCardProps {
  resource: ResourceWithBusiness;
  score?: MatchScore;
  origin?: GeoPoint;
  href?: string;
  className?: string;
  /** Precomputed distance (overrides `origin`). */
  distanceKm?: number;
  /** Weighted match total shown on the score bar. */
  total?: number;
  /** Hover tooltip on the score bar explaining the total. */
  breakdown?: boolean;
  urgent?: boolean;
  /** Position in a ranked list. */
  rank?: number;
  /** Visually emphasise (e.g. hovered on the map). */
  highlighted?: boolean;
  onHoverChange?: (hovering: boolean) => void;
  /** Rendered beside the availability pill. */
  actions?: ReactNode;
  /** Rendered between the score bar and the price footer. */
  extra?: ReactNode;
}

function availability(r: ResourceWithBusiness) {
  if (r.available === 0) return "unavailable" as const;
  if (r.available / r.quantity < 0.5) return "limited" as const;
  return "available" as const;
}

export function ResourceCard({
  resource,
  score,
  origin,
  href,
  className,
  distanceKm: kmOverride,
  total,
  breakdown,
  urgent,
  rank,
  highlighted,
  onHoverChange,
  actions,
  extra,
}: ResourceCardProps) {
  const biz = resource.business;
  const Icon = CATEGORY_ICON[resource.category];
  const km = kmOverride ?? (origin && biz ? distanceKm(origin, biz) : undefined);

  const body = (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onHoverStart={onHoverChange ? () => onHoverChange(true) : undefined}
      onHoverEnd={onHoverChange ? () => onHoverChange(false) : undefined}
      className={cn(
        "group flex h-full flex-col rounded-lg border border-border bg-card shadow-card transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-card-hover",
        highlighted && "border-primary/60 shadow-card-hover ring-1 ring-primary/30",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="flex min-w-0 items-center gap-2 text-muted">
          {rank !== undefined && (
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink font-mono text-[11px] text-paper">{rank}</span>
          )}
          <Icon className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="truncate text-xs">{CATEGORY_LABEL[resource.category]}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill status={availability(resource)} />
          {actions}
        </div>
      </div>

      <div className="px-5">
        <h3 className="font-display text-xl leading-tight text-text">{resource.title}</h3>
        {biz && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-text/80">
              <span className="truncate">{biz.name}</span>
              {biz.verified && <BadgeCheck className="size-3.5 shrink-0 text-primary" strokeWidth={2} aria-label="Verified" />}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" strokeWidth={1.75} />
              {biz.area}
              {km !== undefined && <span className="font-mono tabular-nums">· {km.toFixed(1)} km</span>}
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="size-3 fill-accent text-accent" strokeWidth={0} />
              <span className="font-mono tabular-nums text-text/80">{biz.rating.toFixed(1)}</span>
            </span>
          </div>
        )}
      </div>

      <dl className="mx-5 mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border text-[11px]">
        <div className="bg-card px-3 py-2">
          <dt className="text-muted">Free</dt>
          <dd className="mt-0.5 font-mono text-sm tabular-nums text-text">
            {resource.available}
            <span className="text-muted">/{resource.quantity}</span>
          </dd>
        </div>
        <div className="bg-card px-3 py-2">
          <dt className="text-muted">{resource.capacity ? "Capacity" : "Unit"}</dt>
          <dd className="mt-0.5 truncate font-mono text-sm tabular-nums text-text">
            {resource.capacity ?? resource.unitLabel}
          </dd>
        </div>
        <div className="bg-card px-3 py-2">
          <dt className="inline-flex items-center gap-1 text-muted">
            <Clock className="size-3" strokeWidth={1.75} />
            Min
          </dt>
          <dd className="mt-0.5 font-mono text-sm tabular-nums text-text">{resource.minRentalHours}h</dd>
        </div>
      </dl>

      {score && <MatchScoreBar score={score} total={total} breakdown={breakdown} urgent={urgent} className="mt-5 px-5" />}

      {extra && <div className="mt-5 px-5">{extra}</div>}

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <PriceTag amount={resource.price} unit={resource.unit} />
          {biz && (
            <span className="font-mono text-[11px] tabular-nums text-muted">
              {Math.round(biz.responseRate * 100)}% reply
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );

  return href ? (
    <Link to={href} className="block h-full rounded-lg">
      {body}
    </Link>
  ) : (
    body
  );
}
