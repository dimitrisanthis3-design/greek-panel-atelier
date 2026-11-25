import {
  Camera,
  ExternalLink,
  FileText,
  ImageUp,
  Loader2,
  Mic,
  MicOff,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClientOnlyFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { PROTECTION_LABELS, circuitCode, type PanelConfig } from "@/lib/panel";
import { applyScan, applyVoiceDefaults, type ScanApplied, type ScanResult } from "@/lib/scan";
import { loadGeminiKey, saveGeminiKey } from "@/lib/storage";

const requestGeminiScan = createClientOnlyFn(
  async (apiKey: string, mimeType: "image/jpeg" | "application/pdf", base64: string) => {
    const { scanWithGemini } = await import("@/lib/scan.client");
    return scanWithGemini(apiKey, mimeType, base64);
  },
);

const requestGeminiVoice = createClientOnlyFn(async (apiKey: string, description: string) => {
  const { describePanelWithGemini } = await import("@/lib/scan.client");
  return describePanelWithGemini(apiKey, description);
});

type ScanMode = "file" | "voice";

interface Props {
  cfg: PanelConfig;
  onApply: (next: PanelConfig) => void;
  newId: () => string;
}

interface ScanFile {
  base64: string;
  mimeType: "image/jpeg" | "application/pdf";
  url: string;
  name: string;
  isPdf: boolean;
}

/** Shrink a phone photo to a JPEG of at most `max` px on the long side. */
async function shrinkImage(file: File, url: string, max = 1800): Promise<string> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)));
  }
  return btoa(chunks.join(""));
}

async function readScanFile(file: File): Promise<ScanFile> {
  const url = URL.createObjectURL(file);
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  try {
    if (isPdf) {
      if (file.size > 15 * 1024 * 1024) {
        throw new Error("Το PDF πρέπει να είναι μικρότερο από 15 MB για αποστολή στο Gemini.");
      }
      return {
        base64: arrayBufferToBase64(await file.arrayBuffer()),
        mimeType: "application/pdf",
        url,
        name: file.name,
        isPdf: true,
      };
    }
    if (!file.type.startsWith("image/")) {
      throw new Error("Επιλέξτε εικόνα ή αρχείο PDF.");
    }
    return {
      base64: await shrinkImage(file, url),
      mimeType: "image/jpeg",
      url,
      name: file.name,
      isPdf: false,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export function ScanDialog({ cfg, onApply, newId }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ScanMode>("file");
  const [apiKey, setApiKey] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [file, setFile] = useState<ScanFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [scanSource, setScanSource] = useState<ScanMode | null>(null);
  const [preview, setPreview] = useState<ScanApplied | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const {
    supported: voiceSupported,
    listening: voiceListening,
    error: voiceError,
    start: startVoice,
    stop: stopVoice,
  } = useVoiceInput({
    onResult: (transcript) => {
      setVoiceText((current) => [current.trim(), transcript].filter(Boolean).join(" "));
      setInterimText("");
    },
    onInterim: setInterimText,
  });

  useEffect(() => {
    if (open) setApiKey(loadGeminiKey());
  }, [open]);
  useEffect(() => {
    if (!open) stopVoice();
  }, [open, stopVoice]);
  useEffect(
    () => () => {
      if (file) URL.revokeObjectURL(file.url);
    },
    [file],
  );

  const reset = () => {
    setFile(null);
    setScan(null);
    setScanSource(null);
    setPreview(null);
    setError("");
    setVoiceText("");
    setInterimText("");
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    reset();
    try {
      setFile(await readScanFile(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Δεν ήταν δυνατό να ανοίξει το αρχείο.");
    }
  };

  const analyse = async () => {
    if (!file || !apiKey.trim()) return;
    setBusy(true);
    setError("");
    setScan(null);
    setScanSource(null);
    setPreview(null);
    saveGeminiKey(apiKey);
    try {
      const res = await requestGeminiScan(apiKey.trim(), file.mimeType, file.base64);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setScan(res.result);
      setScanSource("file");
      setPreview(applyScan(res.result, cfg, newId));
    } catch {
      setError("Η ανάλυση απέτυχε. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.");
    } finally {
      setBusy(false);
    }
  };

  const createFromVoice = async () => {
    const description = voiceText.trim();
    if (!description || !apiKey.trim()) return;
    setBusy(true);
    setError("");
    setScan(null);
    setScanSource(null);
    setPreview(null);
    saveGeminiKey(apiKey);
    try {
      const res = await requestGeminiVoice(apiKey.trim(), description);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const completed = applyVoiceDefaults(res.result, description);
      setScan(completed);
      setScanSource("voice");
      setPreview(applyScan(completed, cfg, newId));
    } catch {
      setError("Η δημιουργία πίνακα απέτυχε. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.");
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!preview) return;
    const previous = cfg;
    const source = scanSource;
    onApply(preview.config);
    setOpen(false);
    reset();
    toast.success(
      source === "voice"
        ? "Ο πίνακας δημιουργήθηκε. Οι γραμμές είναι διαθέσιμες για διόρθωση στη φόρμα."
        : "Η φόρμα, το μονογραμμικό και το υλικολόγιο συμπληρώθηκαν από το αρχείο.",
      {
        action: { label: "Αναίρεση", onClick: () => onApply(previous) },
        duration: 10000,
      },
    );
  };

  const p = preview?.config;

  return (
    <>
      <Button
        className="w-full bg-electric text-electric-foreground hover:bg-electric/85"
        onClick={() => setOpen(true)}
      >
        <ScanLine />
        Εισαγωγή Πίνακα με AI
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o && !busy) reset();
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Εισαγωγή Ηλεκτρικού Πίνακα</DialogTitle>
            <DialogDescription>
              Δημιουργήστε τον πίνακα από φωτογραφία, PDF ή φυσική περιγραφή με το Google Gemini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="geminiKey" className="text-xs font-medium text-muted-foreground">
                Google Gemini API Key
              </Label>
              <Input
                id="geminiKey"
                type="password"
                autoComplete="off"
                placeholder="AIza…"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  saveGeminiKey(e.target.value);
                }}
                className="font-mono text-[13px]"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Αποθηκεύεται αυτόματα μόνο σε αυτή τη συσκευή.
                </span>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-electric-ink underline-offset-2 hover:underline"
                >
                  Δωρεάν κλειδί στο AI Studio <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <Tabs
              value={tab}
              onValueChange={(value) => {
                if (voiceListening) stopVoice();
                setTab(value as ScanMode);
                setError("");
              }}
              className="space-y-3"
            >
              <TabsList className="grid h-auto w-full grid-cols-2">
                <TabsTrigger
                  value="file"
                  className="whitespace-normal px-2 py-2 text-xs sm:text-sm"
                >
                  Φωτογραφία / Κάμερα / PDF
                </TabsTrigger>
                <TabsTrigger
                  value="voice"
                  className="whitespace-normal px-2 py-2 text-xs sm:text-sm"
                >
                  Φωνητική Περιγραφή Πίνακα
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-3">
                {file ? (
                  <div className="space-y-2">
                    {file.isPdf ? (
                      <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-4">
                        <FileText className="size-8 shrink-0 text-electric-ink" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Το PDF θα σταλεί απευθείας στο Gemini για ανάλυση.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={file.url}
                        alt="Φωτογραφία για σάρωση"
                        className="max-h-56 w-full rounded-md border border-border bg-muted object-contain"
                      />
                    )}
                    <Button variant="outline" size="sm" onClick={reset} disabled={busy}>
                      Επιλογή άλλου αρχείου
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-20 flex-col gap-1.5"
                      onClick={() => cameraRef.current?.click()}
                      disabled={busy}
                    >
                      <Camera className="size-5" />
                      Λήψη από Κάμερα
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col gap-1.5"
                      onClick={() => galleryRef.current?.click()}
                      disabled={busy}
                    >
                      <ImageUp className="size-5" />
                      Από Gallery / Υπολογιστή
                    </Button>
                  </div>
                )}
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  aria-label="Λήψη από Κάμερα"
                  onChange={(e) => {
                    void pickFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  data-testid="scan-file"
                  aria-label="Επιλογή εικόνας ή PDF"
                  onChange={(e) => {
                    void pickFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </TabsContent>

              <TabsContent value="voice" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Πείτε ή γράψτε τα στοιχεία του πίνακα</p>
                  <Button
                    type="button"
                    variant={voiceListening ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => {
                      setError("");
                      if (voiceListening) {
                        stopVoice();
                      } else {
                        setInterimText("");
                        startVoice();
                      }
                    }}
                    disabled={!voiceSupported || busy}
                  >
                    {voiceListening ? <MicOff /> : <Mic />}
                    {voiceListening ? "Διακοπή" : "Υπαγόρευση στα Ελληνικά"}
                  </Button>
                </div>
                {!voiceSupported && (
                  <p className="text-xs text-muted-foreground">
                    Η φωνητική αναγνώριση δεν υποστηρίζεται σε αυτόν τον browser. Μπορείτε να
                    πληκτρολογήσετε την περιγραφή.
                  </p>
                )}
                <Textarea
                  value={voiceText}
                  onChange={(event) => setVoiceText(event.target.value)}
                  placeholder="Παράδειγμα: Τριφασικός πίνακας με γενική ασφάλεια 40A, ρελέ διαρροής, πέντε γραμμές 10A, οκτώ γραμμές 16A, θερμοσίφωνα 20A και κουζίνα 25A."
                  aria-label="Περιγραφή ηλεκτρικού πίνακα"
                  rows={5}
                  disabled={busy}
                />
                {voiceListening && (
                  <p aria-live="polite" className="text-xs text-muted-foreground">
                    Ακούω… {interimText}
                  </p>
                )}
                {voiceError && (
                  <p role="alert" className="text-xs text-destructive">
                    {voiceError}
                  </p>
                )}
              </TabsContent>
            </Tabs>

            {error && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            {p && scan && preview && scanSource === tab && (
              <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">
                  {scanSource === "voice" ? "Προεπισκόπηση πίνακα:" : "Αναγνωρίστηκαν:"}
                </p>
                <ul className="space-y-0.5 font-mono text-[12px]">
                  <li>Παροχή: {p.supply === "mono" ? "1Φ" : "3Φ"}</li>
                  <li>Γενικός διακόπτης: {p.mainSwitch}A</li>
                  <li>
                    Γενική ασφάλεια: {PROTECTION_LABELS[p.protectionType]} {p.mainFuse}A
                  </li>
                  <li>Ενδεικτική λυχνία: {p.indicatorLamp ? "Ναι" : "Όχι"}</li>
                  <li>
                    Ρελέ διαρροής:{" "}
                    {p.rcdEnabled ? `${p.rcdPoles} ${p.rcdAmps}A 30mA Type ${p.rcdType}` : "Όχι"}
                  </li>
                  <li>
                    Αναχωρήσεις:{" "}
                    {scan.circuits.length ? p.circuits.length : "καμία (μένουν οι τρέχουσες)"}
                  </li>
                  {scan.circuits.length > 0 &&
                    p.circuits.map((c, i) => (
                      <li key={c.id} className="pl-3 text-muted-foreground">
                        {circuitCode(i)} {c.poles} {c.curve}
                        {c.amps} · {c.cable} · {c.description || "—"}
                      </li>
                    ))}
                </ul>
                {(preview.adjustments.length > 0 || scan.notes) && (
                  <div className="space-y-0.5 border-t border-border pt-2 text-xs text-muted-foreground">
                    {preview.adjustments.map((a) => (
                      <p key={a}>• {a}</p>
                    ))}
                    {scan.notes && <p>• {scan.notes}</p>}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {scanSource === "voice"
                    ? "Ελέγξτε τις προεπιλογές και διορθώστε τις γραμμές στη φόρμα πριν την παραγγελία."
                    : "Ό,τι δεν φάνηκε στη φωτογραφία κρατά την τρέχουσα τιμή. Ελέγξτε τα πριν την παραγγελία."}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {preview && scanSource === tab ? (
              <Button
                onClick={apply}
                className="bg-electric text-electric-foreground hover:bg-electric/85"
              >
                <Sparkles />
                {tab === "voice" ? "Δημιουργία Πίνακα" : "Εφαρμογή στον πίνακα"}
              </Button>
            ) : tab === "voice" ? (
              <Button
                onClick={createFromVoice}
                disabled={!voiceText.trim() || !apiKey.trim() || busy}
                className="bg-electric text-electric-foreground hover:bg-electric/85"
              >
                {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {busy ? "Δημιουργία…" : "Δημιουργία Πίνακα"}
              </Button>
            ) : (
              <Button onClick={analyse} disabled={!file || !apiKey.trim() || busy}>
                {busy ? <Loader2 className="animate-spin" /> : <ScanLine />}
                {busy ? "Ανάλυση…" : "Ανάλυση αρχείου"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
