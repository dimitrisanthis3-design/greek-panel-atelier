import { describe, expect, it } from "vitest";
import { defaultConfig } from "./panel";
import { estimateCircuitPowerKw } from "./electrical-calc";

describe("estimateCircuitPowerKw", () => {
  it("uses the existing connected-load estimate for named circuits", () => {
    const circuit = defaultConfig().circuits[0]!;

    expect(estimateCircuitPowerKw({ ...circuit, description: "Φωτισμός" })).toBe(0.8);
    expect(estimateCircuitPowerKw({ ...circuit, description: "Κουζίνα" })).toBe(4.5);
  });

  it("estimates unnamed three-phase loads from their rated current", () => {
    const circuit = {
      ...defaultConfig().circuits[0]!,
      description: "",
      poles: "3P" as const,
      amps: 16,
    };

    expect(estimateCircuitPowerKw(circuit)).toBeCloseTo((16 * 400 * 1.732 * 0.85) / 1000);
  });
});
