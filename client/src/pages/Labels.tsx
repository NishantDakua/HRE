import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { useListingUnits } from "@/hooks/queries";

export default function LabelsPage() {
  const { id } = useParams();
  const { data, isPending, isError, refetch } = useListingUnits(id);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    let cancel = false;
    setUrls({});
    (async () => {
      const next: Record<string, string> = {};
      for (const unit of data.units) {
        next[unit.code] = await QRCode.toDataURL(unit.code, { margin: 1, width: 280, errorCorrectionLevel: "M" });
        if (cancel) return;
      }
      if (!cancel) setUrls(next);
    })();
    return () => {
      cancel = true;
    };
  }, [data]);

  if (isPending) return <div className="mx-auto h-80 max-w-5xl animate-pulse rounded-lg bg-card" aria-busy="true" />;
  if (isError || !data) {
    return (
      <div className="surface mx-auto max-w-lg space-y-3 p-6">
        <p>These labels are not on your account.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const ready = Object.keys(urls).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <Link to="/dashboard" className="text-sm text-muted hover:text-text">
            Back to listings
          </Link>
          <h1 className="mt-2 font-display text-3xl tracking-tight">{data.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {data.units.length} labels · stick one on each {data.unitLabel.replace(/s$/, "")}. Print this sheet and keep the spare codes with the listing.
          </p>
        </div>
        <Button type="button" onClick={() => window.print()} disabled={ready !== data.units.length}>
          {ready === data.units.length ? "Print labels" : `Preparing ${ready} of ${data.units.length}`}
        </Button>
      </div>
      <h1 className="hidden font-display text-2xl print:block">{data.title}</h1>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {data.units.map((unit) => (
          <li key={unit.code} className="flex flex-col items-center rounded-md border border-border bg-card p-3 text-center">
            {urls[unit.code] ? <img src={urls[unit.code]} alt="" className="h-36 w-36" /> : <div className="h-36 w-36 animate-pulse bg-sand" />}
            <p className="mt-2 font-mono text-sm">{unit.label}</p>
            <p className="font-mono text-[10px] text-muted">{unit.code}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
