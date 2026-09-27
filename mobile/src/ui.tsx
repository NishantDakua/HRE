import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { colors, fonts } from "./theme";

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Display({ children }: { children: string }) {
  return <Text style={styles.display}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  disabled,
  tone = "primary",
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "primary" | "ghost" | "danger";
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === "ghost" && styles.buttonGhost,
        tone === "danger" && styles.buttonDanger,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone === "ghost" ? colors.ink : colors.white} />
      ) : (
        <Text style={[styles.buttonLabel, tone === "ghost" && styles.buttonLabelGhost]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, ...input }: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...input} />
    </View>
  );
}

export function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return <Text style={styles.error}>{message}</Text>;
}

export function Centered({ label }: { label: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.terracotta} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function SignInPrompt({ onPress }: { onPress: () => void }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>Sign in to continue</Text>
      <Muted>Requests, your dashboard and contracts belong to the company you sign in as.</Muted>
      <Button label="Sign in" onPress={onPress} />
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, paddingBottom: 36, gap: 14 },
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.ink },
  muted: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  button: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  buttonGhost: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  buttonDanger: { backgroundColor: colors.conflict },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { fontFamily: fonts.medium, color: colors.white, fontSize: 15 },
  buttonLabelGhost: { color: colors.ink },
  pressed: { opacity: 0.85 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  pillLabelActive: { color: colors.paper },
  error: { fontFamily: fonts.body, color: colors.conflict, fontSize: 14, lineHeight: 20 },
  centered: { paddingVertical: 48, alignItems: "center", gap: 10 },
});
