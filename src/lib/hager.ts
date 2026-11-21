// Bill of materials: maps a panel configuration to Hager catalogue references and quantities.
import {
  type Circuit,
  type CustomItem,
  type PanelConfig,
  PROTECTION_LABELS,
  RCD_SENSITIVITY,
} from "./panel";

export interface BomLine {
  code: string;
  description: string;
  qty: number;
  /** DIN-rail modules (17.5 mm) per unit. */
  modules: number;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function mainSwitchCode(cfg: Pick<PanelConfig, "supply" | "mainSwitch">): string {
  const poles = cfg.supply === "mono" ? 2 : 4;
  const rating = cfg.mainSwitch === 100 ? "90" : String(cfg.mainSwitch);
  return `SBN${poles}${rating}`;
}

export function mcbCode(c: Pick<Circuit, "curve" | "poles" | "amps">): string {
  const series = c.curve === "B" ? "MBN" : "MCN";
  const p = c.poles === "1P" ? 1 : c.poles === "1P+N" ? 5 : 3;
  return `${series}${p}${pad2(c.amps)}`;
}

export function rcdCode(cfg: Pick<PanelConfig, "rcdPoles" | "rcdAmps" | "rcdType">): string {
  const series = cfg.rcdType === "A" ? "CDA" : "CDC";
  const suffix = cfg.rcdType === "A" ? "D" : "F";
  return `${series}${cfg.rcdPoles === "2P" ? 2 : 4}${cfg.rcdAmps}${suffix}`;
}

const MCB_MODULES: Record<Circuit["poles"], number> = { "1P": 1, "1P+N": 2, "3P": 3 };

interface FuseSize {
  carrier: string;
  link: string;
  size: string;
  modules: number;
}
export function fuseFor(amps: number): FuseSize {
  if (amps <= 32) return { carrier: "LS501", link: "LF332G", size: "10x38", modules: 1 };
  if (amps <= 50)
    return {
      carrier: "LS601",
      link: amps <= 40 ? "LF440G" : "LF450G",
      size: "14x51",
      modules: 1.5,
    };
  return { carrier: "LS701", link: "LF563G", size: "22x58", modules: 2 };
}

function mainProtection(cfg: PanelConfig): BomLine[] {
  const tri = cfg.supply === "tri";
  const a = cfg.mainFuse;
  if (cfg.protectionType === "mcb") {
    return [
      {
        code: `MCN${tri ? 3 : 2}${pad2(a)}`,
        description: `Γενικός μικροαυτόματος ${tri ? "3P" : "2P"} C${a} 6kA`,
        qty: 1,
        modules: tri ? 3 : 2,
      },
    ];
  }
  if (cfg.protectionType === "fuse") {
    const f = fuseFor(a);
    const n = tri ? 3 : 1;
    return [
      {
        code: f.carrier,
        description: `Ασφαλειοθήκη φυσιγγίου 1P ${f.size}`,
        qty: n,
        modules: f.modules,
      },
      { code: f.link, description: `Φυσίγγιο ασφάλειας gG ${f.size} ${a}A`, qty: n, modules: 0 },
    ];
  }
  return [
    {
      code: `HDA0${pad2(a)}L`,
      description: `${PROTECTION_LABELS.mccb} h3 x160 3P ${a}A 18kA`,
      qty: 1,
      modules: 4.5,
    },
    { code: "HYA033H", description: "Αντάπτορας ράγας DIN για x160", qty: 1, modules: 0 },
  ];
}

function combBusbar(cfg: PanelConfig): BomLine[] {
  if (cfg.circuits.length === 0) return [];
  const modules = cfg.circuits.reduce((s, c) => s + MCB_MODULES[c.poles], 0);
  const withN = cfg.circuits.some((c) => c.poles === "1P+N");
  const [code, poles] =
    cfg.supply === "mono"
      ? withN
        ? ["KDN263A", "2P"]
        : ["KDN163A", "1P"]
      : withN
        ? ["KDN463A", "4P"]
        : ["KDN363A", "3P"];
  return [
    {
      code,
      description: `Χτένα γεφύρωσης ${poles} 63A 10mm² 12 θέσεων`,
      qty: Math.ceil(modules / 12),
      modules: 0,
    },
  ];
}

/** Every Hager device the panel needs, identical codes merged, in panel order. */
export function buildBom(cfg: PanelConfig): BomLine[] {
  const tri = cfg.supply === "tri";
  const lines: BomLine[] = [
    {
      code: mainSwitchCode(cfg),
      description: `Γενικός διακόπτης φορτίου ${tri ? "4P" : "2P"} ${cfg.mainSwitch}A`,
      qty: 1,
      modules: tri ? 4 : 2,
    },
    ...mainProtection(cfg),
  ];
  if (cfg.indicatorLamp) {
    lines.push({
      code: "SVN122",
      description: "Ενδεικτική λυχνία ράγας LED 230V κόκκινη",
      qty: tri ? 3 : 1,
      modules: 1,
    });
  }
  if (cfg.rcdEnabled) {
    lines.push({
      code: rcdCode(cfg),
      description: `Ρελέ διαρροής ${cfg.rcdPoles} ${cfg.rcdAmps}A ${RCD_SENSITIVITY}mA Type ${cfg.rcdType}`,
      qty: 1,
      modules: cfg.rcdPoles === "2P" ? 2 : 4,
    });
  }
  for (const c of cfg.circuits) {
    lines.push({
      code: mcbCode(c),
      description: `Μικροαυτόματος ${c.poles} ${c.curve}${c.amps} 6kA`,
      qty: 1,
      modules: MCB_MODULES[c.poles],
    });
  }
  lines.push(...combBusbar(cfg));

  const merged: BomLine[] = [];
  for (const l of lines) {
    const hit = merged.find((m) => m.code === l.code);
    if (hit) hit.qty += l.qty;
    else merged.push({ ...l });
  }
  return merged;
}

export function railModules(lines: BomLine[]): number {
  return lines.reduce((s, l) => s + l.modules * l.qty, 0);
}

export interface Totals {
  net: number;
  vat: number;
  gross: number;
}

export function computeTotals(
  lines: BomLine[],
  prices: Record<string, number>,
  custom: CustomItem[],
  vatPercent: number,
): Totals {
  const hager = lines.reduce((s, l) => s + l.qty * (prices[l.code] ?? 0), 0);
  const extra = custom.reduce((s, c) => s + c.qty * c.unitPrice, 0);
  const net = Math.round((hager + extra) * 100) / 100;
  const vat = Math.round(net * vatPercent) / 100;
  return { net, vat, gross: Math.round((net + vat) * 100) / 100 };
}
