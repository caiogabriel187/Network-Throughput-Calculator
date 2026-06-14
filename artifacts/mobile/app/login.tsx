import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Segmented, TextField } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type Mode = "login" | "register";

function statusOf(err: unknown): number | null {
  if (
    err &&
    typeof err === "object" &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  ) {
    return (err as { status: number }).status;
  }
  return null;
}

function errorMessage(mode: Mode, err: unknown): string {
  const status = statusOf(err);
  if (status === 401) return "E-mail ou senha incorretos.";
  if (status === 409) return "Este e-mail já está cadastrado. Faça login.";
  if (status === 400) return "Verifique os dados informados e tente de novo.";
  if (status === 429) return "Muitas tentativas. Aguarde um momento.";
  return mode === "login"
    ? "Não foi possível entrar. Verifique sua conexão."
    : "Não foi possível criar a conta. Verifique sua conexão.";
}

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit() {
    setError(null);
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    if (!trimmedEmail.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        await signIn(trimmedEmail, password);
      } else {
        await signUp(trimmedEmail, password);
      }
      // On success, dismiss the login screen and return to where the user came
      // from (home or history); both reflect the new authenticated state.
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    } catch (err) {
      setError(errorMessage(mode, err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[colors.accent, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logo}
          >
            <MaterialCommunityIcons
              name="signal"
              size={30}
              color={colors.primaryForeground}
            />
          </LinearGradient>

          <Text style={[styles.title, { color: colors.foreground }]}>
            5G NR Calculadora
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {isLogin
              ? "Entre para acessar seus cálculos salvos."
              : "Crie uma conta para salvar seus cálculos na nuvem."}
          </Text>

          <View style={styles.segmented}>
            <Segmented<Mode>
              value={mode}
              onChange={(next) => {
                setMode(next);
                setError(null);
              }}
              options={[
                { label: "Entrar", value: "login" },
                { label: "Criar conta", value: "register" },
              ]}
            />
          </View>

          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo de 8 caracteres"
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isLogin ? "current-password" : "new-password"}
            error={error}
          />

          <View style={styles.action}>
            <Button
              label={isLogin ? "Entrar" : "Criar conta"}
              onPress={handleSubmit}
              loading={submitting}
            />
          </View>

          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {isLogin
              ? "Ainda não tem conta? Toque em “Criar conta”."
              : "Já tem conta? Toque em “Entrar”."}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  segmented: {
    marginBottom: 24,
  },
  action: {
    marginTop: 6,
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
  },
});
