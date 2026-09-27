import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Fraunces_600SemiBold, Fraunces_600SemiBold_Italic } from "@expo-google-fonts/fraunces";
import { DMSans_400Regular, DMSans_500Medium } from "@expo-google-fonts/dm-sans";
import { loadSavedApiBase, setAuthTokenGetter } from "../src/api";
import { ModeProvider } from "../src/mode";
import { colors, fonts } from "../src/theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

function AuthBridge() {
  const { getToken, isLoaded } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken, isLoaded]);
  return null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
  });
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    loadSavedApiBase().finally(() => setUrlReady(true));
  }, []);

  useEffect(() => {
    if ((loaded || error) && urlReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded, error, urlReady]);

  if ((!loaded && !error) || !urlReady) return null;

  const stack = (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.medium, color: colors.ink },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ title: "Sign in", presentation: "modal" }} />
      <Stack.Screen name="sso-callback" options={{ headerShown: false }} />
      <Stack.Screen name="resource/[id]" options={{ title: "Resource" }} />
      <Stack.Screen name="booking/[id]" options={{ title: "Request" }} />
      <Stack.Screen name="contract/[id]" options={{ title: "Contract" }} />
      <Stack.Screen name="labels/[id]" options={{ title: "Unit codes" }} />
    </Stack>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ModeProvider>
        <StatusBar style="dark" />
        {publishableKey ? (
          <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <AuthBridge />
            {stack}
          </ClerkProvider>
        ) : (
          stack
        )}
      </ModeProvider>
    </QueryClientProvider>
  );
}
