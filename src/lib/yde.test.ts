import { describe, expect, it } from "vitest";
import { defaultConfig, normalizeConfig, type PanelConfig } from "./panel";
import { feedRow, protocolRows } from "./protocol";
import {
  TEST_CHECKS,
  checkResult,
  defaultTest,
  defaultYde,
  eheTotals,
  measureIssues,
  nextCheckDate,
  parseMeasure,
  protocolPasses,
  roomKw,
  type Room,
} from "./yde";

const room = (p: Partial<Room>): Room => ({
  id: "r",
  name: "Χώρος",
  sockets: 0,
  switches: 0,
  lights: 0,
  fixedDesc: "",
  fixedKw: 0,
  ...p,
});

describe("protocol page 2 rows", () => {
  it("pulls every panel circuit with use, conductors, section and breaker", () => {
    const rows = protocolRows(defaultConfig());
    expect(rows).toHaveLength(defaultConfig().circuits.length);
    expect(rows[0]).toMatchObject({
      no: "1",
      use: "Φωτισμός",
      cableType: "NYA",
      conductors: 3,
      section: "1,5",
      kind: "Μικρ/τος B",
      amps: 10,
    });
    expect(rows[2]).toMatchObject({ section: "4", kind: "Μικρ/τος C", amps: 25 });
  });

  it("writes the measurements typed for each circuit", () => {
    const cfg = defaultConfig();
    cfg.yde.tests["c2"] = { ...defaultTest(), cableType: "NYM", riso: "30,0", imess: "20,5", zs: "0,36" };
    const r = protocolRows(cfg)[1];
    expect(r).toMatchObject({ cableType: "NYM", riso: "30,0", imess: "20,5", zs: "0,36" });
  });

  it("feed row carries the main protection and the general RCD", () => {
    const f = feedRow(defaultConfig());
    expect(f).toMatchObject({ cableType: "NYY", conductors: 3, section: "10", kind: "Diazed", amps: 40 });
    expect(f.rcd).toBe("2Χ40 A");
    expect(f.rcdIdn).toBe("30");
    const tri = feedRow({ ...defaultConfig(), supply: "tri", rcdPoles: "4P", rcdAmps: 63 });
    expect(tri.conductors).toBe(5);
    expect(tri.rcd).toBe("4Χ63 A");
  });
});

describe("measurement limits", () => {
  it("reads Greek decimals and signs", () => {
    expect(parseMeasure("1,86")).toBe(1.86);
    expect(parseMeasure("> 500")).toBe(500);
    expect(parseMeasure("")).toBeNull();
  });

  it("flags insulation below 0,5 MΩ and RCD trip current above IΔn", () => {
    expect(measureIssues({ ...defaultTest(), riso: "0,4" }, 30)).toEqual(["riso"]);
    expect(measureIssues({ ...defaultTest(), riso: "0,5", imess: "31" }, 30)).toEqual(["imess"]);
    expect(measureIssues({ ...defaultTest(), riso: "30", imess: "20,5" }, 30)).toEqual([]);
  });

  it("fails the protocol on a non-compliant check or an out-of-limit measurement", () => {
    const cfg: PanelConfig = defaultConfig();
    expect(protocolPasses(cfg.yde, cfg.circuits, "mono", 30)).toBe(true);
    const failed = { ...cfg.yde, checks: { "1.3": "fail" as const } };
    expect(protocolPasses(failed, cfg.circuits, "mono", 30)).toBe(false);
    const low = { ...cfg.yde, tests: { c1: { ...defaultTest(), riso: "0,2" } } };
    expect(protocolPasses(low, cfg.circuits, "mono", 30)).toBe(false);
  });

  it("three-phase-only tests are not applicable on a single-phase supply", () => {
    const item = TEST_CHECKS.find((c) => c.id === "2.4")!;
    expect(checkResult(defaultYde(), item, "mono")).toBe("na");
    expect(checkResult(defaultYde(), item, "tri")).toBe("ok");
  });
});

describe("next periodic re-check", () => {
  it("is 14 years after the check date unless typed", () => {
    expect(nextCheckDate(defaultYde(), "9/3/2022")).toBe("9 / 3 / 2036");
    expect(nextCheckDate({ ...defaultYde(), nextCheck: "1/1/2030" }, "9/3/2022")).toBe("1/1/2030");
  });
});

describe("ΕΗΕ installed power", () => {
  it("counts 0,2 kW per Schuko socket", () => {
    expect(roomKw(room({ sockets: 5 }))).toBe(1);
  });
  it("adds light points and fixed appliances", () => {
    expect(roomKw(room({ sockets: 2, lights: 3, fixedKw: 4 }))).toBe(4.7);
    const t = eheTotals([room({ sockets: 4, switches: 2, lights: 2 }), room({ sockets: 1, fixedKw: 2.5 })]);
    expect(t).toEqual({ sockets: 5, switches: 2, lights: 2, fixedKw: 2.5, kw: 3.7 });
  });
});

describe("stored ΥΔΕ data", () => {
  it("survives normalizeConfig and drops measurements of removed circuits", () => {
    const cfg = defaultConfig();
    const raw = JSON.parse(
      JSON.stringify({
        ...cfg,
        yde: { ...cfg.yde, owner: "Παπαδόπουλος", tests: { c1: { riso: "30" }, gone: { riso: "1" } } },
      }),
    );
    const n = normalizeConfig(raw)!;
    expect(n.yde.owner).toBe("Παπαδόπουλος");
    expect(n.yde.tests["c1"]?.riso).toBe("30");
    expect(n.yde.tests["gone"]).toBeUndefined();
  });
});
