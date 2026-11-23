// Rows of the protocol's circuit table (page 2), pulled from the panel so they never disagree.
import { cableCores, cableSectionOf, circuitCode, RCD_SENSITIVITY, type PanelConfig } from "./panel";
import { measureIssues, testFor, type CableType, type MeasureIssue } from "./yde";

export interface ProtocolRow {
  id: string;
  code: string;
  use: string;
  cableType: CableType;
  conductors: number;
  section: string;
  /** e.g. "MCB C16" */
  protection: string;
  curve: string;
  amps: number;
  rcdIn: string;
  rcdIdn: string;
  imess: string;
  riso: string;
  zs: string;
  issues: MeasureIssue[];
}

export function rcdIdnMa(cfg: PanelConfig): number | null {
  return cfg.rcdEnabled ? RCD_SENSITIVITY : null;
}

export function protocolRows(cfg: PanelConfig): ProtocolRow[] {
  const idn = rcdIdnMa(cfg);
  return cfg.circuits.map((c, i) => {
    const t = testFor(cfg.yde, c.id);
    return {
      id: c.id,
      code: circuitCode(i),
      use: c.description,
      cableType: t.cableType,
      conductors: cableCores(c.cable),
      section: cableSectionOf(c.cable).replace(".", ","),
      protection: `MCB ${c.curve}${c.amps}`,
      curve: c.curve,
      amps: c.amps,
      rcdIn: cfg.rcdEnabled ? `${cfg.rcdAmps}` : "—",
      rcdIdn: idn !== null ? `${idn}` : "—",
      imess: t.imess,
      riso: t.riso,
      zs: t.zs,
      issues: measureIssues(t, idn),
    };
  });
}
