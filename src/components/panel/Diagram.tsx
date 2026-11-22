import { forwardRef } from "react";
import { fuseFor, mainSwitchCode, mcbCode, rcdCode } from "@/lib/hager";
import {
  circuitCode,
  cableCores,
  conductorsLabel,
  phaseLabel,
  rcdLabel,
  supplyLabel,
  type PanelConfig,
} from "@/lib/panel";
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

const COL = 84;
const CIRC_START = 170;
const TABLE_LEFT = 60;

const Y = {
  terminal: 72,
  ticksIn: 96,
  frameTop: 115,
  sw1: 128,
  sw2: 184,
  fuse1: 200,
  fuse2: 252,
  junction: 272,
  rcd1: 288,
  rcd2: 372,
  bus: 400,
  mcb1: 424,
  mcb2: 478,
  ticksOut: 492,
  frameBottom: 510,
  arrow: 548,
  table: 560,
  row: 26,
  descRow: 140,
  title: 848,
  height: 956,
};

function clip(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export const Diagram = forwardRef<SVGSVGElement, { cfg: PanelConfig; scale: number | "fit" }>(
  function Diagram({ cfg, scale }, ref) {
    const n = cfg.circuits.length;
    const cols = Math.max(n, 1);
    const cx = (i: number) => CIRC_START + COL * i + COL / 2;
    const circEnd = CIRC_START + COL * cols;
    const mainX = Math.max(CIRC_START + 300, Math.round((cx(0) + cx(cols - 1)) / 2));
    const busLeft = Math.min(cx(0), mainX) - 24;
    const busRight = Math.max(cx(cols - 1), mainX) + 24;
    const tri = cfg.supply === "tri";
    const lampX = mainX + 90;
    const lampCount = tri ? 3 : 1;
    const frameRight = Math.max(busRight + 30, lampX + (lampCount - 1) * 30 + 140);
    const W = Math.max(1180, frameRight + 40, circEnd + 40);
    const H = Y.height;
    const inCores = tri ? 5 : 3;

    const rowY = (r: number) => Y.table + Y.row * r;
    const tableBottom = rowY(5) + Y.descRow;

    const tbW = 420;
    const tbX = W - 28 - tbW;
    const tbY = Y.title;
    const tbH = H - 28 - tbY;

    const labelX = mainX - 28;
    const width = scale === "fit" ? "100%" : `${Math.round(W * scale)}px`;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        style={{ width, height: "auto", display: "block" }}
        fontFamily={FONT}
        role="img"
        aria-label="Μονογραμμικό διάγραμμα πίνακα"
      >
        <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
        <rect
          x={12}
          y={12}
          width={W - 24}
          height={H - 24}
          fill="none"
          stroke={INK}
          strokeWidth={0.6}
        />
        <rect
          x={28}
          y={28}
          width={W - 56}
          height={H - 56}
          fill="none"
          stroke={INK}
          strokeWidth={1.6}
        />

        {/* Heading */}
        <Txt x={TABLE_LEFT} y={62} size={16} weight="bold">
          ΜΟΝΟΓΡΑΜΜΙΚΟ ΔΙΑΓΡΑΜΜΑ
        </Txt>
        <Txt x={TABLE_LEFT} y={80} size={11} fill={GREY}>
          {clip(cfg.panelName || "Πίνακας", 42)}
        </Txt>

        {/* Incoming supply */}
        <Terminal x={mainX} y={Y.terminal} />
        <line
          x1={mainX}
          y1={Y.terminal + 3.5}
          x2={mainX}
          y2={Y.sw1}
          stroke={INK}
          strokeWidth={1.4}
        />
        <Ticks x={mainX} y={Y.ticksIn} count={inCores} />
        <Txt x={mainX + 14} y={60} size={11} weight="bold">
          ΠΑΡΟΧΗ ΔΕΗ
        </Txt>
        <Txt x={mainX + 14} y={74}>
          {supplyLabel(cfg.supply)}
        </Txt>
        <Txt x={mainX + 14} y={100} fill={GREY} size={9}>
          {conductorsLabel(cfg.supply)}
        </Txt>

        {/* Panel enclosure */}
        <rect
          x={TABLE_LEFT}
          y={Y.frameTop}
          width={frameRight - TABLE_LEFT}
          height={Y.frameBottom - Y.frameTop}
          fill="none"
          stroke={INK}
          strokeWidth={1}
          strokeDasharray="10 4 2 4"
        />
        <Txt x={TABLE_LEFT + 10} y={Y.frameTop + 17} size={10} weight="bold">
          ΠΛΑΙΣΙΟ ΠΙΝΑΚΑ
        </Txt>
        <Txt x={TABLE_LEFT + 10} y={Y.frameTop + 30} size={9} fill={GREY}>
          {tri ? "Τριφασικός" : "Μονοφασικός"} · {n} {n === 1 ? "γραμμή" : "γραμμές"}
        </Txt>

        {/* Main switch-disconnector (first) */}
        <SwitchSym x={mainX} y1={Y.sw1} y2={Y.sw2} kind="disconnector" />
        <Txt x={labelX} y={Y.sw1 + 22} anchor="end" weight="bold">
          Γενικός διακόπτης φορτίου
        </Txt>
        <Txt x={labelX} y={Y.sw1 + 35} anchor="end">
          {tri ? "4P" : "2P"} {cfg.mainSwitch}A
        </Txt>
        <Txt x={labelX} y={Y.sw1 + 47} anchor="end" size={8} fill={GREY}>
          Hager {mainSwitchCode(cfg)}
        </Txt>
        <line x1={mainX} y1={Y.sw2} x2={mainX} y2={Y.fuse1} stroke={INK} strokeWidth={1.4} />

        {/* Main protection (second) */}
        {cfg.protectionType === "fuse" ? (
          <Fuse x={mainX} y1={Y.fuse1} y2={Y.fuse2} />
        ) : (
          <SwitchSym x={mainX} y1={Y.fuse1} y2={Y.fuse2} kind="breaker" />
        )}
        <Txt x={labelX} y={Y.fuse1 + 22} anchor="end" weight="bold">
          Γενική ασφάλεια
        </Txt>
        <Txt x={labelX} y={Y.fuse1 + 35} anchor="end">
          {cfg.protectionType === "fuse"
            ? `${tri ? "3x" : ""}Φυσίγγιο gG ${fuseFor(cfg.mainFuse).size} ${cfg.mainFuse}A`
            : cfg.protectionType === "mcb"
              ? `MCB ${tri ? "3P" : "2P"} C${cfg.mainFuse}`
              : `MCCB 3P ${cfg.mainFuse}A 18kA`}
        </Txt>
        <line x1={mainX} y1={Y.fuse2} x2={mainX} y2={Y.rcd1} stroke={INK} strokeWidth={1.4} />

        {/* Indicator lamps */}
        {cfg.indicatorLamp && (
          <g>
            <Dot x={mainX} y={Y.junction} />
            <line
              x1={mainX}
              y1={Y.junction}
              x2={lampX + (lampCount - 1) * 30}
              y2={Y.junction}
              stroke={INK}
              strokeWidth={1.4}
            />
            {Array.from({ length: lampCount }, (_, k) => {
              const lx = lampX + k * 30;
              return (
                <g key={k}>
                  {k < lampCount - 1 && <Dot x={lx} y={Y.junction} />}
                  <line
                    x1={lx}
                    y1={Y.junction}
                    x2={lx}
                    y2={Y.junction + 22}
                    stroke={INK}
                    strokeWidth={1.4}
                  />
                  <Lamp x={lx} y={Y.junction + 31} />
                  <line
                    x1={lx}
                    y1={Y.junction + 40}
                    x2={lx}
                    y2={Y.junction + 52}
                    stroke={INK}
                    strokeWidth={1.4}
                  />
                  <Txt x={lx} y={Y.junction + 62} anchor="middle" size={8} fill={GREY}>
                    {tri ? `L${k + 1}` : "L"}-N
                  </Txt>
                </g>
              );
            })}
            <Txt x={lampX + (lampCount - 1) * 30 + 18} y={Y.junction + 29} weight="bold">
              {tri ? "Ενδεικτικές λυχνίες" : "Ενδεικτική λυχνία"}
            </Txt>
            <Txt x={lampX + (lampCount - 1) * 30 + 18} y={Y.junction + 42}>
              230V
            </Txt>
          </g>
        )}

        {/* RCD */}
        {cfg.rcdEnabled ? (
          <g>
            <Rcd x={mainX} y1={Y.rcd1} y2={Y.rcd2} />
            <Txt x={labelX} y={Y.rcd1 + 30} anchor="end" weight="bold">
              Ρελέ διαρροής (RCD)
            </Txt>
            <Txt x={labelX} y={Y.rcd1 + 43} anchor="end">
              {rcdLabel(cfg)}
            </Txt>
            <Txt x={labelX} y={Y.rcd1 + 55} anchor="end" fill={GREY} size={8}>
              Hager {rcdCode(cfg)}
            </Txt>
          </g>
        ) : (
          <line x1={mainX} y1={Y.rcd1} x2={mainX} y2={Y.rcd2} stroke={INK} strokeWidth={1.4} />
        )}
        <line x1={mainX} y1={Y.rcd2} x2={mainX} y2={Y.bus} stroke={INK} strokeWidth={1.4} />

        {/* Busbar */}
        <line x1={busLeft} y1={Y.bus} x2={busRight} y2={Y.bus} stroke={INK} strokeWidth={4} />
        <Dot x={mainX} y={Y.bus} />
        <Txt x={busLeft - 8} y={Y.bus + 4} anchor="end" size={9} weight="bold">
          {tri ? "ΖΥΓΟΣ L1-L2-L3-N" : "ΖΥΓΟΣ L-N"}
        </Txt>

        {/* Earth bar */}
        <line
          x1={TABLE_LEFT + 30}
          y1={Y.mcb1}
          x2={TABLE_LEFT + 30}
          y2={Y.mcb2 - 4}
          stroke={INK}
          strokeWidth={1.4}
        />
        <line
          x1={TABLE_LEFT + 18}
          y1={Y.mcb1}
          x2={TABLE_LEFT + 42}
          y2={Y.mcb1}
          stroke={INK}
          strokeWidth={3}
        />
        <Earth x={TABLE_LEFT + 30} y={Y.mcb2 - 4} />
        <Txt x={TABLE_LEFT + 48} y={Y.mcb1 + 4} size={9} weight="bold">
          PE
        </Txt>
        <Txt x={TABLE_LEFT + 48} y={Y.mcb1 + 16} size={8} fill={GREY}>
          Ζυγός γείωσης
        </Txt>

        {/* Circuits */}
        {n === 0 && (
          <Txt x={(busLeft + busRight) / 2} y={Y.mcb1 + 34} anchor="middle" fill={GREY} size={11}>
            Προσθέστε γραμμές από τη φόρμα
          </Txt>
        )}
        {cfg.circuits.map((c, i) => {
          const x = cx(i);
          return (
            <g key={c.id}>
              <Dot x={x} y={Y.bus} />
              <line x1={x} y1={Y.bus} x2={x} y2={Y.mcb1} stroke={INK} strokeWidth={1.4} />
              <SwitchSym x={x} y1={Y.mcb1} y2={Y.mcb2} kind="breaker" />
              <Txt x={x + 9} y={Y.mcb1 + 24} size={11} weight="bold">
                {c.curve}
                {c.amps}
              </Txt>
              <Txt x={x + 9} y={Y.mcb1 + 36} size={8} fill={GREY}>
                {c.poles}
              </Txt>
              <line x1={x} y1={Y.mcb2} x2={x} y2={Y.arrow - 6} stroke={INK} strokeWidth={1.4} />
              <Ticks x={x} y={Y.ticksOut} count={cableCores(c.cable)} />
              <ArrowDown x={x} y={Y.arrow} />
            </g>
          );
        })}

        {/* Circuit table */}
        {n > 0 && (
          <g>
            {[0, 1, 2, 3, 4, 5].map((r) => (
              <line
                key={r}
                x1={TABLE_LEFT}
                y1={rowY(r)}
                x2={circEnd}
                y2={rowY(r)}
                stroke={INK}
                strokeWidth={r === 0 ? 1.2 : 0.6}
              />
            ))}
            <line
              x1={TABLE_LEFT}
              y1={tableBottom}
              x2={circEnd}
              y2={tableBottom}
              stroke={INK}
              strokeWidth={1.2}
            />
            <line
              x1={TABLE_LEFT}
              y1={Y.table}
              x2={TABLE_LEFT}
              y2={tableBottom}
              stroke={INK}
              strokeWidth={1.2}
            />
            {Array.from({ length: n + 1 }, (_, k) => (
              <line
                key={k}
                x1={CIRC_START + k * COL}
                y1={Y.table}
                x2={CIRC_START + k * COL}
                y2={tableBottom}
                stroke={INK}
                strokeWidth={k === 0 || k === n ? 1.2 : 0.6}
              />
            ))}
            {["Κύκλωμα", "Προστασία", "Κωδ. Hager", "Καλώδιο (mm²)", "Φάση", "Περιγραφή"].map((h, r) => (
              <Txt
                key={h}
                x={TABLE_LEFT + 8}
                y={rowY(r) + (r === 5 ? 20 : 17)}
                size={9}
                weight="bold"
              >
                {h}
              </Txt>
            ))}
            {cfg.circuits.map((c, i) => {
              const x = cx(i);
              return (
                <g key={c.id}>
                  <Txt x={x} y={rowY(0) + 17} anchor="middle" weight="bold" size={11}>
                    {circuitCode(i)}
                  </Txt>
                  <Txt x={x} y={rowY(1) + 17} anchor="middle">
                    {c.curve}
                    {c.amps}A {c.poles}
                  </Txt>
                  <Txt x={x} y={rowY(2) + 17} anchor="middle" size={9}>
                    {mcbCode(c)}
                  </Txt>
                  <Txt x={x} y={rowY(3) + 17} anchor="middle">
                    NYM {c.cable}
                  </Txt>
                  <Txt x={x} y={rowY(4) + 17} anchor="middle">
                    {phaseLabel(c)}
                  </Txt>
                  <Txt x={x + 4} y={tableBottom - 8} rotate={-90} size={11}>
                    {clip(c.description || "—", 22)}
                  </Txt>
                </g>
              );
            })}
          </g>
        )}

        {/* Legend */}
        <g>
          <Txt x={TABLE_LEFT} y={tbY + 10} size={9} weight="bold">
            ΥΠΟΜΝΗΜΑ ΣΥΜΒΟΛΩΝ (IEC 60617)
          </Txt>
          {(
            [
              ["fuse", "Ασφάλεια τήξεως"],
              ["switch", "Διακόπτης φορτίου"],
              ["mcb", "MCB / MCCB"],
              ["rcd", "Ρελέ διαρροής"],
              ["lamp", "Ενδεικτική λυχνία"],
            ] as const
          ).map(([kind, label], k) => {
            const ix = TABLE_LEFT + 10 + k * 112;
            const iy = tbY + 22;
            return (
              <g key={kind}>
                <g transform={`translate(${ix} ${iy}) scale(0.72)`}>
                  {kind === "fuse" && <Fuse x={0} y1={0} y2={56} />}
                  {kind === "switch" && <SwitchSym x={0} y1={0} y2={56} kind="disconnector" />}
                  {kind === "mcb" && <SwitchSym x={0} y1={0} y2={56} kind="breaker" />}
                  {kind === "rcd" && <Rcd x={0} y1={-6} y2={62} />}
                  {kind === "lamp" && (
                    <g>
                      <line x1={0} y1={0} x2={0} y2={56} stroke={INK} strokeWidth={1.4} />
                      <Lamp x={0} y={28} />
                    </g>
                  )}
                </g>
                <Txt x={ix + 22} y={iy + 24} size={9}>
                  {label}
                </Txt>
              </g>
            );
          })}
        </g>

        {/* Title block */}
        <g>
          <rect
            x={tbX}
            y={tbY}
            width={tbW}
            height={tbH}
            fill="#ffffff"
            stroke={INK}
            strokeWidth={1.4}
          />
          <line
            x1={tbX + 270}
            y1={tbY}
            x2={tbX + 270}
            y2={tbY + tbH}
            stroke={INK}
            strokeWidth={1}
          />
          {[1, 2, 3].map((r) => (
            <line
              key={r}
              x1={tbX}
              y1={tbY + (tbH / 4) * r}
              x2={tbX + 270}
              y2={tbY + (tbH / 4) * r}
              stroke={INK}
              strokeWidth={0.6}
            />
          ))}
          {(
            [
              ["ΕΡΓΟ", cfg.project],
              ["ΠΙΝΑΚΑΣ", cfg.panelName],
              ["ΜΕΛΕΤΗΤΗΣ", cfg.designer],
              ["ΗΜΕΡΟΜΗΝΙΑ", cfg.date],
            ] as const
          ).map(([k, v], r) => (
            <g key={k}>
              <Txt x={tbX + 6} y={tbY + (tbH / 4) * r + 13} size={7} fill={GREY} weight="bold">
                {k}
              </Txt>
              <Txt x={tbX + 74} y={tbY + (tbH / 4) * r + 13} size={10}>
                {clip(v || "—", 32)}
              </Txt>
            </g>
          ))}
          <Txt x={tbX + 345} y={tbY + 24} anchor="middle" size={11} weight="bold">
            ΜΟΝΟΓΡΑΜΜΙΚΟ
          </Txt>
          <Txt x={tbX + 345} y={tbY + 38} anchor="middle" size={11} weight="bold">
            ΔΙΑΓΡΑΜΜΑ
          </Txt>
          <Txt x={tbX + 345} y={tbY + 54} anchor="middle" size={8} fill={GREY}>
            Σύμβολα κατά IEC 60617
          </Txt>
          <Txt x={tbX + 345} y={tbY + 68} anchor="middle" size={8} fill={GREY}>
            Φύλλο 1/1 · Χωρίς κλίμακα
          </Txt>
        </g>
      </svg>
    );
  },
);
