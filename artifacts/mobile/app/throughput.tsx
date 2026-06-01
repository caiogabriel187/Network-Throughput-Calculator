import React, { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import {
  Card,
  NumberField,
  PillSelector,
  ResultRow,
  SectionLabel,
  Segmented,
} from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import {
  availableBandwidths,
  COMPONENT_CARRIERS,
  computeThroughput,
  FR_SCS,
  formatRate,
  MIMO_LAYERS,
  MODULATIONS,
  SCALING_FACTORS,
  SCS_TO_MU,
  type Duplex,
  type FrequencyRange,
} from "@/lib/calc";

const WEB_BOTTOM_INSET = 34;

function toNum(s: string, fallback = 0): number {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? fallback : n;
}

export default function ThroughputScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [fr, setFr] = useState<FrequencyRange>("FR1");
  const [scs, setScs] = useState(30);
  const [bandwidth, setBandwidth] = useState(100);
  const [numCC, setNumCC] = useState(1);
  const [layers, setLayers] = useState(4);
  const [modulation, setModulation] = useState(8);
  const [scalingFactor, setScalingFactor] = useState(1);
  const [codeRate, setCodeRate] = useState("0.9258");
  const [overheadDL, setOverheadDL] = useState("14");
  const [overheadUL, setOverheadUL] = useState("8");
  const [duplex, setDuplex] = useState<Duplex>("TDD");
  const [dlPercent, setDlPercent] = useState("75");
  const [ulPercent, setUlPercent] = useState("25");

  const scsOptions = FR_SCS[fr];
  const bwOptions = availableBandwidths(fr, scs);

  // Keep dependent selectors valid when FR / SCS change.
  const handleFr = (next: FrequencyRange) => {
    setFr(next);
    const nextScs = FR_SCS[next];
    const newScs = nextScs.includes(scs) ? scs : nextScs[0];
    setScs(newScs);
    const bws = availableBandwidths(next, newScs);
    if (!bws.includes(bandwidth)) setBandwidth(bws[bws.length - 1]);
  };

  const handleScs = (next: number) => {
    setScs(next);
    const bws = availableBandwidths(fr, next);
    if (!bws.includes(bandwidth)) setBandwidth(bws[bws.length - 1]);
  };

  const result = useMemo(
    () =>
      computeThroughput({
        numCC,
        fr,
        bandwidth,
        scs,
        layers,
        modulation,
        codeRate: toNum(codeRate, 0.9258),
        scalingFactor,
        overheadDL: toNum(overheadDL, 14),
        overheadUL: toNum(overheadUL, 8),
        duplex,
        dlPercent: toNum(dlPercent, 75),
        ulPercent: toNum(ulPercent, 25),
      }),
    [
      numCC, fr, bandwidth, scs, layers, modulation, codeRate, scalingFactor,
      overheadDL, overheadUL, duplex, dlPercent, ulPercent,
    ],
  );

  const dl = result ? formatRate(result.dlMbps) : null;
  const ul = result ? formatRate(result.ulMbps) : null;

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
      {/* Result */}
      <Card style={{ marginBottom: 20 }}>
        <SectionLabel>Resultado</SectionLabel>
        {result ? (
          <>
            <ResultRow
              label="Downlink"
              value={dl!.value}
              unit={dl!.unit}
              emphasize
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <ResultRow
              label="Uplink"
              value={ul!.value}
              unit={ul!.unit}
              emphasize
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <ResultRow label="Resource Blocks (PRB)" value={String(result.nprb)} />
            <ResultRow label="Numerologia (µ)" value={String(result.mu)} />
          </>
        ) : (
          <Text style={[styles.invalid, { color: colors.destructive }]}>
            Combinação de faixa, SCS e banda não suportada pelo 3GPP.
          </Text>
        )}
      </Card>

      {/* Carrier config */}
      <Card style={{ marginBottom: 20 }}>
        <SectionLabel>Configuração da portadora</SectionLabel>
        <View style={{ marginBottom: 18 }}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            Faixa de frequência
          </Text>
          <Segmented
            options={[
              { label: "FR1 (Sub-6 GHz)", value: "FR1" },
              { label: "FR2 (mmWave)", value: "FR2" },
            ]}
            value={fr}
            onChange={(v) => handleFr(v as FrequencyRange)}
          />
        </View>
        <PillSelector
          label="Espaçamento de subportadora (SCS)"
          options={scsOptions.map((s) => ({
            label: `${s} kHz · µ${SCS_TO_MU[s]}`,
            value: s,
          }))}
          value={scs}
          onChange={handleScs}
        />
        <PillSelector
          label="Largura de banda do canal"
          options={bwOptions.map((b) => ({ label: `${b} MHz`, value: b }))}
          value={bandwidth}
          onChange={setBandwidth}
        />
        <PillSelector
          label="Portadoras agregadas (CC)"
          options={COMPONENT_CARRIERS.map((c) => ({ label: String(c), value: c }))}
          value={numCC}
          onChange={setNumCC}
        />
      </Card>

      {/* Modulation & MIMO */}
      <Card style={{ marginBottom: 20 }}>
        <SectionLabel>Modulação e MIMO</SectionLabel>
        <PillSelector
          label="Camadas MIMO"
          options={MIMO_LAYERS.map((l) => ({ label: `${l}x`, value: l }))}
          value={layers}
          onChange={setLayers}
        />
        <PillSelector
          label="Ordem de modulação"
          options={MODULATIONS}
          value={modulation}
          onChange={setModulation}
        />
        <PillSelector
          label="Fator de escala (f)"
          options={SCALING_FACTORS.map((f) => ({ label: f.toString(), value: f }))}
          value={scalingFactor}
          onChange={setScalingFactor}
        />
        <NumberField
          label="Taxa de código alvo"
          unit="fração 0–1"
          value={codeRate}
          onChangeText={setCodeRate}
          placeholder="0.9258"
        />
      </Card>

      {/* Overhead & duplex */}
      <Card>
        <SectionLabel>Overhead e duplexação</SectionLabel>
        <NumberField
          label="Overhead Downlink"
          unit="%"
          value={overheadDL}
          onChangeText={setOverheadDL}
          placeholder="14"
        />
        <NumberField
          label="Overhead Uplink"
          unit="%"
          value={overheadUL}
          onChangeText={setOverheadUL}
          placeholder="8"
        />
        <View style={{ marginBottom: duplex === "TDD" ? 18 : 0 }}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            Modo de duplexação
          </Text>
          <Segmented
            options={[
              { label: "FDD", value: "FDD" },
              { label: "TDD", value: "TDD" },
            ]}
            value={duplex}
            onChange={(v) => setDuplex(v as Duplex)}
          />
        </View>
        {duplex === "TDD" ? (
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <NumberField
                label="Slots DL"
                unit="%"
                value={dlPercent}
                onChangeText={setDlPercent}
                placeholder="75"
              />
            </View>
            <View style={styles.rowItem}>
              <NumberField
                label="Slots UL"
                unit="%"
                value={ulPercent}
                onChangeText={setUlPercent}
                placeholder="25"
              />
            </View>
          </View>
        ) : null}
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
  invalid: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", gap: 14 },
  rowItem: { flex: 1 },
});
