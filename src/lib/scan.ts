// Photo / sketch scan: the JSON shape asked from the vision model and how its answer
// becomes a PanelConfig. The model's output is untrusted: every value is snapped to an
// allowed option and the result still passes normalizeConfig.
import {
  CABLE_SECTIONS,
  CIRCUIT_AMP_OPTIONS,
  MAIN_FUSE_OPTIONS,
  MAIN_SWITCH_OPTIONS,
  MAX_BREAKER_FOR_SECTION,
  RCD_AMP_OPTIONS,
  normalizeConfig,
  type Circuit,
  type Curve,
  type PanelConfig,
  type Poles,
  type ProtectionType,
  type RcdPoles,
  type RcdType,
  type Supply,
} from "./panel";

export interface ScannedCircuit {
  poles: Poles | null;
  amps: number | null;
  curve: Curve | null;
  description: string | null;
  cableSection: string | null;
}

export interface ScanResult {
  supply: Supply | null;
  mainSwitchAmps: number | null;
  protectionType: ProtectionType | null;
  mainProtectionAmps: number | null;
  indicatorLamp: boolean | null;
  rcdPresent: boolean | null;
  rcdPoles: RcdPoles | null;
  rcdAmps: number | null;
  rcdType: RcdType | null;
  circuits: ScannedCircuit[];
  notes: string;
}

/** Response schema in the Gemini (OpenAPI subset) format. */
export const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    supply: { type: "STRING", enum: ["mono", "tri"], nullable: true },
    mainSwitchAmps: { type: "NUMBER", nullable: true },
    protectionType: { type: "STRING", enum: ["mcb", "fuse", "mccb"], nullable: true },
    mainProtectionAmps: { type: "NUMBER", nullable: true },
    indicatorLamp: { type: "BOOLEAN", nullable: true },
    rcdPresent: { type: "BOOLEAN", nullable: true },
    rcdPoles: { type: "STRING", enum: ["2P", "4P"], nullable: true },
    rcdAmps: { type: "NUMBER", nullable: true },
    rcdType: { type: "STRING", enum: ["A", "AC"], nullable: true },
    circuits: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          poles: { type: "STRING", enum: ["1P", "1P+N", "3P"], nullable: true },
          amps: { type: "NUMBER", nullable: true },
          curve: { type: "STRING", enum: ["B", "C"], nullable: true },
          description: { type: "STRING", nullable: true },
          cableSection: { type: "STRING", nullable: true },
        },
      },
    },
    notes: { type: "STRING" },
  },
  required: ["circuits", "notes"],
} as const;

export const SCAN_PROMPT = `Είσαι έμπειρος Έλληνας ηλεκτρολόγος. Η εικόνα είναι είτε φωτογραφία υφιστάμενου ηλεκτρικού πίνακα (ράγα DIN) είτε χειρόγραφο σημείωμα / σκαρίφημα πίνακα.
Αναγνώρισε τα υλικά από πάνω προς τα κάτω / αριστερά προς τα δεξιά:
- supply: "mono" για μονοφασική, "tri" για τριφασική παροχή (π.χ. 3 φάσεις, τετραπολικός γενικός, 4P ρελέ, 3P ασφάλειες).
- mainSwitchAmps: ονομαστική ένταση γενικού διακόπτη φορτίου (π.χ. 40, 63).
- protectionType + mainProtectionAmps: γενική ασφάλεια: "mcb" μικροαυτόματος, "fuse" τηκόμενη ασφάλεια φυσιγγίου (π.χ. ασφαλειοαποζεύκτης, βιδωτή), "mccb" αυτόματος διακόπτης ισχύος.
- indicatorLamp: αν υπάρχει ενδεικτική λυχνία ράγας.
- rcdPresent, rcdPoles ("2P"/"4P"), rcdAmps, rcdType ("A"/"AC"): ρελέ διαρροής.
- circuits: κάθε μικροαυτόματος αναχώρησης με poles ("1P", "1P+N", "3P"), amps, curve ("B"/"C", από το γράμμα πριν τα αμπέρ, π.χ. C16), description στα ελληνικά (π.χ. Φωτισμός, Ρευματοδότες, Κουζίνα, Θερμοσίφωνας, Κλιματιστικό) και cableSection σε mm² αν φαίνεται (π.χ. "1.5", "2.5", "4").
Αν κάτι δεν φαίνεται ή δεν είσαι σίγουρος, βάλε null· μην μαντεύεις. Μην βάζεις στη λίστα circuits τον γενικό διακόπτη, τη γενική ασφάλεια ή το ρελέ.
Στο notes γράψε σύντομα στα ελληνικά τι δεν διαβάστηκε καθαρά ή τι χρειάζεται έλεγχο.`;

// ---------- Parsing the model's answer ----------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}
function amps(v: unknown): number | null {
  const n = typeof v === "string" ? Number.parseFloat(v.replace(",", ".")) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}
function text(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Read the model's JSON (already parsed) into a ScanResult; null when it is not an object. */
export function parseScanResult(raw: unknown): ScanResult | null {
  if (!isRecord(raw)) return null;
  const circuits = (Array.isArray(raw["circuits"]) ? raw["circuits"] : [])
    .filter(isRecord)
    .map((c) => ({
      poles: oneOf<Poles>(c["poles"], ["1P", "1P+N", "3P"]),
      amps: amps(c["amps"]),
      curve: oneOf<Curve>(typeof c["curve"] === "string" ? c["curve"].toUpperCase() : null, [
        "B",
        "C",
      ]),
      description: text(c["description"]),
      cableSection: text(c["cableSection"]),
    }));
  return {
    supply: oneOf<Supply>(raw["supply"], ["mono", "tri"]),
    mainSwitchAmps: amps(raw["mainSwitchAmps"]),
    protectionType: oneOf<ProtectionType>(raw["protectionType"], ["mcb", "fuse", "mccb"]),
    mainProtectionAmps: amps(raw["mainProtectionAmps"]),
    indicatorLamp: typeof raw["indicatorLamp"] === "boolean" ? raw["indicatorLamp"] : null,
    rcdPresent: typeof raw["rcdPresent"] === "boolean" ? raw["rcdPresent"] : null,
    rcdPoles: oneOf<RcdPoles>(raw["rcdPoles"], ["2P", "4P"]),
    rcdAmps: amps(raw["rcdAmps"]),
    rcdType: oneOf<RcdType>(raw["rcdType"], ["A", "AC"]),
    circuits,
    notes: text(raw["notes"]) ?? "",
  };
}

// ---------- Turning a scan into a panel ----------

/** Closest allowed rating; on a tie the higher one. */
export function snapTo(value: number, options: readonly number[]): number {
  let best = options[0] ?? value;
  for (const o of options) {
    const d = Math.abs(o - value);
    const bd = Math.abs(best - value);
    if (d < bd || (d === bd && o > best)) best = o;
  }
  return best;
}

/** Smallest standard cable section whose breaker limit covers these amps. */
export function sectionForAmps(a: number): string {
  for (const s of CABLE_SECTIONS) {
    const max = MAX_BREAKER_FOR_SECTION[s];
    if (max !== undefined && max >= a) return s;
  }
  return CABLE_SECTIONS[CABLE_SECTIONS.length - 1] ?? "10";
}

function normalizeSection(s: string | null): string | null {
  if (!s) return null;
  const m = /(\d+(?:[.,]\d+)?)\s*(?:mm|$)/i.exec(s.split(/x/i).pop() ?? s);
  const n = m?.[1]?.replace(",", ".");
  return n && CABLE_SECTIONS.includes(n) ? n : null;
}

export interface ScanApplied {
  config: PanelConfig;
  /** What was adjusted to fit the available options, in Greek. */
  adjustments: string[];
}

/**
 * Fill the panel from a scan. Anything the scan did not read keeps the current value;
 * recognised outgoing circuits replace the current list.
 */
export function applyScan(scan: ScanResult, base: PanelConfig, newId: () => string): ScanApplied {
  const adjustments: string[] = [];
  const snap = (label: string, v: number | null, opts: readonly number[], fallback: number) => {
    if (v === null) return fallback;
    const s = snapTo(v, opts);
    if (s !== v) adjustments.push(`${label}: διαβάστηκε ${v}A, ορίστηκε ${s}A.`);
    return s;
  };

  const supply: Supply =
    scan.supply ??
    (scan.rcdPoles === "4P" || scan.circuits.some((c) => c.poles === "3P") ? "tri" : base.supply);

  const circuits: Circuit[] = scan.circuits.map((c, i) => {
    const label = `Γραμμή ${i + 1}`;
    const a = snap(label, c.amps, CIRCUIT_AMP_OPTIONS, 16);
    let poles: Poles = c.poles ?? "1P";
    if (poles === "3P" && supply === "mono") {
      poles = "1P+N";
      adjustments.push(`${label}: τριπολική σε μονοφασική παροχή, ορίστηκε 1P+N.`);
    }
    const description = c.description ?? "";
    const curve: Curve = c.curve ?? (/φωτ/i.test(description) ? "B" : "C");
    const section = normalizeSection(c.cableSection) ?? sectionForAmps(a);
    const cores = poles === "3P" ? "5" : "3";
    return {
      id: newId(),
      poles,
      amps: a,
      curve,
      description,
      cable: `${cores}x${section}`,
      phase: poles === "3P" ? "L123" : "L",
    };
  });

  const rcdEnabled = scan.rcdPresent ?? (scan.rcdPoles || scan.rcdAmps ? true : base.rcdEnabled);
  const draft: PanelConfig = {
    ...base,
    supply,
    mainSwitch: snap("Γενικός διακόπτης", scan.mainSwitchAmps, MAIN_SWITCH_OPTIONS, base.mainSwitch),
    protectionType: scan.protectionType ?? base.protectionType,
    mainFuse: snap("Γενική ασφάλεια", scan.mainProtectionAmps, MAIN_FUSE_OPTIONS, base.mainFuse),
    indicatorLamp: scan.indicatorLamp ?? base.indicatorLamp,
    rcdEnabled,
    rcdPoles: scan.rcdPoles ?? (supply === "tri" ? "4P" : "2P"),
    rcdAmps: snap("Ρελέ διαρροής", scan.rcdAmps, RCD_AMP_OPTIONS, base.rcdAmps),
    rcdType: scan.rcdType ?? base.rcdType,
    circuits: circuits.length ? circuits : base.circuits,
  };
  return { config: normalizeConfig(draft) ?? base, adjustments };
}
