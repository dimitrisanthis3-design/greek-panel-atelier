import { afterEach, describe, expect, it, vi } from "vitest";
import { describePanelWithGemini, scanWithGemini } from "./scan.client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("direct Gemini scan request", () => {
  it("sends a PDF to Gemini and parses the structured JSON result", async () => {
    const scanResult = {
      supply: "tri",
      mainSwitchAmps: 40,
      circuits: [
        {
          poles: "1P",
          amps: 16,
          curve: "C",
          description: "Ρευματοδότες",
          cableSection: "2.5",
        },
      ],
      notes: "",
    };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(scanResult) }] } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await scanWithGemini("test-key", "application/pdf", "JVBERi0xLjQ=");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.supply).toBe("tri");
      expect(result.result.circuits[0]?.cableSection).toBe("2.5");
    }

    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    );
    expect(options?.headers).toMatchObject({ "x-goog-api-key": "test-key" });
    const request = JSON.parse(String(options?.body)) as {
      contents: { parts: { inlineData?: { mimeType: string; data: string } }[] }[];
      generationConfig: { responseMimeType: string };
    };
    expect(request.contents[0]?.parts[0]?.inlineData).toEqual({
      mimeType: "application/pdf",
      data: "JVBERi0xLjQ=",
    });
    expect(request.generationConfig.responseMimeType).toBe("application/json");
  });

  it("returns a helpful error when Gemini rejects the API key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "API key not valid" } }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const result = await scanWithGemini("bad-key", "image/jpeg", "base64");

    expect(result).toEqual({
      ok: false,
      error: "Το κλειδί API δεν είναι έγκυρο. Ελέγξτε το και δοκιμάστε ξανά.",
    });
  });

  it("sends a Greek voice description as text only and parses quantities", async () => {
    const voiceResult = {
      supply: "tri",
      circuits: [{ amps: 10, quantity: 5 }],
      notes: "",
    };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(voiceResult) }] } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await describePanelWithGemini(
      "voice-key",
      "Τριφασικός πίνακας με πέντε γραμμές 10A",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.supply).toBe("tri");
      expect(result.result.circuits[0]?.quantity).toBe(5);
    }
    const [, options] = fetchMock.mock.calls[0] ?? [];
    const request = JSON.parse(String(options?.body)) as {
      contents: { parts: { text?: string; inlineData?: unknown }[] }[];
    };
    expect(request.contents[0]?.parts).toHaveLength(1);
    expect(request.contents[0]?.parts[0]?.text).toContain(
      "Τριφασικός πίνακας με πέντε γραμμές 10A",
    );
    expect(request.contents[0]?.parts[0]?.inlineData).toBeUndefined();
  });
});
