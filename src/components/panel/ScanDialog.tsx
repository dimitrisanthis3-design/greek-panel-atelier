import { Camera, ExternalLink, ImageUp, Loader2, ScanLine, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PROTECTION_LABELS, circuitCode, type PanelConfig } from "@/lib/panel";
import { applyScan, type ScanApplied, type ScanResult } from "@/lib/scan";
import { scanPanelPhoto } from "@/lib/scan.functions";
import { loadGeminiKey, saveGeminiKey } from "@/lib/storage";

interface Props {
  cfg: PanelConfig;
  onApply: (next: PanelConfig) => void;
  newId: () => string;
}

/** Shrink a phone photo to a JPEG of at most `max` px on the long side. */
async function shrinkImage(file: File, max = 1800): Promise<{ base64: string; url: string }> {
  const url = URL.createObjectURL(file);
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
  return { base64: dataUrl.slice(dataUrl.indexOf(",") + 1), url };
}

export function ScanDialog({ cfg, onApply, newId }: Props) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(true);
  const [image, setImage] = useState<{ base64: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [preview, setPreview] = useState<ScanApplied | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const scanFn = useServerFn(scanPanelPhoto);

  useEffect(() => {
    if (open) setApiKey((k) => k || loadGeminiKey());
  }, [open]);
  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.url);
  }, [image]);

  const reset = () => {
    setImage(null);
    setScan(null);
    setPreview(null);
    setError("");
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    reset();
    try {
      setImage(await shrinkImage(file));
    } catch {
      setError("Δεν ήταν δυνατό να ανοίξει η εικόνα. Δοκιμάστε φωτογραφία JPG ή PNG.");
    }
  };

  const analyse = async () => {
    if (!image || !apiKey.trim()) return;
    setBusy(true);
    setError("");
    setScan(null);
    setPreview(null);
    saveGeminiKey(remember ? apiKey : "");
    try {
      const res = await scanFn({
        data: { apiKey: apiKey.trim(), mimeType: "image/jpeg", imageBase64: image.base64 },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setScan(res.result);
      setPreview(applyScan(res.result, cfg, newId));
    } catch {
      setError("Η ανάλυση απέτυχε. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.");
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!preview) return;
    const previous = cfg;
    onApply(preview.config);
    setOpen(false);
    reset();
    toast.success("Η φόρμα, το μονογραμμικό και το υλικολόγιο συμπληρώθηκαν από τη φωτογραφία.", {
      action: { label: "Αναίρεση", onClick: () => onApply(previous) },
      duration: 10000,
    });
  };

  const p = preview?.config;

  return (
    <>
      <Button
        className="w-full bg-electric text-electric-foreground hover:bg-electric/85"
        onClick={() => setOpen(true)}
      >
        <ScanLine />
        Σάρωση από Φωτογραφία / Σκαρίφημα
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
            <DialogTitle>Σάρωση από Φωτογραφία / Σκαρίφημα</DialogTitle>
            <DialogDescription>
              Φωτογραφίστε υφιστάμενο πίνακα ή χειρόγραφο σημείωμα. Το Google Gemini αναγνωρίζει
              γενικό διακόπτη, ασφάλειες και ρελέ και συμπληρώνει τον πίνακα.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="geminiKey" className="text-xs font-medium text-muted-foreground">
                Κλειδί Google Gemini API
              </Label>
              <Input
                id="geminiKey"
                type="password"
                autoComplete="off"
                placeholder="AIza…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-[13px]"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
                  Απομνημόνευση σε αυτή τη συσκευή
                </label>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-electric-ink underline-offset-2 hover:underline"
                >
                  Απόκτηση κλειδιού <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {image ? (
              <div className="space-y-2">
                <img
                  src={image.url}
                  alt="Φωτογραφία για σάρωση"
                  className="max-h-56 w-full rounded-md border border-border bg-muted object-contain"
                />
                <Button variant="outline" size="sm" onClick={reset} disabled={busy}>
                  Άλλη φωτογραφία
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-1.5"
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="size-5" />
                  Λήψη φωτογραφίας
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-1.5"
                  onClick={() => galleryRef.current?.click()}
                >
                  <ImageUp className="size-5" />
                  Από τη συλλογή
                </Button>
              </div>
            )}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                void pickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="scan-file"
              onChange={(e) => {
                void pickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            {p && scan && (
              <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Αναγνωρίστηκαν:</p>
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
                    Αναχωρήσεις: {scan.circuits.length ? p.circuits.length : "καμία (μένουν οι τρέχουσες)"}
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
                  Ό,τι δεν φάνηκε στη φωτογραφία κρατά την τρέχουσα τιμή. Ελέγξτε τα πριν την
                  παραγγελία.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {preview ? (
              <Button onClick={apply} className="bg-electric text-electric-foreground hover:bg-electric/85">
                <Sparkles />
                Εφαρμογή στον πίνακα
              </Button>
            ) : (
              <Button onClick={analyse} disabled={!image || !apiKey.trim() || busy}>
                {busy ? <Loader2 className="animate-spin" /> : <ScanLine />}
                {busy ? "Ανάλυση…" : "Ανάλυση φωτογραφίας"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
