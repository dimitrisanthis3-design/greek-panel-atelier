import { beforeEach, describe, expect, it } from "vitest";
import { defaultConfig } from "./panel";
import {
  loadGeminiKey,
  nextProtocolNumber,
  protocolNameToken,
  renameProtocolNumber,
  saveGeminiKey,
  startNumberedProject,
} from "./storage";

describe("automatic protocol numbers", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        get length() {
          return values.size;
        },
        key: (index: number) => [...values.keys()][index] ?? null,
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
          values.set(key, value);
        },
        removeItem: (key: string) => {
          values.delete(key);
        },
        clear: () => values.clear(),
      } as Storage,
    });
  });

  it("persists the Gemini API key locally and removes it when cleared", () => {
    saveGeminiKey("  test-gemini-key  ");
    expect(loadGeminiKey()).toBe("test-gemini-key");

    saveGeminiKey("");
    expect(loadGeminiKey()).toBe("");
  });

  it("uses the current date, a persistent sequence, and an unaccented surname", () => {
    const date = new Date(2026, 10, 25);
    expect(nextProtocolNumber("Ιωάννης Παπαδόπουλος", "Κατοικία", date)).toBe(
      "2026-1125-001-ΠΑΠΑΔΟΠΟΥΛΟΣ",
    );
    expect(nextProtocolNumber("Ιωάννης Παπαδόπουλος", "Κατοικία", date)).toBe(
      "2026-1125-002-ΠΑΠΑΔΟΠΟΥΛΟΣ",
    );
  });

  it("falls back to the project name and refreshes only the automatic suffix", () => {
    expect(protocolNameToken("", "Εξοχική κατοικία")).toBe("ΕΞΟΧΙΚΗ-ΚΑΤΟΙΚΙΑ");
    expect(renameProtocolNumber("2026-1125-009-ΚΑΤΟΙΚΙΑ", "Μαρία Νικολάου", "Έργο")).toBe(
      "2026-1125-009-ΝΙΚΟΛΑΟΥ",
    );
  });

  it("starts a project with today's local date and an editable automatic number", () => {
    const date = new Date(2026, 10, 25);
    const project = startNumberedProject(defaultConfig(), date);
    expect(project.date).toBe("25/11/2026");
    expect(project.yde.protocolNo).toBe("2026-1125-001-ΚΑΤΟΙΚΙΑ");
    expect(project.yde.protocolNoAuto).toBe(true);
  });
});
