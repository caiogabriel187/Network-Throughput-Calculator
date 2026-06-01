import React, { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import {
  Card,
  NumberField,
  ResultRow,
  SectionLabel,
  Segmented,
} from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { computeLinkBudget, type Direction } from "@/lib/calc";

const WEB_BOTTOM_INSET = 34;

function toNum(s: string, fallback = 0): number {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? fallback : n;
}

export default function LinkBudgetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [direction, setDirection] = useState<Direction>("DL");
  const [frequency, setFrequency] = useState("3500");
  const [gnbTxPower, setGnbTxPower] = useState("49");
  const [gnbGain, setGnbGain] = useState("18");
  const [gnbCableLoss, setGnbCableLoss] = useState("2");
  const [ueTxPower, setUeTxPower] = useState("23");
  const [ueGain, setUeGain] = useState("0");
  const [noiseFigure, setNoiseFigure] = useState("7");
  const [sinr, setSinr] = useState("-3");
  const [noiseBW, setNoiseBW] = useState("10");
  const [shadowMargin, setShadowMargin] = useState("7");
  const [interferenceMargin, setInterferenceMargin] = useState("3");
  const [bodyLoss, setBodyLoss] = useState("3");

  const result = useMemo(
    () =>
      computeLinkBudget({
        direction,
        frequency: toNum(frequency, 3500),
        gnbTxPower: toNum(gnbTxPower, 49),
        gnbGain: toNum(gnbGain, 18),
        gnbCableLoss: toNum(gnbCableLoss, 2),
        ueTxPower: toNum(ueTxPower, 23),
        ueGain: toNum(ueGain, 0),
        noiseFigure: toNum(noiseFigure, 7),
        sinr: toNum(sinr, -3),
        noiseBW: toNum(noiseBW, 10),
        shadowMargin: toNum(shadowMargin, 7),
        interferenceMargin: toNum(interferenceMargin, 3),
        bodyLoss: toNum(bodyLoss, 3),
      }),
    [
      direction, frequency, gnbTxPower, gnbGain, gnbCableLoss, ueTxPower, ueGain,
      noiseFigure, sinr, noiseBW, shadowMargin, interferenceMargin, bodyLoss,
    ],
  );

  const radius = result
    ? result.radiusKm >= 1
      ? { value: result.radiusKm.toFixed(2), unit: "km" }
      : { value: (result.radiusKm * 1000).toFixed(0), unit: "m" }
    : { value: "—", unit: "" };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: (isWeb ? WEB_BOTTOM_INSET : insets.bottom) + 32,
      }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
      showsVerticalScrollIndicator={false}
    >
      <Card style={{ marginBottom: 20 }}>
        <SectionLabel>Resultado</SectionLabel>
        <ResultRow
          label="Raio de célula (espaço livre)"
          value={radius.value}
          unit={radius.unit}
          emphasize
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ResultRow label="MAPL" value={result ? result.mapl.toFixed(1) : "—"} unit="dB" />
        <ResultRow
          label="Sensibilidade do receptor"
          value={result ? result.sensitivity.toFixed(1) : "—"}
          unit="dBm"
        />
        <ResultRow label="EIRP" value={result ? result.eirp.toFixed(1) : "—"} unit="dBm" />
        <ResultRow
          label="Ruído térmico"
          value={result ? result.thermalNoise.toFixed(1) : "—"}
          unit="dBm"
        />
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <SectionLabel>Sentido e frequência</SectionLabel>
        <View style={{ marginBottom: 18 }}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            Sentido do enlace
          </Text>
          <Segmented
            options={[
              { label: "Downlink", value: "DL" },
              { label: "Uplink", value: "UL" },
            ]}
            value={direction}
            onChange={(v) => setDirection(v as Direction)}
          />
        </View>
        <NumberField
          label="Frequência"
          unit="MHz"
          value={frequency}
          onChangeText={setFrequency}
          placeholder="3500"
        />
        <NumberField
          label="Largura de banda de ruído"
          unit="MHz"
          value={noiseBW}
          onChangeText={setNoiseBW}
          placeholder="10"
        />
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <SectionLabel>Estação base (gNB)</SectionLabel>
        <NumberField
          label="Potência de transmissão"
          unit="dBm"
          value={gnbTxPower}
          onChangeText={setGnbTxPower}
          placeholder="49"
        />
        <NumberField
          label="Ganho da antena"
          unit="dBi"
          value={gnbGain}
          onChangeText={setGnbGain}
          placeholder="18"
        />
        <NumberField
          label="Perda de cabo/feeder"
          unit="dB"
          value={gnbCableLoss}
          onChangeText={setGnbCableLoss}
          placeholder="2"
        />
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <SectionLabel>Terminal (UE)</SectionLabel>
        <NumberField
          label="Potência de transmissão"
          unit="dBm"
          value={ueTxPower}
          onChangeText={setUeTxPower}
          placeholder="23"
        />
        <NumberField
          label="Ganho da antena"
          unit="dBi"
          value={ueGain}
          onChangeText={setUeGain}
          placeholder="0"
        />
        <NumberField
          label="Figura de ruído do receptor"
          unit="dB"
          value={noiseFigure}
          onChangeText={setNoiseFigure}
          placeholder="7"
        />
        <NumberField
          label="SINR requerido"
          unit="dB"
          value={sinr}
          onChangeText={setSinr}
          placeholder="-3"
        />
      </Card>

      <Card>
        <SectionLabel>Margens e perdas</SectionLabel>
        <NumberField
          label="Margem de shadowing"
          unit="dB"
          value={shadowMargin}
          onChangeText={setShadowMargin}
          placeholder="7"
        />
        <NumberField
          label="Margem de interferência"
          unit="dB"
          value={interferenceMargin}
          onChangeText={setInterferenceMargin}
          placeholder="3"
        />
        <NumberField
          label="Perda corpo/penetração"
          unit="dB"
          value={bodyLoss}
          onChangeText={setBodyLoss}
          placeholder="3"
        />
      </Card>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginBottom: 8,
  },
  divider: { height: StyleSheet.hairlineWidth },
});
