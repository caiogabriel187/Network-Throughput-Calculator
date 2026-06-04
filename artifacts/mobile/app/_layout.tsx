import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useColors } from "@/hooks/useColors";

// Expo bundles run outside the web proxy, so the API client needs an absolute
// URL to reach the Express server.
//
// Resolution order:
//   1. EXPO_PUBLIC_API_URL — explicit override. Set this (e.g. in a `.env`
//      file) when running outside Replit, such as in the Android Studio
//      emulator. Examples:
//        - https://<seu-app>.replit.app   (API publicada no Replit)
//        - http://10.0.2.2:8080           (API local; 10.0.2.2 = host do AVD)
//   2. EXPO_PUBLIC_DOMAIN — injected automatically in the Replit dev/deploy
//      environment.
function resolveApiBaseUrl(): string | null {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (domain) return `https://${domain}`;

  return null;
}

const apiBaseUrl = resolveApiBaseUrl();
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
}

// ---------------------------------------------------------------------------
// Per-device anonymous session token
//
// Each device generates a random UUID the first time the app runs and persists
// it in AsyncStorage. This token is sent as a Bearer header on every request to
// the calculations API, so the server can scope history reads and writes to
// that device only. The token never leaves the device storage — it is NOT
// bundled into the app binary (unlike EXPO_PUBLIC_* variables), so it cannot
// be extracted by inspecting the JavaScript bundle.
// ---------------------------------------------------------------------------
const SESSION_KEY = "@5gnr/session_token";

async function getOrCreateSessionToken(): Promise<string> {
  let token = await AsyncStorage.getItem(SESSION_KEY);
  if (!token) {
    token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem(SESSION_KEY, token);
  }
  return token;
}

// The getter returns a Promise; customFetch awaits it before each request.
const sessionTokenPromise = getOrCreateSessionToken();
setAuthTokenGetter(() => sessionTokenPromise);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Voltar",
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
        },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="throughput" options={{ title: "Throughput 5G NR" }} />
      <Stack.Screen
        name="link-budget"
        options={{ title: "Link Budget 5G NR" }}
      />
      <Stack.Screen name="history" options={{ title: "Histórico" }} />
      <Stack.Screen
        name="save-calculation"
        options={{ title: "Salvar cálculo", presentation: "modal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
