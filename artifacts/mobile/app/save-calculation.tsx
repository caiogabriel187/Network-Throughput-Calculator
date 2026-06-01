import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Button, Card, SectionLabel, Segmented, TextField } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import {
  CalculationType,
  getGetCalculationsQueryKey,
  useCreateCalculation,
} from "@workspace/api-client-react";

const WEB_BOTTOM_INSET = 34;

type FormType = (typeof CalculationType)[keyof typeof CalculationType];

export default function SaveCalculationScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    type?: string;
    title?: string;
    summary?: string;
  }>();

  const initialType: FormType =
    params.type === "link-budget" ? "link-budget" : "throughput";

  const [type, setType] = useState<FormType>(initialType);
  const [title, setTitle] = useState(params.title ?? "");
  const [summary, setSummary] = useState(params.summary ?? "");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ title?: string; summary?: string }>({});

  const createMutation = useCreateCalculation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetCalculationsQueryKey(),
        });
        if (Platform.OS !== "web") {
          Alert.alert("Salvo", "Cálculo adicionado ao histórico.");
        }
        router.replace("/history");
      },
      onError: (err) => {
        Alert.alert(
          "Falha ao salvar",
          err instanceof Error ? err.message : "Verifique sua conexão.",
        );
      },
    },
  });

  const validate = () => {
    const next: { title?: string; summary?: string } = {};
    if (!title.trim()) next.title = "Informe um título.";
    if (!summary.trim()) next.summary = "Informe o resultado principal.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate({
      data: {
        type,
        title: title.trim(),
        summary: summary.trim(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      },
    });
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: (Platform.OS === "web" ? WEB_BOTTOM_INSET : 0) + 32,
      }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
      showsVerticalScrollIndicator={false}
    >
      <Card style={{ marginBottom: 20 }}>
        <SectionLabel>Tipo de cálculo</SectionLabel>
        <View style={{ marginBottom: 18 }}>
          <Segmented<FormType>
            options={[
              { label: "Throughput", value: "throughput" },
              { label: "Link Budget", value: "link-budget" },
            ]}
            value={type}
            onChange={setType}
          />
        </View>

        <TextField
          label="Título"
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            if (errors.title) setErrors((e) => ({ ...e, title: undefined }));
          }}
          placeholder="Ex.: FR1 100 MHz · 256-QAM"
          error={errors.title}
        />

        <TextField
          label="Resultado principal"
          value={summary}
          onChangeText={(v) => {
            setSummary(v);
            if (errors.summary)
              setErrors((e) => ({ ...e, summary: undefined }));
          }}
          placeholder="Ex.: DL 1.75 Gbps · 273 PRB"
          error={errors.summary}
        />

        <TextField
          label="Observações (opcional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Parâmetros, cenário, premissas…"
          multiline
        />
      </Card>

      <Button
        label="Salvar cálculo"
        onPress={handleSubmit}
        loading={createMutation.isPending}
      />
      <View style={{ height: 12 }} />
      <Button
        label="Cancelar"
        variant="secondary"
        onPress={() => router.back()}
      />
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({});
