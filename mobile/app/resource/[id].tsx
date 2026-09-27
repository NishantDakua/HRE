import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiErrorMessage, postJson } from "../../src/api";
import { inr, perUnit, tomorrowEvening } from "../../src/format";
import { useResource } from "../../src/queries";
import { colors, fonts } from "../../src/theme";
import type { BookingDetail } from "../../src/types";
import { Button, Card, Centered, ErrorNote, Field, Muted, Screen } from "../../src/ui";

export default function ResourceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const resource = useResource(id ?? "");
  const initial = tomorrowEvening();
  const [quantity, setQuantity] = useState(1);
  const [start, setStart] = useState(initial.start);
  const [hours, setHours] = useState(5);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const booking = useMutation({
    mutationFn: () => {
      const end = new Date(start);
      end.setHours(start.getHours() + hours);
      return postJson<BookingDetail>("/bookings", {
        resourceId: id,
        quantity,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        note: note.trim() || undefined,
      });
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      router.replace(`/booking/${created.id}`);
    },
    onError: (caught) => setError(apiErrorMessage(caught)),
  });

  if (resource.isLoading) return <Centered label="Opening the listing…" />;
  if (!resource.data) return <Screen><ErrorNote message="This listing is not available." /></Screen>;

  const item = resource.data;
  const photo = item.photos?.[0]?.url;
  const end = new Date(start);
  end.setHours(start.getHours() + hours);

  return (
    <Screen>
      {photo ? <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" /> : null}
      <Text style={styles.title}>{item.title}</Text>
      <Muted>
        {item.business.name} · {item.business.area}
        {item.business.verified ? " · Verified" : ""} · {item.business.rating.toFixed(1)}
      </Muted>
      <Text style={styles.price}>
        {inr(item.price)} <Text style={styles.per}>/ {perUnit(item.unit)}</Text>
      </Text>
      <Muted>
        {item.available} of {item.quantity} {item.unitLabel} free
        {item.deposit ? ` · deposit ${inr(item.deposit)}` : ""}
        {item.delivers ? " · delivers" : ""}
      </Muted>
      <Muted>{item.description}</Muted>
      <Card>
        <Text style={styles.section}>Request it</Text>
        <View style={styles.stepper}>
          <Text style={styles.stepLabel}>Quantity</Text>
          <View style={styles.stepperRow}>
            <Button label="−" tone="ghost" onPress={() => setQuantity((value) => Math.max(1, value - 1))} />
            <Text style={styles.stepValue}>{quantity}</Text>
            <Button label="+" tone="ghost" onPress={() => setQuantity((value) => Math.min(item.available || 1, value + 1))} />
          </View>
        </View>
        <View style={styles.stepper}>
          <Text style={styles.stepLabel}>Starts {start.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</Text>
          <View style={styles.stepperRow}>
            <Button label="−1h" tone="ghost" onPress={() => setStart((value) => new Date(value.getTime() - 60 * 60 * 1000))} />
            <Button label="+1h" tone="ghost" onPress={() => setStart((value) => new Date(value.getTime() + 60 * 60 * 1000))} />
          </View>
        </View>
        <View style={styles.stepper}>
          <Text style={styles.stepLabel}>
            {hours}h · until {end.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
          </Text>
          <View style={styles.stepperRow}>
            <Button label="−1h" tone="ghost" onPress={() => setHours((value) => Math.max(1, value - 1))} />
            <Button label="+1h" tone="ghost" onPress={() => setHours((value) => Math.min(24, value + 1))} />
          </View>
        </View>
        <Field label="Note" value={note} onChangeText={setNote} placeholder="Optional" />
        <Muted>Estimate {inr(item.price * quantity)}</Muted>
        {error ? <ErrorNote message={error} /> : null}
        {isSignedIn ? (
          <Button label="Send request" loading={booking.isPending} disabled={item.available < 1} onPress={() => booking.mutate()} />
        ) : (
          <Button label="Sign in to request" onPress={() => router.push("/sign-in")} />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { height: 220, borderRadius: 18, backgroundColor: colors.sand },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, color: colors.ink },
  price: { fontFamily: fonts.medium, fontSize: 20, color: colors.ink },
  per: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
  section: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  stepper: { gap: 8 },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepLabel: { fontFamily: fonts.body, color: colors.ink, fontSize: 15 },
  stepValue: { fontFamily: fonts.medium, fontSize: 18, color: colors.ink, minWidth: 28, textAlign: "center" },
});
