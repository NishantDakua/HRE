import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Health {
  ok: boolean;
  db: boolean;
  auth: "clerk" | "demo";
  demo?: boolean;
}

/** Development only: a small green/red dot from GET /api/health, pinned to the bottom corner. */
export function ApiStatusDot() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api.get<Health>("/health", { validateStatus: () => true }).then((r) => ({ ...r.data, status: r.status })),
    enabled: import.meta.env.DEV,
    refetchInterval: 15_000,
    retry: false,
  });
  if (!import.meta.env.DEV) return null;
  const up = health.data?.ok === true;
  const label = health.isPending
    ? "API: checking…"
    : up
      ? `API up · db ok · auth ${health.data?.auth}${health.data?.demo ? " + demo" : ""}`
      : health.data
        ? `API up · database unreachable`
        : "API unreachable";
  return (
    <div className="pointer-events-none fixed bottom-tabbar left-3 z-50 md:bottom-3" data-testid="api-status" data-status={health.isPending ? "pending" : up ? "up" : "down"}>
      <span title={label} aria-label={label} className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-2 py-1 font-mono text-[10px] text-muted shadow-card backdrop-blur">
        <span className={cn("size-2 rounded-full", health.isPending ? "bg-muted" : up ? "bg-available" : "bg-conflict")} />
        API
      </span>
    </div>
  );
}
