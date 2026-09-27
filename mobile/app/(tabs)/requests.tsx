import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { isUnauthorized } from "../../src/api";
import { inr, statusLabel, when } from "../../src/format";
import { useMode } from "../../src/mode";
import { useBookings } from "../../src/queries";
import { colors, fonts } from "../../src/theme";
import { Centered, ErrorNote, Muted, Pill, SignInPrompt } from "../../src/ui";

export default function RequestsScreen() {
  const router = useRouter();
  const { mode, setMode } = useMode();
  const bookings = useBookings();

  if (bookings.isLoading) return <Centered label="Loading requests…" />;
  if (bookings.isError && isUnauthorized(bookings.error)) {
    return (
      <View style={styles.pad}>
        <SignInPrompt onPress={() => router.push("/sign-in")} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={bookings.data ?? []}
      keyExtractor={(item) => item.id}
      refreshing={bookings.isRefetching}
      onRefresh={() => void bookings.refetch()}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.row}>
            <Pill label="Seeker" active={mode === "seeker"} onPress={() => setMode("seeker")} />
            <Pill label="Provider" active={mode === "provider"} onPress={() => setMode("provider")} />
          </View>
          <Muted>{mode === "seeker" ? "Requests you sent." : "Requests for your listings."}</Muted>
          {bookings.isError ? <ErrorNote message="Couldn't load requests." /> : null}
        </View>
      }
      ListEmptyComponent={!bookings.isError ? <Muted>Nothing here yet.</Muted> : null}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => router.push(`/booking/${item.id}`)}>
          <View style={styles.between}>
            <Text style={styles.ref}>{item.ref}</Text>
            <Text style={styles.status}>{statusLabel(item.status)}</Text>
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.seeker.name} → {item.provider.name}
          </Text>
          <Text style={styles.meta}>
            {when(item.startAt)} – {when(item.endAt)}
          </Text>
          <Text style={styles.total}>{inr(item.total)}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.paper },
  pad: { flex: 1, backgroundColor: colors.paper, padding: 20 },
  content: { padding: 20, gap: 12, paddingBottom: 32 },
  header: { gap: 10, marginBottom: 4 },
  row: { flexDirection: "row", gap: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 4,
  },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ref: { fontFamily: fonts.medium, color: colors.terracotta, fontSize: 13 },
  status: { fontFamily: fonts.medium, color: colors.peacock, fontSize: 13 },
  title: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  meta: { fontFamily: fonts.body, color: colors.muted, fontSize: 14 },
  total: { fontFamily: fonts.medium, color: colors.ink, fontSize: 16, marginTop: 4 },
});
