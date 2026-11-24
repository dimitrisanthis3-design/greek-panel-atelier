// YDE (ΥΔΕ) documents tab: installation data form, installer details, circuit measurements,
// visual check checklist, and printable Protocol Document (ΕΛΟΤ 60364 / HD 384).
// Prefills acceptable typical values: Riso > 100 MΩ, RCD < 30 ms, visual checks "Ναι".

import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Mic,
  MicOff,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ProtocolDocument } from "@/components/yde/ProtocolDocument";
import { useVoiceInput, parseVoiceProject } from "@/hooks/use-voice-input";
import { circuitCode } from "@/lib/panel";
import { buildProtocolDoc } from "@/lib/protocol";
import type { PanelConfig } from "@/lib/panel";
import {
  ALL_CHECKS,
  CABLE_TYPES,
  CHECK_KIND_LABELS,
  CHECK_RESULT_LABELS,
  EARTH_TYPE_LABELS,
  ROOM_SUGGESTIONS,
  RECHECK_YEARS,
  type CheckKind,
  type CheckResult,
  type EarthType,
  type Network,
  type OwnerRole,
  type CableType,
} from "@/lib/yde";
import {
  emptyInstaller,
  type Installer,
  type Room,
} from "@/lib/yde";
import { loadInstaller, saveInstaller } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface Props {
  cfg: PanelConfig;
  onChange: (next: PanelConfig) => void;
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Prefill all circuit measurements with acceptable typical values. */
function prefillMeasurements(cfg: PanelConfig): PanelConfig {
  const tests = { ...cfg.yde.tests };
  for (const c of cfg.circuits) {
    if (!tests[c.id]) {
      tests[c.id] = {
        cableType: "NYA",
        risoLoad: ">100",
        riso: ">100",
        imess: "<30",
        umess: "230",
        zs: "",
      };
    }
  }
  const checks = { ...cfg.yde.checks };
  for (const item of ALL_CHECKS) {
    if (!checks[item.id]) {
      checks[item.id] = item.triOnly && cfg.supply === "mono" ? "na" : "ok";
    }
  }
  return {
    ...cfg,
    yde: { ...cfg.yde, tests, checks },
  };
}

const TYPICAL_VALUES_LABEL = (
  <div className="rounded-md border border-electric/30 bg-electric-soft/50 px-3 py-2 text-xs text-muted-foreground">
    Προσυμπληρώθηκαν αποδεκτές τυπικές τιμίες: R<sub>iso</sub> &gt; 100 MΩ, RCD &lt; 30 ms,
    οπτικός έλεγχος «Ναι». Επεξεργαστείτε τις αν χρειάζεται.
  </div>
);

export function YdeTab({ cfg, onChange }: Props) {
  const [installer, setInstaller] = useState<Installer>(emptyInstaller());
  const [ydeReady, setYdeReady] = useState(false);
  const [ydeSub, setYdeSub] = useState("form");

  // Load installer details from storage once.
  useEffect(() => {
    setInstaller(loadInstaller());
    setYdeReady(true);
  }, []);

  // Auto-prefill measurements when circuits exist but have no test data.
  useEffect(() => {
    if (!ydeReady) return;
    const hasUnfilled = cfg.circuits.some(
      (c) => !cfg.yde.tests[c.id] || !cfg.yde.checks["1.1"],
    );
    if (hasUnfilled && cfg.circuits.length > 0) {
      onChange(prefillMeasurements(cfg));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ydeReady, cfg.circuits.length]);

  const setYde = (patch: Partial<PanelConfig["yde"]>) =>
    onChange({ ...cfg, yde: { ...cfg.yde, ...patch } });

  const setInstallerField = (k: keyof Installer, v: string) => {
    const next = { ...installer, [k]: v };
    setInstaller(next);
    saveInstaller(next);
  };

  const protocolDoc = useMemo(
    () => buildProtocolDoc(cfg, installer),
    [cfg, installer],
  );

  // Voice input for project details
  const voice = useVoiceInput({
    onResult: (text) => {
      const parsed = parseVoiceProject(text);
      const patch: Partial<PanelConfig> = {};
      if (parsed.project) patch.project = parsed.project;
      if (parsed.panelName) patch.panelName = parsed.panelName;
      if (parsed.designer) patch.designer = parsed.designer;
      if (Object.keys(patch).length > 0) {
        onChange({ ...cfg, ...patch });
        toast.success(`Φωνητική εντολή: ${text}`);
      }
    },
  });

  const updateCheck = (id: string, result: CheckResult) => {
    setYde({ checks: { ...cfg.yde.checks, [id]: result } });
  };

  const updateTest = (circuitId: string, field: string, value: string) => {
    const existing = cfg.yde.tests[circuitId] ?? {
      cableType: "NYA",
      risoLoad: "",
      riso: "",
      imess: "",
      umess: "",
      zs: "",
    };
    setYde({
      tests: { ...cfg.yde.tests, [circuitId]: { ...existing, [field]: value } },
    });
  };

  const addRoom = () => {
    const room: Room = {
      id: `r${Date.now()}`,
      name: "",
      sockets: 0,
      switches: 0,
      lights: 0,
      fixedDesc: "",
      fixedKw: 0,
    };
    setYde({ rooms: [...cfg.yde.rooms, room] });
  };

  const updateRoom = (id: string, patch: Partial<Room>) => {
    setYde({
      rooms: cfg.yde.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  return (
    <div className="flex h-full flex-col">
      <Tabs value={ydeSub} onValueChange={setYdeSub} className="flex h-full flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2.5 print:hidden">
          <TabsList>
            <TabsTrigger value="form">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Στοιχεία Εγκατάστασης</span>
              <span className="sm:hidden">Στοιχεία</span>
            </TabsTrigger>
            <TabsTrigger value="installer">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Ηλεκτρολόγος</span>
              <span className="sm:hidden">Εγκαταστάτης</span>
            </TabsTrigger>
            <TabsTrigger value="protocol">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Πρωτόκολλο Ελέγχου</span>
              <span className="sm:hidden">Πρωτόκολλο</span>
            </TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onChange(prefillMeasurements(cfg));
                toast.success("Προσυμπληρώθηκαν οι τυπικές αποδεκτές τιμές.");
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Τυπικές τιμές</span>
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              Εκτύπωση
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 lg:overflow-y-auto print:overflow-visible print:p-0">
          <TabsContent value="form" className="mt-0">
            <div className="mx-auto max-w-3xl space-y-6">
              {TYPICAL_VALUES_LABEL}

              {/* Installation info */}
              <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight">
                  <Building2 className="h-4 w-4 text-electric-ink" />
                  Στοιχεία Εγκατάστασης
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Αριθμός πρωτοκόλλου" htmlFor="protocolNo">
                    <Input
                      id="protocolNo"
                      value={cfg.yde.protocolNo}
                      onChange={(e) => setYde({ protocolNo: e.target.value })}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Αριθμός παροχής" htmlFor="supplyNo">
                    <Input
                      id="supplyNo"
                      value={cfg.yde.supplyNo}
                      onChange={(e) => setYde({ supplyNo: e.target.value })}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Ιδιοκτήτης / Καταναλωτής" htmlFor="owner">
                    <Input
                      id="owner"
                      value={cfg.yde.owner}
                      placeholder="Ονοματεπώνυμο"
                      onChange={(e) => setYde({ owner: e.target.value })}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Ιδιότητα">
                    <Select
                      value={cfg.yde.ownerRole}
                      onValueChange={(v) => setYde({ ownerRole: v as OwnerRole })}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Ιδιοκτήτης</SelectItem>
                        <SelectItem value="consumer">Καταναλωτής</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Διεύθυνση" htmlFor="address" className="sm:col-span-2">
                    <Input
                      id="address"
                      value={cfg.yde.address}
                      onChange={(e) => setYde({ address: e.target.value })}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Πόλη" htmlFor="city">
                    <Input
                      id="city"
                      value={cfg.yde.city}
                      onChange={(e) => setYde({ city: e.target.value })}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Ταχ. κώδικας" htmlFor="postalCode">
                    <Input
                      id="postalCode"
                      value={cfg.yde.postalCode}
                      onChange={(e) => setYde({ postalCode: e.target.value })}
                      className="bg-card font-mono text-[13px]"
                    />
                  </Field>
                  <Field label="Είδος ελέγχου">
                    <Select
                      value={cfg.yde.checkKind}
                      onValueChange={(v) => setYde({ checkKind: v as CheckKind })}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CHECK_KIND_LABELS) as CheckKind[]).map((k) => (
                          <SelectItem key={k} value={k}>
                            {CHECK_KIND_LABELS[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Κατηγορία εγκατάστασης" htmlFor="installCategory">
                    <Input
                      id="installCategory"
                      value={cfg.yde.installCategory}
                      onChange={(e) => setYde({ installCategory: e.target.value })}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Κωδ. εγκατάστασης" htmlFor="installCode">
                    <Input
                      id="installCode"
                      value={cfg.yde.installCode}
                      onChange={(e) => setYde({ installCode: e.target.value })}
                      className="bg-card font-mono text-[13px]"
                    />
                  </Field>
                  <Field label="Δίκτυο τροφοδοσίας">
                    <Select
                      value={cfg.yde.network}
                      onValueChange={(v) => setYde({ network: v as Network })}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TT">TT</SelectItem>
                        <SelectItem value="TN">TN</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Αντίσταση ηλεκτροδίου γείωσης (Ω)" htmlFor="earthOhms">
                    <Input
                      id="earthOhms"
                      value={cfg.yde.earthOhms}
                      placeholder="π.χ. 12"
                      onChange={(e) => setYde({ earthOhms: e.target.value })}
                      className="bg-card font-mono text-[13px]"
                    />
                  </Field>
                  <Field label="Είδος γείωσης">
                    <Select
                      value={cfg.yde.earthType}
                      onValueChange={(v) => setYde({ earthType: v as EarthType })}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(EARTH_TYPE_LABELS) as EarthType[]).map((k) => (
                          <SelectItem key={k} value={k}>
                            {EARTH_TYPE_LABELS[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Μέθοδος μέτρησης γείωσης" htmlFor="earthMethod" className="sm:col-span-2">
                    <Input
                      id="earthMethod"
                      value={cfg.yde.earthMethod}
                      onChange={(e) => setYde({ earthMethod: e.target.value })}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Τύπος καλωδίου τροφοδοσίας">
                    <Select
                      value={cfg.yde.feedCableType}
                      onValueChange={(v) => setYde({ feedCableType: v as CableType })}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CABLE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Διατομή τροφοδοσίας (mm²)" htmlFor="feedSection">
                    <Input
                      id="feedSection"
                      value={cfg.yde.feedSection}
                      onChange={(e) => setYde({ feedSection: e.target.value })}
                      className="bg-card font-mono text-[13px]"
                    />
                  </Field>
                </div>
              </section>

              {/* Visual checks */}
              <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
                <h3 className="mb-1 text-sm font-semibold tracking-tight">1. Οπτικός έλεγχος</h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  Προσυμπληρωμένο με «Συμμόρφωση» (Ναι) για όλα τα σημεία.
                </p>
                <div className="space-y-2">
                  {ALL_CHECKS.map((item) => {
                    const result =
                      cfg.yde.checks[item.id] ??
                      (item.triOnly && cfg.supply === "mono" ? "na" : "ok");
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                      >
                        <span className="min-w-0 text-[13px]">
                          <span className="font-mono text-xs text-electric-ink">{item.id}</span>{" "}
                          {item.label}
                          {item.triOnly && cfg.supply === "mono" && (
                            <span className="ml-2 text-xs text-muted-foreground">(Δεν εφαρμόζεται σε 1Φ)</span>
                          )}
                        </span>
                        <Select
                          value={result}
                          onValueChange={(v) => updateCheck(item.id, v as CheckResult)}
                        >
                          <SelectTrigger className="h-8 w-36 bg-card text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(CHECK_RESULT_LABELS) as CheckResult[]).map((r) => (
                              <SelectItem key={r} value={r}>
                                {CHECK_RESULT_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
                <Field label="Παρατηρήσεις οπτικού ελέγχου" htmlFor="remarksVisual" className="mt-4">
                  <Textarea
                    id="remarksVisual"
                    value={cfg.yde.remarksVisual}
                    onChange={(e) => setYde({ remarksVisual: e.target.value })}
                    className="bg-card min-h-20"
                  />
                </Field>
              </section>

              {/* Circuit measurements */}
              <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
                <h3 className="mb-1 text-sm font-semibold tracking-tight">3. Μετρήσεις ανά κύκλωμα</h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  Προσυμπληρωμένο: R<sub>iso</sub> &gt; 100 MΩ, I<sub>mess</sub> &lt; 30 mA, U = 230V.
                  Συνδέεται αυτόματα με τις γραμμές του πίνακα.
                </p>
                {cfg.circuits.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    Δεν υπάρχουν γραμμές στον πίνακα. Προσθέστε γραμμές στην καρτέλα «Σχεδιασμός».
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cfg.circuits.map((c, i) => {
                      const t =
                        cfg.yde.tests[c.id] ?? {
                          cableType: "NYA",
                          risoLoad: ">100",
                          riso: ">100",
                          imess: "<30",
                          umess: "230",
                          zs: "",
                        };
                      return (
                        <div
                          key={c.id}
                          className="rounded-md border border-border bg-muted/30 p-3"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <span className="inline-flex h-7 min-w-9 items-center justify-center rounded-md bg-primary px-2 font-mono text-xs font-semibold text-primary-foreground">
                              {circuitCode(i)}
                            </span>
                            <span className="text-sm font-medium">
                              {c.description || "Χωρίς περιγραφή"}
                            </span>
                            <span className="ml-auto font-mono text-xs text-muted-foreground">
                              {c.poles} · {c.amps}A · {c.cable}mm²
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                            <Field label="Τύπος καλωδίου">
                              <Select
                                value={t.cableType}
                                onValueChange={(v) => updateTest(c.id, "cableType", v)}
                              >
                                <SelectTrigger className="h-8 bg-card text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CABLE_TYPES.map((ct) => (
                                    <SelectItem key={ct} value={ct}>
                                      {ct}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field label="Riso με φορτία (MΩ)">
                              <Input
                                aria-label={`Riso με φορτία ${circuitCode(i)}`}
                                value={t.risoLoad}
                                placeholder=">100"
                                onChange={(e) => updateTest(c.id, "risoLoad", e.target.value)}
                                className="h-8 bg-card font-mono text-[13px]"
                              />
                            </Field>
                            <Field label="Riso χωρίς φορτία (MΩ)">
                              <Input
                                aria-label={`Riso χωρίς φορτία ${circuitCode(i)}`}
                                value={t.riso}
                                placeholder=">100"
                                onChange={(e) => updateTest(c.id, "riso", e.target.value)}
                                className="h-8 bg-card font-mono text-[13px]"
                              />
                            </Field>
                            <Field label="Imess (mA)">
                              <Input
                                aria-label={`Imess ${circuitCode(i)}`}
                                value={t.imess}
                                placeholder="<30"
                                onChange={(e) => updateTest(c.id, "imess", e.target.value)}
                                className="h-8 bg-card font-mono text-[13px]"
                              />
                            </Field>
                            <Field label="Umess (V)">
                              <Input
                                aria-label={`Umess ${circuitCode(i)}`}
                                value={t.umess}
                                placeholder="230"
                                onChange={(e) => updateTest(c.id, "umess", e.target.value)}
                                className="h-8 bg-card font-mono text-[13px]"
                              />
                            </Field>
                            <Field label="Zs (Ω)">
                              <Input
                                aria-label={`Zs ${circuitCode(i)}`}
                                value={t.zs}
                                onChange={(e) => updateTest(c.id, "zs", e.target.value)}
                                className="h-8 bg-card font-mono text-[13px]"
                              />
                            </Field>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Field label="Παρατηρήσεις μετρήσεων" htmlFor="remarksMeasure" className="mt-4">
                  <Textarea
                    id="remarksMeasure"
                    value={cfg.yde.remarksMeasure}
                    onChange={(e) => setYde({ remarksMeasure: e.target.value })}
                    className="bg-card min-h-20"
                  />
                </Field>
              </section>

              {/* ΕΗΕ Rooms */}
              <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
                <h3 className="mb-1 text-sm font-semibold tracking-tight">
                  Καταγραφή χώρων ΕΗΕ
                </h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  Καταγραφή σημείων ανά χώρο για τον υπολογισμό εγκατεστημένης ισχύος.
                </p>
                {cfg.yde.rooms.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">
                    Δεν υπάρχουν καταγεγραμμένοι χώροι ακόμα.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cfg.yde.rooms.map((r) => (
                      <div
                        key={r.id}
                        className="grid grid-cols-2 gap-2 rounded-md border border-border p-2 sm:grid-cols-5"
                      >
                        <Input
                          aria-label="Όνομα χώρου"
                          list="room-suggestions"
                          value={r.name}
                          placeholder="Χώρος"
                          onChange={(e) => updateRoom(r.id, { name: e.target.value })}
                          className="h-8 bg-card text-sm"
                        />
                        <Input
                          aria-label="Σούκος"
                          type="number"
                          min={0}
                          value={r.sockets || ""}
                          placeholder="Σούκοι"
                          onChange={(e) => updateRoom(r.id, { sockets: Number(e.target.value) || 0 })}
                          className="h-8 bg-card font-mono text-[13px]"
                        />
                        <Input
                          aria-label="Διακόπτες"
                          type="number"
                          min={0}
                          value={r.switches || ""}
                          placeholder="Διακόπτες"
                          onChange={(e) => updateRoom(r.id, { switches: Number(e.target.value) || 0 })}
                          className="h-8 bg-card font-mono text-[13px]"
                        />
                        <Input
                          aria-label="Φωτισμός"
                          type="number"
                          min={0}
                          value={r.lights || ""}
                          placeholder="Φωτ."
                          onChange={(e) => updateRoom(r.id, { lights: Number(e.target.value) || 0 })}
                          className="h-8 bg-card font-mono text-[13px]"
                        />
                        <div className="flex items-center gap-1">
                          <Input
                            aria-label="Σταθερή ισχύς kW"
                            type="number"
                            step="0.1"
                            min={0}
                            value={r.fixedKw || ""}
                            placeholder="kW"
                            onChange={(e) => updateRoom(r.id, { fixedKw: Number(e.target.value) || 0 })}
                            className="h-8 bg-card font-mono text-[13px]"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            aria-label="Διαγραφή χώρου"
                            onClick={() =>
                              setYde({ rooms: cfg.yde.rooms.filter((x) => x.id !== r.id) })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <datalist id="room-suggestions">
                  {ROOM_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full border-dashed"
                  onClick={addRoom}
                >
                  <Plus className="h-4 w-4" />
                  Προσθήκη χώρου
                </Button>
              </section>

              {/* Remarks & recommendations */}
              <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
                <h3 className="mb-4 text-sm font-semibold tracking-tight">
                  Παρατηρήσεις & Συστάσεις
                </h3>
                <div className="space-y-4">
                  <Field label="Γενικές παρατηρήσεις" htmlFor="remarks">
                    <Textarea
                      id="remarks"
                      value={cfg.yde.remarks}
                      onChange={(e) => setYde({ remarks: e.target.value })}
                      className="bg-card min-h-20"
                    />
                  </Field>
                  <Field label="Συστάσεις αναβάθμισης επιπέδου ασφάλειας" htmlFor="recommendations">
                    <Textarea
                      id="recommendations"
                      value={cfg.yde.recommendations}
                      onChange={(e) => setYde({ recommendations: e.target.value })}
                      className="bg-card min-h-20"
                    />
                  </Field>
                  <div className="flex items-center justify-between gap-3 rounded-md border border-input bg-card px-3 py-2.5">
                    <Label htmlFor="labelAffixed" className="text-[13px] font-medium">
                      Επικόλληση ετικέτας ελέγχου στον πίνακα
                    </Label>
                    <Switch
                      id="labelAffixed"
                      checked={cfg.yde.labelAffixed}
                      onCheckedChange={(v) => setYde({ labelAffixed: v })}
                    />
                  </div>
                  <Field label={`Επόμενος τακτικός επανέλεγχος (προεπιλογή: +${RECHECK_YEARS} χρόνια)`} htmlFor="nextCheck">
                    <Input
                      id="nextCheck"
                      value={cfg.yde.nextCheck}
                      placeholder="π.χ. 24/11/2040"
                      onChange={(e) => setYde({ nextCheck: e.target.value })}
                      className="bg-card font-mono text-[13px]"
                    />
                  </Field>
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="installer" className="mt-0">
            <div className="mx-auto max-w-2xl space-y-6">
              <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight">
                  <User className="h-4 w-4 text-electric-ink" />
                  Στοιχεία Ηλεκτρολόγου Εγκαταστάτη
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Ονοματεπώνυμο" htmlFor="iName" className="sm:col-span-2">
                    <Input
                      id="iName"
                      value={installer.name}
                      onChange={(e) => setInstallerField("name", e.target.value)}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Τίτλος / Ειδικότητα" htmlFor="iTitle">
                    <Input
                      id="iTitle"
                      value={installer.title}
                      onChange={(e) => setInstallerField("title", e.target.value)}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Αριθμός Άδειας" htmlFor="iLicense">
                    <Input
                      id="iLicense"
                      value={installer.licenseNo}
                      onChange={(e) => setInstallerField("licenseNo", e.target.value)}
                      className="bg-card font-mono text-[13px]"
                    />
                  </Field>
                  <Field label="Βεβ. Αναγγελίας" htmlFor="iAnnouncement">
                    <Input
                      id="iAnnouncement"
                      value={installer.announcementNo}
                      onChange={(e) => setInstallerField("announcementNo", e.target.value)}
                      className="bg-card font-mono text-[13px]"
                    />
                  </Field>
                  <Field label="Κατηγορία" htmlFor="iCategory">
                    <Input
                      id="iCategory"
                      value={installer.category}
                      onChange={(e) => setInstallerField("category", e.target.value)}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Ειδικότητα (Κλάδος)" htmlFor="iSpecialty">
                    <Input
                      id="iSpecialty"
                      value={installer.specialty}
                      onChange={(e) => setInstallerField("specialty", e.target.value)}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Α.Μ. / Ε.Ε.Τ.Ε.Μ." htmlFor="iAm">
                    <Input
                      id="iAm"
                      value={installer.amNo}
                      onChange={(e) => setInstallerField("amNo", e.target.value)}
                      className="bg-card font-mono text-[13px]"
                    />
                  </Field>
                  <Field label="ΑΦΜ" htmlFor="iAfm">
                    <Input
                      id="iAfm"
                      value={installer.afm}
                      onChange={(e) => setInstallerField("afm", e.target.value)}
                      className="bg-card font-mono text-[13px]"
                    />
                  </Field>
                  <Field label="ΔΟΥ" htmlFor="iDoy">
                    <Input
                      id="iDoy"
                      value={installer.doy}
                      onChange={(e) => setInstallerField("doy", e.target.value)}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Διεύθυνση" htmlFor="iAddress" className="sm:col-span-2">
                    <Input
                      id="iAddress"
                      value={installer.address}
                      onChange={(e) => setInstallerField("address", e.target.value)}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Τηλέφωνο" htmlFor="iPhone">
                    <Input
                      id="iPhone"
                      value={installer.phone}
                      onChange={(e) => setInstallerField("phone", e.target.value)}
                      className="bg-card font-mono text-[13px]"
                    />
                  </Field>
                </div>
              </section>

              <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
                <h3 className="mb-4 text-sm font-semibold tracking-tight">
                  Όργανα Μετρήσεων
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Όνομα οργάνου" htmlFor="iInstName">
                    <Input
                      id="iInstName"
                      value={installer.instrumentName}
                      onChange={(e) => setInstallerField("instrumentName", e.target.value)}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Τύπος" htmlFor="iInstType">
                    <Input
                      id="iInstType"
                      value={installer.instrumentType}
                      onChange={(e) => setInstallerField("instrumentType", e.target.value)}
                      className="bg-card"
                    />
                  </Field>
                  <Field label="Σειριακός αριθμός" htmlFor="iInstSerial">
                    <Input
                      id="iInstSerial"
                      value={installer.instrumentSerial}
                      onChange={(e) => setInstallerField("instrumentSerial", e.target.value)}
                      className="bg-card font-mono text-[13px]"
                    />
                  </Field>
                </div>
              </section>

              <p className="text-xs text-muted-foreground">
                Τα στοιχεία του ηλεκτρολόγου αποθηκεύονται μόνιμα σε αυτή τη συσκευή και
                χρησιμοποιούνται σε όλα τα έργα.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="protocol" className="mt-0">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="flex items-center gap-2 rounded-md border border-electric/30 bg-electric-soft/50 px-4 py-2.5 text-sm print:hidden">
                <CheckCircle2 className="h-4 w-4 text-electric-ink" />
                <span>
                  Το πρωτόκολλο συνδέεται αυτόματα με τις {cfg.circuits.length} γραμμές του πίνακα.
                  Εκτυπώνεται σε σελίδες Α4.
                </span>
              </div>
              <div className="print:hidden">
                <Button onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  Εκτύπωση / Αποθήκευση PDF
                </Button>
              </div>
              <ProtocolDocument doc={protocolDoc} />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
