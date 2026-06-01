/**
 * 5G NR engineering calculations.
 * Throughput follows 3GPP TS 38.214 max data rate formula.
 * Link Budget computes receiver sensitivity, MAPL and free-space cell radius.
 */

export type FrequencyRange = "FR1" | "FR2";
export type Duplex = "FDD" | "TDD";
export type Direction = "DL" | "UL";

export const MODULATIONS: { label: string; value: number }[] = [
  { label: "QPSK", value: 2 },
  { label: "16-QAM", value: 4 },
  { label: "64-QAM", value: 6 },
  { label: "256-QAM", value: 8 },
];

export const MIMO_LAYERS = [1, 2, 4, 8];
export const SCALING_FACTORS = [1, 0.8, 0.75, 0.4];
export const COMPONENT_CARRIERS = [1, 2, 3, 4, 5, 6, 7, 8];

export const SCS_TO_MU: Record<number, number> = { 15: 0, 30: 1, 60: 2, 120: 3 };

// Transmission bandwidth configuration N_RB per 3GPP TS 38.101-1 (FR1)
// and TS 38.101-2 (FR2). Keyed as NPRB[FR][SCS][BW(MHz)].
export const NPRB: Record<FrequencyRange, Record<number, Record<number, number>>> = {
  FR1: {
    15: { 5: 25, 10: 52, 15: 79, 20: 106, 25: 133, 30: 160, 40: 216, 50: 270 },
    30: {
      5: 11, 10: 24, 15: 38, 20: 51, 25: 65, 30: 78, 40: 106, 50: 133,
      60: 162, 70: 189, 80: 217, 90: 245, 100: 273,
    },
    60: {
      10: 11, 15: 18, 20: 24, 25: 31, 30: 38, 40: 51, 50: 65,
      60: 79, 70: 93, 80: 107, 90: 121, 100: 135,
    },
  },
  FR2: {
    60: { 50: 66, 100: 132, 200: 264 },
    120: { 50: 32, 100: 66, 200: 132, 400: 264 },
  },
};

export const FR_BANDWIDTHS: Record<FrequencyRange, number[]> = {
  FR1: [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100],
  FR2: [50, 100, 200, 400],
};

export const FR_SCS: Record<FrequencyRange, number[]> = {
  FR1: [15, 30, 60],
  FR2: [60, 120],
};

export function getNprb(fr: FrequencyRange, scs: number, bw: number): number | undefined {
  return NPRB[fr]?.[scs]?.[bw];
}

/** Bandwidths valid for a given FR + SCS combination. */
export function availableBandwidths(fr: FrequencyRange, scs: number): number[] {
  const table = NPRB[fr]?.[scs];
  if (!table) return [];
  return FR_BANDWIDTHS[fr].filter((bw) => table[bw] !== undefined);
}

export interface ThroughputInput {
  numCC: number;
  fr: FrequencyRange;
  bandwidth: number;
  scs: number;
  layers: number;
  modulation: number;
  codeRate: number; // fraction 0-1
  scalingFactor: number;
  overheadDL: number; // percent
  overheadUL: number; // percent
  duplex: Duplex;
  dlPercent: number; // percent of time for DL (TDD)
  ulPercent: number; // percent of time for UL (TDD)
}

export interface ThroughputResult {
  nprb: number;
  mu: number;
  dlMbps: number;
  ulMbps: number;
}

export function computeThroughput(p: ThroughputInput): ThroughputResult | null {
  const mu = SCS_TO_MU[p.scs];
  const nprb = getNprb(p.fr, p.scs, p.bandwidth);
  if (nprb === undefined || mu === undefined) return null;

  // Guard against physically impossible inputs that would yield nonsense.
  const overheadValid = (o: number) => o >= 0 && o < 100;
  if (
    p.codeRate <= 0 ||
    p.codeRate > 1 ||
    !overheadValid(p.overheadDL) ||
    !overheadValid(p.overheadUL)
  ) {
    return null;
  }
  if (p.duplex === "TDD" && p.dlPercent + p.ulPercent > 100) return null;

  // Symbols per second per subcarrier: 14 OFDM symbols per slot, 2^mu slots per ms.
  const symbolRate = 14 * Math.pow(2, mu) * 1000;
  const subcarriers = nprb * 12;

  const ratePerCC = (overheadPct: number) =>
    p.layers *
    p.modulation *
    p.scalingFactor *
    p.codeRate *
    subcarriers *
    symbolRate *
    (1 - overheadPct / 100);

  let dl = (p.numCC * ratePerCC(p.overheadDL)) / 1e6; // Mbps
  let ul = (p.numCC * ratePerCC(p.overheadUL)) / 1e6;

  if (p.duplex === "TDD") {
    dl *= p.dlPercent / 100;
    ul *= p.ulPercent / 100;
  }

  return { nprb, mu, dlMbps: dl, ulMbps: ul };
}

export interface LinkBudgetInput {
  direction: Direction;
  frequency: number; // MHz
  gnbTxPower: number; // dBm
  gnbGain: number; // dBi
  gnbCableLoss: number; // dB
  ueTxPower: number; // dBm
  ueGain: number; // dBi
  noiseFigure: number; // dB (receiver)
  sinr: number; // dB
  noiseBW: number; // MHz
  shadowMargin: number; // dB
  interferenceMargin: number; // dB
  bodyLoss: number; // dB
}

export interface LinkBudgetResult {
  eirp: number; // dBm
  thermalNoise: number; // dBm
  sensitivity: number; // dBm
  mapl: number; // dB
  radiusKm: number;
}

export function computeLinkBudget(p: LinkBudgetInput): LinkBudgetResult | null {
  if (p.frequency <= 0 || p.noiseBW <= 0) return null;

  const bwHz = p.noiseBW * 1e6;
  // Thermal noise floor kTB (no NF). Noise figure and SINR are added to reach
  // receiver sensitivity.
  const thermalNoise = -174 + 10 * Math.log10(bwHz);
  const sensitivity = thermalNoise + p.noiseFigure + p.sinr;

  let eirp: number;
  let rxGain: number;
  if (p.direction === "DL") {
    eirp = p.gnbTxPower + p.gnbGain - p.gnbCableLoss;
    rxGain = p.ueGain;
  } else {
    eirp = p.ueTxPower + p.ueGain;
    rxGain = p.gnbGain - p.gnbCableLoss;
  }

  const mapl =
    eirp + rxGain - sensitivity - p.shadowMargin - p.interferenceMargin - p.bodyLoss;

  // Free-space path loss: FSPL = 20log10(d_km) + 20log10(f_MHz) + 32.44
  const radiusKm = Math.pow(
    10,
    (mapl - 20 * Math.log10(p.frequency) - 32.44) / 20,
  );

  return { eirp, thermalNoise, sensitivity, mapl, radiusKm };
}

/** Format a Mbps value, switching to Gbps above 1000 Mbps. */
export function formatRate(mbps: number): { value: string; unit: string } {
  if (!isFinite(mbps) || mbps <= 0) return { value: "0", unit: "Mbps" };
  if (mbps >= 1000) {
    return { value: (mbps / 1000).toFixed(2), unit: "Gbps" };
  }
  return { value: mbps.toFixed(1), unit: "Mbps" };
}
