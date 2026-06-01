import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Calculation } from "@workspace/api-client-react";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CalculationCard({
  item,
  onDelete,
  deleting,
}: {
  item: Calculation;
  onDelete: (item: Calculation) => void;
  deleting?: boolean;
}) {
  const colors = useColors();
  const isThroughput = item.type === "throughput";
  const icon = isThroughput ? "speedometer" : "access-point";
  const typeLabel = isThroughput ? "Throughput" : "Link Budget";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: deleting ? 0.5 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconBadge,
            { backgroundColor: colors.secondary, borderRadius: colors.radius - 6 },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={colors.accent}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {item.title}
          </Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {typeLabel} · {formatDate(item.createdAt)}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Excluir cálculo"
          disabled={deleting}
          onPress={() => onDelete(item)}
          hitSlop={10}
          style={styles.deleteBtn}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={20}
            color={colors.destructive}
          />
        </TouchableOpacity>
      </View>

      <Text style={[styles.summary, { color: colors.foreground }]}>
        {item.summary}
      </Text>
      {item.notes ? (
        <Text style={[styles.notes, { color: colors.mutedForeground }]}>
          {item.notes}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  meta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
  },
  summary: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 21,
  },
  notes: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
});
