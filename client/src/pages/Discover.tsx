import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Map as MapIcon, SearchX, SlidersHorizontal, Zap } from "lucide-react";
import { toast } from "sonner";
import { BundleBanner } from "@/components/discover/BundleBanner";
import { CompareDock, MAX_COMPARE } from "@/components/discover/CompareDrawer";
import { FilterRail } from "@/components/discover/FilterRail";
import { MatchList, MatchListSkeleton } from "@/components/discover/MatchList";
import { PasteParser } from "@/components/discover/PasteParser";
import { RequirementChips } from "@/components/discover/RequirementChips";
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  isoToLocal,
  readFilters,
  readRequirement,
  toRequirement,
  writeFilters,
  writeRequirement,
  type FilterValues,
  type RequirementDraft,
} from "@/components/discover/params";
import { applyFilters, planBundle, type Row } from "@/components/discover/rows";
import { useLenis } from "@/components/smooth-scroll";
import { Button } from "@/components/ui/button";
import { useCreateBundle, useMatches, useResources } from "@/hooks/queries";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { AREA_CENTER, DEFAULT_ORIGIN } from "@/lib/geo";
import { CATEGORY_LABEL, type ParsedRequest, type ResourceCategory } from "@/lib/types";
import { cn, distanceKm, formatINR } from "@/lib/utils";

const MatchMap = lazy(() => import("@/components/discover/MatchMap"));

function MapFallback() {
  return <div className="h-full w-full animate-pulse rounded-lg border border-border bg-sand/60" aria-label="Loading map" />;
}

export default function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const search = params.toString();
  const lenis = useLenis();
  const wide = useMediaQuery("(min-width: 1280px)");

  // URL → state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const draft = useMemo(() => readRequirement(params), [search]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filters = useMemo(() => readFilters(params), [search]);
  const requirement = useMemo(() => toRequirement(draft), [draft]);
  const origin = draft.area ? AREA_CENTER[draft.area] : DEFAULT_ORIGIN;

  const update = useCallback(
    (fn: (p: URLSearchParams) => URLSearchParams, replace = false) => {
      const next = fn(new URLSearchParams(search));
      if (next.toString() !== search) setParams(next, { replace, preventScrollReset: true });
    },
    [search, setParams]
  );

  // Data
  const matches = useMatches(requirement);
  const listings = useResources();

  const rows: Row[] = useMemo(() => {
    if (requirement) {
      return (matches.data ?? []).map((m) => ({
        resource: m.resource,
        distanceKm: m.distanceKm,
        score: m.score,
        total: m.total,
        rental: m.rental,
        delivery: m.delivery,
        landed: m.landed,
        fulfils: m.fulfils,
      }));
    }
    return (listings.data ?? [])
      .map((resource) => ({ resource, distanceKm: Math.round(distanceKm(origin, resource.business) * 10) / 10 }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [requirement, matches.data, listings.data, origin]);

  const visible = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const bundle = useMemo(() => (requirement ? planBundle(visible, requirement.quantity) : null), [visible, requirement]);
  const counts = useMemo(() => {
    const out: Partial<Record<ResourceCategory, number>> = {};
    for (const r of listings.data ?? []) out[r.category] = (out[r.category] ?? 0) + 1;
    return out;
  }, [listings.data]);

  const query = requirement ? matches : listings;
  const loading = query.isPending;
  const refreshing = requirement ? matches.isFetching && matches.isPlaceholderData : false;

  // UI state
  const [parsed, setParsed] = useState<ParsedRequest | null>(null);
  const [activeItem, setActiveItem] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const createBundle = useCreateBundle();

  const applyParsed = (p: ParsedRequest, index: number) => {
    const item = p.items[index];
    const next: RequirementDraft = {
      ...draft,
      category: item?.category ?? draft.category,
      quantity: item?.quantity ?? draft.quantity,
      area: p.area ?? draft.area,
      from: p.startAt ? isoToLocal(p.startAt) : draft.from,
      to: p.endAt ? isoToLocal(p.endAt) : draft.to,
      budget: p.budget ?? draft.budget,
    };
    update((q) => writeRequirement(q, next));
    if (!item) toast.info("Couldn't spot what you need", { description: "Pick a category in the chips below." });
  };

  const toggleCompare = (id: string) =>
    setCompareIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      if (ids.length >= MAX_COMPARE) {
        toast.warning(`Compare up to ${MAX_COMPARE} at a time`, { description: "Remove one from the tray first." });
        return ids;
      }
      return [...ids, id];
    });

  const scrollToCard = (id: string) => {
    const el = document.getElementById(`match-${id}`);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -120, duration: 1 });
    else el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const compareRows = compareIds.map((id) => rows.find((r) => r.resource.id === id)).filter((r): r is Row => !!r);
  const activeFilters = countActiveFilters(filters);
  const unitLabel = visible[0]?.resource.unitLabel ?? "units";

  const map = (
    <Suspense fallback={<MapFallback />}>
      <MatchMap rows={visible} origin={origin} hoveredId={hoveredId} onHover={setHoveredId} onSelect={scrollToCard} />
    </Suspense>
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Discover</p>
        <h1 className="mt-2 text-4xl leading-[1.05] tracking-tightest md:text-5xl">
          Find it <em>nearby.</em>
        </h1>
      </header>

      <PasteParser
        parsed={parsed}
        activeIndex={activeItem}
        onParsed={(p) => {
          setParsed(p);
          setActiveItem(0);
          applyParsed(p, 0);
        }}
        onPickItem={(i) => {
          if (!parsed) return;
          setActiveItem(i);
          applyParsed(parsed, i);
        }}
      />

      <RequirementChips values={draft} onSubmit={(v) => update((q) => writeRequirement(q, v))} />

      <div className="flex gap-2 lg:hidden">
        <Button variant="outline" size="sm" aria-expanded={showFilters} onClick={() => setShowFilters((s) => !s)}>
          <SlidersHorizontal />
          Filters{activeFilters > 0 && ` (${activeFilters})`}
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,0.8fr)]">
        <aside className={cn("lg:block", showFilters ? "block" : "hidden")}>
          <div className="surface p-4 lg:sticky lg:top-24 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <FilterRail
              values={filters}
              category={draft.category}
              counts={counts}
              onChange={(v: FilterValues) => update((q) => writeFilters(q, v), true)}
              onCategory={(c) =>
                update((q) => {
                  const n = new URLSearchParams(q);
                  if (c) n.set("category", c);
                  else n.delete("category");
                  return n;
                })
              }
            />
          </div>
        </aside>

        <section className="min-w-0 space-y-5" aria-live="polite" aria-busy={loading || refreshing}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {loading ? (
                "Finding providers…"
              ) : requirement ? (
                <>
                  <span className="font-mono text-text">{visible.length}</span> matches for{" "}
                  <span className="text-text">
                    {formatINR(requirement.quantity)} × {CATEGORY_LABEL[requirement.category].toLowerCase()}
                  </span>{" "}
                  · ranked by match score
                </>
              ) : (
                <>
                  <span className="font-mono text-text">{visible.length}</span> listings nearby · pick a category to rank them
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              {refreshing && <span className="font-mono text-[11px] text-muted">re-ranking…</span>}
              {draft.urgent && requirement && (
                <span className="inline-flex items-center gap-1 rounded-full bg-conflict/10 px-2.5 py-1 text-xs text-conflict">
                  <Zap className="size-3" /> Urgent weighting
                </span>
              )}
              {!wide && (
                <Button variant="outline" size="sm" aria-expanded={showMap} onClick={() => setShowMap((s) => !s)}>
                  <MapIcon />
                  {showMap ? "Hide map" : "Map"}
                </Button>
              )}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {!wide && showMap && (
              <motion.div
                key="inline-map"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 300, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {map}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {bundle && requirement && (
              <BundleBanner
                key="bundle"
                plan={bundle}
                unitLabel={unitLabel}
                pending={createBundle.isPending}
                onAccept={() =>
                  createBundle.mutate({
                    title: `${CATEGORY_LABEL[requirement.category]} bundle`,
                    startAt: requirement.startAt,
                    endAt: requirement.endAt,
                    items: bundle.parts.map((p) => ({ resourceId: p.row.resource.id, quantity: p.quantity })),
                  })
                }
              />
            )}
          </AnimatePresence>

          {loading ? (
            <MatchListSkeleton />
          ) : query.isError ? (
            <div className="surface space-y-3 p-6">
              <p className="text-text">We couldn&apos;t load results.</p>
              <Button size="sm" variant="outline" onClick={() => query.refetch()}>
                Try again
              </Button>
            </div>
          ) : visible.length === 0 ? (
            <div className="surface flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-sand">
                <SearchX className="size-5 text-muted" />
              </span>
              <h2 className="font-display text-2xl text-ink">
                {rows.length > 0 ? "Nothing fits those filters." : "No one has that free right now."}
              </h2>
              <p className="max-w-sm text-sm text-muted">
                {rows.length > 0
                  ? "Widen the distance, relax the price range or drop a toggle."
                  : "Try a wider time window, a different area, or a higher budget."}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {activeFilters > 0 && (
                  <Button size="sm" onClick={() => update((q) => writeFilters(q, DEFAULT_FILTERS), true)}>
                    Reset filters
                  </Button>
                )}
                {requirement?.budget !== undefined && (
                  <Button size="sm" variant="outline" onClick={() => update((q) => writeRequirement(q, { ...draft, budget: undefined }))}>
                    Remove budget
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <MatchList
              rows={visible}
              needed={requirement?.quantity}
              urgent={draft.urgent}
              hoveredId={hoveredId}
              compareIds={compareIds}
              onHover={setHoveredId}
              onToggleCompare={toggleCompare}
            />
          )}
        </section>

        {wide && (
          <aside aria-label="Map">
            <div className="sticky top-24 h-[calc(100vh-7rem)]">{map}</div>
          </aside>
        )}
      </div>

      <CompareDock
        items={compareRows}
        onRemove={(id) => setCompareIds((ids) => ids.filter((x) => x !== id))}
        onClear={() => setCompareIds([])}
      />
    </div>
  );
}
