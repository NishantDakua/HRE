import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, MapPin, Star, X } from "lucide-react";
import { AvailabilityCalendar } from "@/components/resource/AvailabilityCalendar";
import { Gallery } from "@/components/resource/Gallery";
import { ProviderCard } from "@/components/resource/ProviderCard";
import { RequestSheet } from "@/components/resource/RequestSheet";
import { defaultRequest, makeRequestSchema, quote, type RequestValues } from "@/components/resource/requestForm";
import { Conditions, Specs } from "@/components/resource/Specs";
import { CATEGORY_ICON } from "@/components/ResourceCard";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useAvailability, useResource } from "@/hooks/queries";
import { useAccount } from "@/hooks/account";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { prepareAvailability, type PreparedAvailability } from "@/lib/availability";
import { CATEGORY_LABEL, type ResourceWithBusiness } from "@/lib/types";
import { formatINR } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Loading / error                                                     */
/* ------------------------------------------------------------------ */

function DetailSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]" aria-busy="true" aria-label="Loading listing">
      <div className="space-y-5">
        <div className="aspect-[16/9] animate-pulse rounded-lg bg-surface" />
        <div className="h-4 w-28 animate-pulse rounded bg-surface" />
        <div className="h-12 w-3/4 animate-pulse rounded bg-surface" />
        <div className="h-24 animate-pulse rounded-lg bg-surface" />
        <div className="h-[420px] animate-pulse rounded-lg bg-surface" />
      </div>
      <div className="hidden h-[640px] animate-pulse rounded-lg border border-border bg-card lg:block" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="max-w-md space-y-4">
      <p className="eyebrow text-primary">Not found</p>
      <h1 className="text-3xl tracking-tightest">This listing isn&apos;t available.</h1>
      <Button asChild variant="outline">
        <Link to="/discover">Back to Discover</Link>
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** Shown instead of the request form on your own listing. */
function OwnListingNote() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="eyebrow text-primary">Your listing</p>
        <p className="mt-1 text-sm text-muted">This is how seekers see it.</p>
      </div>
      <Button asChild size="lg" variant="outline">
        <Link to="/dashboard">Manage in dashboard</Link>
      </Button>
    </div>
  );
}

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const resource = useResource(id);
  const availability = useAvailability(id);
  const prepared = useMemo(() => (availability.data ? prepareAvailability(availability.data) : undefined), [availability.data]);

  if (resource.isPending) return <DetailSkeleton />;
  if (resource.isError || !resource.data) return <NotFound />;

  return (
    <ResourceDetailView
      key={resource.data.id}
      resource={resource.data}
      prepared={prepared}
      availabilityLoading={availability.isPending}
      availabilityError={availability.isError}
    />
  );
}

function ResourceDetailView({
  resource: r,
  prepared,
  availabilityLoading,
  availabilityError,
}: {
  resource: ResourceWithBusiness;
  prepared?: PreparedAvailability;
  availabilityLoading: boolean;
  availabilityError: boolean;
}) {
  // The resolver reads the latest availability through a ref so validation
  // always checks against the freshest calendar without recreating the form.
  const availabilityRef = useRef(prepared);
  availabilityRef.current = prepared;
  const resolver = useMemo<Resolver<RequestValues>>(() => {
    const schema = makeRequestSchema(r, () => availabilityRef.current);
    return zodResolver(schema);
  }, [r]);

  const form = useForm<RequestValues>({ resolver, defaultValues: defaultRequest(r), mode: "onChange" });

  // Re-check quantity once availability arrives or refreshes (e.g. after a 409).
  const { trigger, getValues } = form;
  useEffect(() => {
    if (prepared && getValues("quantity")) void trigger("quantity");
  }, [prepared, trigger, getValues]);

  const desktop = useMediaQuery("(min-width: 1024px)");
  const mine = useAccount().business?.id === r.businessId;
  const [sheetOpen, setSheetOpen] = useState(false);
  const values = form.watch();
  const total = quote(r, values).total;

  const biz = r.business;
  const Icon = CATEGORY_ICON[r.category];
  const stock = r.available === 0 ? "unavailable" : r.available / r.quantity < 0.5 ? "limited" : "available";

  return (
    <FormProvider {...form}>
      <div className="space-y-6 pb-24 lg:pb-0">
        <Link to="/discover" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text">
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          Discover
        </Link>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-10">
            <Gallery resource={r} />

            <header className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm text-muted">
                  <Icon className="size-4" strokeWidth={1.5} />
                  {CATEGORY_LABEL[r.category]}
                </span>
                <StatusPill status={stock} />
              </div>
              <h1 className="text-[clamp(1.75rem,0.9rem+4vw,2.25rem)] leading-[1.05] tracking-tightest [overflow-wrap:anywhere] md:text-5xl">{r.title}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1 text-text/80">
                  {biz.name}
                  {biz.verified && <BadgeCheck className="size-4 text-primary" strokeWidth={2} aria-label="Verified" />}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" strokeWidth={1.75} />
                  {biz.area}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5 fill-accent text-accent" strokeWidth={0} />
                  <span className="font-mono tabular-nums text-text/80">{biz.rating.toFixed(1)}</span>
                  <span>({biz.reviewCount})</span>
                </span>
              </div>
              <p className="max-w-2xl leading-relaxed text-text/85">{r.description}</p>
            </header>

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-8">
                <Specs resource={r} />
                <Conditions resource={r} />
              </div>
              <ProviderCard business={biz} />
            </div>

            <AvailabilityCalendar resource={r} prepared={prepared} loading={availabilityLoading} error={availabilityError} />
          </div>

          {desktop && (
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="surface max-h-[calc(100vh-7rem)] overflow-y-auto p-6" data-lenis-prevent>
                {mine ? <OwnListingNote /> : <RequestSheet resource={r} prepared={prepared} />}
              </div>
            </aside>
          )}
        </div>
      </div>

      {!desktop && mine && (
        <div className="fixed inset-x-0 bottom-above-tabbar z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md md:bottom-0">
          <OwnListingNote />
        </div>
      )}

      {/* Mobile: sticky price bar + bottom sheet (same form instance). */}
      {!desktop && !mine && (
        <>
          <div className="fixed inset-x-0 bottom-above-tabbar z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md md:bottom-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-muted">Estimated total</p>
                <p className="font-mono text-lg tabular-nums text-text">₹{formatINR(total)}</p>
              </div>
              <Button size="lg" onClick={() => setSheetOpen(true)}>
                Request to book
              </Button>
            </div>
          </div>
          <AnimatePresence>
            {sheetOpen && (
              <>
                <motion.div
                  key="backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] bg-ink/30"
                  onClick={() => setSheetOpen(false)}
                  aria-hidden
                />
                <motion.div
                  key="sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Request to book"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 320, damping: 34 }}
                  className="fixed inset-x-0 bottom-0 z-[60] h-[100dvh] overflow-y-auto border-t border-border bg-card px-4 pt-3 shadow-card-hover md:h-auto md:max-h-[90vh] md:rounded-t-[22px] md:pb-8"
                  data-lenis-prevent
                >
                  <div className="mb-2 flex justify-between">
                    <span className="mx-auto h-1 w-10 rounded-full bg-border" aria-hidden />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    aria-label="Close"
                    className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full text-muted hover:bg-surface hover:text-text touch:size-11"
                  >
                    <X className="size-4" />
                  </button>
                  <RequestSheet resource={r} prepared={prepared} />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </FormProvider>
  );
}
