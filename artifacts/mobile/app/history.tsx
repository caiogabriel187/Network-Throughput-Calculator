import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalculationCard } from "@/components/CalculationCard";
import { Button } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  getGetCalculationsQueryKey,
  useDeleteCalculation,
  useGetCalculations,
  type Calculation,
} from "@workspace/api-client-react";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useGetCalculations({
      query: {
        enabled: isAuthenticated,
        queryKey: getGetCalculationsQueryKey(),
      },
    });

  // Refetch whenever the screen regains focus (e.g. after saving a new item).
  // Only when signed in — the endpoint requires a session.
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) refetch();
    }, [isAuthenticated, refetch]),
  );

  const deleteMutation = useDeleteCalculation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetCalculationsQueryKey(),
        });
      },
      onError: (err) => {
        Alert.alert(
          "Falha ao excluir",
          err instanceof Error ? err.message : "Tente novamente.",
        );
      },
      onSettled: () => setDeletingId(null),
    },
  });

  const confirmDelete = useCallback(
    (item: Calculation) => {
      const run = () => {
        setDeletingId(item.id);
        deleteMutation.mutate({ id: item.id });
      };
      if (Platform.OS === "web") {
        run();
      } else {
        Alert.alert(
          "Excluir cálculo",
          `Remover "${item.title}"?`,
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Excluir", style: "destructive", onPress: run },
          ],
        );
      }
    },
    [deleteMutation],
  );

  if (!isAuthenticated) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons
          name="lock-outline"
          size={40}
          color={colors.mutedForeground}
        />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          Entre para ver seu histórico
        </Text>
        <Text style={[styles.centerText, { color: colors.mutedForeground }]}>
          Faça login para salvar cálculos na sua conta e acessá-los de qualquer
          dispositivo.
        </Text>
        <View style={{ marginTop: 16 }}>
          <Button
            label="Entrar ou criar conta"
            onPress={() => router.push("/login")}
          />
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View
        style={[styles.center, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.centerText, { color: colors.mutedForeground }]}>
          Carregando cálculos…
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons
          name="wifi-alert"
          size={40}
          color={colors.destructive}
        />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          Falha na conexão
        </Text>
        <Text style={[styles.centerText, { color: colors.mutedForeground }]}>
          {error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados."}
        </Text>
        <View style={{ marginTop: 16 }}>
          <Button label="Tentar novamente" onPress={() => refetch()} />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={data ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: insets.bottom + 32,
      }}
      onRefresh={() => refetch()}
      refreshing={isRefetching}
      ListHeaderComponent={
        <View style={{ marginBottom: 16 }}>
          <Button
            label="+ Salvar novo cálculo"
            onPress={() => router.push("/save-calculation")}
          />
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <MaterialCommunityIcons
            name="folder-open-outline"
            size={40}
            color={colors.mutedForeground}
          />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>
            Nenhum cálculo salvo
          </Text>
          <Text style={[styles.centerText, { color: colors.mutedForeground }]}>
            Salve um resultado para vê-lo aqui.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <CalculationCard
          item={item}
          onDelete={confirmDelete}
          deleting={deletingId === item.id}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  centerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  errorTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    marginTop: 12,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
  },
});
