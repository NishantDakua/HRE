import { useState } from "react";
import { useContractUnits, useSaveUnitPhoto } from "@/hooks/queries";
import { prepareLabelPhoto } from "@/lib/readCodes";
import type { UnitCode, UnitSummary } from "@/lib/types";

function chips(units: UnitCode[]) {
  if (!units.length) return <p className="text-sm text-muted">None yet.</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {units.map((unit) => (
        <li key={unit.code} className="rounded-full bg-sand px-2 py-0.5 font-mono text-[11px]">
          {unit.label}
        </li>
      ))}
    </ul>
  );
}

export function UnitScan({
  contractId,
  phase,
  booked,
}: {
  contractId: string;
  phase: "DISPATCH" | "RECEIPT" | "RETURN";
  booked: number;
}) {
  const { data, isPending } = useContractUnits(contractId);
  const save = useSaveUnitPhoto();
  const [note, setNote] = useState("");
  const [damage, setDamage] = useState<string[]>([]);
  const summary: UnitSummary | undefined = data;
  const seen = phase === "DISPATCH" ? summary?.dispatched ?? [] : phase === "RECEIPT" ? summary?.received ?? [] : summary?.returned ?? [];
  const missing = phase === "RECEIPT" ? summary?.missingOnArrival ?? [] : phase === "RETURN" ? summary?.missingOnReturn ?? [] : [];
  const damaged = (summary?.damaged ?? []).filter((unit) => unit.phase === phase);
  const damageChoices = seen.filter((unit) => !damaged.some((item) => item.code === unit.code));

  async function onLabels(files: FileList | null) {
    if (!files?.length) return;
    setNote("");
    for (const file of Array.from(files)) {
      try {
        const prepared = await prepareLabelPhoto(file);
        const result = await save.mutateAsync({ id: contractId, phase, kind: "LABEL", dataUrl: prepared.dataUrl, codes: prepared.codes });
        const read = result.accepted.map((unit) => unit.label).join(", ");
        setNote(
          prepared.codes.length
            ? `This photo had ${prepared.codes.length} codes. Saved ${result.accepted.length}${read ? `: ${read}` : ""}.`
            : "No codes were read in that photo. Take another, closer to the labels, with the stickers facing the camera."
        );
      } catch {
        setNote("That photo did not save.");
      }
    }
  }

  async function onDamage(files: FileList | null) {
    const file = files?.[0];
    if (!file || !damage.length) return;
    try {
      const prepared = await prepareLabelPhoto(file, 2000, false);
      await save.mutateAsync({ id: contractId, phase, kind: "DAMAGE", dataUrl: prepared.dataUrl, codes: damage });
      setDamage([]);
    } catch {
      setNote("That damage photo did not save.");
    }
  }

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="text-sm">
        {phase === "DISPATCH" && `Photograph the labels on the units leaving. This order is for ${booked}. Several photos are fine if one shot misses stickers.`}
        {phase === "RECEIPT" && "Photograph the labels that arrived. Units that were sent and are not in these photos count as a shortage. Add a photo of any damage and tick those units."}
        {phase === "RETURN" && "Photograph the labels that came back. Units that were sent and are not in these photos count as missing. Add a photo of any damage and tick those units."}
      </p>
      {isPending && <p className="text-sm text-muted">Loading the unit list.</p>}
      {summary && (
        <>
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.12em] text-muted">
              {phase === "DISPATCH" ? `Leaving · ${seen.length} of ${booked}` : phase === "RECEIPT" ? `Arrived · ${seen.length} of ${booked} booked, ${summary?.dispatched.length ?? 0} sent` : `Back · ${seen.length} of ${summary?.dispatched.length ?? 0} sent`}
            </p>
            {chips(seen)}
          </div>
          {phase !== "DISPATCH" && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.12em] text-muted">{phase === "RECEIPT" ? "Sent, not in the photos" : "Sent, not back"}</p>
              {chips(missing)}
            </div>
          )}
          {phase !== "DISPATCH" && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.12em] text-muted">Marked damaged</p>
              {chips(damaged)}
            </div>
          )}
        </>
      )}
      <label className="block text-sm">
        Label photos
        <input
          className="mt-1 block w-full text-sm"
          type="file"
          accept="image/*"
          multiple
          disabled={save.isPending}
          onChange={(event) => {
            void onLabels(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      {note && <p className="text-sm text-muted">{note}</p>}
      {phase !== "DISPATCH" && damageChoices.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm">Damaged units in this step</legend>
          <div className="flex flex-wrap gap-2">
            {damageChoices.map((unit) => (
              <label key={unit.code} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 font-mono text-[11px]">
                <input
                  type="checkbox"
                  checked={damage.includes(unit.code)}
                  onChange={(event) => setDamage((current) => (event.target.checked ? [...current, unit.code] : current.filter((code) => code !== unit.code)))}
                />
                {unit.label}
              </label>
            ))}
          </div>
          <label className="block text-sm">
            Photo of the damage
            <input
              className="mt-1 block w-full text-sm"
              type="file"
              accept="image/*"
              disabled={save.isPending || damage.length === 0}
              onChange={(event) => {
                void onDamage(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </fieldset>
      )}
    </div>
  );
}
