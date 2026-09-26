import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { useAgreeDispute, useApproveHandover, useContract, useOpenDispute, useRecordArrival } from "@/hooks/queries";
import type { HandoverContract } from "@/lib/types";
import { formatINR } from "@/lib/utils";

const PHASES = [
  { id: "DISPATCH", label: "Provider sends" },
  { id: "RECEIPT", label: "Seeker receives" },
  { id: "RETURN", label: "Provider gets it back" },
] as const;

const SEEKER_NATURES = [
  { id: "SHORT_DELIVERY", label: "Short delivery" },
  { id: "DAMAGED_ON_ARRIVAL", label: "Damaged on arrival" },
  { id: "WRONG_ITEMS", label: "Wrong items" },
  { id: "OTHER", label: "Other" },
];

const PROVIDER_NATURES = [
  { id: "DAMAGED_ON_RETURN", label: "Damaged on return" },
  { id: "MISSING_ON_RETURN", label: "Missing on return" },
  { id: "OTHER", label: "Other" },
];

function DisputeForm({ contract }: { contract: HandoverContract }) {
  const open = useOpenDispute();
  const receiving = contract.viewerRole === "SEEKER";
  const natures = receiving ? SEEKER_NATURES : PROVIDER_NATURES;
  const [nature, setNature] = useState(natures[0].id);
  const [note, setNote] = useState("");
  const [count, setCount] = useState("");
  const [severity, setSeverity] = useState<"MINOR" | "MODERATE" | "SEVERE">("MINOR");
  const countIsReceived = receiving && (nature === "SHORT_DELIVERY" || nature === "OTHER");
  const countIsAffected = !countIsReceived;
  const showSeverity = !receiving && nature !== "MISSING_ON_RETURN";

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        open.mutate({
          id: contract.id,
          nature,
          note,
          receivedQuantity: countIsReceived ? Number(count) : undefined,
          damagedQuantity: countIsAffected ? Number(count) : undefined,
          severity: showSeverity ? severity : undefined,
        });
      }}
    >
      <label className="block text-sm">
        Nature of the dispute
        <select className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2" value={nature} onChange={(event) => setNature(event.target.value)}>
          {natures.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        What happened
        <textarea className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2" rows={3} value={note} onChange={(event) => setNote(event.target.value)} required minLength={3} />
      </label>
      <label className="block text-sm">
        {countIsReceived ? `Units that were usable (booked ${contract.booked})` : `Units affected (booked ${contract.booked})`}
        <input className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2" inputMode="numeric" value={count} onChange={(event) => setCount(event.target.value)} required />
      </label>
      {showSeverity && (
        <label className="block text-sm">
          How bad
          <select className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2" value={severity} onChange={(event) => setSeverity(event.target.value as "MINOR" | "MODERATE" | "SEVERE")}>
            <option value="MINOR">Minor — a quarter of that unit's value</option>
            <option value="MODERATE">Moderate — half of that unit's value</option>
            <option value="SEVERE">Severe — the full value of that unit</option>
          </select>
        </label>
      )}
      <Button type="submit" disabled={open.isPending}>
        Open dispute
      </Button>
    </form>
  );
}

export default function HandoverPage() {
  const { id } = useParams();
  const { data, isPending, isError, refetch } = useContract(id);
  const scan = useRecordArrival();
  const approve = useApproveHandover();
  const agree = useAgreeDispute();
  const recorded = useRef(false);

  useEffect(() => {
    if (!data || recorded.current) return;
    const seekerArriving = data.viewerRole === "SEEKER" && data.phase === "RECEIPT" && !data.arrivedAt;
    const providerReturning = data.viewerRole === "PROVIDER" && data.phase === "RETURN" && !data.returnedAt;
    if (!seekerArriving && !providerReturning) return;
    recorded.current = true;
    scan.mutate(data.id);
  }, [data, scan]);

  if (isPending) return <div className="mx-auto h-80 max-w-lg animate-pulse rounded-lg bg-card" aria-busy="true" />;
  if (isError || !data) {
    return (
      <div className="surface mx-auto max-w-lg space-y-3 p-6">
        <p>This handover is not on your account.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const openDispute = data.disputes.find((dispute) => dispute.status === "OPEN");
  const youAgreed = data.viewerRole === "PROVIDER" ? openDispute?.providerAgreed : openDispute?.seekerAgreed;
  const myTurn =
    (data.phase === "RECEIPT" && data.viewerRole === "SEEKER" && data.windowOpen) ||
    (data.phase === "RETURN" && data.viewerRole === "PROVIDER" && Boolean(data.returnedAt));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link to={`/contract/${data.id}`} className="text-sm text-muted hover:text-text">
          View the contract
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">{data.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {data.provider.name} → {data.seeker.name}
        </p>
      </div>

      <ol className="grid grid-cols-3 gap-2 text-center text-[11px] uppercase tracking-[0.12em]">
        {PHASES.map((phase, index) => {
          const current = PHASES.findIndex((item) => item.id === data.phase);
          const done = data.phase === "CLOSED" || index < current;
          const active = phase.id === data.phase;
          return (
            <li key={phase.id} className={active ? "rounded-md bg-card px-2 py-3 text-ink shadow-card" : done ? "px-2 py-3 text-text" : "px-2 py-3 text-muted"}>
              {index + 1}. {phase.label}
            </li>
          );
        })}
      </ol>

      <section className="surface space-y-4 p-5">
        {data.phase === "DISPATCH" && (
          <p className="text-sm">
            {data.provider.name} signs the printed contract when sending the order. No dispute is raised at this step.
          </p>
        )}
        {data.phase === "RECEIPT" && data.viewerRole === "SEEKER" && (
          <p className="text-sm">
            {data.arrivedAt
              ? `Arrival recorded ${format(parseISO(data.arrivedAt), "d MMM, h:mm a")}. You can raise a dispute until ${data.disputeWindowEndsAt ? format(parseISO(data.disputeWindowEndsAt), "h:mm a") : "one hour later"}, or approve the order if nothing is wrong.`
              : "Recording your arrival scan."}
          </p>
        )}
        {data.phase === "RECEIPT" && data.viewerRole === "PROVIDER" && (
          <p className="text-sm">{data.seeker.name} receives the order and has one hour to approve it or raise a dispute.</p>
        )}
        {data.phase === "RETURN" && data.viewerRole === "PROVIDER" && (
          <p className="text-sm">
            {data.returnedAt
              ? `Return recorded ${format(parseISO(data.returnedAt), "d MMM, h:mm a")}. Approve the goods if they came back fine, or raise a dispute.`
              : "Recording the return scan."}
          </p>
        )}
        {data.phase === "RETURN" && data.viewerRole === "SEEKER" && <p className="text-sm">{data.provider.name} checks the goods on return and can raise a dispute.</p>}
        {data.phase === "CLOSED" && <p className="text-sm">Both sides have finished this handover.</p>}

        {data.disputes.map((dispute) => (
          <div key={dispute.id} className="space-y-1 border-t border-border pt-3 text-sm">
            <p>
              {dispute.reason}: {dispute.note}
            </p>
            <p className="font-mono text-xs text-muted">
              Rent ₹{formatINR(dispute.rentDue)} · damage ₹{formatINR(dispute.damageDue)} · refund ₹{formatINR(dispute.refund)} · {dispute.status === "AGREED" ? "both agreed" : "waiting on both sides"}
            </p>
          </div>
        ))}

        {openDispute && !youAgreed && (
          <Button type="button" disabled={agree.isPending} onClick={() => agree.mutate({ id: data.id, disputeId: openDispute.id })}>
            I agree with this settlement
          </Button>
        )}
        {openDispute && youAgreed && <p className="text-sm text-muted">You have agreed. It closes when the other side agrees too.</p>}
        {data.phase === "RECEIPT" && data.viewerRole === "SEEKER" && !data.arrivedAt && (
          <Button type="button" disabled={scan.isPending} onClick={() => scan.mutate(data.id)}>
            Record arrival
          </Button>
        )}
        {data.phase === "RETURN" && data.viewerRole === "PROVIDER" && !data.returnedAt && (
          <Button type="button" disabled={scan.isPending} onClick={() => scan.mutate(data.id)}>
            Record the return
          </Button>
        )}
        {myTurn && !openDispute && (
          <div className="space-y-4">
            <Button type="button" disabled={approve.isPending} onClick={() => approve.mutate(data.id)}>
              {data.phase === "RECEIPT" ? "Approve — nothing is wrong" : "Approve — goods came back fine"}
            </Button>
            <DisputeForm contract={data} />
          </div>
        )}
      </section>

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="eyebrow">Rent due</dt>
          <dd className="font-mono">₹{formatINR(data.settlement.rentDue)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Damage</dt>
          <dd className="font-mono">₹{formatINR(data.settlement.damageDue)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Refund</dt>
          <dd className="font-mono">₹{formatINR(data.settlement.refund)}</dd>
        </div>
      </dl>
    </div>
  );
}
