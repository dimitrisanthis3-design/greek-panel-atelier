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
  PROTECTION_LABELS,
  RCD_AMP_OPTIONS,
  cableOptions,
  circuitCode,
  polesFor,
  switchSupply,
  withPoles,
  type Circuit,
  type PanelConfig,
  type Poles,
  type ProtectionType,
  type RcdPoles,
  type RcdType,
  type Supply,
} from "@/lib/panel";

interface Props {
  cfg: PanelConfig;
  onChange: (next: PanelConfig) => void;
  newId: () => string;
}

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="border-b border-border px-5 py-5">
      <h2 className="mb-4 flex items-baseline gap-2.5 text-sm font-semibold tracking-tight text-foreground">
        <span className="font-mono text-xs text-electric-ink">{n}</span>
        {title}
      </h2>
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
  label,
}: {
  id?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={label} className="bg-card font-mono text-[13px]">
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

function ToggleRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-input bg-card px-3 py-2.5">
      <Label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <span className="w-7 text-right text-xs text-muted-foreground">
          {checked ? "Ναι" : "Όχι"}
        </span>
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
      </div>
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
    const a = next[index];
    const b = next[index + dir];
    if (!a || !b) return;
    next[index] = b;
    next[index + dir] = a;
    set({ circuits: next });
  };

  const addCircuit = () => {
    const base: Circuit = {
      id: newId(),
      poles: "1P",
      amps: 16,
      curve: "C",
      description: "",
      cable: "3x2.5",
      phase: "L",
    };
    set({ circuits: [...cfg.circuits, withPoles(base, "1P", cfg.supply, cfg.circuits.length)] });
  };

  return (
    <div className="pb-10">
      <Section n="00" title="Στοιχεία έργου">
        <Field label="Πελάτης / Έργο" htmlFor="project">
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

      <Section n="01" title="Τύπος παροχής">
        <Segmented<Supply>
          label="Τύπος παροχής"
          value={cfg.supply}
          onChange={(s) => onChange(switchSupply(cfg, s))}
          options={[
            { value: "mono", label: "Μονοφασικός (1Φ)" },
            { value: "tri", label: "Τριφασικός (3Φ)" },
          ]}
        />
      </Section>

      <Section n="02" title="Γενικός διακόπτης φορτίου">
        <Field label={`Ονομαστικό ρεύμα (${tri ? "4P" : "2P"})`} htmlFor="mainSwitch">
          <Pick
            id="mainSwitch"
            value={String(cfg.mainSwitch)}
            options={amps(MAIN_SWITCH_OPTIONS)}
            onChange={(v) => set({ mainSwitch: Number(v) })}
          />
        </Field>
      </Section>

      <Section n="03" title="Γενική ασφάλεια">
        <Field label="Τύπος" htmlFor="protectionType">
          <Pick
            id="protectionType"
            value={cfg.protectionType}
            options={(Object.keys(PROTECTION_LABELS) as ProtectionType[]).map((k) => ({
              value: k,
              label: PROTECTION_LABELS[k],
            }))}
            onChange={(v) => set({ protectionType: v as ProtectionType })}
          />
        </Field>
        <Field label="Αμπέρ" htmlFor="mainFuse">
          <Pick
            id="mainFuse"
            value={String(cfg.mainFuse)}
            options={amps(MAIN_FUSE_OPTIONS)}
            onChange={(v) => set({ mainFuse: Number(v) })}
          />
        </Field>
      </Section>

      <Section n="04" title="Ενδεικτική λυχνία ράγας">
        <ToggleRow
          id="lamp"
          label={`Μετά τη γενική ασφάλεια${tri ? " (3 τεμ. L1-L2-L3)" : ""}`}
          checked={cfg.indicatorLamp}
          onChange={(v) => set({ indicatorLamp: v })}
        />
      </Section>

      <Section n="05" title="Ρελέ διαρροής (RCD)">
        <ToggleRow
          id="rcd"
          label="Γενικό ρελέ διαρροής 30mA"
          checked={cfg.rcdEnabled}
          onChange={(v) => set({ rcdEnabled: v })}
        />
        {cfg.rcdEnabled && (
          <div className="grid grid-cols-3 gap-2">
            <Field label="Πόλοι">
              <Segmented<RcdPoles>
                label="Πόλοι ρελέ"
                value={cfg.rcdPoles}
                onChange={(v) => set({ rcdPoles: v })}
                options={[
                  { value: "2P", label: "2P" },
                  { value: "4P", label: "4P" },
                ]}
              />
            </Field>
            <Field label="Αμπέρ">
              <Pick
                label="Αμπέρ ρελέ"
                value={String(cfg.rcdAmps)}
                options={amps(RCD_AMP_OPTIONS)}
                onChange={(v) => set({ rcdAmps: Number(v) })}
              />
            </Field>
            <Field label="Τύπος">
              <Segmented<RcdType>
                label="Τύπος ρελέ"
                value={cfg.rcdType}
                onChange={(v) => set({ rcdType: v })}
                options={[
                  { value: "A", label: "A" },
                  { value: "AC", label: "AC" },
                ]}
              />
            </Field>
          </div>
        )}
      </Section>

      <Section n="06" title={`Μπάρα διανομής & αναχωρήσεις (${cfg.circuits.length})`}>
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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                <Field label="Πόλοι">
                  <Pick
                    label={`Πόλοι ${circuitCode(i)}`}
                    value={c.poles}
                    options={polesFor(cfg.supply).map((p) => ({ value: p, label: p }))}
                    onChange={(v) =>
                      set({
                        circuits: cfg.circuits.map((x) =>
                          x.id === c.id ? withPoles(x, v as Poles, cfg.supply, i) : x,
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="Αμπέρ">
                  <Pick
                    label={`Αμπέρ ${circuitCode(i)}`}
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
                    label={`Καλώδιο ${circuitCode(i)}`}
                    value={c.cable}
                    options={cableOptions(c).map((k) => ({ value: k, label: `${k} mm²` }))}
                    onChange={(v) => updateCircuit(c.id, { cable: v })}
                  />
                </Field>
                {tri && c.poles !== "3P" && (
                  <Field label="Φάση">
                    <Pick
                      label={`Φάση ${circuitCode(i)}`}
                      value={c.phase}
                      options={PHASE_OPTIONS}
                      onChange={(v) => updateCircuit(c.id, { phase: v as Circuit["phase"] })}
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
