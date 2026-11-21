import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
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
import { cn } from "@/lib/utils";
import {
  CIRCUIT_AMP_OPTIONS,
  CURVE_OPTIONS,
  DESCRIPTION_SUGGESTIONS,
  MAIN_FUSE_OPTIONS,
  MAIN_SWITCH_OPTIONS,
  PHASE_OPTIONS,
  RCD_AMP_OPTIONS,
  RCD_SENSITIVITY_OPTIONS,
  cableOptions,
  circuitCode,
  rcdLabel,
  switchSupply,
  type Circuit,
  type PanelConfig,
  type Supply,
} from "@/lib/panel";

interface Props {
  cfg: PanelConfig;
  onChange: (next: PanelConfig) => void;
  newId: () => string;
}

function Section({
  n,
  title,
  children,
  action,
}: {
  n: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border-b border-border px-5 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-baseline gap-2.5 text-sm font-semibold tracking-tight text-foreground">
          <span className="font-mono text-xs text-electric-ink">{n}</span>
          {title}
        </h2>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
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

function Pick({
  id,
  value,
  options,
  onChange,
}: {
  id?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="bg-card font-mono text-[13px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="font-mono text-[13px]">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-md border border-input bg-muted p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[5px] px-2 py-1.5 text-[13px] font-medium transition-colors",
            value === o.value
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-card hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const amps = (list: number[]) => list.map((a) => ({ value: String(a), label: `${a}A` }));

export function PanelForm({ cfg, onChange, newId }: Props) {
  const set = (patch: Partial<PanelConfig>) => onChange({ ...cfg, ...patch });
  const tri = cfg.supply === "tri";

  const updateCircuit = (id: string, patch: Partial<Circuit>) =>
    set({ circuits: cfg.circuits.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const move = (index: number, dir: -1 | 1) => {
    const next = [...cfg.circuits];
    const target = index + dir;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    set({ circuits: next });
  };

  const addCircuit = () => {
    const phases = ["L1", "L2", "L3"] as const;
    const c: Circuit = {
      id: newId(),
      amps: 16,
      curve: "C",
      description: "",
      cable: "3x2.5",
      phase: tri ? (phases[cfg.circuits.length % 3] ?? "L1") : "L",
    };
    set({ circuits: [...cfg.circuits, c] });
  };

  const rcdValue = cfg.rcdAmps ? `${cfg.rcdAmps}-${cfg.rcdSensitivity}` : "none";
  const rcdOptions = [
    { value: "none", label: "Χωρίς ρελέ διαρροής" },
    ...RCD_SENSITIVITY_OPTIONS.flatMap((s) =>
      RCD_AMP_OPTIONS.map((a) => ({
        value: `${a}-${s}`,
        label: rcdLabel({ supply: cfg.supply, rcdAmps: a, rcdSensitivity: s }),
      })),
    ),
  ];

  const cables = cableOptions(cfg.supply).map((c) => ({ value: c, label: `${c} mm²` }));

  return (
    <div className="pb-10">
      <Section n="01" title="Στοιχεία σχεδίου">
        <Field label="Έργο" htmlFor="project">
          <Input
            id="project"
            value={cfg.project}
            onChange={(e) => set({ project: e.target.value })}
            className="bg-card"
          />
        </Field>
        <Field label="Ονομασία πίνακα" htmlFor="panelName">
          <Input
            id="panelName"
            value={cfg.panelName}
            onChange={(e) => set({ panelName: e.target.value })}
            className="bg-card"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Μελετητής" htmlFor="designer">
            <Input
              id="designer"
              value={cfg.designer}
              placeholder="Ονοματεπώνυμο"
              onChange={(e) => set({ designer: e.target.value })}
              className="bg-card"
            />
          </Field>
          <Field label="Ημερομηνία" htmlFor="date">
            <Input
              id="date"
              value={cfg.date}
              onChange={(e) => set({ date: e.target.value })}
              className="bg-card font-mono text-[13px]"
            />
          </Field>
        </div>
      </Section>

      <Section n="02" title="Παροχή & γενική προστασία">
        <Field label="Τύπος παροχής">
          <Segmented<Supply>
            label="Τύπος παροχής"
            value={cfg.supply}
            onChange={(s) => onChange(switchSupply(cfg, s))}
            options={[
              { value: "mono", label: "Μονοφασικός" },
              { value: "tri", label: "Τριφασικός" },
            ]}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Γενικός διακόπτης" htmlFor="mainSwitch">
            <Pick
              id="mainSwitch"
              value={String(cfg.mainSwitch)}
              options={amps(MAIN_SWITCH_OPTIONS)}
              onChange={(v) => set({ mainSwitch: Number(v) })}
            />
          </Field>
          <Field label="Γενική ασφάλεια" htmlFor="mainFuse">
            <Pick
              id="mainFuse"
              value={String(cfg.mainFuse)}
              options={amps(MAIN_FUSE_OPTIONS)}
              onChange={(v) => set({ mainFuse: Number(v) })}
            />
          </Field>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border border-input bg-card px-3 py-2.5">
          <Label htmlFor="lamp" className="text-[13px] font-medium">
            Ενδεικτική λυχνία{tri ? " (L1-L2-L3)" : ""}
          </Label>
          <div className="flex items-center gap-2">
            <span className="w-7 text-right text-xs text-muted-foreground">
              {cfg.indicatorLamp ? "Ναι" : "Όχι"}
            </span>
            <Switch
              id="lamp"
              checked={cfg.indicatorLamp}
              onCheckedChange={(v) => set({ indicatorLamp: v })}
            />
          </div>
        </div>
      </Section>

      <Section n="03" title="Ρελέ διαρροής (RCD)">
        <Field label={tri ? "Τετραπολικό ρελέ" : "Διπολικό ρελέ"} htmlFor="rcd">
          <Pick
            id="rcd"
            value={rcdValue}
            options={rcdOptions}
            onChange={(v) => {
              if (v === "none") return set({ rcdAmps: 0 });
              const [a, s] = v.split("-");
              set({ rcdAmps: Number(a), rcdSensitivity: Number(s) });
            }}
          />
        </Field>
      </Section>

      <Section n="04" title={`Γραμμές (${cfg.circuits.length})`}>
        <datalist id="desc-suggestions">
          {DESCRIPTION_SUGGESTIONS.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <ol className="space-y-3">
          {cfg.circuits.map((c, i) => (
            <li key={c.id} className="rounded-lg border border-border bg-card p-3 shadow-xs">
              <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                <span className="inline-flex h-9 min-w-10 items-center justify-center rounded-md bg-primary px-2 font-mono text-xs font-semibold text-primary-foreground">
                  {circuitCode(i)}
                </span>
                <Input
                  aria-label={`Περιγραφή ${circuitCode(i)}`}
                  list="desc-suggestions"
                  value={c.description}
                  placeholder="Περιγραφή (π.χ. Φωτισμός)"
                  onChange={(e) => updateCircuit(c.id, { description: e.target.value })}
                  className="bg-card"
                />
                <div className="flex shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-7"
                    aria-label="Μετακίνηση πάνω"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-7"
                    aria-label="Μετακίνηση κάτω"
                    disabled={i === cfg.circuits.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-7"
                    aria-label="Αντιγραφή γραμμής"
                    onClick={() => {
                      const next = [...cfg.circuits];
                      next.splice(i + 1, 0, { ...c, id: newId() });
                      set({ circuits: next });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-7 text-muted-foreground hover:text-destructive"
                    aria-label="Διαγραφή γραμμής"
                    onClick={() => set({ circuits: cfg.circuits.filter((x) => x.id !== c.id) })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div
                className={cn(
                  "grid gap-2",
                  tri ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-2" : "grid-cols-3",
                )}
              >
                <Field label="Αμπέρ">
                  <Pick
                    value={String(c.amps)}
                    options={amps(CIRCUIT_AMP_OPTIONS)}
                    onChange={(v) => updateCircuit(c.id, { amps: Number(v) })}
                  />
                </Field>
                <Field label="Καμπύλη">
                  <Segmented
                    label="Καμπύλη"
                    value={c.curve}
                    options={CURVE_OPTIONS.map((k) => ({ value: k, label: k }))}
                    onChange={(v) => updateCircuit(c.id, { curve: v })}
                  />
                </Field>
                <Field label="Καλώδιο">
                  <Pick
                    value={c.cable}
                    options={cables}
                    onChange={(v) => updateCircuit(c.id, { cable: v })}
                  />
                </Field>
                {tri && (
                  <Field label="Φάση">
                    <Pick
                      value={c.phase}
                      options={PHASE_OPTIONS.tri}
                      onChange={(v) => {
                        const phase = v as Circuit["phase"];
                        const section = c.cable.split("x")[1] ?? "2.5";
                        updateCircuit(
                          c.id,
                          phase === "L123" ? { phase, cable: `5x${section}` } : { phase },
                        );
                      }}
                    />
                  </Field>
                )}
              </div>
            </li>
          ))}
        </ol>
        <Button
          type="button"
          onClick={addCircuit}
          variant="outline"
          className="w-full border-dashed border-electric bg-electric-soft font-semibold text-foreground hover:bg-electric/30"
        >
          <Plus className="h-4 w-4" />
          Προσθήκη Γραμμής
        </Button>
      </Section>
    </div>
  );
}
