import {
  GEMINI_RESPONSE_SCHEMA,
  SCAN_PROMPT,
  VOICE_SCAN_PROMPT,
  parseScanResult,
  type ScanResult,
} from "./scan";

export const GEMINI_MODEL = "gemini-3-flash-preview";
/** Used when the main model answers 404 (not available on this key yet). */
export const GEMINI_FALLBACK_MODEL = "gemini-3.8-flash";

export type ScanResponse = { ok: true; result: ScanResult } | { ok: false; error: string };

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

/** Call Gemini directly from the browser with the user's own API key. */
export async function scanWithGemini(
  apiKey: string,
  mimeType: "image/jpeg" | "application/pdf",
  base64: string,
): Promise<ScanResponse> {
  return requestGemini(apiKey, [{ inlineData: { mimeType, data: base64 } }, { text: SCAN_PROMPT }]);
}

/** Send a natural-language panel description without attaching media. */
export async function describePanelWithGemini(
  apiKey: string,
  description: string,
): Promise<ScanResponse> {
  return requestGemini(apiKey, [{ text: `${VOICE_SCAN_PROMPT}\n${description.trim()}` }]);
}

async function requestGemini(
  apiKey: string,
  parts: ({ inlineData: { mimeType: string; data: string } } | { text: string })[],
): Promise<ScanResponse> {
  const models = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL];
  let response: Response | undefined;
  for (const [index, model] of models.entries()) {
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
              responseSchema: GEMINI_RESPONSE_SCHEMA,
            },
          }),
        },
      );
    } catch {
      return {
        ok: false,
        error:
          "Δεν ήταν δυνατή η σύνδεση με το Google Gemini. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.",
      };
    }
    // Model not found on this key: retry once with the fallback model.
    if (response.status === 404 && index < models.length - 1) continue;
    break;
  }
  if (!response) {
    return {
      ok: false,
      error:
        "Δεν ήταν δυνατή η σύνδεση με το Google Gemini. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.",
    };
  }

  const body = (await response.json().catch(() => null)) as GeminiResponse | null;
  if (!response.ok) {
    if (response.status === 400 && /API key/i.test(body?.error?.message ?? "")) {
      return { ok: false, error: "Το κλειδί API δεν είναι έγκυρο. Ελέγξτε το και δοκιμάστε ξανά." };
    }
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        error:
          "Το κλειδί API απορρίφθηκε. Ελέγξτε ότι είναι σωστό και ότι έχει ενεργό το Gemini API.",
      };
    }
    if (response.status === 429) {
      return {
        ok: false,
        error:
          "Ξεπεράστηκε το όριο χρήσης του κλειδιού σας στο Gemini. Περιμένετε λίγο ή ελέγξτε το πλάνο σας.",
      };
    }
    return {
      ok: false,
      error: body?.error?.message
        ? `Το Gemini απάντησε με σφάλμα: ${body.error.message}`
        : "Το Gemini δεν μπόρεσε να αναλύσει το αρχείο. Δοκιμάστε ξανά.",
    };
  }

  const output =
    body?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return {
      ok: false,
      error: "Η απάντηση του Gemini δεν ήταν έγκυρο JSON. Ελέγξτε την περιγραφή ή το αρχείο.",
    };
  }

  const result = parseScanResult(parsed);
  if (!result) {
    return {
      ok: false,
      error:
        "Δεν αναγνωρίστηκαν στοιχεία πίνακα. Προσθέστε περισσότερες λεπτομέρειες και δοκιμάστε ξανά.",
    };
  }
  return { ok: true, result };
}
