import { describe, expect, it } from "vitest";
import { defaultConfig } from "./panel";
import { applyScan, parseScanResult, sectionForAmps, snapTo } from "./scan";

let n = 0;
const newId = () => `t${++n}`;

describe("scan → panel", () => {
  it("snaps read ratings to the closest available option", () => {
    expect(snapTo(13, [6, 10, 16, 20, 25, 32])).toBe(16);
    expect(snapTo(35, [32, 40, 50, 63])).toBe(32);
    expect(snapTo(45, [32, 40, 50, 63])).toBe(50); // tie goes to the higher rating
  });

  it("picks the smallest cable that carries the breaker when no cable is read", () => {
    expect(sectionForAmps(10)).toBe("1.5");
    expect(sectionForAmps(16)).toBe("2.5");
    expect(sectionForAmps(25)).toBe("4");
  });

  it("fills main devices, RCD and circuits from a scan", () => {
    const scan = parseScanResult({
      supply: "mono",
      mainSwitchAmps: 63,
      protectionType: "mcb",
      mainProtectionAmps: 40,
      indicatorLamp: true,
      rcdPresent: true,
      rcdPoles: "2P",
      rcdAmps: 40,
      rcdType: "AC",
      circuits: [
        { poles: "1P", amps: 10, curve: "b", description: "Φωτισμός", cableSection: null },
        { poles: "1P", amps: 16, curve: null, description: "Ρευματοδότες", cableSection: "3x2,5" },
      ],
      notes: "",
    });
    expect(scan).not.toBeNull();
    const { config } = applyScan(scan!, defaultConfig(), newId);
    expect(config.mainSwitch).toBe(63);
    expect(config.protectionType).toBe("mcb");
    expect(config.mainFuse).toBe(40);
    expect(config.rcdType).toBe("AC");
    expect(config.circuits.map((c) => `${c.poles} ${c.curve}${c.amps} ${c.cable}`)).toEqual([
      "1P B10 3x1.5",
      "1P C16 3x2.5",
    ]);
  });

  it("keeps current values for anything the photo did not show", () => {
    const base = { ...defaultConfig(), mainSwitch: 80 };
    const { config } = applyScan(parseScanResult({ circuits: [], notes: "" })!, base, newId);
    expect(config.mainSwitch).toBe(80);
    expect(config.circuits).toHaveLength(base.circuits.length);
  });

  it("treats a 4P RCD or 3P circuit as a three-phase supply", () => {
    const scan = parseScanResult({
      rcdPoles: "4P",
      circuits: [{ poles: "3P", amps: 16, curve: "C", description: "Αντλία", cableSection: "2.5" }],
      notes: "",
    })!;
    const { config } = applyScan(scan, defaultConfig(), newId);
    expect(config.supply).toBe("tri");
    expect(config.circuits[0]?.cable).toBe("5x2.5");
    expect(config.circuits[0]?.phase).toBe("L123");
  });

  it("rejects an answer that is not an object", () => {
    expect(parseScanResult("όχι json")).toBeNull();
  });
});
