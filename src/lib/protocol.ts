// Rows of the protocol's circuit table (page 2), pulled from the panel so they never disagree.
import {
  cableCores,
  cableSectionOf,
  RCD_SENSITIVITY,
  type PanelConfig,
  type ProtectionType,
  type Supply,
} from "./panel";
import {
  ALL_CHECKS,
  EARTH_TYPE_LABELS,
  MEASURE_CHECKS,
  PROTOCOL_MIN_ROWS,
  TEST_CHECKS,
  VISUAL_CHECKS,
  checkResult,
  measureIssues,
  protocolPasses,
  testFor,
  type CableType,
  type MeasureIssue,
  nextCheckDate,
  type CheckItem,
  type CheckKind,
  type CheckResult,
  type EarthType,
  type Installer,
  type Network,
  type OwnerRole,
  type ProtocolConclusion,
} from "./yde";

export interface ProtocolRow {
  id: string;
  /** Circuit number as written on page 2 ("1", "2", …). */
  no: string;
  use: string;
  cableType: CableType;
  conductors: number;
  section: string;
  /** Kind / characteristic, e.g. "Μικρ/τος B". */
  kind: string;
  amps: number;
  risoLoad: string;
  riso: string;
  imess: string;
  umess: string;
  zs: string;
  issues: MeasureIssue[];
}

export interface FeedRow {
  cableType: CableType;
  conductors: number;
  section: string;
  kind: string;
  amps: number;
  /** RCD nominal current and type, e.g. "2Χ40 A". */
  rcd: string;
  rcdIdn: string;
}

const MAIN_KIND: Record<ProtectionType, string> = {
  fuse: "Diazed",
  mcb: "Μικρ/τος C",
  mccb: "MCCB",
};

export function rcdIdnMa(cfg: PanelConfig): number | null {
  return cfg.rcdEnabled ? RCD_SENSITIVITY : null;
}

/** "Γραμμή παροχής" row: incoming cable, main protection and the general RCD. */
export function feedRow(cfg: PanelConfig): FeedRow {
  return {
    cableType: cfg.yde.feedCableType,
    conductors: cfg.supply === "mono" ? 3 : 5,
    section: cfg.yde.feedSection.replace(".", ","),
    kind: MAIN_KIND[cfg.protectionType],
    amps: cfg.mainFuse,
    rcd: cfg.rcdEnabled ? `${cfg.rcdPoles === "2P" ? 2 : 4}Χ${cfg.rcdAmps} ${cfg.rcdType}` : "—",
    rcdIdn: cfg.rcdEnabled ? String(RCD_SENSITIVITY) : "—",
  };
}

export function protocolRows(cfg: PanelConfig): ProtocolRow[] {
  const idn = rcdIdnMa(cfg);
  return cfg.circuits.map((c, i) => {
    const t = testFor(cfg.yde, c.id);
    return {
      id: c.id,
      no: String(i + 1),
      use: c.description,
      cableType: t.cableType,
      conductors: cableCores(c.cable),
      section: cableSectionOf(c.cable).replace(".", ","),
      kind: `Μικρ/τος ${c.curve}`,
      amps: c.amps,
      risoLoad: t.risoLoad,
      riso: t.riso,
      imess: t.imess,
      umess: t.umess,
      zs: t.zs,
      issues: measureIssues(t, idn),
    };
  });
}

/** Nominal voltage written on page 1. */
export function nominalVoltage(cfg: PanelConfig): string {
  return cfg.supply === "mono" ? "230" : "400/230";
}

// ---------- The whole document, shared by the on-screen/PDF sheet and the Word file ----------

export interface DocCheck {
  id: string;
  label: string;
  result: CheckResult;
}

export interface ProtocolDoc {
  // Κεφαλίδα
  protocolNo: string;
  checkKind: CheckKind;
  extraReason: string;
  // Πλαίσιο 1: στοιχεία εγκατάστασης & ιδιοκτήτη/χρήστη
  ownerRole: OwnerRole;
  owner: string;
  supplyNo: string;
  address: string;
  cityLine: string;
  installCategory: string;
  installCode: string;
  network: Network;
  supply: Supply;
  voltage: string;
  // Πλαίσιο 2: στοιχεία εγκαταστάτη ηλεκτρολόγου
  installer: Installer;
  // Πλαίσιο 3: πίνακας οπτικού ελέγχου & δοκιμών
  /** Visual checks 1.1–1.12 in order, as printed on the form. */
  visualChecks: DocCheck[];
  /** Functional tests 2.x, in order. */
  testChecks: DocCheck[];
  /** Legacy grid representation retained for the deprecated component export. */
  visualGrid: (DocCheck | null)[][];
  testGrid: (DocCheck | null)[][];
  measureChecks: DocCheck[];
  remarksVisual: string;
  // Πλαίσιο 4: πίνακας δοκιμών & μετρήσεων κυκλωμάτων
  feed: FeedRow;
  rows: ProtocolRow[];
  blankRows: number;
  // Πλαίσιο 5: μετρήσεις γείωσης & γενικών δοκιμών
  earthOhms: string;
  earthType: EarthType;
  earthTypes: { key: EarthType; label: string }[];
  earthMethod: string;
  remarksMeasure: string;
  // Πλαίσιο 6: συμπέρασμα ελέγχου
  /** True when no check failed and no measurement is out of limits. */
  passes: boolean;
  conclusion: ProtocolConclusion;
  nextCheck: string;
  remarks: string;
  recommendations: string;
  labelAffixed: boolean;
  place: string;
  date: string;
  stampLines: string[];
}

function gridOf<T>(items: T[], rows: number): (T | null)[][] {
  return Array.from({ length: rows }, (_, row) =>
    [0, 1, 2].map((column) => items[column * rows + row] ?? null),
  );
}

export function stampLines(i: Installer): string[] {
  const join = (parts: string[]) => parts.filter(Boolean).join("  –  ");
  return [
    i.name.toLocaleUpperCase("el"),
    i.title,
    i.amNo ? `Α.Μ. / Ε.Ε.Τ.Ε.Μ.: ${i.amNo}` : "",
    join([
      i.licenseNo ? `ΑΡ ΑΔΕΙΑΣ: ${i.licenseNo}` : "",
      i.announcementNo ? `ΑΡ ΑΝΑΓΓΕΛΙΑΣ: ${i.announcementNo}` : "",
    ]),
    i.address,
    i.phone ? `ΤΗΛ: ${i.phone}` : "",
    join([i.afm ? `ΑΦΜ: ${i.afm}` : "", i.doy ? `ΔΟΥ: ${i.doy}` : ""]),
  ].filter((l) => l.trim());
}

export function buildProtocolDoc(cfg: PanelConfig, installer: Installer): ProtocolDoc {
  const y = cfg.yde;
  const toDoc = (c: CheckItem): DocCheck => ({
    id: c.id,
    label: c.label,
    result: checkResult(y, c, cfg.supply),
  });
  const rows = protocolRows(cfg);
  const cityLine = [y.city, y.postalCode ? `ΤΚ ${y.postalCode}` : ""].filter(Boolean).join("  ");
  return {
    protocolNo: y.protocolNo,
    checkKind: y.checkKind,
    extraReason: y.extraReason,
    ownerRole: y.ownerRole,
    owner: y.owner,
    supplyNo: y.supplyNo,
    address: y.address,
    cityLine,
    installCategory: y.installCategory,
    installCode: y.installCode,
    network: y.network,
    supply: cfg.supply,
    voltage: nominalVoltage(cfg),
    installer,
    visualChecks: VISUAL_CHECKS.map(toDoc),
    testChecks: TEST_CHECKS.map(toDoc),
    visualGrid: gridOf(VISUAL_CHECKS.map(toDoc), 4),
    testGrid: gridOf(TEST_CHECKS.map(toDoc), 2),
    measureChecks: MEASURE_CHECKS.map(toDoc),
    remarksVisual: y.remarksVisual,
    feed: feedRow(cfg),
    rows,
    blankRows: Math.max(0, PROTOCOL_MIN_ROWS - rows.length),
    earthOhms: y.earthOhms,
    earthType: y.earthType,
    earthTypes: (Object.keys(EARTH_TYPE_LABELS) as (keyof typeof EARTH_TYPE_LABELS)[]).map(
      (key) => ({
        key,
        label: EARTH_TYPE_LABELS[key],
      }),
    ),
    earthMethod: y.earthMethod,
    remarksMeasure: y.remarksMeasure,
    passes: protocolPasses(y, cfg.circuits, cfg.supply, rcdIdnMa(cfg)),
    conclusion: y.conclusion,
    nextCheck: nextCheckDate(y, cfg.date),
    remarks: y.remarks,
    recommendations: y.recommendations,
    labelAffixed: y.labelAffixed,
    place: y.city,
    date: cfg.date,
    stampLines: stampLines(installer),
  };
}

export const CHECK_COUNT = ALL_CHECKS.length;
