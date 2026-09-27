import { ExternalLink, Radio } from 'lucide-react';
import { useSocialSignals } from '@/hooks/useSocialSignals';
import { cn } from '@/lib/utils';

const SEVERITY_STYLE: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
  HIGH: 'bg-conflict/10 text-conflict',
  MEDIUM: 'bg-marigold/25 text-ink',
  LOW: 'bg-available/10 text-available',
};

interface SocialSignalsCardProps {
  location: string;
  weatherCondition: string;
}

/**
 * Real-world public signal feed — live news coverage from Google News RSS
 * when available, falling back to labeled demo signals only when no live
 * coverage matches. Never presents a demo signal as live.
 */
export function SocialSignalsCard({ location, weatherCondition }: SocialSignalsCardProps) {
  const { data, isPending, error } = useSocialSignals(location, weatherCondition);

  return (
    <div className="surface rounded-lg border p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Public Signals</h2>
        {data && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs',
              data.source === 'live' ? 'bg-peacock/10 text-peacock' : 'bg-sand text-muted'
            )}
          >
            <Radio className="size-3" />
            {data.source === 'live' ? 'LIVE' : 'DEMO'}
          </span>
        )}
      </div>

      {isPending ? (
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-sand" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-sand" />
        </div>
      ) : error || !data || data.signals.length === 0 ? (
        <p className="text-sm text-muted">No public signals found for {location} right now.</p>
      ) : (
        <div className="space-y-3">
          {data.signals.map((signal) => (
            <div key={signal.id} className="rounded-md border border-border p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', SEVERITY_STYLE[signal.severity])}>
                  {signal.severity}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted">{signal.label}</span>
              </div>
              {signal.url ? (
                <a href={signal.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-ink hover:underline">
                  {signal.message}
                  <ExternalLink className="ml-1 inline size-3 opacity-60" />
                </a>
              ) : (
                <p className="text-sm font-medium text-ink">{signal.message}</p>
              )}
              <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                <span>{signal.source}</span>
                <span>·</span>
                <span>{new Date(signal.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-muted">{data?.note}</p>
    </div>
  );
}
