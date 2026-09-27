import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { apiErrorMessage, postJson } from "../../src/api";
import { useResources } from "../../src/queries";
import { colors, fonts } from "../../src/theme";
import { AREAS, CATEGORY_LABEL, CATEGORIES, type Area, type ParsedRequest, type ResourceCategory, type ResourceWithBusiness } from "../../src/types";
import { inr, perUnit } from "../../src/format";
import { Button, ErrorNote, Muted, Pill } from "../../src/ui";

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState<ResourceCategory | undefined>();
  const [area, setArea] = useState<Area | undefined>();
  const [paste, setPaste] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  const filters = useMemo(() => ({ q, category, area }), [q, category, area]);
  const resources = useResources(filters);

  const parse = useMutation({
    mutationFn: (text: string) => postJson<ParsedRequest>("/requests/parse", { text }),
    onSuccess: (parsed) => {
      setParseError(null);
      const item = parsed.items[0];
      if (item) setCategory(item.category);
      if (parsed.area) setArea(parsed.area);
    },
    onError: (error) => setParseError(apiErrorMessage(error)),
  });

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 28, gap: 12 }}
      data={resources.data ?? []}
      keyExtractor={(item) => item.id}
      refreshing={resources.isRefetching}
      onRefresh={() => void resources.refetch()}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Discover</Text>
          <Text style={styles.title}>
            Find it <Text style={styles.italic}>nearby.</Text>
          </Text>
          <TextInput
            value={paste}
            onChangeText={setPaste}
            placeholder="Paste a WhatsApp request"
            placeholderTextColor={colors.muted}
            style={styles.paste}
            multiline
          />
          <Button
            label="Parse"
            tone="ghost"
            loading={parse.isPending}
            disabled={paste.trim().length < 4}
            onPress={() => parse.mutate(paste.trim())}
          />
          {parseError ? <ErrorNote message={parseError} /> : null}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => setQ(draft.trim())}
            placeholder="Search chairs, halls, vans"
            placeholderTextColor={colors.muted}
            style={styles.search}
            returnKeyType="search"
          />
          <View style={styles.chips}>
            <Pill label="All" active={!category} onPress={() => setCategory(undefined)} />
            {CATEGORIES.map((id) => (
              <Pill key={id} label={CATEGORY_LABEL[id]} active={category === id} onPress={() => setCategory(id)} />
            ))}
          </View>
          <View style={styles.chips}>
            <Pill label="Anywhere" active={!area} onPress={() => setArea(undefined)} />
            {AREAS.map((name) => (
              <Pill key={name} label={name} active={area === name} onPress={() => setArea(name)} />
            ))}
          </View>
          {resources.isLoading ? <Muted>Finding providers…</Muted> : null}
          {resources.isError ? (
            <ErrorNote message="Can't reach the Spare API. Start the server, or set EXPO_PUBLIC_API_URL to the hosted address." />
          ) : null}
        </View>
      }
      ListEmptyComponent={
        !resources.isLoading && !resources.isError ? <Muted>No listings match that search.</Muted> : null
      }
      renderItem={({ item }) => <ResourceRow resource={item} onPress={() => router.push(`/resource/${item.id}`)} />}
    />
  );
}

function ResourceRow({ resource, onPress }: { resource: ResourceWithBusiness; onPress: () => void }) {
  const photo = resource.photos?.[0]?.url;
  return (
    <Pressable onPress={onPress} style={styles.card}>
      {photo ? <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" /> : <View style={styles.photoFallback} />}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {resource.title}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {resource.business.name} · {resource.business.area}
        </Text>
        <Text style={styles.price}>
          {inr(resource.price)}
          <Text style={styles.cardMeta}> / {perUnit(resource.unit)}</Text>
        </Text>
        <Text style={styles.cardMeta}>
          {resource.available} of {resource.quantity} {resource.unitLabel} free
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.paper },
  header: { gap: 12, marginBottom: 8 },
  eyebrow: { fontFamily: fonts.medium, letterSpacing: 1.4, textTransform: "uppercase", color: colors.terracotta, fontSize: 12 },
  title: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, color: colors.ink },
  italic: { fontFamily: fonts.displayItalic },
  paste: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    textAlignVertical: "top",
  },
  search: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  photo: { width: 108, height: 124 },
  photoFallback: { width: 108, height: 124, backgroundColor: colors.sand },
  cardBody: { flex: 1, paddingVertical: 12, paddingRight: 12, gap: 4 },
  cardTitle: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  cardMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  price: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
});
