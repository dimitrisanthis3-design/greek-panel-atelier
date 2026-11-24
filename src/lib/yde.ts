// ΥΔΕ (ΕΛΟΤ HD 384) documents: installer details, per-project data, protocol checklist,
// circuit measurements and the ΕΗΕ room recording. Imports only types from panel.ts so that
// panel.ts can call normalizeYde without a circular runtime import.
import type { Circuit, Supply } from "./panel";

export type CheckKind = "initial" | "periodic" | "extraordinary";
export type CheckResult = "ok" | "fail" | "na";
export type CableType = "NYA" | "NYY" | "NYM";
export type OwnerRole = "owner" | "consumer";
export type Network = "TT" | "TN" | "IT";
export type EarthType = "foundation" | "rod" | "other";

export const CABLE_TYPES: CableType[] = ["NYA", "NYY", "NYM"];
export const CHECK_KIND_LABELS: Record<CheckKind, string> = {
  initial: "Αρχικός έλεγχος",
  periodic: "Τακτικός επανέλεγχος",
  extraordinary: "Έκτακτος έλεγχος",
};
export const EARTH_TYPE_LABELS: Record<EarthType, string> = {
  foundation: "θεμελιακή",
  rod: "ράβδος ηλεκτρόδιο",
  other: "άλλο",
};
export const CHECK_RESULT_LABELS: Record<CheckResult, string> = {
  ok: "Συμμόρφωση",
  fail: "Μη συμμόρφωση",
  na: "Δεν εφαρμόζεται",
};

/** kW counted per Schuko (σούκο) socket in the installed power. */
export const SOCKET_KW = 0.2;
/** kW counted per light point in the installed power. */
export const LIGHT_KW = 0.1;
/** Minimum insulation resistance (MΩ) for circuits up to 500 V, tested at 500 V DC. */
export const MIN_RISO_MOHM = 0.5;
/** Years until the next periodic re-check of a dwelling. */
export const RECHECK_YEARS = 14;
/** Empty circuit rows printed on page 2 so the electrician can add more by hand. */
export const PROTOCOL_MIN_ROWS = 38;

export interface Installer {
  name: string;
  title: string;
  licenseNo: string;
  announcementNo: string;
  category: string;
  specialty: string;
  amNo: string;
  afm: string;
  doy: string;
  address: string;
  phone: string;
  instrumentName: string;
  instrumentType: string;
  instrumentSerial: string;
}

export interface CircuitTest {
  cableType: CableType;
  /** Riso with loads connected (MΩ). */
  risoLoad: string;
  /** Riso without loads (MΩ). */
  riso: string;
  imess: string;
  umess: string;
  zs: string;
}

export interface Room {
  id: string;
  name: string;
  sockets: number;
  switches: number;
  lights: number;
  fixedDesc: string;
  fixedKw: number;
}

export interface YdeProject {
  protocolNo: string;
  ownerRole: OwnerRole;
  owner: string;
  supplyNo: string;
  address: string;
  city: string;
  postalCode: string;
  checkKind: CheckKind;
  extraReason: string;
  installCategory: string;
  installCode: string;
  network: Network;
  earthOhms: string;
  earthType: EarthType;
  earthMethod: string;
  feedCableType: CableType;
  feedSection: string;
  checks: Record<string, CheckResult>;
  remarksVisual: string;
  remarksMeasure: string;
  remarks: string;
  recommendations: string;
  labelAffixed: boolean;
  /** Next periodic re-check; empty means check date + RECHECK_YEARS. */
  nextCheck: string;
  tests: Record<string, CircuitTest>;
  rooms: Room[];
}

export interface CheckItem {
  id: string;
  label: string;
  /** Applies only to three-phase supplies; defaults to "not applicable" on single phase. */
  triOnly?: boolean;
}

export const VISUAL_CHECKS: CheckItem[] = [
  { id: "1.1", label: "Μέτρα προστασίας έναντι ηλεκτροπληξίας" },
  { id: "1.2", label: "Μέτρα προστασίας έναντι θερμικών επιδράσεων" },
  { id: "1.3", label: "Επιλογή διατομών αγωγών" },
  { id: "1.4", label: "Επιλογή & ρύθμιση των διατάξεων προστασίας" },
  { id: "1.5", label: "Όργανα διακοπής & απομόνωσης" },
  { id: "1.6", label: "Επιλογή υλικού βάσει εξωτερικών επιδράσεων" },
  { id: "1.7", label: "Αναγνώριση αγωγών Ν & ΡΕ" },
  { id: "1.8", label: "Δυνατότητα αναγνώρισης κυκλωμάτων" },
  { id: "1.9", label: "Κύρια & συμπληρωματικές ισοδυναμικές συνδέσεις" },
  { id: "1.10", label: "Σχέδια, διαγράμματα, πινακίδα δοκιμής ΔΔΡ" },
  { id: "1.11", label: "Επάρκεια συνδέσεων αγωγών" },
  { id: "1.12", label: "Δυνατότητα πρόσβασης & χειρισμών" },
];

export const TEST_CHECKS: CheckItem[] = [
  { id: "2.1", label: "Έλεγχοι, δοκιμές πολικότητας (άρθρο 612.7)" },
  {
    id: "2.2",
    label: "Δοκιμές λειτουργίας διατάξεων διαφορικού ρεύματος (παράγραφος 531.2.1.5)",
  },
  { id: "2.3", label: "Κατεύθυνση φοράς των 3φ κινητήρων", triOnly: true },
  { id: "2.4", label: "Κατεύθυνση πεδίου φοράς 3φ πριζών", triOnly: true },
  { id: "2.5", label: "Δοκιμές λειτουργίας (άρθρο 612.8)" },
  { id: "2.6", label: "Δοκιμές διακοπής & απομόνωσης" },
];

export const MEASURE_CHECKS: CheckItem[] = [
  { id: "3.1", label: "Συνέχεια αγωγών γείωσης (άρθρο 612.2)" },
];

export const ALL_CHECKS = [...VISUAL_CHECKS, ...TEST_CHECKS, ...MEASURE_CHECKS];

export function emptyInstaller(): Installer {
  return {
    name: "",
    title: "",
    licenseNo: "",
    announcementNo: "",
    category: "",
    specialty: "",
    amNo: "",
    afm: "",
    doy: "",
    address: "",
    phone: "",
    instrumentName: "",
    instrumentType: "",
    instrumentSerial: "",
  };
}

export function defaultTest(): CircuitTest {
  return { cableType: "NYA", risoLoad: "", riso: "", imess: "", umess: "", zs: "" };
}

export function defaultYde(): YdeProject {
  return {
    protocolNo: "",
    ownerRole: "owner",
    owner: "",
    supplyNo: "",
    address: "",
    city: "",
    postalCode: "",
    checkKind: "initial",
    extraReason: "",
    installCategory: "Κατοικία – Διαμερίσματα",
    installCode: "Α1",
    network: "TT",
    earthOhms: "",
    earthType: "foundation",
    earthMethod: "",
    feedCableType: "NYY",
    feedSection: "10",
    checks: {},
    remarksVisual: "",
    remarksMeasure: "",
    remarks: "",
    recommendations: "",
    labelAffixed: true,
    nextCheck: "",
    tests: {},
    rooms: [],
  };
}

/** Result of a checklist item: unanswered items pass, three-phase-only items are n/a on 1Φ. */
export function checkResult(y: YdeProject, item: CheckItem, supply: Supply): CheckResult {
  return y.checks[item.id] ?? (item.triOnly && supply === "mono" ? "na" : "ok");
}

export function testFor(y: YdeProject, circuitId: string): CircuitTest {
  return y.tests[circuitId] ?? defaultTest();
}

// ---------- Dates ----------

/** Parse "d/m/yyyy" (Greek date format, also with - or .) into its parts. */
export function parseGrDate(s: string): { d: number; m: number; y: number } | null {
  const m = /^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*$/.exec(s);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return { d, m: mo, y };
}

/** Date of the next periodic re-check: the typed one, or check date + RECHECK_YEARS. */
export function nextCheckDate(y: YdeProject, checkDate: string): string {
  if (y.nextCheck.trim()) return y.nextCheck.trim();
  const p = parseGrDate(checkDate);
  return p ? `${p.d} / ${p.m} / ${p.y + RECHECK_YEARS}` : "";
}

// ---------- Measurements ----------

/** Read a measurement typed by hand ("1,5", "> 500", "≥200"); null when empty or unreadable. */
export function parseMeasure(v: string): number | null {
  const m = /-?\d+(?:[.,]\d+)?/.exec(v.replace(/\s/g, ""));
  if (!m) return null;
  const n = Number.parseFloat(m[0].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export type MeasureIssue = "riso" | "imess";

/** Measurements outside the limits: Riso below 0,5 MΩ, RCD trip current above IΔn. */
export function measureIssues(t: CircuitTest, rcdIdnMa: number | null): MeasureIssue[] {
  const out: MeasureIssue[] = [];
  const risos = [parseMeasure(t.riso), parseMeasure(t.risoLoad)];
  if (risos.some((r) => r !== null && r < MIN_RISO_MOHM)) out.push("riso");
  const imess = parseMeasure(t.imess);
  if (imess !== null && rcdIdnMa !== null && imess > rcdIdnMa) out.push("imess");
  return out;
}

/** The installation passes when no checklist item failed and no measurement is out of limits. */
export function protocolPasses(
  y: YdeProject,
  circuits: Circuit[],
  supply: Supply,
  rcdIdnMa: number | null,
): boolean {
  if (ALL_CHECKS.some((c) => checkResult(y, c, supply) === "fail")) return false;
  return circuits.every((c) => measureIssues(testFor(y, c.id), rcdIdnMa).length === 0);
}

// ---------- ΕΗΕ recording ----------

export function roomKw(r: Room): number {
  return round2(r.sockets * SOCKET_KW + r.lights * LIGHT_KW + r.fixedKw);
}

export interface EheTotals {
  sockets: number;
  switches: number;
  lights: number;
  fixedKw: number;
  kw: number;
}

export function eheTotals(rooms: Room[]): EheTotals {
  const t = rooms.reduce(
    (a, r) => ({
      sockets: a.sockets + r.sockets,
      switches: a.switches + r.switches,
      lights: a.lights + r.lights,
      fixedKw: a.fixedKw + r.fixedKw,
      kw: a.kw + r.sockets * SOCKET_KW + r.lights * LIGHT_KW + r.fixedKw,
    }),
    { sockets: 0, switches: 0, lights: 0, fixedKw: 0, kw: 0 },
  );
  return { ...t, kw: round2(t.kw), fixedKw: round2(t.fixedKw) };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Greek number format: decimal comma, up to two decimals. */
export function grNum(n: number, decimals = 2): string {
  return n.toLocaleString("el-GR", { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

export const ROOM_SUGGESTIONS = [
  "Είσοδος",
  "Υποδοχή",
  "Καθιστικό",
  "Τραπεζαρία",
  "Κουζίνα",
  "Υπνοδωμάτιο 1",
  "Υπνοδωμάτιο 2",
  "Υπνοδωμάτιο 3",
  "Λουτρό",
  "WC",
  "Διάδρομος",
  "Αποθήκη",
  "Βεράντα / Μπαλκόνι",
];

// ---------- Parsing stored / imported data ----------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown, max = 200): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}
function strOr(v: unknown, fallback: string, max = 200): string {
  return typeof v === "string" ? v.slice(0, max) : fallback;
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}
function count(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.max(0, Math.min(999, Math.round(v)))
    : 0;
}
function kw(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(999, round2(v))) : 0;
}

export function normalizeInstaller(raw: unknown): Installer {
  const r = isRecord(raw) ? raw : {};
  const out = emptyInstaller();
  for (const k of Object.keys(out) as (keyof Installer)[]) out[k] = str(r[k]);
  return out;
}

export function normalizeRoom(raw: Record<string, unknown>, i: number): Room {
  return {
    id: str(raw["id"], 60) || `r${i + 1}`,
    name: str(raw["name"], 80),
    sockets: count(raw["sockets"]),
    switches: count(raw["switches"]),
    lights: count(raw["lights"]),
    fixedDesc: str(raw["fixedDesc"]),
    fixedKw: kw(raw["fixedKw"]),
  };
}

/** Untrusted JSON to a valid YdeProject; measurements are kept only for existing circuits. */
export function normalizeYde(raw: unknown, circuitIds: string[]): YdeProject {
  const d = defaultYde();
  if (!isRecord(raw)) return d;
  const checks: Record<string, CheckResult> = {};
  if (isRecord(raw["checks"])) {
    for (const c of ALL_CHECKS) {
      const v = raw["checks"][c.id];
      if (v === "ok" || v === "fail" || v === "na") checks[c.id] = v;
    }
  }
  const tests: Record<string, CircuitTest> = {};
  if (isRecord(raw["tests"])) {
    for (const id of circuitIds) {
      const t = raw["tests"][id];
      if (!isRecord(t)) continue;
      tests[id] = {
        cableType: oneOf(t["cableType"], CABLE_TYPES, "NYA"),
        risoLoad: str(t["risoLoad"], 12),
        riso: str(t["riso"], 12),
        imess: str(t["imess"], 12),
        umess: str(t["umess"], 12),
        zs: str(t["zs"], 12),
      };
    }
  }
  return {
    protocolNo: str(raw["protocolNo"], 30),
    ownerRole: oneOf<OwnerRole>(raw["ownerRole"], ["owner", "consumer"], d.ownerRole),
    owner: str(raw["owner"]),
    supplyNo: str(raw["supplyNo"], 40),
    address: str(raw["address"]),
    city: str(raw["city"], 80),
    postalCode: str(raw["postalCode"], 10),
    checkKind: oneOf<CheckKind>(
      raw["checkKind"],
      ["initial", "periodic", "extraordinary"],
      d.checkKind,
    ),
    extraReason: str(raw["extraReason"]),
    installCategory: strOr(raw["installCategory"], d.installCategory, 80),
    installCode: strOr(raw["installCode"], d.installCode, 10),
    network: oneOf<Network>(raw["network"], ["TT", "TN", "IT"], d.network),
    earthOhms: str(raw["earthOhms"], 12),
    earthType: oneOf<EarthType>(raw["earthType"], ["foundation", "rod", "other"], d.earthType),
    earthMethod: str(raw["earthMethod"], 80),
    feedCableType: oneOf(raw["feedCableType"], CABLE_TYPES, d.feedCableType),
    feedSection: strOr(raw["feedSection"], d.feedSection, 6),
    checks,
    remarksVisual: str(raw["remarksVisual"], 500),
    remarksMeasure: str(raw["remarksMeasure"], 300),
    remarks: str(raw["remarks"], 800),
    recommendations: str(raw["recommendations"], 800),
    labelAffixed: typeof raw["labelAffixed"] === "boolean" ? raw["labelAffixed"] : d.labelAffixed,
    nextCheck: str(raw["nextCheck"], 20),
    tests,
    rooms: (Array.isArray(raw["rooms"]) ? raw["rooms"] : []).filter(isRecord).map(normalizeRoom),
  };
}
