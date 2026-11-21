import { describe, expect, it } from "vitest";
import { buildBom, computeTotals, mainSwitchCode, mcbCode, rcdCode } from "./hager";
import { buildBomCsv } from "./csv";
import { defaultConfig, type PanelConfig } from "./panel";

const codes = (cfg: PanelConfig) => buildBom(cfg).map((l) => `${l.code}x${l.qty}`);

describe("Hager codes", () => {
  it("maps main switches to the SBN series", () => {
    expect(mainSwitchCode({ supply: "mono", mainSwitch: 40 })).toBe("SBN240");
    expect(mainSwitchCode({ supply: "mono", mainSwitch: 100 })).toBe("SBN290");
    expect(mainSwitchCode({ supply: "tri", mainSwitch: 63 })).toBe("SBN463");
    expect(mainSwitchCode({ supply: "tri", mainSwitch: 80 })).toBe("SBN480");
  });

  it("maps MCBs to MBN (B) and MCN (C)", () => {
    expect(mcbCode({ curve: "B", poles: "1P", amps: 10 })).toBe("MBN110");
    expect(mcbCode({ curve: "C", poles: "1P+N", amps: 16 })).toBe("MCN516");
    expect(mcbCode({ curve: "C", poles: "3P", amps: 6 })).toBe("MCN306");
  });

  it("maps RCDs to CDA (Type A) and CDC (Type AC)", () => {
    expect(rcdCode({ rcdPoles: "2P", rcdAmps: 40, rcdType: "A" })).toBe("CDA240D");
    expect(rcdCode({ rcdPoles: "4P", rcdAmps: 63, rcdType: "AC" })).toBe("CDC463F");
  });
});

describe("buildBom", () => {
  it("lists the default single-phase panel with merged quantities", () => {
    expect(codes(defaultConfig())).toEqual([
      "SBN240x1",
      "LS601x1",
      "LF440Gx1",
      "SVN122x1",
      "CDA240Dx1",
      "MBN110x1",
      "MCN116x2",
      "MCN525x1",
      "MCN120x1",
      "KDN263Ax1",
    ]);
  });

  it("uses three fuse carriers and three lamps on a three-phase supply", () => {
    const cfg: PanelConfig = {
      ...defaultConfig(),
      supply: "tri",
      mainFuse: 63,
      rcdPoles: "4P",
      circuits: [],
    };
    expect(codes(cfg)).toEqual(["SBN440x1", "LS701x3", "LF563Gx3", "SVN122x3", "CDA440Dx1"]);
  });

  it("uses an x160 MCCB with DIN adaptor", () => {
    const cfg: PanelConfig = {
      ...defaultConfig(),
      protectionType: "mccb",
      mainFuse: 50,
      circuits: [],
    };
    expect(codes(cfg)).toContain("HDA050Lx1");
    expect(codes(cfg)).toContain("HYA033Hx1");
  });

  it("adds one comb busbar per 12 outgoing modules", () => {
    const circuits = Array.from({ length: 13 }, (_, i) => ({
      id: `c${i}`,
      poles: "1P" as const,
      amps: 16,
      curve: "C" as const,
      description: "",
      cable: "3x2.5",
      phase: "L" as const,
    }));
    expect(codes({ ...defaultConfig(), circuits })).toContain("KDN163Ax2");
  });
});

describe("totals and CSV", () => {
  it("sums quantity × unit price, custom items and VAT", () => {
    const cfg = {
      ...defaultConfig(),
      customItems: [{ id: "x", code: "", description: "Κουτί", qty: 1, unitPrice: 30 }],
    };
    const lines = buildBom(cfg);
    const t = computeTotals(lines, { MCN116: 5, SBN240: 20 }, cfg.customItems, 24);
    expect(t).toEqual({ net: 60, vat: 14.4, gross: 74.4 });
  });

  it("writes semicolon CSV with decimal commas", () => {
    const cfg = { ...defaultConfig(), circuits: [] };
    const lines = buildBom(cfg);
    const csv = buildBomCsv(
      cfg,
      lines,
      { SBN240: 12.5 },
      computeTotals(lines, { SBN240: 12.5 }, [], 24),
    );
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("SBN240;Hager Γενικός διακόπτης φορτίου 2P 40A;1;12,50;12,50");
    expect(csv).toContain("Γενικό σύνολο;15,50");
  });
});
