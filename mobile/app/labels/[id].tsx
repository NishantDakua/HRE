import { FlatList, StyleSheet, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { isUnauthorized } from "../../src/api";
import { useListingUnits } from "../../src/queries";
import { colors, fonts } from "../../src/theme";
import { Centered, ErrorNote, Muted } from "../../src/ui";

export default function LabelsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const units = useListingUnits(id ?? "");

  if (units.isLoading) return <Centered label="Preparing unit codes…" />;
  if (units.isError && isUnauthorized(units.error)) return <Centered label="Only the listing owner can see these codes." />;
  if (!units.data) return <Centered label="No unit codes yet." />;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={units.data.units}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>{units.data.title}</Text>
          <Muted>
            {units.data.units.length} codes · {units.data.available} of {units.data.quantity} {units.data.unitLabel} free. Print the QR sheet from the website.
          </Muted>
          {units.isError ? <ErrorNote message="Couldn't load unit codes." /> : null}
        </>
      }
      renderItem={({ item }) => (
        <Text style={styles.row}>
          {item.label}  {item.code}  ·  {item.status.replaceAll("_", " ")}
        </Text>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 8, paddingBottom: 32 },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, marginBottom: 4 },
  row: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.line },
});
