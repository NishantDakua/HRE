import { Link } from "react-router-dom";
import { useBookingContracts } from "@/hooks/queries";
import { formatINR } from "@/lib/utils";

const LIVE = ["ACCEPTED", "CONFIRMED", "IN_USE", "COMPLETED"];

export function ContractPanel({ bookingId, status }: { bookingId: string; status: string }) {
  const { data, isPending, isError } = useBookingContracts(bookingId, LIVE.includes(status));
  if (!LIVE.includes(status)) return null;
  if (isPending) return <div className="h-24 animate-pulse rounded-lg bg-card" aria-busy="true" />;
  if (isError || !data?.length) return null;

  return (
    <section className="surface space-y-3 p-5">
      <h3 className="font-display text-xl">Contracts</h3>
      <p className="text-sm text-muted">One contract with each provider. Print it, sign the paper, and scan the QR when the order arrives.</p>
      <ul className="space-y-2">
        {data.map((contract) => (
          <li key={contract.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-sm">
            <span>
              {contract.provider.name}
              <span className="ml-2 font-mono text-xs text-muted">deposit ₹{formatINR(contract.deposit)}</span>
            </span>
            <Link to={`/contract/${contract.id}`} className="text-primary underline-offset-4 hover:underline">
              Open contract
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
