import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { isUnauthorized } from "../../src/api";
import { inr } from "../../src/format";
import { useAnalytics } from "../../src/queries";
import { CATEGORY_LABEL, type AnalyticsSummary } from "../../src/types";
import { colors, fonts } from "../../src/theme";
import { Card, Centered, ErrorNote, Muted, Pill, Screen, SignInPrompt } from "../../src/ui";

const RANGES: AnalyticsSummary["range"][] = ["7d", "30d", "90d"];

export default function AnalyticsScreen() {
  const router = useRouter();
  const [range, setRange] = useState<AnalyticsSummary["range"]>("30d");
  const analytics = useAnalytics(range);

  if (analytics.isLoading) return <Centered label="Adding up the exchange…" />;
  if (analytics.isError && isUnauthorized(analytics.error)) {
    return (
      <Screen>
        <SignInPrompt onPress={() => router.push("/sign-in")} />
      </Screen>
    );
  }

  const data = analytics.data;

  return (
    <Screen>
      <View style={styles.row}>
        {RANGES.map((item) => (
          <Pill key={item} label={item} active={range === item} onPress={() => setRange(item)} />
        ))}
      </View>
      {analytics.isError || !data ? <ErrorNote message="Couldn't load analytics." /> : null}
      {data ? (
        <>
          <View style={styles.grid}>
            <Stat label="Earned" value={inr(data.earned)} />
            <Stat label="Spent" value={inr(data.spent)} />
            <Stat label="Bookings" value={String(data.bookings)} />
            <Stat label="Utilisation" value={`${Math.round(data.utilisation * 100)}%`} />
          </View>
          <Card>
            <Text style={styles.heading}>By category</Text>
            {data.byCategory.length === 0 ? <Muted>No category totals in this range.</Muted> : null}
            {data.byCategory.map((row) => (
              <View key={row.category} style={styles.line}>
                <Text style={styles.lineLabel}>{CATEGORY_LABEL[row.category] ?? row.category}</Text>
                <Text style={styles.lineValue}>
                  {row.bookings} · {inr(row.revenue)}
                </Text>
              </View>
            ))}
          </Card>
          <Muted>
            {data.pendingRequests} provider requests waiting · {data.activeRequests} seeker requests in flight · typical reply{" "}
            {data.avgResponseMins} min
          </Muted>
        </>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.value}>{value}</Text>
      <Muted>{label}</Muted>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { width: "48%", flexGrow: 1 },
  value: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  heading: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  lineLabel: { fontFamily: fonts.body, color: colors.ink, flex: 1 },
  lineValue: { fontFamily: fonts.medium, color: colors.ink },
});
