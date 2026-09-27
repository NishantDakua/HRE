import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiErrorMessage, isUnauthorized, postJson } from "../../src/api";
import { inr, statusLabel, when } from "../../src/format";
import { useMode } from "../../src/mode";
import { useBooking, useBookingContracts } from "../../src/queries";
import { colors, fonts } from "../../src/theme";
import type { BookingDetail } from "../../src/types";
import { Button, Card, Centered, ErrorNote, Field, Muted, Screen, SignInPrompt } from "../../src/ui";

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { mode } = useMode();
  const queryClient = useQueryClient();
  const booking = useBooking(id ?? "");
  const contracts = useBookingContracts(id ?? "");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const respond = useMutation({
    mutationFn: (action: "accept" | "reject" | "counter") =>
      postJson<BookingDetail>(`/bookings/${id}/respond`, {
        action,
        as: mode,
        price: action === "counter" ? Number(price) : undefined,
        message: message.trim() || undefined,
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["booking", id] });
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      await queryClient.invalidateQueries({ queryKey: ["booking-contracts", id] });
    },
    onError: (caught) => setError(apiErrorMessage(caught)),
  });

  if (booking.isLoading) return <Centered label="Opening the request…" />;
  if (booking.isError && isUnauthorized(booking.error)) {
    return (
      <Screen>
        <SignInPrompt onPress={() => router.push("/sign-in")} />
      </Screen>
    );
  }
  if (!booking.data) return <Screen><ErrorNote message="This request was not found." /></Screen>;

  const item = booking.data;
  const open = item.status === "PENDING" || item.status === "COUNTERED";

  return (
    <Screen>
      <Text style={styles.ref}>{item.ref}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Muted>{statusLabel(item.status)}</Muted>
      <Card>
        <Text style={styles.line}>{item.seeker.name} → {item.provider.name}</Text>
        <Muted>
          {when(item.startAt)} – {when(item.endAt)}
        </Muted>
        <Text style={styles.total}>{inr(item.total)}</Text>
        {item.note ? <Muted>{item.note}</Muted> : null}
        {item.lines.map((line) => (
          <Muted key={line.resourceId}>
            {line.quantity} × {line.resource.title} at {inr(line.agreedPrice)}
          </Muted>
        ))}
      </Card>
      {item.offers.length > 0 ? (
        <Card>
          <Text style={styles.section}>Offers</Text>
          {item.offers.map((offer) => (
            <Muted key={offer.id}>
              Round {offer.round} · {inr(offer.price)} · {offer.status}
              {offer.message ? ` — ${offer.message}` : ""}
            </Muted>
          ))}
        </Card>
      ) : null}
      {(contracts.data ?? []).map((contract) => (
        <Button key={contract.id} label={`Contract · ${contract.phase}`} tone="ghost" onPress={() => router.push(`/contract/${contract.id}`)} />
      ))}
      {open ? (
        <Card>
          <Text style={styles.section}>Respond as {mode}</Text>
          <Field label="Counter price per unit" keyboardType="number-pad" value={price} onChangeText={setPrice} placeholder="Leave blank to accept the current price" />
          <Field label="Message" value={message} onChangeText={setMessage} />
          {error ? <ErrorNote message={error} /> : null}
          <View style={styles.actions}>
            <Button label="Accept" loading={respond.isPending} onPress={() => respond.mutate("accept")} />
            <Button label="Counter" tone="ghost" disabled={!price} onPress={() => respond.mutate("counter")} />
            <Button label="Reject" tone="danger" onPress={() => respond.mutate("reject")} />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ref: { fontFamily: fonts.medium, color: colors.terracotta, fontSize: 13 },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, color: colors.ink },
  line: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  total: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  section: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  actions: { gap: 8 },
});
