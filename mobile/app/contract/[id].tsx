import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiErrorMessage, isUnauthorized, postJson } from "../../src/api";
import { inr } from "../../src/format";
import { useContract, useContractUnits } from "../../src/queries";
import { colors, fonts } from "../../src/theme";
import { RECEIPT_NATURES, RETURN_NATURES, type HandoverContract } from "../../src/types";
import { Button, Card, Centered, ErrorNote, Field, Muted, Pill, Screen, SignInPrompt } from "../../src/ui";

async function jpegDataUrl(source: "camera" | "library"): Promise<string> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.6 };
  const shot = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (shot.canceled || !shot.assets[0]) throw new Error("No photo chosen");
  const saved = await manipulateAsync(shot.assets[0].uri, [{ resize: { width: 1600 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!saved.base64) throw new Error("Couldn't read that photo");
  return `data:image/jpeg;base64,${saved.base64}`;
}

export default function ContractScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const contract = useContract(id ?? "");
  const units = useContractUnits(id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [nature, setNature] = useState("");
  const [note, setNote] = useState("");
  const [count, setCount] = useState("");

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["contract", id] });
    await queryClient.invalidateQueries({ queryKey: ["contract-units", id] });
  };

  const run = async (label: string, task: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    try {
      await task();
      await refresh();
    } catch (caught) {
      setError(apiErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  if (contract.isLoading) return <Centered label="Opening the contract…" />;
  if (contract.isError && isUnauthorized(contract.error)) {
    return (
      <Screen>
        <SignInPrompt onPress={() => router.push("/sign-in")} />
      </Screen>
    );
  }
  if (!contract.data) return <Screen><ErrorNote message="This contract was not found." /></Screen>;

  const item = contract.data;
  const natures = item.viewerRole === "PROVIDER" ? RETURN_NATURES : RECEIPT_NATURES;
  const phaseForPhoto = item.phase === "CLOSED" ? "RETURN" : item.phase;

  return (
    <Screen>
      <Text style={styles.ref}>{item.ref}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Muted>
        {item.phase} · {item.viewerRole === "PROVIDER" ? "You are the provider" : "You are the seeker"}
      </Muted>
      <Card>
        <Text style={styles.line}>{item.seeker.name} → {item.provider.name}</Text>
        {item.lines.map((line) => (
          <Muted key={line.title}>
            {line.quantity} {line.unitLabel} · {line.title} · {inr(line.agreedPrice)}
          </Muted>
        ))}
        <Text style={styles.total}>Rent {inr(item.rentTotal)}</Text>
        <Muted>Deposit {inr(item.deposit)} · refund {inr(item.settlement.refund)}</Muted>
        <Muted>
          Dispatch signature {signed(item, "DISPATCH") ? "on file" : "missing"} · receipt signature{" "}
          {signed(item, "RECEIPT") ? "on file" : "missing"}
        </Muted>
      </Card>
      <Card>
        <Text style={styles.section}>Units seen</Text>
        <Muted>
          Sent {units.data?.dispatched.length ?? 0} · received {units.data?.received.length ?? 0} · returned{" "}
          {units.data?.returned.length ?? 0}
        </Muted>
        {(units.data?.missingOnArrival.length ?? 0) > 0 ? <Muted>Missing on arrival: {units.data?.missingOnArrival.map((unit) => unit.label).join(", ")}</Muted> : null}
        {(units.data?.missingOnReturn.length ?? 0) > 0 ? <Muted>Missing on return: {units.data?.missingOnReturn.map((unit) => unit.label).join(", ")}</Muted> : null}
        <Button
          label="Photograph labels"
          loading={busy === "labels"}
          onPress={() =>
            void run("labels", async () => {
              const dataUrl = await jpegDataUrl("camera");
              await postJson(`/contracts/${id}/units`, { phase: phaseForPhoto, kind: "LABEL", dataUrl, codes: [] });
            })
          }
        />
        <Button
          label="Choose a label photo"
          tone="ghost"
          onPress={() =>
            void run("library", async () => {
              const dataUrl = await jpegDataUrl("library");
              await postJson(`/contracts/${id}/units`, { phase: phaseForPhoto, kind: "LABEL", dataUrl, codes: [] });
            })
          }
        />
      </Card>
      <Card>
        <Text style={styles.section}>Hard copy</Text>
        <Muted>Photograph the page after it is signed on paper.</Muted>
        {item.viewerRole === "PROVIDER" ? (
          <Button
            label="Upload dispatch signature"
            tone="ghost"
            loading={busy === "sign-dispatch"}
            onPress={() =>
              void run("sign-dispatch", async () => {
                const dataUrl = await jpegDataUrl("library");
                await postJson(`/contracts/${id}/sign`, { purpose: "DISPATCH", dataUrl });
              })
            }
          />
        ) : (
          <Button
            label="Upload receipt signature"
            tone="ghost"
            loading={busy === "sign-receipt"}
            onPress={() =>
              void run("sign-receipt", async () => {
                const dataUrl = await jpegDataUrl("library");
                await postJson(`/contracts/${id}/sign`, { purpose: "RECEIPT", dataUrl });
              })
            }
          />
        )}
        <Button
          label={item.viewerRole === "PROVIDER" ? "Approve the return" : "Approve receipt"}
          loading={busy === "approve"}
          onPress={() => void run("approve", () => postJson(`/contracts/${id}/approve`))}
        />
      </Card>
      {item.disputes.map((dispute) => (
        <Card key={dispute.id}>
          <Text style={styles.section}>{dispute.nature.replaceAll("_", " ")} · {dispute.status}</Text>
          <Muted>{dispute.note}</Muted>
          <Muted>Refund {inr(dispute.refund)}</Muted>
          {dispute.status === "OPEN" ? (
            <Button label="Agree and close" onPress={() => void run("agree", () => postJson(`/contracts/${id}/disputes/${dispute.id}/agree`))} />
          ) : null}
        </Card>
      ))}
      {item.phase !== "CLOSED" && item.phase !== "DISPATCH" ? (
        <Card>
          <Text style={styles.section}>Raise a dispute</Text>
          <View style={styles.natures}>
            {natures.map(([value, label]) => (
              <Pill key={value} label={label} active={nature === value} onPress={() => setNature(value)} />
            ))}
          </View>
          <Field label="What happened" value={note} onChangeText={setNote} multiline />
          <Field label="How many units" keyboardType="number-pad" value={count} onChangeText={setCount} />
          <Button
            label="Open dispute"
            tone="danger"
            disabled={!nature || note.trim().length < 3}
            loading={busy === "dispute"}
            onPress={() =>
              void run("dispute", () =>
                postJson(`/contracts/${id}/disputes`, {
                  nature,
                  note: note.trim(),
                  receivedQuantity: count === "" ? undefined : Number(count),
                  damagedQuantity: count === "" ? undefined : Number(count),
                  severity: "MODERATE",
                })
              )
            }
          />
        </Card>
      ) : null}
      {error ? <ErrorNote message={error} /> : null}
    </Screen>
  );
}

function signed(contract: HandoverContract, purpose: "DISPATCH" | "RECEIPT") {
  return contract.signatures.some((signature) => signature.purpose === purpose);
}

const styles = StyleSheet.create({
  ref: { fontFamily: fonts.medium, color: colors.terracotta, fontSize: 13 },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.ink },
  line: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  total: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  section: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  natures: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
