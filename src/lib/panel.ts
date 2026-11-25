// Domain model for the single-line panel designer: options, defaults, design checks and parsing.
import { defaultYde, normalizeYde, type YdeProject } from "./yde";

export type Supply = "mono" | "tri";
export type Curve = "B" | "C";
export type Poles = "1P" | "1P+N" | "3P";
export type Phase = "L" | "L1" | "L2" | "L3" | "L123";
export type ProtectionType = "mcb" | "fuse" | "mccb";
export type RcdPoles = "2P" | "4P";
export type RcdType = "A" | "AC";

export interface Circuit {
  id: string;
  poles: Poles;
  amps: number;
  curve: Curve;
  description: string;
  cable: string;
  phase: Phase;
}

export interface CustomItem {
  id: string;
  code: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export type PlanSymbolKind =
  "panel" | "light" | "switch" | "socket" | "cooker" | "heater" | "ac" | "earth";

export const PLAN_SYMBOL_KINDS: PlanSymbolKind[] = [
  "panel",
  "light",
  "switch",
  "socket",
  "cooker",
  "heater",
  "ac",
  "earth",
];

/** A room outline on the floor plan: top-left corner in canvas units plus size in metres. */
export interface PlanRoom {
  id: string;
  name: string;
  x: number;
  y: number;
  wMeters: number;
  hMeters: number;
}

/** An electrical symbol placed on the floor plan, optionally tied to a circuit. */
export interface PlanSymbol {
  id: string;
  kind: PlanSymbolKind;
  x: number;
  y: number;
  circuitId: string;
}

/** The 2D floor plan (κάτοψη): draggable rooms and electrical symbols. */
export interface PlanData {
  rooms: PlanRoom[];
  symbols: PlanSymbol[];
}

export interface PanelConfig {
  supply: Supply;
  mainSwitch: number;
  protectionType: ProtectionType;
  mainFuse: number;
  indicatorLamp: boolean;
  rcdEnabled: boolean;
  rcdPoles: RcdPoles;
  rcdAmps: number;
  rcdType: RcdType;
  circuits: Circuit[];
  customItems: CustomItem[];
  vatPercent: number;
  project: string;
  panelName: string;
  designer: string;
  date: string;
  /** ΥΔΕ documents of this project (protocol data, measurements, ΕΗΕ rooms). */
  yde: YdeProject;
  /** The 2D floor plan (κάτοψη): rooms and electrical symbols, saved with the project. */
  plan: PlanData;
}

export const RCD_SENSITIVITY = 30;
export const MAIN_SWITCH_OPTIONS = [25, 32, 40, 63, 80, 100];
export const MAIN_FUSE_OPTIONS = [25, 32, 40, 50, 63];
export const RCD_AMP_OPTIONS = [25, 40, 63];
export const CIRCUIT_AMP_OPTIONS = [6, 10, 16, 20, 25, 32];
export const CURVE_OPTIONS: Curve[] = ["B", "C"];
export const CABLE_SECTIONS = ["1.5", "2.5", "4", "6", "10"];

export const PROTECTION_LABELS: Record<ProtectionType, string> = {
  mcb: "Μικροαυτόματος (MCB)",
  fuse: "Τηκόμενη ασφάλεια φυσιγγίου",
  mccb: "Αυτόματος διακόπτης ισχύος (MCCB)",
};

export function polesFor(supply: Supply): Poles[] {
  return supply === "mono" ? ["1P", "1P+N"] : ["1P", "1P+N", "3P"];
}

export function cableOptions(c: Pick<Circuit, "poles">): string[] {
  const cores = c.poles === "3P" ? "5" : "3";
  return CABLE_SECTIONS.map((s) => `${cores}x${s}`);
}

export const PHASE_OPTIONS: { value: Phase; label: string }[] = [
  { value: "L1", label: "L1" },
  { value: "L2", label: "L2" },
  { value: "L3", label: "L3" },
];

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

export function rcdLabel(cfg: Pick<PanelConfig, "rcdPoles" | "rcdAmps" | "rcdType">): string {
  return `${cfg.rcdPoles} ${cfg.rcdAmps}A ${RCD_SENSITIVITY}mA Type ${cfg.rcdType}`;
}

export function supplyLabel(supply: Supply): string {
  return supply === "mono" ? "1Φ 230V 50Hz" : "3Φ 400/230V 50Hz";
}

export function conductorsLabel(supply: Supply): string {
  return supply === "mono" ? "L + N + PE" : "L1 + L2 + L3 + N + PE";
}

export function cableCores(cable: string): number {
  const n = Number.parseInt(cable.split("x")[0] ?? "", 10);
  return Number.isFinite(n) ? n : 3;
}

export function cableSectionOf(cable: string): string {
  return cable.split("x")[1] ?? "2.5";
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
  return MAX_BREAKER_FOR_SECTION[cableSectionOf(cable)];
}

export function phaseLabel(c: Pick<Circuit, "phase">): string {
  return c.phase === "L123" ? "L1-L2-L3" : c.phase;
}

export function circuitCode(index: number): string {
  return `Γ${index + 1}`;
}

const TRI_PHASES: Phase[] = ["L1", "L2", "L3"];

/** Apply a new pole count to a circuit, keeping its phase and cable consistent. */
export function withPoles(c: Circuit, poles: Poles, supply: Supply, index: number): Circuit {
  const section = cableSectionOf(c.cable);
  if (poles === "3P") return { ...c, poles, phase: "L123", cable: `5x${section}` };
  const phase: Phase =
    supply === "mono"
      ? "L"
      : c.phase === "L123" || c.phase === "L"
        ? (TRI_PHASES[index % 3] ?? "L1")
        : c.phase;
  return { ...c, poles, phase, cable: `3x${section}` };
}

/** Re-shape the panel when the supply type changes, keeping every circuit valid. */
export function switchSupply(cfg: PanelConfig, supply: Supply): PanelConfig {
  if (cfg.supply === supply) return cfg;
  const circuits = cfg.circuits.map((c, i) => {
    if (supply === "mono") return withPoles(c, c.poles === "3P" ? "1P" : c.poles, "mono", i);
    return c.poles === "3P" ? c : { ...c, phase: TRI_PHASES[i % 3] ?? "L1" };
  });
  return { ...cfg, supply, rcdPoles: supply === "mono" ? "2P" : "4P", circuits };
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
      message: `Ο γενικός διακόπτης φορτίου (${cfg.mainSwitch}A) είναι μικρότερος από τη γενική ασφάλεια (${cfg.mainFuse}A).`,
    });
  }
  if (!cfg.rcdEnabled) {
    out.push({ level: "warning", message: "Ο πίνακας δεν έχει ρελέ διαρροής (RCD)." });
  } else {
    if (cfg.rcdAmps < cfg.mainFuse) {
      out.push({
        level: "warning",
        message: `Το ρελέ διαρροής (${cfg.rcdAmps}A) είναι μικρότερο από τη γενική ασφάλεια (${cfg.mainFuse}A).`,
      });
    }
    if (cfg.supply === "tri" && cfg.rcdPoles === "2P") {
      out.push({
        level: "error",
        message: "Σε τριφασική παροχή το γενικό ρελέ διαρροής πρέπει να είναι 4P.",
      });
    }
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
    if (c.poles === "3P" && cfg.supply === "mono") {
      out.push({ level: "error", message: `${code}: τριπολική γραμμή σε μονοφασική παροχή.` });
    }
    if (c.poles === "3P" && cableCores(c.cable) < 5) {
      out.push({
        level: "error",
        message: `${code}: τριφασική γραμμή χρειάζεται 5πολικό καλώδιο (π.χ. 5x${cableSectionOf(c.cable)}).`,
      });
    }
  });
  return out;
}

/** The floor plan canvas is 950x620 viewBox units; 60 units ≈ 1 m. */
export const PLAN_PX_PER_METER = 60;

/** Default floor plan: a small demo dwelling so a new project is not an empty canvas. */
export function defaultPlan(): PlanData {
  return {
    rooms: [
      { id: "rm1", name: "Σαλόνι - Κουζίνα", x: 60, y: 60, wMeters: 5, hMeters: 4 },
      { id: "rm2", name: "Υπνοδωμάτιο", x: 360, y: 60, wMeters: 3.5, hMeters: 3 },
      { id: "rm3", name: "Λουτρό", x: 360, y: 240, wMeters: 2.5, hMeters: 2 },
    ],
    symbols: [
      { id: "s1", kind: "panel", x: 85, y: 120, circuitId: "" },
      { id: "s2", kind: "light", x: 210, y: 180, circuitId: "c1" },
      { id: "s3", kind: "switch", x: 85, y: 260, circuitId: "c1" },
      { id: "s4", kind: "socket", x: 180, y: 80, circuitId: "c2" },
      { id: "s5", kind: "cooker", x: 320, y: 100, circuitId: "c3" },
      { id: "s6", kind: "light", x: 465, y: 150, circuitId: "c1" },
      { id: "s7", kind: "socket", x: 540, y: 120, circuitId: "c2" },
      { id: "s8", kind: "heater", x: 435, y: 290, circuitId: "c4" },
    ],
  };
}

export function defaultConfig(): PanelConfig {
  return {
    supply: "mono",
    mainSwitch: 40,
    protectionType: "fuse",
    mainFuse: 40,
    indicatorLamp: true,
    rcdEnabled: true,
    rcdPoles: "2P",
    rcdAmps: 40,
    rcdType: "A",
    vatPercent: 24,
    project: "Κατοικία",
    panelName: "Γενικός Πίνακας Κατοικίας",
    designer: "",
    date: "",
    customItems: [],
    yde: defaultYde(),
    plan: defaultPlan(),
    circuits: [
      {
        id: "c1",
        poles: "1P",
        amps: 10,
        curve: "B",
        description: "Φωτισμός",
        cable: "3x1.5",
        phase: "L",
      },
      {
        id: "c2",
        poles: "1P",
        amps: 16,
        curve: "C",
        description: "Ρευματοδότες",
        cable: "3x2.5",
        phase: "L",
      },
      {
        id: "c3",
        poles: "1P+N",
        amps: 25,
        curve: "C",
        description: "Κουζίνα",
        cable: "3x4",
        phase: "L",
      },
      {
        id: "c4",
        poles: "1P",
        amps: 20,
        curve: "C",
        description: "Θερμοσίφωνας",
        cable: "3x2.5",
        phase: "L",
      },
      {
        id: "c5",
        poles: "1P",
        amps: 16,
        curve: "C",
        description: "Κλιματιστικό",
        cable: "3x2.5",
        phase: "L",
      },
    ],
  };
}

// ---------- Parsing saved / imported data ----------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function pick<T>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}
function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
}

/** Turn untrusted JSON (local storage or an imported file) into a valid PanelConfig, or null. */
export function normalizeConfig(raw: unknown): PanelConfig | null {
  if (!isRecord(raw)) return null;
  const d = defaultConfig();
  const supply = pick<Supply>(raw["supply"], ["mono", "tri"], d.supply);
  const circuitsRaw = Array.isArray(raw["circuits"]) ? raw["circuits"] : d.circuits;
  const circuits: Circuit[] = circuitsRaw.filter(isRecord).map((c, i) => {
    const poles = pick<Poles>(c["poles"], polesFor(supply), "1P");
    const base: Circuit = {
      id: str(c["id"], `i${i + 1}`) || `i${i + 1}`,
      poles,
      amps: pick(c["amps"], CIRCUIT_AMP_OPTIONS, 16),
      curve: pick<Curve>(c["curve"], CURVE_OPTIONS, "C"),
      description: str(c["description"], ""),
      cable: pick(c["cable"], cableOptions({ poles }), cableOptions({ poles })[1] ?? "3x2.5"),
      phase: pick<Phase>(c["phase"], ["L", "L1", "L2", "L3", "L123"], "L"),
    };
    return withPoles(base, poles, supply, i);
  });
  const customRaw = Array.isArray(raw["customItems"]) ? raw["customItems"] : [];
  const customItems: CustomItem[] = customRaw.filter(isRecord).map((c, i) => ({
    id: str(c["id"], `x${i + 1}`) || `x${i + 1}`,
    code: str(c["code"], ""),
    description: str(c["description"], ""),
    qty: Math.max(0, num(c["qty"], 1)),
    unitPrice: Math.max(0, num(c["unitPrice"], 0)),
  }));
  return {
    supply,
    mainSwitch: pick(raw["mainSwitch"], MAIN_SWITCH_OPTIONS, d.mainSwitch),
    protectionType: pick<ProtectionType>(
      raw["protectionType"],
      ["mcb", "fuse", "mccb"],
      d.protectionType,
    ),
    mainFuse: pick(raw["mainFuse"], MAIN_FUSE_OPTIONS, d.mainFuse),
    indicatorLamp:
      typeof raw["indicatorLamp"] === "boolean" ? raw["indicatorLamp"] : d.indicatorLamp,
    rcdEnabled: typeof raw["rcdEnabled"] === "boolean" ? raw["rcdEnabled"] : d.rcdEnabled,
    rcdPoles: pick<RcdPoles>(raw["rcdPoles"], ["2P", "4P"], supply === "mono" ? "2P" : "4P"),
    rcdAmps: pick(raw["rcdAmps"], RCD_AMP_OPTIONS, d.rcdAmps),
    rcdType: pick<RcdType>(raw["rcdType"], ["A", "AC"], d.rcdType),
    vatPercent: Math.max(0, Math.min(100, num(raw["vatPercent"], d.vatPercent))),
    project: str(raw["project"], d.project),
    panelName: str(raw["panelName"], d.panelName),
    designer: str(raw["designer"], d.designer),
    date: str(raw["date"], d.date),
    circuits,
    customItems,
    yde: normalizeYde(
      raw["yde"],
      circuits.map((c) => c.id),
    ),
    plan: normalizePlan(raw["plan"]),
  };
}

/** Untrusted JSON to a valid floor plan; a missing plan keeps the default demo layout. */
export function normalizePlan(raw: unknown): PlanData {
  if (!isRecord(raw)) return defaultPlan();
  const rooms: PlanRoom[] = (Array.isArray(raw["rooms"]) ? raw["rooms"] : [])
    .filter(isRecord)
    .slice(0, 200)
    .map((r, i) => ({
      id: str(r["id"], `rm${i + 1}`) || `rm${i + 1}`,
      name: str(r["name"], ""),
      x: Math.round(clampNum(r["x"], -2000, 4000, 60)),
      y: Math.round(clampNum(r["y"], -2000, 4000, 60)),
      wMeters: clampNum(r["wMeters"], 0.5, 200, 3),
      hMeters: clampNum(r["hMeters"], 0.5, 200, 3),
    }));
  const symbols: PlanSymbol[] = (Array.isArray(raw["symbols"]) ? raw["symbols"] : [])
    .filter(isRecord)
    .slice(0, 500)
    .map((s, i) => ({
      id: str(s["id"], `sym${i + 1}`) || `sym${i + 1}`,
      kind: pick<PlanSymbolKind>(s["kind"], PLAN_SYMBOL_KINDS, "socket"),
      x: Math.round(clampNum(s["x"], -2000, 4000, 0)),
      y: Math.round(clampNum(s["y"], -2000, 4000, 0)),
      circuitId: str(s["circuitId"], ""),
    }));
  return { rooms, symbols };
}
