import type { Circuit, PanelConfig, Phase } from "./panel";

export interface VoltageDropInput {
  supply: "mono" | "tri";
  lengthMeters: number;
  sectionMm2: number;
  powerKw: number;
  cosPhi: number;
  isLighting: boolean;
}

export interface VoltageDropResult {
  currentAmps: number;
  deltaVolts: number;
  deltaPercent: number;
  maxAllowedPercent: number;
  ok: boolean;
  recommendedSection: number;
}

const STANDARD_SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50];
// Ειδική αγωγιμότητα χαλκού στους 70°C (m / Ω·mm²)
const COPPER_CONDUCTIVITY = 48.5;

export function calculateVoltageDrop(input: VoltageDropInput): VoltageDropResult {
  const { supply, lengthMeters, sectionMm2, powerKw, cosPhi, isLighting } = input;
  const voltage = supply === "mono" ? 230 : 400;
  const factor = supply === "mono" ? 2 : Math.sqrt(3);
  const pf = Math.min(1, Math.max(0.5, cosPhi || 0.9));

  const currentAmps =
    supply === "mono"
      ? (powerKw * 1000) / (voltage * pf)
      : (powerKw * 1000) / (Math.sqrt(3) * voltage * pf);

  const calcDeltaV = (sec: number) =>
    (factor * lengthMeters * currentAmps * pf) / (COPPER_CONDUCTIVITY * sec);

  const deltaVolts = calcDeltaV(sectionMm2);
  const deltaPercent = (deltaVolts / voltage) * 100;
  const maxAllowedPercent = isLighting ? 3.0 : 4.0;
  const ok = deltaPercent <= maxAllowedPercent;

  let recommendedSection = sectionMm2;
  if (!ok) {
    for (const s of STANDARD_SECTIONS) {
      if (s > sectionMm2 && (calcDeltaV(s) / voltage) * 100 <= maxAllowedPercent) {
        recommendedSection = s;
        break;
      }
    }
  }

  return {
    currentAmps: Number(currentAmps.toFixed(2)),
    deltaVolts: Number(deltaVolts.toFixed(2)),
    deltaPercent: Number(deltaPercent.toFixed(2)),
    maxAllowedPercent,
    ok,
    recommendedSection,
  };
}

export interface DeddieRecommendation {
  installedKw: number;
  demandKw: number;
  supplyType: "mono" | "tri";
  deddieNumber: string;
  deddieKva: number;
  mainFuseAmps: number;
  supplyCable: string;
}

/** Estimate a circuit's connected power from its description or rated protection. */
export function estimateCircuitPowerKw(c: Circuit): number {
  const desc = c.description.toLowerCase();
  if (desc.includes("κουζίν") || desc.includes("φούρν")) return 4.5;
  if (desc.includes("θερμοσίφ")) return 4.0;
  if (desc.includes("αντλία")) return 5.5;
  if (desc.includes("κλιματιστ")) return 2.0;
  if (desc.includes("πλυντήρ")) return 2.2;
  if (desc.includes("φωτισμ")) return 0.8;
  if (desc.includes("ρευματοδ")) return 1.8;
  return c.poles === "3P"
    ? (c.amps * 400 * 1.732 * 0.85) / 1000
    : ((c.amps * 230 * 0.85) / 1000) * 0.6;
}

/** Εκτιμά την ισχύ κάθε γραμμής από την ασφάλεια/περιγραφή και προτείνει παροχή ΔΕΔΔΗΕ */
export function estimatePanelPower(
  cfg: PanelConfig,
  diversityFactor = 0.65,
): DeddieRecommendation {
  const installedKw = cfg.circuits.reduce((sum, circuit) => sum + estimateCircuitPowerKw(circuit), 0);

  const demandKw = Math.max(2, installedKw * diversityFactor);

  if (demandKw <= 8) {
    return {
      installedKw: Number(installedKw.toFixed(1)),
      demandKw: Number(demandKw.toFixed(1)),
      supplyType: "mono",
      deddieNumber: "Νο 1 (Μονοφασική 8 kVA)",
      deddieKva: 8,
      mainFuseAmps: 35,
      supplyCable: "3x10 mm² NYY",
    };
  }
  if (demandKw <= 12) {
    return {
      installedKw: Number(installedKw.toFixed(1)),
      demandKw: Number(demandKw.toFixed(1)),
      supplyType: "mono",
      deddieNumber: "Νο 2 (Μονοφασική 12 kVA)",
      deddieKva: 12,
      mainFuseAmps: 50,
      supplyCable: "3x16 mm² NYY",
    };
  }
  if (demandKw <= 15) {
    return {
      installedKw: Number(installedKw.toFixed(1)),
      demandKw: Number(demandKw.toFixed(1)),
      supplyType: "tri",
      deddieNumber: "Νο 2 Τριφασική (15 kVA)",
      deddieKva: 15,
      mainFuseAmps: 25,
      supplyCable: "5x6 mm² NYY",
    };
  }
  if (demandKw <= 25) {
    return {
      installedKw: Number(installedKw.toFixed(1)),
      demandKw: Number(demandKw.toFixed(1)),
      supplyType: "tri",
      deddieNumber: "Νο 3 Τριφασική (25 kVA)",
      deddieKva: 25,
      mainFuseAmps: 35,
      supplyCable: "5x10 mm² NYY",
    };
  }
  return {
    installedKw: Number(installedKw.toFixed(1)),
    demandKw: Number(demandKw.toFixed(1)),
    supplyType: "tri",
    deddieNumber: "Νο 4 Τριφασική (35 kVA)",
    deddieKva: 35,
    mainFuseAmps: 50,
    supplyCable: "5x16 mm² NYY",
  };
}

/** Αυτόματη εξισορρόπηση φορτίων στις φάσεις L1, L2, L3 */
export function balanceThreePhaseCircuits(circuits: Circuit[]): Circuit[] {
  const loads: Record<"L1" | "L2" | "L3", number> = { L1: 0, L2: 0, L3: 0 };
  const phases: ("L1" | "L2" | "L3")[] = ["L1", "L2", "L3"];

  return circuits.map((c) => {
    if (c.poles === "3P") return { ...c, phase: "L123" as Phase };
    let minPhase: "L1" | "L2" | "L3" = "L1";
    for (const p of phases) {
      if (loads[p] < loads[minPhase]) minPhase = p;
    }
    loads[minPhase] += c.amps;
    return { ...c, phase: minPhase };
  });
}
