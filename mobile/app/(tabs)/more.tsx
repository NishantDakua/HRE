import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQueryClient } from "@tanstack/react-query";
import { apiBaseUrl, isUnauthorized, saveApiBase } from "../../src/api";
import { when } from "../../src/format";
import { useMode } from "../../src/mode";
import { useNotifications } from "../../src/queries";
import { colors, fonts } from "../../src/theme";
import { Button, Card, ErrorNote, Field, Muted, Pill, Screen } from "../../src/ui";

export default function MoreScreen() {
  const router = useRouter();
  const { mode, setMode } = useMode();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const notes = useNotifications();
  const queryClient = useQueryClient();
  const [server, setServer] = useState(apiBaseUrl());
  const [serverNote, setServerNote] = useState<string | null>(null);
  const [serverSaved, setServerSaved] = useState(false);

  return (
    <Screen>
      <Text style={styles.title}>Spare</Text>
      <Muted>The same exchange as the website, on your phone.</Muted>
      <View style={styles.row}>
        <Pill label="Seeker" active={mode === "seeker"} onPress={() => setMode("seeker")} />
        <Pill label="Provider" active={mode === "provider"} onPress={() => setMode("provider")} />
      </View>
      <Card>
        {isSignedIn ? (
          <>
            <Text style={styles.name}>{user?.fullName || user?.primaryEmailAddress?.emailAddress || "Signed in"}</Text>
            <Muted>{user?.primaryEmailAddress?.emailAddress}</Muted>
            <Button label="Sign out" tone="ghost" onPress={() => void signOut()} />
          </>
        ) : (
          <>
            <Text style={styles.name}>You are browsing as a guest</Text>
            <Button label="Sign in" onPress={() => router.push("/sign-in")} />
          </>
        )}
      </Card>
      <Card>
        <Text style={styles.name}>Server</Text>
        <Muted>The address of the Spare API. On a phone this cannot be localhost. Use your computer’s address on the same Wi‑Fi, or the hosted URL later.</Muted>
        <Field
          label="API address"
          autoCapitalize="none"
          autoCorrect={false}
          value={server}
          onChangeText={setServer}
          placeholder="http://192.168.1.20:5000/api"
        />
        {serverNote ? <ErrorNote message={serverNote} /> : null}
        {serverSaved ? <Muted>Saved. The app will load from this server.</Muted> : null}
        <Button
          label="Save server"
          tone="ghost"
          onPress={() => {
            const next = server.trim();
            if (!/^https?:\/\/.+/i.test(next)) {
              setServerSaved(false);
              setServerNote("Start with http:// or https:// and include the /api path.");
              return;
            }
            setServerNote(null);
            void saveApiBase(next).then(() => {
              setServerSaved(true);
              return queryClient.invalidateQueries();
            });
          }}
        />
      </Card>
      <Text style={styles.name}>Notifications</Text>
      {notes.isError && isUnauthorized(notes.error) ? <Muted>Sign in to see notifications.</Muted> : null}
      {notes.isError && !isUnauthorized(notes.error) ? <Muted>Notifications are unavailable.</Muted> : null}
      {(notes.data ?? []).slice(0, 8).map((note) => (
        <Card key={note.id}>
          <Text style={styles.noteTitle}>{note.title}</Text>
          <Muted>{note.body}</Muted>
          <Muted>{when(note.createdAt)}</Muted>
        </Card>
      ))}
      {notes.data && notes.data.length === 0 ? <Muted>No notifications.</Muted> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 40, color: colors.ink },
  name: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  noteTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  row: { flexDirection: "row", gap: 8 },
});
