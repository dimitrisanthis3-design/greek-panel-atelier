import {
  Calculator,
  Download,
  ImagePlus,
  LayoutGrid,
  MousePointer2,
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
import {
  circuitCode,
  PLAN_PX_PER_METER,
  PLAN_SYMBOL_KINDS,
  type PanelConfig,
  type PlanRoom,
  type PlanSymbol,
  type PlanSymbolKind,
} from "@/lib/panel";
import type { Room } from "@/lib/yde";
import { cn } from "@/lib/utils";

interface Props {
  cfg: PanelConfig;
  onChange: (next: PanelConfig) => void;
}

const SYMBOL_LABELS: Record<PlanSymbolKind, string> = {
  panel: "Γενικός Πίνακας (ΓΠ)",
  light: "Φωτιστικό Οροφής",
  switch: "Διακόπτης Απλός",
  socket: "Ρευματοδότης Σούκο",
  cooker: "Ηλ. Κουζίνα",
  heater: "Θερμοσίφωνας",
  ac: "Κλιματιστικό (A/C)",
  earth: "Γείωση",
};

const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50];
const CANVAS_W = 950;
const CANVAS_H = 620;

interface DragState {
  kind: "room" | "symbol";
  id: string;
  offsetX: number;
  offsetY: number;
}

export function FloorPlanTab({ cfg, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [subView, setSubView] = useState<"plan" | "calc">("plan");

  // Δωμάτια & σύμβολα ζουν μέσα στο PanelConfig (cfg.plan) ώστε να αποθηκεύονται
  // αυτόματα στο localStorage και να μη χάνονται όταν αλλάζει καρτέλα.
  const rooms = cfg.plan.rooms;
  const symbols = cfg.plan.symbols;
  const setRooms = (next: PlanRoom[]) => onChange({ ...cfg, plan: { ...cfg.plan, rooms: next } });
  const setSymbols = (next: PlanSymbol[]) =>
    onChange({ ...cfg, plan: { ...cfg.plan, symbols: next } });

  const [activeTool, setActiveTool] = useState<PlanSymbolKind | "select" | "measure">("select");
  const [selectedCircuitId, setSelectedCircuitId] = useState<string>(cfg.circuits[1]?.id ?? "");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState<number>(0.45);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

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

  /** Μετατρέπει συντεταγμένες οθόνης (clientX/Y) σε συντεταγμένες του viewBox (950x620). */
  const pointFromEvent = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  // Έναρξη συρσίματος (drag) δωματίου ή συμβόλου — μόνο με το εργαλείο Επιλογής.
  const startDrag = (e: React.PointerEvent, kind: "room" | "symbol", id: string) => {
    if (activeTool !== "select") return;
    const p = pointFromEvent(e.clientX, e.clientY);
    if (!p) return;
    const item = kind === "room" ? rooms.find((r) => r.id === id) : symbols.find((s) => s.id === id);
    if (!item) return;
    e.stopPropagation();
    dragRef.current = { kind, id, offsetX: p.x - item.x, offsetY: p.y - item.y };
    setDraggingId(id);
    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = pointFromEvent(e.clientX, e.clientY);
    if (!p) return;
    const x = Math.round(p.x - drag.offsetX);
    const y = Math.round(p.y - drag.offsetY);
    if (drag.kind === "room") {
      setRooms(rooms.map((rm) => (rm.id === drag.id ? { ...rm, x, y } : rm)));
    } else {
      setSymbols(symbols.map((s) => (s.id === drag.id ? { ...s, x, y } : s)));
    }
  };

  const endDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDraggingId(null);
    try {
      if (svgRef.current?.hasPointerCapture(e.pointerId)) {
        svgRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
  };

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

  const updateRoom = (id: string, patch: Partial<PlanRoom>) => {
    setRooms(rooms.map((rm) => (rm.id === id ? { ...rm, ...patch } : rm)));
  };

  const removeRoom = (id: string) => {
    setRooms(rooms.filter((rm) => rm.id !== id));
  };

  // Αυτόματη τοποθέτηση φωτιστικών, διακοπτών και πριζών σε όλα τα δωμάτια
  const autoPopulateElectrical = () => {
    const generated: PlanSymbol[] = [
      {
        id: "sp-panel",
        kind: "panel",
        x: (rooms[0]?.x ?? 60) + 25,
        y: (rooms[0]?.y ?? 60) + 40,
        circuitId: "",
      },
    ];
    const lightCircuit = cfg.circuits[0]?.id ?? "";
    const socketCircuit = cfg.circuits[1]?.id ?? lightCircuit;

    rooms.forEach((rm, idx) => {
      const wPx = rm.wMeters * PLAN_PX_PER_METER;
      const hPx = rm.hMeters * PLAN_PX_PER_METER;
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
      const wPx = rm.wMeters * PLAN_PX_PER_METER;
      const hPx = rm.hMeters * PLAN_PX_PER_METER;
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
    const p = pointFromEvent(e.clientX, e.clientY);
    if (!p) return;
    const x = Math.round(p.x);
    const y = Math.round(p.y);

    if (activeTool === "measure") {
      if (!measureStart) {
        setMeasureStart({ x, y });
      } else {
        // Υπολογισμός ορθογώνιας όδευσης καλωδίου (Manhattan distance) σε μέτρα
        const distPx = Math.abs(x - measureStart.x) + Math.abs(y - measureStart.y);
        const meters = Math.max(1, Number((distPx / PLAN_PX_PER_METER).toFixed(1)));
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

  const actionButtonClass =
    "flex h-auto w-full justify-start gap-2 px-3 py-2 text-left text-xs font-medium";

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

      {subView === "plan" ? (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Πλαϊνό πάνελ: δωμάτια, υπόβαθρο, σύμβολα και ενέργειες */}
          <aside className="w-full shrink-0 space-y-3 overflow-y-auto border-b border-border bg-card p-3 lg:w-72 lg:border-b-0 lg:border-r print:hidden">
            {/* Δωμάτια */}
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Δωμάτια</span>
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={addRoom}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-2">
                {rooms.map((rm) => (
                  <div key={rm.id} className="space-y-1 rounded border border-border p-2">
                    <div className="flex items-center gap-1">
                      <Input
                        aria-label="Όνομα δωματίου"
                        value={rm.name}
                        onChange={(e) => updateRoom(rm.id, { name: e.target.value })}
                        className="h-8 bg-card text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="Διαγραφή δωματίου"
                        onClick={() => removeRoom(rm.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Πλάτος (μ)
                        <Input
                          type="number"
                          min={1}
                          step={0.5}
                          value={rm.wMeters}
                          onChange={(e) =>
                            updateRoom(rm.id, { wMeters: Number(e.target.value) || 1 })
                          }
                          className="mt-1 h-7 bg-card font-mono text-xs"
                        />
                      </Label>
                      <Label className="text-[11px] text-muted-foreground">
                        Ύψος (μ)
                        <Input
                          type="number"
                          min={1}
                          step={0.5}
                          value={rm.hMeters}
                          onChange={(e) =>
                            updateRoom(rm.id, { hMeters: Number(e.target.value) || 1 })
                          }
                          className="mt-1 h-7 bg-card font-mono text-xs"
                        />
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Υπόβαθρο κάτοψης */}
            <div className="space-y-2 rounded-md border border-border p-3">
              <span className="text-sm font-semibold">Υπόβαθρο Κάτοψης</span>
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded border border-dashed border-input px-2 py-2 text-[11px] hover:bg-accent">
                <ImagePlus className="h-3.5 w-3.5" />
                Εισαγωγή εικόνας (σκαρίφημα / φωτογραφία)
                <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
              </label>
              {bgImage && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Διαφάνεια: {Math.round(bgOpacity * 100)}%
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={bgOpacity}
                      onChange={(e) => setBgOpacity(Number(e.target.value))}
                      className="mt-1 w-full"
                    />
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setBgImage(null)}
                  >
                    Αφαίρεση υποβάθρου
                  </Button>
                </div>
              )}
            </div>

            {/* Παλέτα Συμβόλων & Μέτρηση Πτώσης Τάσης */}
            <div className="space-y-2 rounded-md border border-border p-3">
              <span className="text-sm font-semibold">Τοποθέτηση Συμβόλων (Κλικ στον χάρτη)</span>
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

              <button
                type="button"
                onClick={() => setActiveTool("select")}
                className={cn(
                  "flex w-full items-center gap-1.5 rounded border px-2 py-1.5 text-left text-[11px] font-medium transition-colors",
                  activeTool === "select"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:bg-accent",
                )}
              >
                <MousePointer2 className="h-3.5 w-3.5" />
                Επιλογή / Μετακίνηση
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                {PLAN_SYMBOL_KINDS.map((kind) => (
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
                    + {SYMBOL_LABELS[kind]}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Με το εργαλείο <strong>Επιλογή</strong> σύρετε δωμάτια και σύμβολα (ποντίκι ή
                δάχτυλο) πάνω στην κάτοψη.
              </p>

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

            {/* Ενέργειες */}
            <div className="space-y-2 rounded-md border border-border p-3">
              <span className="text-sm font-semibold">Ενέργειες</span>
              <Button
                size="sm"
                variant="outline"
                className={actionButtonClass}
                onClick={autoPopulateElectrical}
              >
                <Wand2 className="h-3.5 w-3.5" />
                Αυτόματη τοποθέτηση συμβόλων
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={actionButtonClass}
                onClick={syncRoomsToYde}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Συγχρονισμός με Έντυπα ΥΔΕ
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={actionButtonClass}
                onClick={() =>
                  svgRef.current &&
                  downloadSvg(
                    svgRef.current,
                    `${fileSlug(cfg.project || cfg.panelName)}-katopsi.svg`,
                  )
                }
              >
                <Download className="h-3.5 w-3.5" />
                Λήψη κάτοψης SVG
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={actionButtonClass}
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" />
                Εκτύπωση κάτοψης
              </Button>
            </div>
          </aside>

          {/* Καμβάς SVG Κάτοψης */}
          <div className="bg-drafting flex-1 overflow-auto p-4 print:p-0">
            <div className="mx-auto max-w-[1000px] bg-white p-3 shadow-sheet print:shadow-none">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                onClick={handleCanvasClick}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                style={{ touchAction: "none" }}
                className={cn(
                  "w-full border border-slate-400 bg-white",
                  activeTool === "select" ? "cursor-move" : "cursor-crosshair",
                )}
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
                  const w = rm.wMeters * PLAN_PX_PER_METER;
                  const h = rm.hMeters * PLAN_PX_PER_METER;
                  const active = draggingId === rm.id;
                  return (
                    <g
                      key={rm.id}
                      onPointerDown={(e) => startDrag(e, "room", rm.id)}
                      className={activeTool === "select" ? "cursor-move" : undefined}
                    >
                      <rect
                        x={rm.x}
                        y={rm.y}
                        width={w}
                        height={h}
                        fill={bgImage ? "transparent" : "#f8fafc"}
                        stroke={active ? "#2563eb" : "#0f172a"}
                        strokeWidth={active ? 5 : 4}
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
                      onPointerDown={(e) => startDrag(e, "symbol", sym.id)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setSymbols(symbols.filter((s) => s.id !== sym.id));
                      }}
                      className={activeTool === "select" ? "cursor-move" : undefined}
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

                <rect
                  x="20"
                  y="535"
                  width="910"
                  height="65"
                  fill="#f8fafc"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
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
      ) : (
        /* Υπολογισμοί: Πτώση τάσης & Παροχή ΔΕΔΔΗΕ */
        <div className="flex-1 overflow-y-auto bg-drafting p-5 print:p-0">
          <div className="mx-auto max-w-4xl space-y-6">
            <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight">
                <Scale className="h-4 w-4 text-electric-ink" />
                Υπολογισμός Πτώσης Τάσης
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Label className="text-xs font-medium text-muted-foreground">
                  Μήκος γραμμής (m)
                  <Input
                    type="number"
                    min={1}
                    value={vdLength}
                    onChange={(e) => setVdLength(Number(e.target.value) || 0)}
                    className="mt-1.5 bg-card font-mono text-[13px]"
                  />
                </Label>
                <Label className="text-xs font-medium text-muted-foreground">
                  Διατομή αγωγού (mm²)
                  <select
                    value={vdSection}
                    onChange={(e) => setVdSection(Number(e.target.value))}
                    className="mt-1.5 h-9 w-full rounded-md border border-input bg-card px-2 font-mono text-[13px]"
                  >
                    {SECTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Label>
                <Label className="text-xs font-medium text-muted-foreground">
                  Ισχύς φορτίου (kW)
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={vdKw}
                    onChange={(e) => setVdKw(Number(e.target.value) || 0)}
                    className="mt-1.5 bg-card font-mono text-[13px]"
                  />
                </Label>
                <Label className="text-xs font-medium text-muted-foreground">
                  Συντελεστής ισχύος (cosφ)
                  <Input
                    type="number"
                    min={0.5}
                    max={1}
                    step={0.01}
                    value={vdCosPhi}
                    onChange={(e) => setVdCosPhi(Number(e.target.value) || 0.9)}
                    className="mt-1.5 bg-card font-mono text-[13px]"
                  />
                </Label>
                <Label className="flex items-center gap-2 self-end text-[13px] sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={vdLighting}
                    onChange={(e) => setVdLighting(e.target.checked)}
                  />
                  Γραμμή φωτισμού (όριο πτώσης τάσης 3%)
                </Label>
              </div>
              <div
                className={cn(
                  "mt-4 rounded-md border px-3 py-2 text-sm",
                  vdResult.ok
                    ? "border-electric/40 bg-electric-soft/50"
                    : "border-destructive/40 bg-destructive/5",
                )}
              >
                Ρεύμα γραμμής: <strong>{vdResult.currentAmps} A</strong> · Πτώση τάσης:{" "}
                <strong>
                  {vdResult.deltaVolts} V ({vdResult.deltaPercent}%)
                </strong>{" "}
                · Όριο: {vdResult.maxAllowedPercent}%.
                {!vdResult.ok && (
                  <>
                    {" "}
                    Προτεινόμενη διατομή: <strong>{vdResult.recommendedSection} mm²</strong>.
                  </>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight">
                <Zap className="h-4 w-4 text-electric-ink" />
                Εκτίμηση Παροχής ΔΕΔΔΗΕ
              </h3>
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Εγκατεστημένη ισχύς</dt>
                  <dd className="font-mono">{deddieRec.installedKw} kW</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Ισχύς αιχμής (με ετεροχρονισμό)</dt>
                  <dd className="font-mono">{deddieRec.demandKw} kW</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Προτεινόμενη παροχή</dt>
                  <dd className="font-mono">{deddieRec.deddieNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Γενική ασφάλεια</dt>
                  <dd className="font-mono">{deddieRec.mainFuseAmps} A</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Καλώδιο παροχής</dt>
                  <dd className="font-mono">{deddieRec.supplyCable}</dd>
                </div>
              </dl>
              {cfg.supply === "tri" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={() =>
                    onChange({ ...cfg, circuits: balanceThreePhaseCircuits(cfg.circuits) })
                  }
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Εξισορρόπηση φάσεων L1/L2/L3
                </Button>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
