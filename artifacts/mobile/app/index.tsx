import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = 67;
const WEB_BOTTOM_INSET = 34;

function CalcCard({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View
        style={[
          styles.iconBadge,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={26} color={colors.accent} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>
          {title}
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
          {subtitle}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={colors.mutedForeground}
      />
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, status, signOut } = useAuth();
  const isWeb = Platform.OS === "web";
  const isAuthenticated = status === "authenticated";

  const topPad = isWeb ? WEB_TOP_INSET : insets.top + 12;
  const bottomPad = isWeb ? WEB_BOTTOM_INSET : insets.bottom + 24;

  const handleLogout = () => {
    if (isWeb) {
      signOut();
      return;
    }
    Alert.alert("Sair", "Deseja encerrar a sessão?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => signOut() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingBottom: bottomPad,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <LinearGradient
            colors={[colors.accent, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logo}
          >
            <MaterialCommunityIcons
              name="signal"
              size={26}
              color={colors.primaryForeground}
            />
          </LinearGradient>
          <View style={styles.brandText}>
            <Text style={[styles.brandTitle, { color: colors.foreground }]}>
              5G NR Tools
            </Text>
            <Text
              style={[styles.brandSubtitle, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {user?.email ?? "Calculadoras de engenharia de rede"}
            </Text>
          </View>
          {isAuthenticated ? (
            <Pressable
              onPress={handleLogout}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Sair da conta"
              style={({ pressed }) => [
                styles.logoutBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="logout"
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push("/login")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Entrar na conta"
              style={({ pressed }) => [
                styles.loginBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="login"
                size={18}
                color={colors.primary}
              />
              <Text style={[styles.loginBtnText, { color: colors.primary }]}>
                Entrar
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={[styles.hero, { color: colors.foreground }]}>
          Dimensione sua{"\n"}rede 5G NR
        </Text>
        <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
          Calcule throughput de pico e o link budget de cobertura com base nas
          fórmulas 3GPP.
        </Text>

        <View style={styles.cardsWrap}>
          <CalcCard
            title="Throughput 5G NR"
            subtitle="Taxa máxima de DL/UL (TS 38.214)"
            icon="speedometer"
            onPress={() => router.push("/throughput")}
          />
          <CalcCard
            title="Link Budget 5G NR"
            subtitle="Sensibilidade, MAPL e raio de célula"
            icon="radio-tower"
            onPress={() => router.push("/link-budget")}
          />
          <CalcCard
            title="Histórico de cálculos"
            subtitle={
              isAuthenticated
                ? "Resultados salvos na sua conta"
                : "Entre para salvar e revisar cálculos"
            }
            icon="history"
            onPress={() => router.push("/history")}
          />
        </View>

        <View
          style={[
            styles.note,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <MaterialCommunityIcons
            name="information-outline"
            size={18}
            color={colors.mutedForeground}
          />
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            Todos os cálculos são feitos no dispositivo, sem conexão. Valores são
            teóricos de pico para fins de planejamento.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 36,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { flex: 1 },
  brandTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  brandSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  loginBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  hero: {
    fontFamily: "Inter_700Bold",
    fontSize: 34,
    lineHeight: 40,
    marginBottom: 12,
  },
  heroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  cardsWrap: { gap: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  cardSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 3 },
  note: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 28,
  },
  noteText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
});
