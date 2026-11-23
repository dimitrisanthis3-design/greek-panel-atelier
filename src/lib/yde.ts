// ΥΔΕ (ΕΛΟΤ HD 384) documents: installer details, per-project data, protocol checklist,
// circuit measurements and the ΕΗΕ room recording. Imports only types from panel.ts so that
// panel.ts can call normalizeYde without a circular runtime import.
import type { Circuit } from "./panel";

export type CheckKind = "initial" | "recheck";
export type CheckResult = "ok" | "fail" | "na";
export type CableType = "NYA" | "NYY" | "NYM";

export const CABLE_TYPES: CableType[] = ["NYA", "NYY", "NYM"];
export const CHECK_KIND_LABELS: Record<CheckKind, string> = {
  initial: "Αρχικός έλεγχος",
  recheck: "Επανέλεγχος",
};
export const CHECK_RESULT_LABELS: Record<CheckResult, string> = { ok: "ΝΑΙ", fail: "ΟΧΙ", na: "—" };

/** kW counted per Schuko (σούκο) socket in the installed power. */
export const SOCKET_KW = 0.2;
/** kW counted per light point in the installed power. */
export const LIGHT_KW = 0.1;
/** Minimum insulation resistance (MΩ) for circuits up to 500 V, tested at 500 V DC. */
export const MIN_RISO_MOHM = 0.5;

export interface Installer {
  name: string;
  licenseNo: string;
  announcementNo: string;
  afm: string;
  doy: string;
  instrument: string;
}

export interface CircuitTest {
  cableType: CableType;
  riso: string;
  imess: string;
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
  owner: string;
  supplyNo: string;
  address: string;
  postalCode: string;
  checkKind: CheckKind;
  earthOhms: string;
  checks: Record<string, CheckResult>;
  tests: Record<string, CircuitTest>;
  rooms: Room[];
}

export interface CheckItem {
  id: string;
  label: string;
}

export const VISUAL_CHECKS: CheckItem[] = [
  { id: "v1", label: "Μέτρα προστασίας έναντι ηλεκτροπληξίας (άμεση και έμμεση επαφή)" },
  { id: "v2", label: "Προστασία έναντι θερμικών επιδράσεων και διάδοσης πυρκαγιάς" },
  { id: "v3", label: "Επιλογή αγωγών ως προς την ικανότητα φόρτισης και την πτώση τάσης" },
  { id: "v4", label: "Επιλογή και ρύθμιση των διατάξεων προστασίας και επιτήρησης" },
  { id: "v5", label: "Ύπαρξη και σωστή θέση διατάξεων απομόνωσης και διακοπής" },
  { id: "v6", label: "Επιλογή εξοπλισμού και μέτρων προστασίας ανάλογα με τις εξωτερικές επιδράσεις" },
  { id: "v7", label: "Σήμανση ουδετέρου (μπλε) και αγωγού προστασίας (πράσινο-κίτρινο)" },
  { id: "v8", label: "Ύπαρξη μονογραμμικού διαγράμματος, προειδοποιητικών πινακίδων και οδηγιών" },
  { id: "v9", label: "Αναγνώριση κυκλωμάτων, ασφαλειών, διακοπτών και ακροδεκτών" },
  { id: "v10", label: "Σωστή σύνδεση αγωγών και ακροδεκτών" },
  { id: "v11", label: "Προσβασιμότητα για λειτουργία, αναγνώριση και συντήρηση" },
  { id: "v12", label: "Κύρια και συμπληρωματική ισοδυναμική σύνδεση" },
];

export const TEST_CHECKS: CheckItem[] = [
  { id: "t1", label: "Συνέχεια αγωγών προστασίας και ισοδυναμικών συνδέσεων" },
  { id: "t2", label: "Αντίσταση μόνωσης της ηλεκτρικής εγκατάστασης" },
  { id: "t3", label: "Προστασία με αυτόματη διακοπή της τροφοδότησης" },
  { id: "t4", label: "Μέτρηση αντίστασης γείωσης" },
  { id: "t5", label: "Έλεγχος πολικότητας" },
  { id: "t6", label: "Δοκιμή λειτουργίας διάταξης διαφορικού ρεύματος (RCD)" },
  { id: "t7", label: "Έλεγχος διαδοχής φάσεων (τριφασικές εγκαταστάσεις)" },
  { id: "t8", label: "Δοκιμές λειτουργίας διατάξεων και εξοπλισμού" },
];

export const ALL_CHECKS = [...VISUAL_CHECKS, ...TEST_CHECKS];

export function emptyInstaller(): Installer {
  return { name: "", licenseNo: "", announcementNo: "", afm: "", doy: "", instrument: "" };
}

export function defaultTest(): CircuitTest {
  return { cableType: "NYA", riso: "", imess: "", zs: "" };
}

export function defaultYde(): YdeProject {
  return {
    owner: "",
    supplyNo: "",
    address: "",
    postalCode: "",
    checkKind: "initial",
    earthOhms: "",
    checks: {},
    tests: {},
    rooms: [],
  };
}

/** Result of a checklist item; unanswered items count as passed. */
export function checkResult(y: YdeProject, id: string): CheckResult {
  return y.checks[id] ?? "ok";
}

export function testFor(y: YdeProject, circuitId: string): CircuitTest {
  return y.tests[circuitId] ?? defaultTest();
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
  const riso = parseMeasure(t.riso);
  if (riso !== null && riso < MIN_RISO_MOHM) out.push("riso");
  const imess = parseMeasure(t.imess);
  if (imess !== null && rcdIdnMa !== null && imess > rcdIdnMa) out.push("imess");
  return out;
}

/** The installation passes when no checklist item failed and no measurement is out of limits. */
export function protocolPasses(y: YdeProject, circuits: Circuit[], rcdIdnMa: number | null): boolean {
  if (ALL_CHECKS.some((c) => checkResult(y, c.id) === "fail")) return false;
  return circuits.every((c) => measureIssues(testFor(y, c.id), rcdIdnMa).length === 0);
}

// ---------- ΕΗΕ recording ----------

export function roomKw(r: Room): number {
  return r.sockets * SOCKET_KW + r.lights * LIGHT_KW + r.fixedKw;
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
      kw: a.kw + roomKw(r),
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
function count(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(999, Math.round(v))) : 0;
}
function kw(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(999, round2(v))) : 0;
}

export function normalizeInstaller(raw: unknown): Installer {
  const r = isRecord(raw) ? raw : {};
  return {
    name: str(r["name"]),
    licenseNo: str(r["licenseNo"]),
    announcementNo: str(r["announcementNo"]),
    afm: str(r["afm"], 20),
    doy: str(r["doy"]),
    instrument: str(r["instrument"]),
  };
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
      const cableType = CABLE_TYPES.includes(t["cableType"] as CableType)
        ? (t["cableType"] as CableType)
        : "NYA";
      tests[id] = {
        cableType,
        riso: str(t["riso"], 12),
        imess: str(t["imess"], 12),
        zs: str(t["zs"], 12),
      };
    }
  }
  return {
    owner: str(raw["owner"]),
    supplyNo: str(raw["supplyNo"], 40),
    address: str(raw["address"]),
    postalCode: str(raw["postalCode"], 10),
    checkKind: raw["checkKind"] === "recheck" ? "recheck" : "initial",
    earthOhms: str(raw["earthOhms"], 12),
    checks,
    tests,
    rooms: (Array.isArray(raw["rooms"]) ? raw["rooms"] : []).filter(isRecord).map(normalizeRoom),
  };
}
