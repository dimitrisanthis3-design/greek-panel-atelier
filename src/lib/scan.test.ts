import { describe, expect, it } from "vitest";
import { defaultConfig } from "./panel";
import { applyScan, applyVoiceDefaults, parseScanResult, sectionForAmps, snapTo } from "./scan";

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

  it("keeps the new 25A and 32A ratings when applying AI results", () => {
    const scan = parseScanResult({
      supply: "mono",
      mainSwitchAmps: 25,
      mainProtectionAmps: 25,
      rcdAmps: 25,
      circuits: [],
      notes: "",
    })!;
    const { config } = applyScan(scan, defaultConfig(), newId);
    const scan32 = parseScanResult({
      supply: "mono",
      mainSwitchAmps: 32,
      mainProtectionAmps: 32,
      rcdAmps: 40,
      circuits: [],
      notes: "",
    })!;
    const config32 = applyScan(scan32, defaultConfig(), newId).config;

    expect(config).toMatchObject({ mainSwitch: 25, mainFuse: 25, rcdAmps: 25 });
    expect(config32).toMatchObject({ mainSwitch: 32, mainFuse: 32 });
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

  it("fills voice defaults, expands quantities and balances three-phase circuits", () => {
    const parsed = parseScanResult({
      supply: "tri",
      mainProtectionAmps: 40,
      circuits: [
        { amps: 10, quantity: 5 },
        { amps: 16, quantity: 8 },
        { amps: 20, description: "Θερμοσίφωνας" },
        { amps: 25, description: "Κουζίνα" },
      ],
      notes: "",
    })!;
    const voice = applyVoiceDefaults(
      parsed,
      "Τριφασικός πίνακας με γενική ασφάλεια 40A, πέντε γραμμές 10A, οκτώ γραμμές 16A, θερμοσίφωνα 20A και κουζίνα 25A",
    );
    const { config } = applyScan(voice, defaultConfig(), newId);

    expect(config.mainSwitch).toBeGreaterThanOrEqual(config.mainFuse);
    expect(config.indicatorLamp).toBe(true);
    expect(config.rcdEnabled).toBe(true);
    expect(config.rcdPoles).toBe("4P");
    expect(config.circuits).toHaveLength(15);
    expect(config.circuits.slice(0, 5).map((c) => `${c.curve} ${c.cable}`)).toEqual(
      Array(5).fill("B 3x1.5"),
    );
    expect(config.circuits.slice(5, 13).map((c) => `${c.curve} ${c.cable}`)).toEqual(
      Array(8).fill("C 3x2.5"),
    );
    expect(config.circuits[13]).toMatchObject({
      description: "Θερμοσίφωνας",
      curve: "C",
      cable: "3x2.5",
    });
    expect(config.circuits[14]).toMatchObject({
      description: "Κουζίνα",
      poles: "1P+N",
      curve: "C",
      cable: "3x4",
    });
    expect(new Set(config.circuits.map((c) => c.phase))).toEqual(new Set(["L1", "L2", "L3"]));
  });

  it("only disables default indicators and RCD when the voice text explicitly says so", () => {
    const parsed = parseScanResult({ indicatorLamp: false, rcdPresent: false, notes: "" })!;
    const enabled = applyVoiceDefaults(
      parsed,
      "Μονοφασικός πίνακας με φωτεινές ενδείξεις και ρελέ",
    );
    const disabled = applyVoiceDefaults(parsed, "Πίνακας χωρίς λυχνίες και χωρίς ρελέ διαρροής");

    expect(enabled.indicatorLamp).toBe(true);
    expect(enabled.rcdPresent).toBe(true);
    expect(disabled.indicatorLamp).toBe(false);
    expect(disabled.rcdPresent).toBe(false);
  });

  it("rejects an answer that is not an object", () => {
    expect(parseScanResult("όχι json")).toBeNull();
  });
});
