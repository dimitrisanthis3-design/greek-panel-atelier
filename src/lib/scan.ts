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
import { balanceThreePhaseCircuits } from "./electrical-calc";

export interface ScannedCircuit {
  poles: Poles | null;
  amps: number | null;
  curve: Curve | null;
  description: string | null;
  cableSection: string | null;
  quantity: number | null;
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
          quantity: { type: "NUMBER", nullable: true },
        },
      },
    },
    notes: { type: "STRING" },
  },
  required: ["circuits", "notes"],
} as const;

export const SCAN_PROMPT = `Είσαι έμπειρος Έλληνας ηλεκτρολόγος. Το αρχείο είναι είτε φωτογραφία υφιστάμενου ηλεκτρικού πίνακα (ράγα DIN), χειρόγραφο σημείωμα / σκαρίφημα πίνακα, είτε PDF μονογραμμικού διαγράμματος.
Αναγνώρισε τα υλικά από πάνω προς τα κάτω / αριστερά προς τα δεξιά:
- supply: "mono" για μονοφασική, "tri" για τριφασική παροχή (π.χ. 3 φάσεις, τετραπολικός γενικός, 4P ρελέ, 3P ασφάλειες).
- mainSwitchAmps: ονομαστική ένταση γενικού διακόπτη φορτίου (π.χ. 40, 63).
- protectionType + mainProtectionAmps: γενική ασφάλεια: "mcb" μικροαυτόματος, "fuse" τηκόμενη ασφάλεια φυσιγγίου (π.χ. ασφαλειοαποζεύκτης, βιδωτή), "mccb" αυτόματος διακόπτης ισχύος.
- indicatorLamp: αν υπάρχει ενδεικτική λυχνία ράγας.
- rcdPresent, rcdPoles ("2P"/"4P"), rcdAmps, rcdType ("A"/"AC"): ρελέ διαρροής.
- circuits: κάθε μικροαυτόματος αναχώρησης με poles ("1P", "1P+N", "3P"), amps, curve ("B"/"C", από το γράμμα πριν τα αμπέρ, π.χ. C16), description στα ελληνικά (π.χ. Φωτισμός, Ρευματοδότες, Κουζίνα, Θερμοσίφωνας, Κλιματιστικό) και cableSection σε mm² αν φαίνεται (π.χ. "1.5", "2.5", "4").
Αν κάτι δεν φαίνεται ή δεν είσαι σίγουρος, βάλε null· μην μαντεύεις. Μην βάζεις στη λίστα circuits τον γενικό διακόπτη, τη γενική ασφάλεια ή το ρελέ.
Στο notes γράψε σύντομα στα ελληνικά τι δεν διαβάστηκε καθαρά ή τι χρειάζεται έλεγχο.`;

export const VOICE_SCAN_PROMPT = `Είσαι έμπειρος Έλληνας ηλεκτρολόγος και σχεδιάζεις πίνακες σύμφωνα με τις βασικές αρχές του ΕΛΟΤ 60364. Ο χρήστης περιγράφει στα ελληνικά τον πίνακα με φυσική γλώσσα.
Επέστρεψε αποκλειστικά JSON σύμφωνα με το παρεχόμενο response schema. Συμπλήρωσε supply, mainSwitchAmps, protectionType, mainProtectionAmps, indicatorLamp, rcdPresent, rcdPoles, rcdAmps, rcdType και circuits. Για κάθε τύπο γραμμής βάλε poles, amps, curve, description, cableSection και quantity.
Ερμήνευσε εκφράσεις όπως «τεμ. 5», «πέντε γραμμές» ή «x5» ως πλήθος ανεξάρτητων γραμμών ίδιου τύπου και βάλε αυτόν τον αριθμό στο quantity. Μην παραλείπεις τα αντίστοιχα circuits.
Εφάρμοσε τους εξής κανόνες όταν ο χρήστης δεν δίνει διαφορετική σαφή πληροφορία:
- Γενικός διακόπτης ίσος ή μεγαλύτερος από τη γενική ασφάλεια. Αν δεν αναφέρεται, διάλεξε κατάλληλη τυποποιημένη τιμή που να μην είναι μικρότερη από τη γενική ασφάλεια.
- indicatorLamp: true. rcdPresent: true, εκτός αν ο χρήστης δηλώσει ρητά ότι δεν υπάρχει ρελέ.
- Σε τριφασικό πίνακα χρησιμοποίησε rcdPoles "4P". Οι μονοφασικές γραμμές θα κατανεμηθούν αυτόματα στις L1, L2, L3 από την εφαρμογή.
- Γραμμές 6A ή 10A: curve "B", cableSection "1.5", περιγραφή "Φωτισμός".
- Γραμμές 16A: curve "C", cableSection "2.5", περιγραφή "Ρευματοδότες".
- Θερμοσίφωνας 20A: poles "1P" ή "1P+N" όταν δηλώνεται, curve "C", cableSection "2.5" (ή "4" αν αναφέρεται).
- Κουζίνα 25A: poles "1P+N", curve "C", cableSection "4".
Μην εφευρίσκεις πλήθος γραμμών ή συγκεκριμένες τιμές που δεν προκύπτουν από την περιγραφή. Για άγνωστα στοιχεία βάλε null. Μην προσθέτεις γενικό διακόπτη, γενική ασφάλεια ή ρελέ στα circuits.
Περιγραφή χρήστη:
`;

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
      quantity: amps(c["quantity"]),
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

function unaccent(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Apply conservative defaults specifically to a natural-language panel description. */
export function applyVoiceDefaults(scan: ScanResult, description: string): ScanResult {
  const spoken = unaccent(description);
  const supply: Supply =
    scan.supply ?? (/\b3\s*φ\b|τριφασ|τρεις φασεις|τρια φαση/.test(spoken) ? "tri" : "mono");
  const fuse =
    scan.mainProtectionAmps === null ? null : snapTo(scan.mainProtectionAmps, MAIN_FUSE_OPTIONS);
  const mainSwitchAmps =
    scan.mainSwitchAmps ??
    (fuse === null
      ? null
      : (MAIN_SWITCH_OPTIONS.find((amps) => amps >= fuse) ?? MAIN_SWITCH_OPTIONS.at(-1) ?? fuse));
  const rcdAbsent = /χωρις ρελε|χωρις ρελε διαρροης|δεν (?:εχω|υπαρχει) ρελε|οχι ρελε/.test(spoken);
  const lampAbsent = /χωρις (?:ενδεικτικες? )?λυχνι|χωρις λαμπα|χωρις ενδειξη|χωρις φωτακι/.test(
    spoken,
  );
  const rcdAmps =
    scan.rcdAmps ??
    (fuse === null
      ? null
      : (RCD_AMP_OPTIONS.find((amps) => amps >= fuse) ?? RCD_AMP_OPTIONS.at(-1) ?? fuse));

  return {
    ...scan,
    supply,
    mainSwitchAmps,
    indicatorLamp: !lampAbsent,
    rcdPresent: !rcdAbsent,
    rcdPoles: supply === "tri" ? "4P" : (scan.rcdPoles ?? "2P"),
    rcdAmps,
    rcdType: scan.rcdType ?? "A",
    circuits: scan.circuits.map((circuit) => {
      const circuitDescription = unaccent(circuit.description ?? "");
      const amps = circuit.amps;
      const isCooker = /κουζ|εστι/.test(circuitDescription) || amps === 25;
      const isHeater = /θερμοσιφ/.test(circuitDescription) || amps === 20;
      let defaultDescription = circuit.description;
      if (!defaultDescription) {
        if (amps === 6 || amps === 10) defaultDescription = "Φωτισμός";
        else if (amps === 16) defaultDescription = "Ρευματοδότες";
        else if (isHeater) defaultDescription = "Θερμοσίφωνας";
        else if (isCooker) defaultDescription = "Κουζίνα";
      }
      if ((amps === 6 || amps === 10 || amps === 16) && defaultDescription) {
        defaultDescription = `${defaultDescription.replace(/\s+\d+$/, "")} 1`;
      }

      const defaultCable =
        amps === 6 || amps === 10
          ? "1.5"
          : amps === 16
            ? "2.5"
            : amps === 20 && isHeater
              ? "2.5"
              : amps === 25 && isCooker
                ? "4"
                : amps === null
                  ? null
                  : sectionForAmps(amps);
      const heaterCable = normalizeSection(circuit.cableSection) === "4" ? "4" : "2.5";
      return {
        ...circuit,
        poles: amps === 25 && isCooker ? "1P+N" : circuit.poles,
        curve:
          amps === 6 || amps === 10
            ? "B"
            : amps === 16 || (amps !== null && (isHeater || isCooker))
              ? "C"
              : (circuit.curve ?? (amps === null ? null : "C")),
        description: defaultDescription,
        cableSection:
          amps === 6 || amps === 10 || amps === 16 || (amps === 25 && isCooker)
            ? defaultCable
            : amps === 20 && isHeater
              ? heaterCable
              : (circuit.cableSection ?? defaultCable),
      };
    }),
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

  const expanded = scan.circuits.flatMap((c) => {
    const quantity = Math.min(50, Math.max(1, Math.floor(c.quantity ?? 1)));
    return Array.from({ length: quantity }, () => c);
  });
  const circuitNames = expanded.map((c) => {
    const a = snapTo(c.amps ?? 16, CIRCUIT_AMP_OPTIONS);
    const name =
      c.description ??
      (a <= 10
        ? "Φωτισμός"
        : a === 16
          ? "Ρευματοδότες"
          : a === 20
            ? "Θερμοσίφωνας"
            : a === 25
              ? "Κουζίνα"
              : "Γραμμή");
    return name.replace(/\s+\d+$/, "");
  });
  const nameCounts = new Map<string, number>();
  circuitNames.forEach((name) => nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1));
  const nameIndices = new Map<string, number>();

  const circuits: Circuit[] = expanded.map((c, i) => {
    const label = `Γραμμή ${i + 1}`;
    const a = snap(label, c.amps, CIRCUIT_AMP_OPTIONS, 16);
    const descriptionBase = circuitNames[i] ?? "Γραμμή";
    let poles: Poles = c.poles ?? (a === 25 && /κουζ|εστία/i.test(descriptionBase) ? "1P+N" : "1P");
    if (poles === "3P" && supply === "mono") {
      poles = "1P+N";
      adjustments.push(`${label}: τριπολική σε μονοφασική παροχή, ορίστηκε 1P+N.`);
    }
    const index = (nameIndices.get(descriptionBase) ?? 0) + 1;
    nameIndices.set(descriptionBase, index);
    const description =
      (nameCounts.get(descriptionBase) ?? 0) > 1
        ? `${descriptionBase} ${index}`
        : (c.description ?? descriptionBase);
    const curve: Curve = c.curve ?? (a <= 10 ? "B" : "C");
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
  const mainFuse = snap(
    "Γενική ασφάλεια",
    scan.mainProtectionAmps,
    MAIN_FUSE_OPTIONS,
    base.mainFuse,
  );
  let mainSwitch = snap(
    "Γενικός διακόπτης",
    scan.mainSwitchAmps,
    MAIN_SWITCH_OPTIONS,
    Math.max(base.mainSwitch, mainFuse),
  );
  if (mainSwitch < mainFuse) {
    mainSwitch = MAIN_SWITCH_OPTIONS.find((amps) => amps >= mainFuse) ?? mainFuse;
    adjustments.push(
      `Γενικός διακόπτης: αυξήθηκε στα ${mainSwitch}A ώστε να μην είναι μικρότερος από τη γενική ασφάλεια.`,
    );
  }
  const draft: PanelConfig = {
    ...base,
    supply,
    mainSwitch,
    protectionType: scan.protectionType ?? base.protectionType,
    mainFuse,
    indicatorLamp: scan.indicatorLamp ?? base.indicatorLamp,
    rcdEnabled,
    rcdPoles: scan.rcdPoles ?? (supply === "tri" ? "4P" : "2P"),
    rcdAmps: snap("Ρελέ διαρροής", scan.rcdAmps, RCD_AMP_OPTIONS, base.rcdAmps),
    rcdType: scan.rcdType ?? base.rcdType,
    circuits: circuits.length ? circuits : base.circuits,
  };
  const config = normalizeConfig(draft) ?? base;
  return {
    config:
      supply === "tri"
        ? { ...config, circuits: balanceThreePhaseCircuits(config.circuits) }
        : config,
    adjustments,
  };
}
