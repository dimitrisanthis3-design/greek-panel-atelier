import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Download, Minus, Plus, Printer, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Diagram } from "@/components/panel/Diagram";
import { PanelForm } from "@/components/panel/PanelForm";
import { Button } from "@/components/ui/button";
import { downloadSvg } from "@/lib/export-svg";
import { defaultConfig, runChecks, type PanelConfig } from "@/lib/panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Σχεδιαστής Μονογραμμικού Πίνακα" },
      {
        name: "description",
        content:
          "Ρυθμίστε παροχή, γενική προστασία, ρελέ διαρροής και γραμμές και δείτε ζωντανά το μονογραμμικό διάγραμμα σε SVG.",
      },
      { property: "og:title", content: "Σχεδιαστής Μονογραμμικού Πίνακα" },
      {
        property: "og:description",
        content:
          "Ζωντανό μονογραμμικό διάγραμμα ηλεκτρικού πίνακα με σύμβολα IEC, λήψη SVG και PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function Index() {
  const [cfg, setCfg] = useState<PanelConfig>(defaultConfig);
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const svgRef = useRef<SVGSVGElement>(null);
  const idRef = useRef(100);
  const checks = useMemo(() => runChecks(cfg), [cfg]);

  useEffect(() => {
    setCfg((c) => (c.date ? c : { ...c, date: new Date().toLocaleDateString("el-GR") }));
  }, []);

  const stepZoom = (dir: 1 | -1) => {
    const current = zoom === "fit" ? 1 : zoom;
    const idx = ZOOMS.findIndex((z) => z >= current);
    const next =
      ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, (idx === -1 ? ZOOMS.length - 1 : idx) + dir))];
    setZoom(next ?? 1);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:h-screen print:h-auto print:block">
      <header className="flex h-14 shrink-0 items-center gap-3 bg-primary px-5 text-primary-foreground print:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-electric text-electric-foreground">
          <Zap className="h-4.5 w-4.5" fill="currentColor" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold leading-tight tracking-tight">
            Σχεδιαστής Μονογραμμικού Πίνακα
          </h1>
          <p className="truncate text-[11px] text-primary-foreground/60">
            Μονογραμμικά διαγράμματα ηλεκτρικών πινάκων · Σύμβολα IEC 60617
          </p>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 lg:grid-cols-[400px_minmax(0,1fr)] print:block">
        <aside className="min-h-0 border-border bg-background lg:overflow-y-auto lg:border-r print:hidden">
          <PanelForm
            cfg={cfg}
            onChange={setCfg}
            newId={() => {
              idRef.current += 1;
              return `c${idRef.current}`;
            }}
          />
        </aside>

        <section className="flex min-h-[70vh] min-w-0 flex-col lg:min-h-0">
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2.5 print:hidden">
            <Button
              onClick={() =>
                svgRef.current && downloadSvg(svgRef.current, "monogrammiko-diagramma.svg")
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
          </div>

          <div
            className={cn(
              "flex shrink-0 items-start gap-2 border-b border-border px-4 py-2 text-xs print:hidden",
              checks.length ? "bg-warning-soft" : "bg-card",
            )}
          >
            {checks.length ? (
              <>
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <ul className="min-w-0 space-y-0.5">
                  {checks.map((c) => (
                    <li
                      key={c.message}
                      className={
                        c.level === "error"
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {c.message}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-electric-ink" />
                <span className="text-muted-foreground">
                  Δεν βρέθηκαν παρατηρήσεις στη διαστασιολόγηση.
                </span>
              </>
            )}
          </div>

          <div className="bg-drafting min-h-0 flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
            <div
              id="print-area"
              className={cn(
                "mx-auto bg-card shadow-sheet print:shadow-none",
                zoom === "fit" ? "w-full max-w-[1500px]" : "w-max",
              )}
            >
              <Diagram ref={svgRef} cfg={cfg} scale={zoom} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
