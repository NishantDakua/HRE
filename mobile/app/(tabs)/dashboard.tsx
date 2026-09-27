import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { isUnauthorized } from "../../src/api";
import { inr } from "../../src/format";
import { useMode } from "../../src/mode";
import { useBookings, useMyResources } from "../../src/queries";
import { colors, fonts } from "../../src/theme";
import { Button, Card, Centered, ErrorNote, Muted, Pill, Screen, SignInPrompt } from "../../src/ui";

export default function DashboardScreen() {
  const router = useRouter();
  const { mode, setMode } = useMode();
  const bookings = useBookings();
  const mine = useMyResources();
  const active = (bookings.data ?? []).filter((booking) => !["COMPLETED", "REJECTED", "CANCELLED"].includes(booking.status));

  if ((mode === "seeker" ? bookings.isLoading : mine.isLoading) && !bookings.data && !mine.data) {
    return <Centered label="Loading your company…" />;
  }

  const error = mode === "provider" ? mine.error : bookings.error;
  if (error && isUnauthorized(error)) {
    return (
      <Screen>
        <SignInPrompt onPress={() => router.push("/sign-in")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.row}>
        <Pill label="Seeker" active={mode === "seeker"} onPress={() => setMode("seeker")} />
        <Pill label="Provider" active={mode === "provider"} onPress={() => setMode("provider")} />
      </View>
      {mode === "seeker" ? (
        <>
          <Card>
            <Text style={styles.kpi}>{active.length}</Text>
            <Muted>Requests still in flight</Muted>
          </Card>
          {bookings.isError ? <ErrorNote message="Couldn't load your requests." /> : null}
          {active.slice(0, 6).map((booking) => (
            <Pressable key={booking.id} onPress={() => router.push(`/booking/${booking.id}`)}>
              <Card>
                <Text style={styles.title}>{booking.title}</Text>
                <Muted>
                  {booking.ref} · {booking.status}
                </Muted>
              </Card>
            </Pressable>
          ))}
          <Button label="Browse the exchange" tone="ghost" onPress={() => router.push("/")} />
        </>
      ) : (
        <>
          {mine.isError ? <ErrorNote message="Couldn't load your listings." /> : null}
          {(mine.data ?? []).map((listing) => (
            <Card key={listing.id}>
              <Text style={styles.title}>{listing.title}</Text>
              <Muted>
                {listing.available} of {listing.quantity} {listing.unitLabel} free · {listing.pendingRequests} waiting
              </Muted>
              <Muted>{inr(listing.price)} list price</Muted>
              <Button label="Unit codes" tone="ghost" onPress={() => router.push(`/labels/${listing.id}`)} />
            </Card>
          ))}
          {(mine.data ?? []).length === 0 && !mine.isLoading ? <Muted>You have no listings yet. Add them on the website.</Muted> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  kpi: { fontFamily: fonts.display, fontSize: 42, color: colors.ink },
  title: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
});
