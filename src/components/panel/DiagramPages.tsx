import { forwardRef, useEffect, useState } from "react";
import {
  ArrowDown,
  Dot,
  Earth,
  FONT,
  Fuse,
  GREY,
  INK,
  Lamp,
  Rcd,
  SwitchSym,
  Terminal,
  Ticks,
  Txt,
} from "./symbols";
import {
  cableCores,
  circuitCode,
  conductorsLabel,
  rcdLabel,
  supplyLabel,
  type Circuit,
  type PanelConfig,
} from "@/lib/panel";
import { estimateCircuitPowerKw } from "@/lib/electrical-calc";
import { CIRCUITS_PER_DIAGRAM_PAGE, paginateCircuitPages } from "@/lib/diagram-layout";
import { fuseFor, mainSwitchCode, mcbCode, rcdCode } from "@/lib/hager";
import { emptyInstaller, type Installer } from "@/lib/yde";
import { loadInstaller } from "@/lib/storage";

const PAGE_WIDTH = 1200;
const PAGE_HEIGHT = 820;
const FRAME = { x: 42, y: 48, width: 1116, height: 732 };
const TABLE = { x: 65, y: 389, headerHeight: 28, rowHeight: 28, width: 1070 };
const TABLE_COLUMNS = [
  { label: "Κωδικός", width: 72 },
  { label: "Προστασία", width: 125 },
  { label: "Αγωγοί", width: 155 },
  { label: "Τύπος / διατομή", width: 205 },
  { label: "Μήκος", width: 100 },
  { label: "Αρ.", width: 70 },
  { label: "Φορτίο / Pεκτ.", width: 343 },
] as const;

interface SheetProps {
  cfg: PanelConfig;
  pageNumber: number;
  totalPages: number;
  continuation: boolean;
  circuits: readonly Circuit[];
  circuitOffset: number;
  scale: number | "fit";
}

function conductorsFor(circuit: Circuit, cfg: PanelConfig): string {
  if (circuit.poles === "3P" || circuit.phase === "L123") return "L1, L2, L3, N, PE";
  const phase = cfg.supply === "tri" ? circuit.phase : "L";
  return `${phase}, N, PE`;
}

function circuitPower(circuit: Circuit): string {
  return `${estimateCircuitPowerKw(circuit).toFixed(1)} kW`;
}

function CadFrame({
  cfg,
  pageNumber,
  totalPages,
  continuation,
  sheetTitle = "ΜΟΝΟΓΡΑΜΜΙΚΟ ΔΙΑΓΡΑΜΜΑ",
}: {
  cfg: PanelConfig;
  pageNumber: number;
  totalPages: number;
  continuation?: boolean;
  sheetTitle?: string;
}) {
  return (
    <>
      <rect width={PAGE_WIDTH} height={PAGE_HEIGHT} fill="#ffffff" />
      <rect
        x={16}
        y={16}
        width={PAGE_WIDTH - 32}
        height={PAGE_HEIGHT - 32}
        fill="none"
        stroke={INK}
        strokeWidth={1}
      />
      <rect
        x={FRAME.x}
        y={FRAME.y}
        width={FRAME.width}
        height={FRAME.height}
        fill="none"
        stroke={INK}
        strokeWidth={1.2}
      />
      {Array.from({ length: 5 }, (_, i) => {
        const x = FRAME.x + (FRAME.width * i) / 4;
        return (
          <g key={`x-${i}`}>
            <line x1={x} y1={16} x2={x} y2={FRAME.y} stroke={INK} strokeWidth={0.8} />
            <line
              x1={x}
              y1={FRAME.y + FRAME.height}
              x2={x}
              y2={PAGE_HEIGHT - 16}
              stroke={INK}
              strokeWidth={0.8}
            />
            {i < 4 && (
              <>
                <Txt x={x + FRAME.width / 8} y={35} anchor="middle" size={9} weight="bold">
                  {String.fromCharCode(65 + i)}
                </Txt>
                <Txt
                  x={x + FRAME.width / 8}
                  y={PAGE_HEIGHT - 22}
                  anchor="middle"
                  size={9}
                  weight="bold"
                >
                  {String.fromCharCode(65 + i)}
                </Txt>
              </>
            )}
          </g>
        );
      })}
      {Array.from({ length: 7 }, (_, i) => {
        const y = FRAME.y + (FRAME.height * i) / 6;
        return (
          <g key={`y-${i}`}>
            <line x1={16} y1={y} x2={FRAME.x} y2={y} stroke={INK} strokeWidth={0.8} />
            <line
              x1={FRAME.x + FRAME.width}
              y1={y}
              x2={PAGE_WIDTH - 16}
              y2={y}
              stroke={INK}
              strokeWidth={0.8}
            />
            {i < 6 && (
              <>
                <Txt x={29} y={y + FRAME.height / 12 + 3} anchor="middle" size={9} weight="bold">
                  {i + 1}
                </Txt>
                <Txt
                  x={PAGE_WIDTH - 29}
                  y={y + FRAME.height / 12 + 3}
                  anchor="middle"
                  size={9}
                  weight="bold"
                >
                  {i + 1}
                </Txt>
              </>
            )}
          </g>
        );
      })}
      <Txt x={65} y={76} size={16} weight="bold">
        {sheetTitle}
      </Txt>
      <Txt x={65} y={96} size={10} fill={GREY}>
        {cfg.project || "Έργο"} · {cfg.panelName || "Πίνακας"} · {supplyLabel(cfg.supply)}
      </Txt>
      <rect x={65} y={744} width={1070} height={42} fill="#ffffff" stroke={INK} strokeWidth={1} />
      <line x1={715} y1={744} x2={715} y2={786} stroke={INK} strokeWidth={0.8} />
      <line x1={915} y1={744} x2={915} y2={786} stroke={INK} strokeWidth={0.8} />
      <Txt x={74} y={758} size={7} weight="bold" fill={GREY}>
        ΕΡΓΟ / ΠΙΝΑΚΑΣ
      </Txt>
      <Txt x={74} y={776} size={9}>
        {cfg.project || "—"} / {cfg.panelName || "—"}
      </Txt>
      <Txt x={725} y={758} size={7} weight="bold" fill={GREY}>
        ΜΕΛΕΤΗΤΗΣ / ΗΜΕΡΟΜΗΝΙΑ
      </Txt>
      <Txt x={725} y={776} size={9}>
        {cfg.designer || "—"} / {cfg.date || "—"}
      </Txt>
      <Txt x={1025} y={760} anchor="middle" size={9} weight="bold">
        {continuation ? `Συνέχεια ${pageNumber}` : `Σελίδα ${pageNumber}`}
      </Txt>
      <Txt x={1025} y={777} anchor="middle" size={8} fill={GREY}>
        {pageNumber} / {totalPages}
      </Txt>
    </>
  );
}

const CircuitSheet = forwardRef<SVGSVGElement, SheetProps>(function CircuitSheet(
  { cfg, pageNumber, totalPages, continuation, circuits, circuitOffset, scale },
  ref,
) {
  const tri = cfg.supply === "tri";
  const centerX = PAGE_WIDTH / 2;
  const tableBottom = TABLE.y + TABLE.headerHeight + CIRCUITS_PER_DIAGRAM_PAGE * TABLE.rowHeight;
  const sheetWidth = scale === "fit" ? "100%" : `${Math.round(PAGE_WIDTH * scale)}px`;
  const branchXs = circuits.map(
    (_, i) => 120 + ((i + 0.5) * 960) / Math.max(circuits.length, 1),
  );

  return (
    <div className="diagram-page">
      <svg
        ref={ref}
        data-diagram-page="circuits"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
        width={PAGE_WIDTH}
        height={PAGE_HEIGHT}
        style={{ width: sheetWidth, height: "auto", display: "block" }}
        fontFamily={FONT}
        role="img"
        aria-label={`${continuation ? "Συνέχεια " : "Σελίδα "}${pageNumber} μονογραμμικού`}
      >
        <CadFrame
          cfg={cfg}
          pageNumber={pageNumber}
          totalPages={totalPages}
          continuation={continuation}
        />
        <Txt x={1135} y={76} anchor="end" size={9} weight="bold">
          {continuation ? `ΣΥΝΕΧΕΙΑ ${pageNumber}` : "ΜΟΝΟΓΡΑΜΜΙΚΟ"}
        </Txt>
        <Terminal x={centerX} y={114} />
        <line x1={centerX} y1={118} x2={centerX} y2={130} stroke={INK} strokeWidth={1.4} />
        <Ticks x={centerX} y={125} count={tri ? 5 : 3} />
        <SwitchSym x={centerX} y1={130} y2={164} kind="disconnector" />
        <line x1={centerX} y1={164} x2={centerX} y2={174} stroke={INK} strokeWidth={1.4} />
        {cfg.protectionType === "fuse" ? (
          <Fuse x={centerX} y1={174} y2={210} />
        ) : (
          <SwitchSym x={centerX} y1={174} y2={210} kind="breaker" />
        )}
        <line x1={centerX} y1={210} x2={centerX} y2={220} stroke={INK} strokeWidth={1.4} />
        {cfg.rcdEnabled ? (
          <Rcd x={centerX} y1={220} y2={278} />
        ) : (
          <line x1={centerX} y1={220} x2={centerX} y2={278} stroke={INK} strokeWidth={1.4} />
        )}
        <line x1={centerX} y1={278} x2={centerX} y2={299} stroke={INK} strokeWidth={1.4} />
        <line x1={80} y1={299} x2={1120} y2={299} stroke={INK} strokeWidth={3} />
        <Dot x={centerX} y={299} />
        <Txt x={centerX} y={113} anchor="middle" size={8} weight="bold">
          {tri ? "L1 · L2 · L3 · N · PE" : "L · N · PE"}
        </Txt>
        <Txt x={centerX - 24} y={148} anchor="end" size={8} weight="bold">
          ΓΕΝΙΚΟΣ
        </Txt>
        <Txt x={centerX - 24} y={160} anchor="end" size={8}>
          {tri ? "4P" : "2P"} {cfg.mainSwitch}A · {mainSwitchCode(cfg)}
        </Txt>
        <Txt x={centerX + 24} y={190} size={8} weight="bold">
          ΓΕΝΙΚΗ ΠΡΟΣΤΑΣΙΑ
        </Txt>
        <Txt x={centerX + 24} y={202} size={8}>
          {cfg.mainFuse}A ·{" "}
          {cfg.protectionType === "fuse"
            ? fuseFor(cfg.mainFuse).link
            : cfg.protectionType === "mcb"
              ? mcbCode({ curve: "C", poles: tri ? "3P" : "1P", amps: cfg.mainFuse })
              : `MCCB ${cfg.mainFuse}A`}
        </Txt>
        <Txt x={centerX + 24} y={241} size={8} weight="bold">
          {cfg.rcdEnabled ? `RCD ${rcdLabel(cfg)}` : "Χωρίς RCD"}
        </Txt>
        <Txt x={centerX + 24} y={253} size={8}>
          {cfg.rcdEnabled ? rcdCode(cfg) : " "}
        </Txt>
        <Txt x={1100} y={294} anchor="end" size={8} weight="bold">
          ΖΥΓΟΣ {tri ? "L1 · L2 · L3 · N" : "L · N"}
        </Txt>

        {circuits.length === 0 ? (
          <Txt x={centerX} y={345} anchor="middle" size={10} fill={GREY}>
            Δεν έχουν προστεθεί γραμμές αναχώρησης.
          </Txt>
        ) : (
          circuits.map((circuit, index) => {
            const x = branchXs[index] ?? centerX;
            const absoluteIndex = circuitOffset + index;
            return (
              <g key={circuit.id}>
                <Dot x={x} y={299} />
                <line x1={x} y1={299} x2={x} y2={311} stroke={INK} strokeWidth={1.2} />
                <SwitchSym x={x} y1={311} y2={348} kind="breaker" />
                <line x1={x} y1={348} x2={x} y2={358} stroke={INK} strokeWidth={1.2} />
                <ArrowDown x={x} y={362} />
                <Txt x={x} y={377} anchor="middle" size={8} weight="bold">
                  F{absoluteIndex + 1} · {circuit.curve}
                  {circuit.amps}A
                </Txt>
              </g>
            );
          })
        )}

        <Txt x={TABLE.x} y={TABLE.y - 8} size={9} weight="bold">
          ΠΙΝΑΚΑΣ ΑΝΑΧΩΡΗΣΕΩΝ · {circuits.length} ΓΡΑΜΜΕΣ ΣΕ ΑΥΤΟ ΤΟ ΦΥΛΛΟ
        </Txt>
        <rect
          x={TABLE.x}
          y={TABLE.y}
          width={TABLE.width}
          height={tableBottom - TABLE.y}
          fill="#ffffff"
          stroke={INK}
          strokeWidth={1}
        />
        <line
          x1={TABLE.x}
          y1={TABLE.y + TABLE.headerHeight}
          x2={TABLE.x + TABLE.width}
          y2={TABLE.y + TABLE.headerHeight}
          stroke={INK}
          strokeWidth={1}
        />
        {TABLE_COLUMNS.reduce<number[]>((positions, column, index) => {
          const previous = positions[index] ?? TABLE.x;
          positions.push(previous + column.width);
          return positions;
        }, [])
          .slice(0, -1)
          .map((x) => (
            <line
              key={x}
              x1={x}
              y1={TABLE.y}
              x2={x}
              y2={tableBottom}
              stroke={INK}
              strokeWidth={0.7}
            />
          ))}
        {Array.from({ length: CIRCUITS_PER_DIAGRAM_PAGE }, (_, row) => {
          const y = TABLE.y + TABLE.headerHeight + (row + 1) * TABLE.rowHeight;
          return (
            <line
              key={row}
              x1={TABLE.x}
              y1={y}
              x2={TABLE.x + TABLE.width}
              y2={y}
              stroke={INK}
              strokeWidth={0.55}
            />
          );
        })}
        {TABLE_COLUMNS.reduce<{ x: number; label: string }[]>((columns, column, index) => {
          const x =
            TABLE.x + TABLE_COLUMNS.slice(0, index).reduce((sum, previous) => sum + previous.width, 0);
          columns.push({ x, label: column.label });
          return columns;
        }, []).map((column, index) => {
          const width = TABLE_COLUMNS[index]?.width ?? 70;
          return (
            <Txt
              key={column.label}
              x={column.x + width / 2}
              y={TABLE.y + 18}
              anchor="middle"
              size={8}
              weight="bold"
            >
              {column.label}
            </Txt>
          );
        })}
        {circuits.map((circuit, row) => {
          const index = circuitOffset + row;
          const y = TABLE.y + TABLE.headerHeight + row * TABLE.rowHeight;
          const centers = TABLE_COLUMNS.reduce<number[]>((positions, column, i) => {
            const left = TABLE.x + TABLE_COLUMNS.slice(0, i).reduce((sum, item) => sum + item.width, 0);
            positions.push(left + column.width / 2);
            return positions;
          }, []);
          const protectionX = centers[1] ?? 0;
          const cableX = centers[3] ?? 0;
          const descriptionX = (centers[6] ?? 0) - 155;
          return (
            <g key={circuit.id}>
              <Txt x={centers[0] ?? 0} y={y + 18} anchor="middle" size={9} weight="bold">
                F{index + 1}
              </Txt>
              <Txt x={protectionX} y={y + 13} anchor="middle" size={8} weight="bold">
                {circuit.curve}
                {circuit.amps}A
              </Txt>
              <Txt x={protectionX} y={y + 23} anchor="middle" size={6.5} fill={GREY}>
                {circuit.poles} · {mcbCode(circuit)}
              </Txt>
              <Txt x={centers[2] ?? 0} y={y + 18} anchor="middle" size={7.5}>
                {conductorsFor(circuit, cfg)}
              </Txt>
              <Txt x={cableX} y={y + 18} anchor="middle" size={8}>
                NYM-J {circuit.cable} mm²
              </Txt>
              <Txt x={centers[4] ?? 0} y={y + 18} anchor="middle" size={8}>
                L = ____ m
              </Txt>
              <g>
                <circle
                  cx={centers[5] ?? 0}
                  cy={y + 14}
                  r={9}
                  fill="none"
                  stroke={INK}
                  strokeWidth={0.8}
                />
                <Txt x={centers[5] ?? 0} y={y + 17} anchor="middle" size={7} weight="bold">
                  {index + 1}
                </Txt>
              </g>
              <Txt x={descriptionX} y={y + 12} size={8} weight="bold">
                {circuitCode(index)} · {circuit.description || "—"}
              </Txt>
              <Txt x={descriptionX} y={y + 23} size={7} fill={GREY}>
                Pεκτ. ≈ {circuitPower(circuit)}
              </Txt>
            </g>
          );
        })}
        <Txt x={TABLE.x} y={TABLE.y + TABLE.headerHeight + 10 * TABLE.rowHeight + 13} size={7} fill={GREY}>
          Η ισχύς είναι ενδεικτική εκτίμηση βάσει περιγραφής/ονομαστικού ρεύματος. Συμπληρώστε το πραγματικό μήκος κάθε γραμμής.
        </Txt>
      </svg>
    </div>
  );
});

function phaseLoads(cfg: PanelConfig): { phase: string; kw: number; lines: number }[] {
  if (cfg.supply === "mono") {
    return [
      {
        phase: "L",
        kw: cfg.circuits.reduce((sum, circuit) => sum + estimateCircuitPowerKw(circuit), 0),
        lines: cfg.circuits.length,
      },
    ];
  }
  const loads = [
    { phase: "L1", kw: 0, lines: 0 },
    { phase: "L2", kw: 0, lines: 0 },
    { phase: "L3", kw: 0, lines: 0 },
  ];
  cfg.circuits.forEach((circuit, index) => {
    const power = estimateCircuitPowerKw(circuit);
    if (circuit.poles === "3P" || circuit.phase === "L123") {
      loads.forEach((load) => {
        load.kw += power / 3;
        load.lines += 1;
      });
      return;
    }
    const fallbackPhase = `L${(index % 3) + 1}`;
    const phase = circuit.phase === "L" ? fallbackPhase : circuit.phase;
    const target = loads.find((load) => load.phase === phase) ?? loads[0]!;
    target.kw += power;
    target.lines += 1;
  });
  return loads;
}

function SymbolLegend({ y, label, kind }: { y: number; label: string; kind: string }) {
  return (
    <g>
      <rect x={85} y={y - 22} width={495} height={42} fill="#ffffff" stroke={INK} strokeWidth={0.6} />
      <g transform={`translate(115 ${y - 18}) scale(0.42)`}>
        {kind === "fuse" && <Fuse x={0} y1={0} y2={54} />}
        {kind === "switch" && <SwitchSym x={0} y1={0} y2={54} kind="disconnector" />}
        {kind === "mcb" && <SwitchSym x={0} y1={0} y2={54} kind="breaker" />}
        {kind === "rcd" && <Rcd x={0} y1={-2} y2={56} />}
        {kind === "lamp" && <Lamp x={0} y={28} />}
        {kind === "earth" && <Earth x={0} y={36} />}
        {kind === "terminal" && <Terminal x={0} y={28} />}
      </g>
      <Txt x={150} y={y + 3} size={9} weight="bold">
        {label}
      </Txt>
    </g>
  );
}

function LegendSheet({
  cfg,
  pageNumber,
  totalPages,
  installer,
  scale,
}: {
  cfg: PanelConfig;
  pageNumber: number;
  totalPages: number;
  installer: Installer;
  scale: number | "fit";
}) {
  const loads = phaseLoads(cfg);
  const totalKw = cfg.circuits.reduce((sum, circuit) => sum + estimateCircuitPowerKw(circuit), 0);
  const sheetWidth = scale === "fit" ? "100%" : `${Math.round(PAGE_WIDTH * scale)}px`;

  return (
    <div className="diagram-page">
      <svg
        data-diagram-page="legend"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
        width={PAGE_WIDTH}
        height={PAGE_HEIGHT}
        style={{ width: sheetWidth, height: "auto", display: "block" }}
        fontFamily={FONT}
        role="img"
        aria-label="Υπόμνημα συμβόλων και συνοπτικός πίνακας φορτίων"
      >
        <CadFrame
          cfg={cfg}
          pageNumber={pageNumber}
          totalPages={totalPages}
          sheetTitle="ΥΠΟΜΝΗΜΑ ΣΥΜΒΟΛΩΝ & ΣΥΝΟΠΤΙΚΟΣ ΠΙΝΑΚΑΣ ΦΟΡΤΙΩΝ"
        />
        <Txt x={580} y={109} size={9} fill={GREY}>
          Σύμβολα κατά IEC 60617 · Εκτίμηση φορτίων από περιγραφή/ονομαστικό ρεύμα
        </Txt>
        <Txt x={85} y={132} size={10} weight="bold">
          ΥΠΟΜΝΗΜΑ ΣΥΜΒΟΛΩΝ IEC 60617
        </Txt>
        <SymbolLegend y={165} kind="terminal" label="Σημείο σύνδεσης / ακροδέκτης" />
        <SymbolLegend y={213} kind="switch" label="Γενικός διακόπτης φορτίου" />
        <SymbolLegend y={261} kind="fuse" label="Ασφάλεια τήξεως φυσιγγίου" />
        <SymbolLegend y={309} kind="mcb" label="Μικροαυτόματος (MCB / MCCB)" />
        <SymbolLegend y={357} kind="rcd" label="Ρελέ διαρροής (RCD)" />
        <SymbolLegend y={405} kind="lamp" label="Ενδεικτική λυχνία" />
        <SymbolLegend y={453} kind="earth" label="Αγωγός / ζυγός προστασίας PE" />

        <Txt x={630} y={132} size={10} weight="bold">
          ΚΑΤΑΝΟΜΗ ΕΚΤΙΜΩΜΕΝΟΥ ΦΟΡΤΙΟΥ
        </Txt>
        <rect x={630} y={145} width={475} height={34 + loads.length * 34} fill="#fff" stroke={INK} />
        <line x1={740} y1={145} x2={740} y2={179 + loads.length * 34} stroke={INK} />
        <line x1={950} y1={145} x2={950} y2={179 + loads.length * 34} stroke={INK} />
        <Txt x={685} y={165} anchor="middle" size={8} weight="bold">
          Φάση
        </Txt>
        <Txt x={845} y={165} anchor="middle" size={8} weight="bold">
          Pεκτ. (kW)
        </Txt>
        <Txt x={1025} y={165} anchor="middle" size={8} weight="bold">
          Γραμμές
        </Txt>
        {loads.map((load, index) => {
          const y = 179 + index * 34;
          return (
            <g key={load.phase}>
              <line x1={630} y1={y} x2={1105} y2={y} stroke={INK} strokeWidth={0.5} />
              <Txt x={685} y={y + 22} anchor="middle" size={9}>
                {load.phase}
              </Txt>
              <Txt x={845} y={y + 22} anchor="middle" size={9}>
                {load.kw.toFixed(2)}
              </Txt>
              <Txt x={1025} y={y + 22} anchor="middle" size={9}>
                {load.lines}
              </Txt>
            </g>
          );
        })}
        <Txt x={630} y={202 + loads.length * 34} size={9} weight="bold">
          Σύνολο εκτιμώμενης ισχύος: {totalKw.toFixed(2)} kW
        </Txt>
        {cfg.supply === "tri" && (
          <Txt x={630} y={219 + loads.length * 34} size={7} fill={GREY}>
            Οι τριπολικές γραμμές επιμερίζονται ισόποσα στις τρεις φάσεις.
          </Txt>
        )}

        <rect x={630} y={300 + loads.length * 34} width={475} height={82} fill="#fff" stroke={INK} />
        <Txt x={645} y={322 + loads.length * 34} size={9} weight="bold">
          ΣΤΟΙΧΕΙΑ ΚΑΤΑΣΚΕΥΗΣ ΠΙΝΑΚΑ
        </Txt>
        <Txt x={645} y={346 + loads.length * 34} size={9}>
          Κατασκευή: □ Επίτοιχος   □ Χωνευτός   ____________________
        </Txt>
        <Txt x={645} y={368 + loads.length * 34} size={9}>
          Βαθμός προστασίας IP: __________
        </Txt>

        <rect x={630} y={398 + loads.length * 34} width={475} height={155} fill="#fff" stroke={INK} />
        <Txt x={645} y={418 + loads.length * 34} size={9} weight="bold">
          ΨΗΦΙΑΚΗ ΣΦΡΑΓΙΔΑ / ΥΠΟΓΡΑΦΗ ΕΓΚΑΤΑΣΤΑΤΗ
        </Txt>
        {installer.stampImage ? (
          <image
            href={installer.stampImage}
            x={650}
            y={430 + loads.length * 34}
            width={250}
            height={100}
            preserveAspectRatio="xMidYMid meet"
            style={{ mixBlendMode: "multiply" }}
          />
        ) : (
          <Txt x={650} y={463 + loads.length * 34} size={8} fill={GREY}>
            Δεν έχει καταχωρηθεί σφραγίδα στα στοιχεία εγκαταστάτη.
          </Txt>
        )}
        <line
          x1={915}
          y1={510 + loads.length * 34}
          x2={1085}
          y2={510 + loads.length * 34}
          stroke={INK}
          strokeWidth={0.7}
        />
        <Txt x={1000} y={530 + loads.length * 34} anchor="middle" size={8}>
          {installer.name || cfg.designer || "Ονοματεπώνυμο"}
        </Txt>
        <Txt x={1000} y={543 + loads.length * 34} anchor="middle" size={7} fill={GREY}>
          {installer.licenseNo ? `Αρ. αδείας: ${installer.licenseNo}` : "Υπογραφή"}
        </Txt>
        <Txt x={630} y={575 + loads.length * 34} size={7} fill={GREY}>
          Τα πεδία κατασκευής και IP συμπληρώνονται σύμφωνα με τα πραγματικά χαρακτηριστικά του πίνακα.
        </Txt>
      </svg>
    </div>
  );
}

export const DiagramPages = forwardRef<
  SVGSVGElement,
  { cfg: PanelConfig; scale: number | "fit" }
>(function DiagramPages({ cfg, scale }, ref) {
  const [installer, setInstaller] = useState<Installer>(emptyInstaller);

  useEffect(() => {
    setInstaller(loadInstaller());
  }, []);

  const pages = paginateCircuitPages(cfg.circuits);
  const totalPages = pages.length + 1;
  const reportWidth = scale === "fit" ? "100%" : `${Math.round(PAGE_WIDTH * scale)}px`;
  let circuitOffset = 0;

  return (
    <div className="diagram-report space-y-6 print:space-y-0" style={{ width: reportWidth }}>
      {pages.map((circuits, index) => {
        const offset = circuitOffset;
        circuitOffset += circuits.length;
        return (
          <CircuitSheet
            key={`page-${index}`}
            ref={index === 0 ? ref : undefined}
            cfg={cfg}
            circuits={circuits}
            circuitOffset={offset}
            pageNumber={index + 1}
            totalPages={totalPages}
            continuation={index > 0}
            scale={scale}
          />
        );
      })}
      <LegendSheet
        cfg={cfg}
        pageNumber={totalPages}
        totalPages={totalPages}
        installer={installer}
        scale={scale}
      />
    </div>
  );
});
