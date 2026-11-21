// Domain model for the single-line panel designer: options, defaults and design checks.

export type Supply = "mono" | "tri";
export type Curve = "B" | "C";
export type Phase = "L" | "L1" | "L2" | "L3" | "L123";

export interface Circuit {
  id: string;
  amps: number;
  curve: Curve;
  description: string;
  cable: string;
  phase: Phase;
}

export interface PanelConfig {
  supply: Supply;
  mainSwitch: number;
  mainFuse: number;
  indicatorLamp: boolean;
  /** Rated current of the RCD in amperes; 0 means no RCD. */
  rcdAmps: number;
  rcdSensitivity: number;
  circuits: Circuit[];
  project: string;
  panelName: string;
  designer: string;
  date: string;
}

export const MAIN_SWITCH_OPTIONS = [25, 40, 63, 80, 100];
export const MAIN_FUSE_OPTIONS = [20, 25, 32, 35, 40, 50, 63];
export const RCD_AMP_OPTIONS = [25, 40, 63];
export const RCD_SENSITIVITY_OPTIONS = [30, 300];
export const CIRCUIT_AMP_OPTIONS = [6, 10, 16, 20, 25, 32];
export const CURVE_OPTIONS: Curve[] = ["B", "C"];

export const CABLE_SECTIONS = ["1.5", "2.5", "4", "6", "10"];

export function cableOptions(supply: Supply): string[] {
  const cores = supply === "mono" ? ["3"] : ["3", "5"];
  return cores.flatMap((c) => CABLE_SECTIONS.map((s) => `${c}x${s}`));
}

export const PHASE_OPTIONS: Record<Supply, { value: Phase; label: string }[]> = {
  mono: [{ value: "L", label: "L" }],
  tri: [
    { value: "L1", label: "L1" },
    { value: "L2", label: "L2" },
    { value: "L3", label: "L3" },
    { value: "L123", label: "3Φ (L1-L2-L3)" },
  ],
};

export const DESCRIPTION_SUGGESTIONS = [
  "Φωτισμός",
  "Ρευματοδότες",
  "Κουζίνα",
  "Θερμοσίφωνας",
  "Πλυντήριο ρούχων",
  "Πλυντήριο πιάτων",
  "Κλιματιστικό",
  "Ψυγείο",
  "Φούρνος",
  "Εξωτερικός φωτισμός",
  "Αντλία θερμότητας",
  "Θυροτηλέφωνο",
];

export function rcdPoles(supply: Supply): number {
  return supply === "mono" ? 2 : 4;
}

export function rcdLabel(cfg: Pick<PanelConfig, "supply" | "rcdAmps" | "rcdSensitivity">): string {
  if (!cfg.rcdAmps) return "Χωρίς";
  return `${rcdPoles(cfg.supply)}x${cfg.rcdAmps}A ${cfg.rcdSensitivity}mA`;
}

export function supplyLabel(supply: Supply): string {
  return supply === "mono" ? "1~ 230V 50Hz" : "3~ 400/230V 50Hz";
}

export function conductorsLabel(supply: Supply): string {
  return supply === "mono" ? "L + N + PE" : "L1 + L2 + L3 + N + PE";
}

export function cableCores(cable: string): number {
  const n = Number.parseInt(cable.split("x")[0] ?? "", 10);
  return Number.isFinite(n) ? n : 3;
}

export function cableSection(cable: string): number {
  const s = Number.parseFloat(cable.split("x")[1] ?? "");
  return Number.isFinite(s) ? s : 0;
}

/** Highest breaker rating normally used on a copper cable of this section (mm²). */
export const MAX_BREAKER_FOR_SECTION: Record<string, number> = {
  "1.5": 10,
  "2.5": 20,
  "4": 25,
  "6": 32,
  "10": 50,
};

export function maxBreakerForCable(cable: string): number | undefined {
  const section = cable.split("x")[1] ?? "";
  return MAX_BREAKER_FOR_SECTION[section];
}

export function circuitPoles(c: Pick<Circuit, "phase">): string {
  return c.phase === "L123" ? "3P" : "1P";
}

export function phaseLabel(p: Phase): string {
  return p === "L123" ? "L1-L2-L3" : p;
}

export function circuitCode(index: number): string {
  return `Γ${index + 1}`;
}

/** Re-shape the panel when the supply type changes, keeping every circuit valid. */
export function switchSupply(cfg: PanelConfig, supply: Supply): PanelConfig {
  if (cfg.supply === supply) return cfg;
  const tri: Phase[] = ["L1", "L2", "L3"];
  const circuits = cfg.circuits.map((c, i) => {
    if (supply === "mono") {
      const section = c.cable.split("x")[1] ?? "2.5";
      return { ...c, phase: "L" as Phase, cable: `3x${section}` };
    }
    return { ...c, phase: tri[i % 3] ?? "L1" };
  });
  return { ...cfg, supply, circuits };
}

export type CheckLevel = "error" | "warning";
export interface Check {
  level: CheckLevel;
  message: string;
}

export function runChecks(cfg: PanelConfig): Check[] {
  const out: Check[] = [];
  if (cfg.mainSwitch < cfg.mainFuse) {
    out.push({
      level: "error",
      message: `Ο γενικός διακόπτης (${cfg.mainSwitch}A) είναι μικρότερος από τη γενική ασφάλεια (${cfg.mainFuse}A).`,
    });
  }
  if (cfg.rcdAmps && cfg.rcdAmps < cfg.mainFuse) {
    out.push({
      level: "warning",
      message: `Το ρελέ διαρροής (${cfg.rcdAmps}A) είναι μικρότερο από τη γενική ασφάλεια (${cfg.mainFuse}A).`,
    });
  }
  if (!cfg.rcdAmps) {
    out.push({ level: "warning", message: "Ο πίνακας δεν έχει ρελέ διαρροής (RCD)." });
  }
  if (cfg.circuits.length === 0) {
    out.push({ level: "warning", message: "Δεν έχουν προστεθεί γραμμές." });
  }
  cfg.circuits.forEach((c, i) => {
    const code = circuitCode(i);
    const max = maxBreakerForCable(c.cable);
    if (max !== undefined && c.amps > max) {
      out.push({
        level: "error",
        message: `${code}: ασφάλεια ${c.amps}A σε καλώδιο ${c.cable}mm² (μέγιστο ${max}A).`,
      });
    }
    if (c.amps > cfg.mainFuse) {
      out.push({
        level: "error",
        message: `${code}: η ασφάλεια ${c.amps}A ξεπερνά τη γενική ασφάλεια ${cfg.mainFuse}A.`,
      });
    }
    if (c.phase === "L123" && cableCores(c.cable) < 5) {
      out.push({
        level: "error",
        message: `${code}: τριφασική γραμμή χρειάζεται 5πολικό καλώδιο (π.χ. 5x${c.cable.split("x")[1] ?? "2.5"}).`,
      });
    }
  });
  return out;
}

export function defaultConfig(): PanelConfig {
  return {
    supply: "mono",
    mainSwitch: 40,
    mainFuse: 35,
    indicatorLamp: true,
    rcdAmps: 40,
    rcdSensitivity: 30,
    project: "Κατοικία",
    panelName: "Γενικός Πίνακας Κατοικίας",
    designer: "",
    date: "",
    circuits: [
      { id: "c1", amps: 10, curve: "B", description: "Φωτισμός", cable: "3x1.5", phase: "L" },
      { id: "c2", amps: 16, curve: "C", description: "Ρευματοδότες", cable: "3x2.5", phase: "L" },
      { id: "c3", amps: 25, curve: "C", description: "Κουζίνα", cable: "3x4", phase: "L" },
      { id: "c4", amps: 20, curve: "C", description: "Θερμοσίφωνας", cable: "3x2.5", phase: "L" },
      { id: "c5", amps: 16, curve: "C", description: "Κλιματιστικό", cable: "3x2.5", phase: "L" },
    ],
  };
}
