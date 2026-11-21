import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type BomLine, type Totals, railModules } from "@/lib/hager";
import type { CustomItem, PanelConfig } from "@/lib/panel";
import { cn } from "@/lib/utils";

const eur = new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" });
const dec = new Intl.NumberFormat("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function parseDecimal(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return 0;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Decimal input that accepts Greek comma decimals and commits valid numbers. */
function NumberInput({
  value,
  onCommit,
  label,
  className,
  integer = false,
}: {
  value: number;
  onCommit: (n: number) => void;
  label: string;
  className?: string;
  integer?: boolean;
}) {
  const fmt = (n: number) => (n === 0 ? "" : integer ? String(n) : dec.format(n));
  const [text, setText] = useState(fmt(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);
  const parsed = parseDecimal(text);
  return (
    <Input
      aria-label={label}
      inputMode="decimal"
      value={text}
      placeholder={integer ? "0" : "0,00"}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseDecimal(e.target.value);
        if (n !== null) onCommit(integer ? Math.round(n) : n);
      }}
      className={cn(
        "h-8 bg-card text-right font-mono text-[13px] tabular-nums",
        parsed === null && "border-destructive",
        className,
      )}
    />
  );
}

interface Props {
  cfg: PanelConfig;
  lines: BomLine[];
  prices: Record<string, number>;
  totals: Totals;
  onPrice: (code: string, price: number) => void;
  onChange: (next: PanelConfig) => void;
  newId: () => string;
}

export function BomTable({ cfg, lines, prices, totals, onPrice, onChange, newId }: Props) {
  const modules = railModules(lines);
  const withSpare = Math.ceil((modules * 1.2) / 12) * 12;
  const updateCustom = (id: string, patch: Partial<CustomItem>) =>
    onChange({
      ...cfg,
      customItems: cfg.customItems.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  let n = 0;

  return (
    <div className="mx-auto w-full max-w-5xl rounded-lg border border-border bg-card shadow-sheet print:max-w-none print:border-0 print:shadow-none">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-wider text-electric-ink">
            Υλικολόγιο & Προσφορά
          </p>
          <h2 className="truncate text-lg font-semibold tracking-tight">{cfg.project || "Έργο"}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {cfg.panelName} · {cfg.date}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-right text-xs text-muted-foreground">
          <span>Θέσεις ράγας DIN</span>
          <span className="font-mono font-semibold text-foreground">
            {String(modules).replace(".", ",")}
          </span>
          <span>Πίνακας με 20% εφεδρεία</span>
          <span className="font-mono font-semibold text-foreground">≥ {withSpare} θέσεις</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              <th className="w-10 px-3 py-2 font-medium">Α/Α</th>
              <th className="w-32 px-3 py-2 font-medium">Κωδικός</th>
              <th className="px-3 py-2 font-medium">Περιγραφή</th>
              <th className="w-20 px-3 py-2 text-right font-medium">Τεμ.</th>
              <th className="w-36 px-3 py-2 text-right font-medium">Τιμή Μονάδας (€)</th>
              <th className="w-28 px-3 py-2 text-right font-medium">Σύνολο (€)</th>
              <th className="w-10 print:hidden" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const price = prices[l.code] ?? 0;
              n += 1;
              return (
                <tr key={l.code} className="border-b border-border/70">
                  <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{n}</td>
                  <td className="px-3 py-1.5 font-mono text-[13px] font-semibold">{l.code}</td>
                  <td className="px-3 py-1.5">
                    <span className="text-muted-foreground">Hager · </span>
                    {l.description}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{l.qty}</td>
                  <td className="px-3 py-1.5">
                    <NumberInput
                      label={`Τιμή ${l.code}`}
                      value={price}
                      onCommit={(p) => onPrice(l.code, p)}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    {dec.format(price * l.qty)}
                  </td>
                  <td className="print:hidden" />
                </tr>
              );
            })}
            {cfg.customItems.map((c) => {
              n += 1;
              return (
                <tr key={c.id} className="border-b border-border/70 bg-electric-soft/40">
                  <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{n}</td>
                  <td className="px-3 py-1.5">
                    <Input
                      aria-label="Κωδικός υλικού"
                      value={c.code}
                      placeholder="Κωδικός"
                      onChange={(e) => updateCustom(c.id, { code: e.target.value })}
                      className="h-8 bg-card font-mono text-[13px]"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      aria-label="Περιγραφή υλικού"
                      value={c.description}
                      placeholder="π.χ. Πίνακας 24 θέσεων, καλώδιο NYM 3x2.5 (μ.)"
                      onChange={(e) => updateCustom(c.id, { description: e.target.value })}
                      className="h-8 bg-card"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <NumberInput
                      label="Ποσότητα"
                      value={c.qty}
                      onCommit={(q) => updateCustom(c.id, { qty: q })}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <NumberInput
                      label="Τιμή μονάδας"
                      value={c.unitPrice}
                      onCommit={(p) => updateCustom(c.id, { unitPrice: p })}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    {dec.format(c.unitPrice * c.qty)}
                  </td>
                  <td className="px-1 print:hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label="Διαγραφή υλικού"
                      onClick={() =>
                        onChange({
                          ...cfg,
                          customItems: cfg.customItems.filter((x) => x.id !== c.id),
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
        <Button
          variant="outline"
          size="sm"
          className="border-dashed print:hidden"
          onClick={() =>
            onChange({
              ...cfg,
              customItems: [
                ...cfg.customItems,
                { id: newId(), code: "", description: "", qty: 1, unitPrice: 0 },
              ],
            })
          }
        >
          <Plus />
          Προσθήκη υλικού (κουτί, καλώδια, εργασία…)
        </Button>
        <dl className="ml-auto grid min-w-64 grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Καθαρό σύνολο</dt>
          <dd className="text-right font-mono tabular-nums">{eur.format(totals.net)}</dd>
          <dt className="flex items-center gap-2 text-muted-foreground">
            ΦΠΑ
            <span className="w-16 print:hidden">
              <NumberInput
                integer
                label="Ποσοστό ΦΠΑ"
                value={cfg.vatPercent}
                onCommit={(v) => onChange({ ...cfg, vatPercent: Math.min(100, v) })}
                className="h-7"
              />
            </span>
            <span className="hidden print:inline">{cfg.vatPercent}</span>%
          </dt>
          <dd className="text-right font-mono tabular-nums">{eur.format(totals.vat)}</dd>
          <dt className="border-t border-border pt-1.5 font-semibold">Γενικό σύνολο</dt>
          <dd className="border-t border-border pt-1.5 text-right font-mono text-base font-semibold tabular-nums">
            {eur.format(totals.gross)}
          </dd>
        </dl>
      </div>
      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground print:hidden">
        Οι τιμές που πληκτρολογείτε κρατιούνται ανά κωδικό σε αυτή τη συσκευή και ισχύουν σε όλα τα
        έργα. Ελέγξτε τους κωδικούς με τον προμηθευτή πριν την παραγγελία.
      </p>
    </div>
  );
}
