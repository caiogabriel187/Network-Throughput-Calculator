import React from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
      {children}
    </Text>
  );
}

export function FieldLabel({
  label,
  hint,
}: {
  label: string;
  hint?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
        {label}
      </Text>
      {hint ? (
        <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function NumberField({
  label,
  unit,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  unit?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldBlock}>
      <FieldLabel label={label} hint={unit} />
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.input,
            borderColor: colors.border,
            borderRadius: colors.radius - 4,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numbers-and-punctuation"
          style={[styles.input, { color: colors.foreground }]}
        />
      </View>
    </View>
  );
}

export function PillSelector<T extends string | number>({
  label,
  options,
  value,
  onChange,
  formatOption,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  formatOption?: (v: T) => string;
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldBlock}>
      <FieldLabel label={label} />
      <View style={styles.pillRow}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              activeOpacity={0.8}
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.selectionAsync();
                }
                onChange(opt.value);
              }}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? colors.primary : colors.secondary,
                  borderColor: active ? colors.primary : colors.border,
                  borderRadius: colors.radius - 4,
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color: active
                      ? colors.primaryForeground
                      : colors.secondaryForeground,
                  },
                ]}
              >
                {formatOption ? formatOption(opt.value) : opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.segmented,
        {
          backgroundColor: colors.secondary,
          borderRadius: colors.radius - 4,
          borderColor: colors.border,
        },
      ]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.8}
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.selectionAsync();
              }
              onChange(opt.value);
            }}
            style={[
              styles.segment,
              {
                backgroundColor: active ? colors.primary : "transparent",
                borderRadius: colors.radius - 6,
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: active
                    ? colors.primaryForeground
                    : colors.mutedForeground,
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function ResultRow({
  label,
  value,
  unit,
  emphasize,
}: {
  label: string;
  value: string;
  unit?: string;
  emphasize?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.resultRow}>
      <Text
        style={[
          styles.resultLabel,
          { color: emphasize ? colors.foreground : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
      <View style={styles.resultValueWrap}>
        <Text
          style={[
            emphasize ? styles.resultValueBig : styles.resultValue,
            { color: emphasize ? colors.accent : colors.foreground },
          ]}
        >
          {value}
        </Text>
        {unit ? (
          <Text style={[styles.resultUnit, { color: colors.mutedForeground }]}>
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string | null;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldBlock}>
      <FieldLabel label={label} />
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.input,
            borderColor: error ? colors.destructive : colors.border,
            borderRadius: colors.radius - 4,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          multiline={multiline}
          autoFocus={autoFocus}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            { color: colors.foreground },
          ]}
        />
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "destructive";
}) {
  const colors = useColors();
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "destructive"
        ? colors.destructive
        : colors.secondary;
  const fg =
    variant === "secondary" ? colors.secondaryForeground : colors.primaryForeground;
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isDisabled}
      onPress={() => {
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onPress();
      }}
      style={[
        styles.button,
        {
          backgroundColor: bg,
          borderRadius: colors.radius - 4,
          opacity: isDisabled ? 0.55 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 6,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  button: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  fieldBlock: {
    marginBottom: 18,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  fieldHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  inputWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
  input: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    paddingVertical: 12,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 44,
    alignItems: "center",
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  segmented: {
    flexDirection: "row",
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  resultLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    flex: 1,
  },
  resultValueWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },
  resultValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  resultValueBig: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
  },
  resultUnit: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
