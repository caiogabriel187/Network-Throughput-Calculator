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

import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
//   3. PUBLISHED_API_URL — the deployed Replit backend, used as the default so
//      standalone builds (e.g. the Android Studio APK) reach the API on any
//      network without needing a `.env` file.
const PUBLISHED_API_URL = "https://network-throughput-calculator.replit.app";

function resolveApiBaseUrl(): string | null {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (domain) return `https://${domain}`;

  return PUBLISHED_API_URL;
}

const apiBaseUrl = resolveApiBaseUrl();
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const colors = useColors();
  const { status } = useAuth();

  // Keep the splash screen up until the persisted session has been resolved,
  // so the user never sees a flash of the login screen on a warm start.
  useEffect(() => {
    if (status !== "loading") {
      SplashScreen.hideAsync();
    }
  }, [status]);

  if (status === "loading") return null;

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
      {/* Calculators are open to everyone; only the cloud history/save flow
          requires an account, gated inside the respective screens. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="throughput"
        options={{ title: "Throughput 5G NR" }}
      />
      <Stack.Screen
        name="link-budget"
        options={{ title: "Link Budget 5G NR" }}
      />
      <Stack.Screen name="history" options={{ title: "Histórico" }} />
      <Stack.Screen
        name="save-calculation"
        options={{ title: "Salvar cálculo", presentation: "modal" }}
      />
      <Stack.Screen name="login" options={{ title: "Entrar" }} />
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

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
