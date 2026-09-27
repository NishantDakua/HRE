import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useSignIn, useSSO } from "@clerk/clerk-expo";
import { colors, fonts } from "../src/theme";
import { Button, ErrorNote, Field, Screen } from "../src/ui";

WebBrowser.maybeCompleteAuthSession();

function clerkMessage(caught: unknown): string {
  if (caught && typeof caught === "object" && "errors" in caught) {
    const errors = (caught as { errors?: { longMessage?: string; message?: string }[] }).errors;
    const first = errors?.[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
  }
  if (caught instanceof Error && caught.message) return caught.message;
  return "Couldn't sign in";
}

function expoGoRedirect(): string {
  const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  return AuthSession.makeRedirectUri({
    path: "sso-callback",
    scheme: inExpoGo ? undefined : "spare",
  });
}

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"password" | "google" | null>(null);

  const finish = async (sessionId: string | null | undefined, activate?: typeof setActive) => {
    if (!sessionId || !activate) return false;
    await activate({ session: sessionId });
    if (router.canGoBack()) router.back();
    else router.replace("/");
    return true;
  };

  const submit = async () => {
    if (!isLoaded || !signIn) return;
    setPending("password");
    setError(null);
    try {
      const attempt = await signIn.create({ identifier: identifier.trim(), password });
      if (await finish(attempt.createdSessionId, setActive)) return;
      setError("This account needs Google. Use Continue with Google.");
    } catch (caught) {
      setError(clerkMessage(caught));
    } finally {
      setPending(null);
    }
  };

  const google = async () => {
    setPending("google");
    setError(null);
    const redirectUrl = expoGoRedirect();
    try {
      const result = await startSSOFlow({ strategy: "oauth_google", redirectUrl });
      if (await finish(result.createdSessionId, result.setActive ?? setActive)) return;
      if (result.authSessionResult?.type === "cancel" || result.authSessionResult?.type === "dismiss") return;
      setError(
        `Google did not return a session. In the Clerk dashboard, under Native applications, allow this redirect: ${redirectUrl}`,
      );
    } catch (caught) {
      const message = clerkMessage(caught);
      setError(message.includes("redirect") ? `${message} Allow this redirect in Clerk: ${redirectUrl}` : message);
    } finally {
      setPending(null);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.copy}>Same Clerk account as the website. Google works inside Expo Go.</Text>
      <Button label="Continue with Google" tone="ghost" loading={pending === "google"} disabled={pending !== null} onPress={() => void google()} />
      <View style={styles.rule} />
      <Field
        label="Email or username"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={identifier}
        onChangeText={setIdentifier}
      />
      <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <ErrorNote message={error} /> : null}
      <Button
        label="Sign in"
        loading={pending === "password"}
        disabled={pending !== null || !identifier.trim() || password.length < 8}
        onPress={() => void submit()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 34, color: colors.ink },
  copy: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.muted },
  rule: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
});
