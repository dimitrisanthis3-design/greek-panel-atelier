// Rows of the protocol's circuit table (page 2), pulled from the panel so they never disagree.
import {
  cableCores,
  cableSectionOf,
  RCD_SENSITIVITY,
  type PanelConfig,
  type ProtectionType,
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
    rcd: cfg.rcdEnabled
      ? `${cfg.rcdPoles === "2P" ? 2 : 4}Χ${cfg.rcdAmps} ${cfg.rcdType}`
      : "—",
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
  protocolNo: string;
  ownerRole: OwnerRole;
  owner: string;
  supplyNo: string;
  address: string;
  cityLine: string;
  checkKind: CheckKind;
  extraReason: string;
  installer: Installer;
  installCategory: string;
  installCode: string;
  voltage: string;
  network: Network;
  /** Visual checks as rows of three (column-major, as on the form). */
  visualGrid: (DocCheck | null)[][];
  testGrid: (DocCheck | null)[][];
  measureChecks: DocCheck[];
  remarksVisual: string;
  remarksMeasure: string;
  earthOhms: string;
  earthType: EarthType;
  earthTypes: { key: EarthType; label: string }[];
  earthMethod: string;
  feed: FeedRow;
  rows: ProtocolRow[];
  blankRows: number;
  remarks: string;
  recommendations: string;
  labelAffixed: boolean;
  nextCheck: string;
  place: string;
  date: string;
  stampLines: string[];
}

/** Arrange items column by column into rows of three, like the printed form. */
export function gridOf<T>(items: T[], rows: number): (T | null)[][] {
  return Array.from({ length: rows }, (_, r) =>
    [0, 1, 2].map((col) => items[col * rows + r] ?? null),
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
    ownerRole: y.ownerRole,
    owner: y.owner,
    supplyNo: y.supplyNo,
    address: y.address,
    cityLine,
    checkKind: y.checkKind,
    extraReason: y.extraReason,
    installer,
    installCategory: y.installCategory,
    installCode: y.installCode,
    voltage: nominalVoltage(cfg),
    network: y.network,
    visualGrid: gridOf(VISUAL_CHECKS.map(toDoc), 4),
    testGrid: gridOf(TEST_CHECKS.map(toDoc), 2),
    measureChecks: MEASURE_CHECKS.map(toDoc),
    remarksVisual: y.remarksVisual,
    remarksMeasure: y.remarksMeasure,
    earthOhms: y.earthOhms,
    earthType: y.earthType,
    earthTypes: (Object.keys(EARTH_TYPE_LABELS) as EarthType[]).map((key) => ({
      key,
      label: EARTH_TYPE_LABELS[key],
    })),
    earthMethod: y.earthMethod,
    feed: feedRow(cfg),
    rows,
    blankRows: Math.max(0, PROTOCOL_MIN_ROWS - rows.length),
    remarks: y.remarks,
    recommendations: y.recommendations,
    labelAffixed: y.labelAffixed,
    nextCheck: nextCheckDate(y, cfg.date),
    place: y.city,
    date: cfg.date,
    stampLines: stampLines(installer),
  };
}

export const CHECK_COUNT = ALL_CHECKS.length;
