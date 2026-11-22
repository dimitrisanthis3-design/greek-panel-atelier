// Server-only call to the Google Gemini vision API with the user's own key.
import { GEMINI_RESPONSE_SCHEMA, SCAN_PROMPT, parseScanResult, type ScanResult } from "./scan";

export const GEMINI_MODEL = "gemini-2.5-flash";

export type ScanResponse = { ok: true; result: ScanResult } | { ok: false; error: string };

export async function scanWithGemini(
  apiKey: string,
  mimeType: string,
  imageBase64: string,
): Promise<ScanResponse> {
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: SCAN_PROMPT }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: GEMINI_RESPONSE_SCHEMA,
          },
        }),
      },
    );
  } catch (e) {
    console.error("Gemini request failed", e);
    return { ok: false, error: "Δεν ήταν δυνατή η σύνδεση με το Google Gemini. Δοκιμάστε ξανά." };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Gemini error", res.status, body.slice(0, 500));
    if (res.status === 400 && /API key/i.test(body))
      return { ok: false, error: "Το κλειδί API δεν είναι έγκυρο. Ελέγξτε το και δοκιμάστε ξανά." };
    if (res.status === 401 || res.status === 403)
      return {
        ok: false,
        error: "Το κλειδί API απορρίφθηκε. Ελέγξτε ότι είναι σωστό και ότι έχει ενεργό το Gemini API.",
      };
    if (res.status === 429)
      return {
        ok: false,
        error: "Ξεπεράστηκε το όριο χρήσης του κλειδιού σας στο Gemini. Περιμένετε λίγο ή ελέγξτε το πλάνο σας.",
      };
    return { ok: false, error: "Το Gemini δεν μπόρεσε να αναλύσει την εικόνα. Δοκιμάστε ξανά." };
  }

  const json = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const out = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(out);
  } catch {
    console.error("Gemini returned non-JSON", out.slice(0, 500));
  }
  const result = parseScanResult(parsed);
  if (!result)
    return { ok: false, error: "Δεν αναγνωρίστηκαν υλικά πίνακα στη φωτογραφία. Δοκιμάστε πιο καθαρή λήψη." };
  return { ok: true, result };
}
