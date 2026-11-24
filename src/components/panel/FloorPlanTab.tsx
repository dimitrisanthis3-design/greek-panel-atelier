import {
  Calculator,
  Download,
  ImagePlus,
  LayoutGrid,
  Plus,
  Printer,
  RefreshCw,
  Ruler,
  Scale,
  Trash2,
  Wand2,
  Zap,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadSvg } from "@/lib/export-svg";
import { fileSlug } from "@/lib/csv";
import {
  balanceThreePhaseCircuits,
  calculateVoltageDrop,
  estimatePanelPower,
} from "@/lib/electrical-calc";
import { circuitCode, type PanelConfig } from "@/lib/panel";
import type { Room } from "@/lib/yde";
import { cn } from "@/lib/utils";

interface Props {
  cfg: PanelConfig;
  onChange: (next: PanelConfig) => void;
}

type SymbolKind =
  | "panel"
  | "light"
  | "switch"
  | "socket"
  | "cooker"
  | "heater"
  | "ac"
  | "earth";

interface PlanRoom {
  id: string;
  name: string;
  x: number;
  y: number;
  wMeters: number;
  hMeters: number;
}

interface PlanSymbol {
  id: string;
  kind: SymbolKind;
  x: number;
  y: number;
  circuitId: string;
}

const SYMBOL_LABELS: Record<SymbolKind, string> = {
  panel: "Γενικός Πίνακας (ΓΠ)",
  light: "Φωτιστικό Οροφής",
  switch: "Διακόπτης Απλός",
  socket: "Ρευματοδότης Σούκο",
  cooker: "Ηλ. Κουζίνα",
  heater: "Θερμοσίφωνας",
  ac: "Κλιματιστικό (A/C)",
  earth: "Γείωση",
};

const PX_PER_METER = 60;

export function FloorPlanTab({ cfg, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [subView, setSubView] = useState<"plan" | "calc">("plan");

  // Παραμετρικά δωμάτια
  const [rooms, setRooms] = useState<PlanRoom[]>([
    { id: "rm1", name: "Σαλόνι - Κουζίνα", x: 60, y: 60, wMeters: 5, hMeters: 4 },
    { id: "rm2", name: "Υπνοδωμάτιο", x: 360, y: 60, wMeters: 3.5, hMeters: 3 },
    { id: "rm3", name: "Λουτρό", x: 360, y: 240, wMeters: 2.5, hMeters: 2 },
  ]);

  // Ηλεκτρολογικά σύμβολα πάνω στην κάτοψη
  const [symbols, setSymbols] = useState<PlanSymbol[]>([
    { id: "s1", kind: "panel", x: 85, y: 120, circuitId: "" },
    { id: "s2", kind: "light", x: 210, y: 180, circuitId: cfg.circuits[0]?.id ?? "" },
    { id: "s3", kind: "switch", x: 85, y: 260, circuitId: cfg.circuits[0]?.id ?? "" },
    { id: "s4", kind: "socket", x: 180, y: 80, circuitId: cfg.circuits[1]?.id ?? "" },
    { id: "s5", kind: "cooker", x: 320, y: 100, circuitId: cfg.circuits[2]?.id ?? "" },
    { id: "s6", kind: "light", x: 465, y: 150, circuitId: cfg.circuits[0]?.id ?? "" },
    { id: "s7", kind: "socket", x: 540, y: 120, circuitId: cfg.circuits[1]?.id ?? "" },
    { id: "s8", kind: "heater", x: 435, y: 290, circuitId: cfg.circuits[3]?.id ?? "" },
  ]);

  const [activeTool, setActiveTool] = useState<SymbolKind | "select" | "measure">("select");
  const [selectedCircuitId, setSelectedCircuitId] = useState<string>(cfg.circuits[1]?.id ?? "");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState<number>(0.45);

  // Μέτρηση απόστασης πάνω στην κάτοψη (σε μέτρα)
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [measuredMeters, setMeasuredMeters] = useState<number>(15);

  // Υπολογιστής πτώσης τάσης
  const [vdLength, setVdLength] = useState<number>(18);
  const [vdSection, setVdSection] = useState<number>(2.5);
  const [vdKw, setVdKw] = useState<number>(3.5);
  const [vdCosPhi, setVdCosPhi] = useState<number>(0.92);
  const [vdLighting, setVdLighting] = useState<boolean>(false);

  const vdResult = useMemo(
    () =>
      calculateVoltageDrop({
        supply: cfg.supply,
        lengthMeters: vdLength,
        sectionMm2: vdSection,
        powerKw: vdKw,
        cosPhi: vdCosPhi,
        isLighting: vdLighting,
      }),
    [cfg.supply, vdLength, vdSection, vdKw, vdCosPhi, vdLighting],
  );

  const deddieRec = useMemo(() => estimatePanelPower(cfg), [cfg]);

  // Προσθήκη νέου δωματίου με διαστάσεις
  const addRoom = () => {
    const newRm: PlanRoom = {
      id: `rm${Date.now()}`,
      name: `Δωμάτιο ${rooms.length + 1}`,
      x: 60 + (rooms.length % 2) * 240,
      y: 380,
      wMeters: 3,
      hMeters: 3,
    };
    setRooms([...rooms, newRm]);
  };

  // Αυτόματη τοποθέτηση φωτιστικών, διακοπτών και πριζών σε όλα τα δωμάτια
  const autoPopulateElectrical = () => {
    const generated: PlanSymbol[] = [
      { id: "sp-panel", kind: "panel", x: (rooms[0]?.x ?? 60) + 25, y: (rooms[0]?.y ?? 60) + 40, circuitId: "" },
    ];
    const lightCircuit = cfg.circuits[0]?.id ?? "";
    const socketCircuit = cfg.circuits[1]?.id ?? lightCircuit;

    rooms.forEach((rm, idx) => {
      const wPx = rm.wMeters * PX_PER_METER;
      const hPx = rm.hMeters * PX_PER_METER;
      // Φωτιστικό στο κέντρο
      generated.push({
        id: `auto-l-${idx}`,
        kind: "light",
        x: rm.x + wPx / 2,
        y: rm.y + hPx / 2,
        circuitId: lightCircuit,
      });
      // Διακόπτης κοντά στην είσοδο
      generated.push({
        id: `auto-sw-${idx}`,
        kind: "switch",
        x: rm.x + 22,
        y: rm.y + hPx - 25,
        circuitId: lightCircuit,
      });
      // Πρίζες ανάλογα με τα τετραγωνικά (εκτός αν είναι Λουτρό)
      if (!rm.name.toLowerCase().includes("λουτρ") && !rm.name.toLowerCase().includes("wc")) {
        generated.push({
          id: `auto-sk1-${idx}`,
          kind: "socket",
          x: rm.x + wPx - 22,
          y: rm.y + 30,
          circuitId: socketCircuit,
        });
        if (rm.wMeters * rm.hMeters >= 9) {
          generated.push({
            id: `auto-sk2-${idx}`,
            kind: "socket",
            x: rm.x + wPx / 2,
            y: rm.y + hPx - 20,
            circuitId: socketCircuit,
          });
        }
      } else {
        generated.push({
          id: `auto-ht-${idx}`,
          kind: "heater",
          x: rm.x + wPx / 2,
          y: rm.y + 30,
          circuitId: cfg.circuits[3]?.id ?? socketCircuit,
        });
      }
    });
    setSymbols(generated);
  };

  // Συγχρονισμός καταγραφής στοιχείων στην καρτέλα ΥΔΕ
  const syncRoomsToYde = () => {
    const mappedRooms: Room[] = rooms.map((rm) => {
      const wPx = rm.wMeters * PX_PER_METER;
      const hPx = rm.hMeters * PX_PER_METER;
      const inside = symbols.filter(
        (s) => s.x >= rm.x && s.x <= rm.x + wPx && s.y >= rm.y && s.y <= rm.y + hPx,
      );
      return {
        id: rm.id,
        name: `${rm.name} (${rm.wMeters}x${rm.hMeters}μ = ${(rm.wMeters * rm.hMeters).toFixed(1)}τ.μ.)`,
        sockets: inside.filter((s) => s.kind === "socket").length,
        switches: inside.filter((s) => s.kind === "switch").length,
        lights: inside.filter((s) => s.kind === "light").length,
        fixedDesc: inside
          .filter((s) => ["cooker", "heater", "ac"].includes(s.kind))
          .map((s) => SYMBOL_LABELS[s.kind])
          .join(", "),
        fixedKw: inside.some((s) => s.kind === "cooker") ? 4.5 : 0,
      };
    });
    onChange({
      ...cfg,
      yde: { ...cfg.yde, rooms: mappedRooms },
    });
    alert("Η Καταγραφή Στοιχείων Εγκατάστασης (ΥΔΕ) ενημερώθηκε αυτόματα από την κάτοψη!");
  };

  // Κλικ πάνω στον καμβά SVG
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = 950 / rect.width;
    const scaleY = 620 / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    if (activeTool === "measure") {
      if (!measureStart) {
        setMeasureStart({ x, y });
      } else {
        // Υπολογισμός ορθογώνιας όδευσης καλωδίου (Manhattan distance) σε μέτρα
        const distPx = Math.abs(x - measureStart.x) + Math.abs(y - measureStart.y);
        const meters = Math.max(1, Number((distPx / PX_PER_METER).toFixed(1)));
        setMeasuredMeters(meters);
        setVdLength(meters);
        setMeasureStart(null);
        setActiveTool("select");
      }
      return;
    }

    if (activeTool !== "select") {
      setSymbols([
        ...symbols,
        {
          id: `sym-${Date.now()}`,
          kind: activeTool,
          x,
          y,
          circuitId: activeTool === "panel" || activeTool === "earth" ? "" : selectedCircuitId,
        },
      ]);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBgImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const circuitLabelFor = (circuitId: string) => {
    const idx = cfg.circuits.findIndex((c) => c.id === circuitId);
    return idx >= 0 ? circuitCode(idx) : "";
  };

  return (
    <div className="flex h-full flex-col">
      {/* Επάνω μπάρα εργαλείων */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2.5 print:hidden">
        <div className="flex rounded-md border border-input bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setSubView("plan")}
            className={cn(
              "flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium",
              subView === "plan" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Σχεδιαστής Κάτοψης 2D
          </button>
          <button
            type="button"
            onClick={() => setSubView("calc")}
            className={cn(
              "flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium",
              subView === "calc" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <Calculator className="h-3.5 w-3.5" />
            Πτώση Τάσης & Παροχή ΔΕΔΔΗΕ
          </button>
        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Παλέτα Συμβόλων & Μέτρηση Πτώσης Τάσης */}
            <div className="space-y-2 rounded-md border border-border p-3">
              <span className="font-semibold">Τοποθέτηση Συμβόλων (Κλικ στον χάρτη)</span>
              <div>
                <Label className="text-[11px] text-muted-foreground">Γραμμή Πίνακα:</Label>
                <select
                  value={selectedCircuitId}
                  onChange={(e) => setSelectedCircuitId(e.target.value)}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  {cfg.circuits.map((c, i) => (
                    <option key={c.id} value={c.id}>
                      {circuitCode(i)} - {c.description} ({c.amps}A)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {(Object.keys(SYMBOL_LABELS) as SymbolKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setActiveTool(kind)}
                    className={cn(
                      "rounded border px-2 py-1.5 text-left text-[11px] transition-colors",
                      activeTool === kind
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input hover:bg-accent",
                    )}
                  >
                    + {SYMBOL_LABELS[kind].split(" ")}
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                variant={activeTool === "measure" ? "default" : "outline"}
                className="mt-2 w-full"
                onClick={() => {
                  setMeasureStart(null);
                  setActiveTool("measure");
                }}
              >
                <Ruler className="h-3.5 w-3.5" />
                Μέτρηση Πτώσης Τάσης (2 κλικ)
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Τελευταία μέτρηση: <strong>{measuredMeters} m</strong> (ΔV:{" "}
                <strong>{vdResult.deltaPercent}%</strong>)
              </p>
            </div>
          </aside>

          {/* Καμβάς SVG Κάτοψης */}
          <div className="bg-drafting flex-1 overflow-auto p-4 print:p-0">
            <div className="mx-auto max-w-[1000px] bg-white p-3 shadow-sheet print:shadow-none">
              <svg
                ref={svgRef}
                viewBox="0 0 950 620"
                onClick={handleCanvasClick}
                className="w-full cursor-crosshair border border-slate-400 bg-white"
              >
                {bgImage && (
                  <image
                    href={bgImage}
                    x="20"
                    y="20"
                    width="910"
                    height="500"
                    opacity={bgOpacity}
                    preserveAspectRatio="xMidYMid meet"
                  />
                )}

                {rooms.map((rm) => {
                  const w = rm.wMeters * PX_PER_METER;
                  const h = rm.hMeters * PX_PER_METER;
                  return (
                    <g key={rm.id}>
                      <rect
                        x={rm.x}
                        y={rm.y}
                        width={w}
                        height={h}
                        fill={bgImage ? "transparent" : "#f8fafc"}
                        stroke="#0f172a"
                        strokeWidth="4"
                      />
                      <path
                        d={`M ${rm.x + 12} ${rm.y + h} A 30 30 0 0 1 ${rm.x + 42} ${rm.y + h - 30} L ${rm.x + 42} ${rm.y + h}`}
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                      <text
                        x={rm.x + w / 2}
                        y={rm.y + 22}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="bold"
                        fill="#1e293b"
                      >
                        {rm.name}
                      </text>
                      <text
                        x={rm.x + w / 2}
                        y={rm.y + 36}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#64748b"
                      >
                        {rm.wMeters}μ x {rm.hMeters}μ ({(rm.wMeters * rm.hMeters).toFixed(1)} τ.μ.)
                      </text>
                    </g>
                  );
                })}

                {symbols.map((sym) => {
                  const code = circuitLabelFor(sym.circuitId);
                  return (
                    <g
                      key={sym.id}
                      transform={`translate(${sym.x}, ${sym.y})`}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setSymbols(symbols.filter((s) => s.id !== sym.id));
                      }}
                    >
                      {sym.kind === "panel" && (
                        <>
                          <rect x="-18" y="-8" width="36" height="16" fill="#0f172a" />
                          <text y="-12" textAnchor="middle" fontSize="10" fontWeight="bold">
                            Γ.Π.
                          </text>
                        </>
                      )}
                      {sym.kind === "light" && (
                        <>
                          <circle r="9" fill="white" stroke="#0f172a" strokeWidth="2" />
                          <line x1="-6" y1="-6" x2="6" y2="6" stroke="#0f172a" strokeWidth="2" />
                          <line x1="6" y1="-6" x2="-6" y2="6" stroke="#0f172a" strokeWidth="2" />
                        </>
                      )}
                      {sym.kind === "switch" && (
                        <>
                          <circle r="5" fill="white" stroke="#0f172a" strokeWidth="2" />
                          <line x1="3" y1="-3" x2="11" y2="-11" stroke="#0f172a" strokeWidth="2" />
                        </>
                      )}
                      {sym.kind === "socket" && (
                        <>
                          <path
                            d="M -8 0 A 8 8 0 0 1 8 0"
                            fill="none"
                            stroke="#0f172a"
                            strokeWidth="2"
                          />
                          <line x1="0" y1="-8" x2="0" y2="-14" stroke="#0f172a" strokeWidth="2" />
                        </>
                      )}
                      {(sym.kind === "cooker" || sym.kind === "heater" || sym.kind === "ac") && (
                        <>
                          <rect
                            x="-12"
                            y="-10"
                            width="24"
                            height="20"
                            fill="white"
                            stroke="#0f172a"
                            strokeWidth="2"
                          />
                          <text y="3" textAnchor="middle" fontSize="9" fontWeight="bold">
                            {sym.kind === "cooker" ? "ΚΟΥΖ" : sym.kind === "heater" ? "Θ/Σ" : "A/C"}
                          </text>
                        </>
                      )}
                      {sym.kind === "earth" && (
                        <>
                          <line x1="0" y1="-10" x2="0" y2="2" stroke="#0f172a" strokeWidth="2" />
                          <line x1="-10" y1="2" x2="10" y2="2" stroke="#0f172a" strokeWidth="2" />
                          <line x1="-6" y1="6" x2="6" y2="6" stroke="#0f172a" strokeWidth="2" />
                          <line x1="-2" y1="10" x2="2" y2="10" stroke="#0f172a" strokeWidth="2" />
                        </>
                      )}
                      {code && (
                        <text x="12" y="4" fontSize="10" fontWeight="bold" fill="#0369a1">
                          {code}
                        </text>
                      )}
                    </g>
                  );
                })}

                <rect x="20" y="535" width="910" height="65" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
                <text x="35" y="558" fontSize="13" fontWeight="bold" fill="#0f172a">
                  ΚΑΤΟΨΗ ΗΛΕΚΤΡΟΛΟΓΙΚΗΣ ΕΓΚΑΤΑΣΤΑΣΗΣ (ΥΔΕ)
                </text>
                <text x="35" y="578" fontSize="11" fill="#334155">
                  Έργο: {cfg.project || "—"} | Πίνακας: {cfg.panelName || "—"} | Μελετητής:{" "}
                  {cfg.designer || "—"} | Ημ/νία: {cfg.date || "—"}
                </text>
                <text x="915" y="578" textAnchor="end" fontSize="10" fill="#64748b">
                  (Διπλό κλικ σε σύμβολο για διαγραφή)
                </text>
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

