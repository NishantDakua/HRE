import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContract, useSignContract } from "@/hooks/queries";
import type { HandoverContract } from "@/lib/types";
import { formatINR } from "@/lib/utils";

async function fileToJpeg(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

function Paper({ contract }: { contract: HandoverContract }) {
  const dispatch = contract.signatures.find((signature) => signature.purpose === "DISPATCH");
  const receipt = contract.signatures.find((signature) => signature.purpose === "RECEIPT");
  return (
    <article className="contract-sheet mx-auto max-w-3xl bg-card p-8 text-ink shadow-card md:p-12">
      <div className="contract-masthead flex items-start justify-between gap-6 border-b border-ink/15 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-[9px] border border-primary/40 bg-primary/10">
              <span className="font-display text-base font-semibold leading-none text-primary">S</span>
            </span>
            <div>
              <p className="font-display text-xl leading-none tracking-tight text-text">Spare</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted">Hospitality Resource Exchange</p>
            </div>
          </div>
          <p className="eyebrow mt-4">Handover contract</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight">{contract.title}</h1>
          <p className="mt-1 font-mono text-xs text-muted">{contract.ref}</p>
        </div>
        <div className="shrink-0 text-center">
          <img src={contract.qrDataUrl} alt="QR code. Scan on arrival to record the handover." className="size-32" />
          <p className="mt-1 max-w-32 text-[10px] uppercase tracking-[0.12em] text-muted">Scan to receive or return</p>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="eyebrow">Provider</dt>
          <dd className="mt-1">{contract.provider.name}</dd>
        </div>
        <div>
          <dt className="eyebrow">Seeker</dt>
          <dd className="mt-1">{contract.seeker.name}</dd>
        </div>
      </dl>

      <table className="mt-8 w-full text-left text-sm">
        <thead className="border-b border-ink/15 text-[11px] uppercase tracking-[0.14em] text-muted">
          <tr>
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Rate</th>
          </tr>
        </thead>
        <tbody>
          {contract.lines.map((line) => (
            <tr key={line.resourceId} className="border-b border-ink/10">
              <td className="py-2">{line.title}</td>
              <td className="py-2 font-mono tabular-nums">
                {line.quantity} {line.unitLabel}
              </td>
              <td className="py-2 text-right font-mono tabular-nums">₹{formatINR(line.agreedPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 grid gap-3 border-t border-ink/15 pt-4 text-sm sm:grid-cols-2">
        <p>
          Rent on the booking <span className="font-mono">₹{formatINR(contract.rentTotal)}</span>
        </p>
        <p>
          Security deposit held <span className="font-mono">₹{formatINR(contract.deposit)}</span>
        </p>
      </div>

      <section className="mt-6 space-y-2 text-sm leading-relaxed">
        <h2 className="font-display text-lg">What both sides agree</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>The seeker pays the security deposit only. Rent is taken from that deposit after the goods come back.</li>
          <li>If the goods return undamaged, rent for what was actually used is deducted and the rest is returned.</li>
          <li>Damage caused by the seeker is deducted on top of the rent, by how severe it is.</li>
          <li>If the provider delivered less than booked, rent is only for the quantity received.</li>
          <li>The provider signs this page when sending the order. No dispute is raised at dispatch.</li>
          <li>The seeker scans the QR on arrival and may raise a dispute within one hour, or approve the order.</li>
          <li>The provider scans the QR when the goods come back and may raise a dispute, or approve the return.</li>
          {contract.terms.map((term) => (
            <li key={term}>{term}</li>
          ))}
          {contract.cancellation && <li>Cancellation: {contract.cancellation}</li>}
        </ul>
      </section>

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="eyebrow">Provider — signed at dispatch</p>
          {dispatch ? (
            <img src={dispatch.imageUrl} alt="Provider's signed page" className="mt-2 max-h-36 border border-ink/15" />
          ) : (
            <p className="mt-6 h-16 border-b border-ink/40 font-hand text-muted">Sign on the printed page</p>
          )}
        </div>
        <div>
          <p className="eyebrow">Seeker — signed on receipt</p>
          {receipt ? (
            <img src={receipt.imageUrl} alt="Seeker's signed page" className="mt-2 max-h-36 border border-ink/15" />
          ) : (
            <p className="mt-6 h-16 border-b border-ink/40 font-hand text-muted">Sign after the handover</p>
          )}
        </div>
      </section>
      <p className="mt-6 text-[11px] text-muted">The QR opens the handover, where receipt and return are approved or disputed. This page is the contract to print and sign.</p>
    </article>
  );
}

export default function ContractPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data, isPending, isError, refetch } = useContract(id);
  const sign = useSignContract();

  if (params.get("arrive") === "1" && id) return <Navigate to={`/handover/${id}`} replace />;

  if (isPending) return <div className="mx-auto h-96 max-w-3xl animate-pulse rounded-lg bg-card" aria-busy="true" />;
  if (isError || !data) {
    return (
      <div className="surface mx-auto max-w-lg space-y-3 p-6">
        <p>This contract is not on your account.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const dispatchSigned = data.signatures.some((signature) => signature.purpose === "DISPATCH");
  const receiptSigned = data.signatures.some((signature) => signature.purpose === "RECEIPT");
  const openDispute = data.disputes.some((dispute) => dispute.status === "OPEN");
  const providerSigning = data.viewerRole === "PROVIDER" && !dispatchSigned;
  const seekerSigning = data.viewerRole === "SEEKER" && dispatchSigned && !receiptSigned && !openDispute;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={`/requests?id=${data.bookingId}`} className="text-sm text-muted hover:text-text">
          Back to the request
        </Link>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer /> Print this page
        </Button>
      </div>

      <Paper contract={data} />

      <section className="mx-auto max-w-3xl space-y-6 print:hidden">
        <div className="surface space-y-3 p-5">
          <h2 className="font-display text-xl">Dispatch signature</h2>
          <p className="text-sm text-muted">The provider prints this page, signs it on paper, and uploads a photo when sending the order. Disputes are not raised here.</p>
          {dispatchSigned ? (
            <p className="text-sm">The dispatch page is signed.</p>
          ) : providerSigning ? (
            <label className="block text-sm">
              Photo of the signed page
              <input
                className="mt-1 block w-full text-sm"
                type="file"
                accept="image/*"
                disabled={sign.isPending}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  const dataUrl = await fileToJpeg(file);
                  sign.mutate({ id: data.id, purpose: "DISPATCH", dataUrl });
                }}
              />
            </label>
          ) : (
            <p className="text-sm text-muted">Waiting for {data.provider.name} to sign at dispatch.</p>
          )}
        </div>

        <div className="surface space-y-3 p-5">
          <h2 className="font-display text-xl">Receipt signature</h2>
          <p className="text-sm text-muted">The seeker prints this page, signs it on paper when the order arrives, and uploads a photo of that signed page.</p>
          {receiptSigned ? (
            <p className="text-sm">The receipt page is signed.</p>
          ) : seekerSigning ? (
            <label className="block text-sm">
              Photo of the signed page
              <input
                className="mt-1 block w-full text-sm"
                type="file"
                accept="image/*"
                disabled={sign.isPending}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  const dataUrl = await fileToJpeg(file);
                  sign.mutate({ id: data.id, purpose: "RECEIPT", dataUrl });
                }}
              />
            </label>
          ) : data.viewerRole === "SEEKER" && openDispute ? (
            <p className="text-sm text-muted">Upload the signed page after both sides agree on the open dispute.</p>
          ) : data.viewerRole === "SEEKER" ? (
            <p className="text-sm text-muted">Waiting for {data.provider.name} to sign at dispatch.</p>
          ) : (
            <p className="text-sm text-muted">{data.seeker.name} uploads this from their account when they receive the order.</p>
          )}
        </div>
      </section>
    </div>
  );
}
