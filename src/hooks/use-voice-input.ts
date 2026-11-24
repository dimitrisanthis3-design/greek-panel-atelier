// Web Speech API voice recognition hook for Greek (el-GR).
// Provides a small API: supported, listening, transcript, error, start(), stop().

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionEvent extends Event {
  results: {
    length: number;
    [index: number]: {
      length: number;
      [index: number]: { transcript: string; confidence: number };
      isFinal: boolean;
    };
  };
  resultIndex: number;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface VoiceInputOptions {
  /** Called with the full transcript when speech is finalized. */
  onResult?: (transcript: string) => void;
  /** Called on each interim update with the partial text. */
  onInterim?: (transcript: string) => void;
}

export function useVoiceInput(options?: VoiceInputOptions) {
  const { onResult, onInterim } = options ?? {};
  const supported = !!getSpeechRecognition();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbacksRef = useRef({ onResult, onInterim });
  callbacksRef.current = { onResult, onInterim };

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("Ο περιηγητής δεν υποστηρίζει φωνητική αναγνώριση.");
      return;
    }
    setError("");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
    }
    const rec = new Ctor();
    rec.lang = "el-GR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalTranscript = "";

    rec.addEventListener("result", (e: Event) => {
      const ev = e as SpeechRecognitionEvent;
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim && callbacksRef.current.onInterim) {
        callbacksRef.current.onInterim(interim);
      }
      if (finalTranscript && callbacksRef.current.onResult) {
        callbacksRef.current.onResult(finalTranscript.trim());
        finalTranscript = "";
      }
    });

    rec.addEventListener("error", (e: Event) => {
      const ev = e as Event & { error?: string };
      const err = ev.error ?? "unknown";
      if (err === "no-speech") {
        setError("Δεν ανιχνεύτηκε ομιλία. Δοκιμάστε ξανά.");
      } else if (err === "not-allowed" || err === "service-not-allowed") {
        setError("Δεν δόθηκε άδεια χρήσης του μικροφώνου.");
      } else if (err === "network") {
        setError("Σφάλμα δικτύου κατά τη φωνητική αναγνώριση.");
      } else {
        setError(`Σφάλμα φωνητικής αναγνώρισης: ${err}`);
      }
      setListening(false);
    });

    rec.addEventListener("end", () => {
      setListening(false);
    });

    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Δεν ήταν δυνατή η εκκίνηση του μικροφώνου.");
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      setListening(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return { supported, listening, error, start, stop };
}

/** Parse a Greek voice command like "Γραμμή κουζίνα 25 αμπέρ καλώδιο 4άρι" into circuit fields. */
export interface ParsedVoiceCircuit {
  description?: string;
  amps?: number;
  cable?: string;
  poles?: string;
  curve?: string;
}

const AMP_KEYWORDS: Record<string, number> = {
  "έξι": 6,
  "έξη": 6,
  "δέκα": 10,
  "δεκαέξι": 16,
  "δεκαέξι": 16,
  "είκοσι": 20,
  "εικοσιπέντε": 25,
  "εικοσιπένα": 25,
  "εικοσιπέντα": 25,
  "τριάντα δύο": 32,
  "τριάνταδύο": 32,
};

const CABLE_KEYWORDS: Record<string, string> = {
  "ένα και μισό": "1.5",
  "ένακίμισο": "1.5",
  "δύο και μισό": "2.5",
  "δύοκίμισο": "2.5",
  "τεσσεράρι": "4",
  "τεσσαρι": "4",
  "εξάρι": "6",
  "δεκάρι": "10",
};

const DESC_KEYWORDS = [
  "φωτισμός",
  "φωτισμος",
  "ρευματοδότες",
  "ρευματοδοτες",
  "κουζίνα",
  "κουζινα",
  "θερμοσίφωνας",
  "θερμοσιφωνας",
  "πλυντήριο",
  "πλυντηριο",
  "κλιματιστικό",
  "κλιματιστικο",
  "ψυγείο",
  "ψυγειο",
  "φούρνος",
  "φουρνος",
  "αντλία",
  "αντλια",
  "θυροτηλέφωνο",
  "θυροτηλεφωνο",
];

export function parseVoiceCircuit(text: string): ParsedVoiceCircuit {
  const lower = text.toLowerCase().trim();
  const result: ParsedVoiceCircuit = {};

  // Amps
  const ampNum = lower.match(/(\d+)\s*(?:αμπέρ|ampere|a\b)/);
  if (ampNum) {
    const n = Number(ampNum[1]);
    if ([6, 10, 16, 20, 25, 32].includes(n)) result.amps = n;
  }
  if (!result.amps) {
    for (const [word, val] of Object.entries(AMP_KEYWORDS)) {
      if (lower.includes(word)) {
        result.amps = val;
        break;
      }
    }
  }

  // Cable section
  const cableNum = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:άρι|ari|mm|τετραγωνικό|διατομή)/);
  if (cableNum) {
    const s = cableNum[1].replace(",", ".");
    if (["1.5", "2.5", "4", "6", "10"].includes(s)) result.cable = s;
  }
  if (!result.cable) {
    for (const [word, val] of Object.entries(CABLE_KEYWORDS)) {
      if (lower.includes(word)) {
        result.cable = val;
        break;
      }
    }
  }

  // Poles
  if (lower.includes("τριφασική") || lower.includes("τριφασικη") || lower.includes("3φ") || lower.includes("3φάση")) {
    result.poles = "3P";
  } else if (lower.includes("διπολική") || lower.includes("διπολικη") || lower.includes("1π+n") || lower.includes("δύο πόλοι")) {
    result.poles = "1P+N";
  }

  // Curve
  if (lower.includes("καμπύλη β") || lower.includes("curve b") || /\bβ\b/.test(lower)) {
    result.curve = "B";
  } else if (lower.includes("καμπύλη γ") || lower.includes("curve c") || /\bγ\b/.test(lower)) {
    result.curve = "C";
  }

  // Description
  for (const desc of DESC_KEYWORDS) {
    if (lower.includes(desc)) {
      result.description = desc.charAt(0).toUpperCase() + desc.slice(1);
      break;
    }
  }

  return result;
}

/** Parse voice text for project detail fields. */
export function parseVoiceProject(text: string): {
  project?: string;
  panelName?: string;
  designer?: string;
} {
  const lower = text.toLowerCase().trim();
  const result: { project?: string; panelName?: string; designer?: string } = {};

  const projectMatch = lower.match(/(?:έργο|πελάτης)\s*[:;]?\s*(.+)/);
  if (projectMatch) result.project = projectMatch[1].trim();

  const panelMatch = lower.match(/(?:πίνακας|ονομασία)\s*[:;]?\s*(.+)/);
  if (panelMatch) result.panelName = panelMatch[1].trim();

  const designerMatch = lower.match(/(?:μελετητής|σχεδιαστής)\s*[:;]?\s*(.+)/);
  if (designerMatch) result.designer = designerMatch[1].trim();

  return result;
}
