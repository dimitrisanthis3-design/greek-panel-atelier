import { describe, expect, it } from "vitest";
import { defaultConfig, runChecks, switchSupply, type PanelConfig } from "./panel";

function cfgWith(patch: Partial<PanelConfig>): PanelConfig {
  return { ...defaultConfig(), ...patch };
}

describe("runChecks", () => {
  it("passes the default panel", () => {
    expect(runChecks(defaultConfig())).toEqual([]);
  });

  it("flags a main switch smaller than the main fuse", () => {
    const msgs = runChecks(cfgWith({ mainSwitch: 25, mainFuse: 40 })).map((c) => c.message);
    expect(msgs.some((m) => m.includes("γενικός διακόπτης"))).toBe(true);
  });

  it("flags a breaker too large for its cable", () => {
    const cfg = cfgWith({
      circuits: [
        { id: "x", amps: 16, curve: "B", description: "Φωτισμός", cable: "3x1.5", phase: "L" },
      ],
    });
    expect(runChecks(cfg).some((c) => c.message.startsWith("Γ1: ασφάλεια 16A"))).toBe(true);
  });

  it("flags a three-phase line on a 3-core cable", () => {
    const cfg = cfgWith({
      supply: "tri",
      circuits: [
        { id: "x", amps: 16, curve: "C", description: "Αντλία", cable: "3x2.5", phase: "L123" },
      ],
    });
    expect(runChecks(cfg).some((c) => c.message.includes("5πολικό"))).toBe(true);
  });

  it("warns when there is no RCD", () => {
    expect(runChecks(cfgWith({ rcdAmps: 0 })).some((c) => c.message.includes("RCD"))).toBe(true);
  });
});

describe("switchSupply", () => {
  it("spreads lines over L1-L2-L3 when going three-phase", () => {
    const tri = switchSupply(defaultConfig(), "tri");
    expect(tri.circuits.map((c) => c.phase)).toEqual(["L1", "L2", "L3", "L1", "L2"]);
  });

  it("turns 5-core cables into 3-core when going single-phase", () => {
    const tri = switchSupply(defaultConfig(), "tri");
    tri.circuits[0] = { ...tri.circuits[0]!, cable: "5x2.5", phase: "L123" };
    const mono = switchSupply(tri, "mono");
    expect(mono.circuits[0]?.cable).toBe("3x2.5");
    expect(mono.circuits.every((c) => c.phase === "L")).toBe(true);
  });
});
