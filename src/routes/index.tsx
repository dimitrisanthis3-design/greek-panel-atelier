tsx
import { createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderKanban,
  Minus,
  Plus,
  Printer,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { BomTable } from "@/components/panel/BomTable";
import { Diagram } from "@/components/panel/Diagram";
import { PanelForm } from "@/components/panel/PanelForm";
import { ProjectBar } from "@/components/panel/ProjectBar";
import { ScanDialog } from "@/components/panel/ScanDialog";
import { YdeTab } from "@/components/panel/YdeTab";
import { Button } from "@/components/ui/button";
import { buildBomCsv, downloadText, fileSlug } from "@/lib/csv";
import { downloadSvg } from "@/lib/export-svg";
import { buildBom, computeTotals } from "@/lib/hager";
import { defaultConfig, runChecks, type PanelConfig } from "@/lib/panel";
import { loadCurrent, loadPrices, saveCurrent, savePrices } from "@/lib/storage";
import { TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/utils";

const TITLE = "Σχεδιαστής Μονογραμμικού, Υλικολογίου & ΥΔΕ";

const searchSchema = z.object({
  tab: fallback(z.string(), "diagram").default("diagram"),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: TITLE },
      {
        name: "description",
        content:
          "Ζωντανό μονογραμμικό διάγραμμα ηλεκτρικού πίνακα, αυτόματο υλικολόγιο Hager και πλήρες Πρωτόκολλο Ελέγχου ΥΔΕ κατά ΕΛΟΤ 60364.",
      },
      { property: "og:title", content: TITLE },
      {
        property: "og:description",
        content: "Μονογραμμικό σε SVG/PDF, υλικολόγιο Hager και Έντυπα ΥΔΕ / Πρωτόκολλο Ελέγχου.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function Index() {
  const { tab: rawTab } = Route.useSearch();
  const tab = rawTab === "bom" ? "bom" : rawTab === "yde" ? "yde" : "diagram";
  const navigate = Route.useNavigate();
  const [cfg, setCfg] = useState<PanelConfig>(defaultConfig);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [savedOk, setSavedOk] = useState(true);
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const svgRef = useRef<SVGSVGElement>(null);
  const idRef = useRef(1000);
  const checks = useMemo(() => runChecks(cfg), [cfg]);
  const bom = useMemo(() => buildBom(cfg), [cfg]);
  const totals = useMemo(
    () => computeTotals(bom, prices, cfg.customItems, cfg.vatPercent),
    [bom, prices, cfg],
  );

  useEffect(() => {
    const stored = loadCurrent();
    const today = new Date().toLocaleDateString("el-GR");
    setCfg(
      stored
        ? stored.date
          ? stored
          : { ...stored, date: today }
        : { ...defaultConfig(), date: today },
    );
    setPrices(loadPrices());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) setSavedOk(saveCurrent(cfg));
  }, [cfg, ready]);
  useEffect(() => {
    if (ready) savePrices(prices);
  }, [prices, ready]);

  const newId = () => {
    idRef.current += 1;
    return `n${Date.now().toString(36)}${idRef.current}`;
  };

  const stepZoom = (dir: 1 | -1) => {
    const current = zoom === "fit" ? 1 : zoom;
    const idx = ZOOMS.findIndex((z) => z >= current);
    const next =
      ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, (idx === -1 ? ZOOMS.length - 1 : idx) + dir))];
    setZoom(next ?? 1);
  };

  const setTab = (t: "diagram" | "bom" | "yde") =>
    navigate({ search: (prev) => ({ ...prev, tab: t }), replace: true });

  const applyTemplate = (templateId: string) => {
    const found = TEMPLATES.find((t) => t.id === templateId);
    if (!found) return;
    const today = new Date().toLocaleDateString("el-GR");
    setCfg({ ...found.build(), date: today });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:h-screen print:block print:h-auto">
      <header className="flex h-14 shrink-0 items-center gap-3 bg-primary px-4 text-primary-foreground print:hidden">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-electric text-electric-foreground">
          <Zap className="h-4.5 w-4.5" fill="currentColor" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold leading-tight tracking-tight">
            {TITLE}
          </h1>
          <p className="truncate text-[11px] text-primary-foreground/60">
            {ready
              ? savedOk
                ? "Αποθηκεύεται αυτόματα σε αυτή τη συσκευή"
                : "Η αυτόματη αποθήκευση απέτυχε"
              : "Σύμβολα IEC 60617 · Κωδικοί Hager · ΕΛΟΤ 60364"}
          </p>
        </div>
        <ProjectBar
          cfg={cfg}
          prices={prices}
          onLoad={setCfg}
          onImportPrices={(p) => setPrices((prev) => ({ ...prev, ...p }))}
        />
      </header>

      <main className="grid min-h-0 flex-1 lg:grid-cols-[400px_minmax(0,1fr)] print:block">
        <aside className="min-h-0 border-border bg-background lg:overflow-y-auto lg:border-r print:hidden">
          <div className="space-y-3 border-b border-border px-5 py-4">
            <ScanDialog cfg={cfg} onApply={setCfg} newId={newId} />
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
              <select
                aria-label="Έτοιμα Πρότυπα Έργων"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    applyTemplate(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="" disabled>
                  Φόρτωση Έτοιμου Προτύπου (1Φ, 3Φ, Εργοταξιακό...)
                </option>
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <PanelForm cfg={cfg} onChange={setCfg} newId={newId} />
        </aside>

        <section className="flex min-h-[70vh] min-w-0 flex-col lg:min-h-0">
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2.5 print:hidden">
            <div
              role="tablist"
              aria-label="Προβολή"
              className="mr-2 flex flex-wrap rounded-md border border-input bg-muted p-0.5"
            >
              {(
                [
                  ["diagram", "Μονογραμμικό"],
                  ["bom", "Υλικολόγιο & Προσφορά"],
                  ["yde", "Έντυπα ΥΔΕ & Πρωτόκολλο"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  type="button"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors",
                    tab === key
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "diagram" && (
              <>
                <Button
                  onClick={() =>
                    svgRef.current &&
                    downloadSvg(
                      svgRef.current,
                      `${fileSlug(cfg.project || cfg.panelName)}-monogrammiko.svg`,
                    )
                  }
                  variant="outline"
                >
                  <Download />
                  Λήψη SVG
                </Button>
                <Button onClick={() => window.print()}>
                  <Printer />
                  Εκτύπωση / Αποθήκευση PDF
                </Button>
                <div className="ml-auto flex items-center gap-1 rounded-md border border-input bg-background p-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Σμίκρυνση"
                    onClick={() => stepZoom(-1)}
                  >
                    <Minus />
                  </Button>
                  <button
                    type="button"
                    onClick={() => setZoom("fit")}
                    className={cn(
                      "h-7 min-w-16 rounded px-2 font-mono text-xs",
                      zoom === "fit" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    )}
                  >
                    {zoom === "fit" ? "Προσαρμ." : `${Math.round(zoom * 100)}%`}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Μεγέθυνση"
                    onClick={() => stepZoom(1)}
                  >
                    <Plus />
                  </Button>
                </div>
              </>
            )}

            {tab === "bom" && (
              <>
                <Button
                  className="bg-electric text-electric-foreground hover:bg-electric/85"
Χρησιμοποιήστε τον κώδικα με προσοχή.
onClick={() =>
downloadText(
buildBomCsv(cfg, bom, prices, totals),
ylikologio-${fileSlug(cfg.project || cfg.panelName)}.csv,
"text/csv;charset=utf-8",
)
}
>

Εξαγωγή σε Excel / CSV

<Button variant="outline" onClick={() => window.print()}>

Εκτύπωση προσφοράς

</>
)}
<div
className={cn(
"flex shrink-0 items-start gap-2 border-b border-border px-4 py-2 text-xs print:hidden",
checks.length ? "bg-warning-soft" : "bg-card",
)}
>
{checks.length ? (
<>
{checks.map((c) => (• {c.message}
))}
</>
) : (
<>


Δεν βρέθηκαν παρατηρήσεις στη διαστασιολόγηση.

</>
)}
{tab === "yde" ? (



) : (

{tab === "diagram" ? (
<div
id="print-area"
className={cn(
"mx-auto bg-card shadow-sheet print:shadow-none",
zoom === "fit" ? "w-full max-w-[1500px]" : "w-max",
)}
>
Εμφάνιση κωδικού
Λήψη διαγράμματος SVG
) : (

<BomTable
cfg={cfg}
lines={bom}
prices={prices}
totals={totals}
onPrice={(code, p) => setPrices((prev) => ({ ...prev, [code]: p }))}
onChange={setCfg}
newId={newId}
/>

)}

)}


);
}