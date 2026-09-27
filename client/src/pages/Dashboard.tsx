import { useCallback, useState } from "react";
import { getHours } from "date-fns";
import { Plus } from "lucide-react";
import { KpiRow } from "@/components/dashboard/KpiRow";
import { ListingsTable } from "@/components/dashboard/ListingsTable";
import { RequestInbox } from "@/components/dashboard/RequestInbox";
import { ActiveRequests, SavedSearches } from "@/components/dashboard/SeekerPanels";
import { ResourceWizard } from "@/components/dashboard/wizard/ResourceWizard";
import { Button } from "@/components/ui/button";
import { useAnalytics, useSavedSearches } from "@/hooks/queries";
import type { AnalyticsRange, MyResource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAccount, useMode } from "@/hooks/account";

const RANGES: AnalyticsRange[] = ["7d", "30d", "90d"];

function greeting() {
  const h = getHours(new Date());
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const mode = useMode();
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const analytics = useAnalytics(range);
  const saved = useSavedSearches();

  const name = useAccount().business?.name;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<MyResource | undefined>();
  const openCreate = useCallback(() => {
    setEditing(undefined);
    setWizardOpen(true);
  }, []);
  const openEdit = useCallback((r: MyResource) => {
    setEditing(r);
    setWizardOpen(true);
  }, []);
  const close = useCallback(() => setWizardOpen(false), []);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Dashboard · {mode === "provider" ? "Provider" : "Seeker"}</p>
          <h1 className="mt-2 text-[clamp(1.75rem,0.9rem+4vw,2.25rem)] leading-[1.05] tracking-tightest [overflow-wrap:anywhere] md:text-5xl">
            {greeting()}
            {name ? (
              <>
                , <em>{name}</em>
              </>
            ) : null}
            .
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Metrics range" className="flex rounded-full border border-border bg-card p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={range === r}
                onClick={() => setRange(r)}
                className={cn("h-8 rounded-full px-3 font-mono text-xs transition-colors", range === r ? "bg-ink text-paper" : "text-muted hover:text-text")}
              >
                {r}
              </button>
            ))}
          </div>
          {mode === "provider" && (
            <Button onClick={openCreate}>
              <Plus /> Add resource
            </Button>
          )}
        </div>
      </header>

      <KpiRow mode={mode} analytics={analytics.data} savedCount={saved.data?.length ?? 0} />

      {mode === "provider" ? (
        <>
          <RequestInbox />
          <ListingsTable onAdd={openCreate} onEdit={openEdit} />
        </>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <ActiveRequests />
          <SavedSearches />
        </div>
      )}

      <ResourceWizard open={wizardOpen} onClose={close} resource={editing} />
    </div>
  );
}
