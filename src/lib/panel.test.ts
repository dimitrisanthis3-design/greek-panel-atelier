import { describe, expect, it } from "vitest";
import {
  MAIN_FUSE_OPTIONS,
  MAIN_SWITCH_OPTIONS,
  RCD_AMP_OPTIONS,
  defaultConfig,
  normalizeConfig,
  runChecks,
  switchSupply,
  withPoles,
  type PanelConfig,
} from "./panel";

function cfgWith(patch: Partial<PanelConfig>): PanelConfig {
  return { ...defaultConfig(), ...patch };
}

describe("runChecks", () => {
  it("passes the default panel", () => {
    expect(runChecks(defaultConfig())).toEqual([]);
  });

  it("flags a main switch smaller than the main protection", () => {
    const msgs = runChecks(cfgWith({ mainSwitch: 40, mainFuse: 63 })).map((c) => c.message);
    expect(msgs.some((m) => m.includes("γενικός διακόπτης"))).toBe(true);
  });

  it("flags a breaker too large for its cable", () => {
    const cfg = cfgWith({
      circuits: [
        {
          id: "x",
          poles: "1P",
          amps: 16,
          curve: "B",
          description: "Φωτισμός",
          cable: "3x1.5",
          phase: "L",
        },
      ],
    });
    expect(runChecks(cfg).some((c) => c.message.startsWith("Γ1: ασφάλεια 16A"))).toBe(true);
  });

  it("flags a 3P line on a 3-core cable", () => {
    const cfg = cfgWith({
      supply: "tri",
      rcdPoles: "4P",
      circuits: [
        {
          id: "x",
          poles: "3P",
          amps: 16,
          curve: "C",
          description: "Αντλία",
          cable: "3x2.5",
          phase: "L123",
        },
      ],
    });
    expect(runChecks(cfg).some((c) => c.message.includes("5πολικό"))).toBe(true);
  });

  it("flags a 2P RCD on a three-phase supply", () => {
    expect(
      runChecks(cfgWith({ supply: "tri", rcdPoles: "2P" })).some((c) => c.message.includes("4P")),
    ).toBe(true);
  });

  it("warns when there is no RCD", () => {
    expect(runChecks(cfgWith({ rcdEnabled: false })).some((c) => c.message.includes("RCD"))).toBe(
      true,
    );
  });
});

describe("switchSupply / withPoles", () => {
  it("spreads single-pole lines over L1-L2-L3 and picks a 4P RCD when going three-phase", () => {
    const tri = switchSupply(defaultConfig(), "tri");
    expect(tri.circuits.map((c) => c.phase)).toEqual(["L1", "L2", "L3", "L1", "L2"]);
    expect(tri.rcdPoles).toBe("4P");
  });

  it("turns 3P lines into 1P with 3-core cable when going single-phase", () => {
    const tri = switchSupply(defaultConfig(), "tri");
    tri.circuits[0] = withPoles(tri.circuits[0]!, "3P", "tri", 0);
    expect(tri.circuits[0].cable).toBe("5x1.5");
    const mono = switchSupply(tri, "mono");
    expect(mono.circuits[0]?.poles).toBe("1P");
    expect(mono.circuits[0]?.cable).toBe("3x1.5");
    expect(mono.circuits.every((c) => c.phase === "L")).toBe(true);
  });
});

describe("normalizeConfig", () => {
  it("rejects non-objects", () => {
    expect(normalizeConfig("hello")).toBeNull();
    expect(normalizeConfig(null)).toBeNull();
  });

  it("keeps valid values and replaces invalid ones with defaults", () => {
    const cfg = normalizeConfig({
      supply: "tri",
      mainSwitch: 63,
      mainFuse: 999,
      circuits: [{ poles: "3P", amps: 32 }],
    });
    expect(cfg?.supply).toBe("tri");
    expect(cfg?.mainSwitch).toBe(63);
    expect(cfg?.mainFuse).toBe(40);
    expect(cfg?.circuits[0]).toMatchObject({
      poles: "3P",
      amps: 32,
      phase: "L123",
      cable: "5x2.5",
    });
  });

  it("accepts 25A and 32A main switches, plus 25A fuse and RCD values", () => {
    expect(MAIN_SWITCH_OPTIONS).toEqual([25, 32, 40, 63, 80, 100]);
    expect(MAIN_FUSE_OPTIONS).toEqual([25, 32, 40, 50, 63]);
    expect(RCD_AMP_OPTIONS).toEqual([25, 40, 63]);

    const cfg = normalizeConfig({
      mainSwitch: 25,
      mainFuse: 25,
      rcdAmps: 25,
    });
    expect(cfg).toMatchObject({ mainSwitch: 25, mainFuse: 25, rcdAmps: 25 });
    expect(runChecks(cfg!)).toEqual([]);
  });
});
