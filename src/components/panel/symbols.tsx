import type { ReactNode } from "react";

// IEC 60617-style symbols drawn with plain SVG attributes so exported files open cleanly in CAD/Illustrator.
// Colours here belong to the exported drawing, not to the app theme.

export const INK = "#111111";
export const GREY = "#555555";
export const FONT = "Arial, Helvetica, sans-serif";

const line = { stroke: INK, strokeWidth: 1.4, fill: "none", strokeLinecap: "round" as const };

export function Terminal({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3.5} fill="#ffffff" stroke={INK} strokeWidth={1.4} />;
}

export function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={2.8} fill={INK} />;
}

/** Fuse (S00362): rectangle with the conductor running through it. */
export function Fuse({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  const mid = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} {...line} />
      <rect x={x - 6} y={mid - 17} width={12} height={34} {...line} />
    </g>
  );
}

type SwitchKind = "disconnector" | "breaker";

/** Open switch contact. "disconnector" draws the isolating bar, "breaker" the circuit-breaker cross. */
export function SwitchSym({
  x,
  y1,
  y2,
  kind,
}: {
  x: number;
  y1: number;
  y2: number;
  kind: SwitchKind;
}) {
  const cTop = y1 + 12;
  const cBot = y2 - 12;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={cTop} {...line} />
      <line x1={x} y1={cBot} x2={x} y2={y2} {...line} />
      <line x1={x} y1={cBot} x2={x - 13} y2={cTop + 3} {...line} />
      {kind === "disconnector" ? (
        <line x1={x - 5} y1={cTop} x2={x + 5} y2={cTop} {...line} />
      ) : (
        <g>
          <line x1={x - 4} y1={cTop - 4} x2={x + 4} y2={cTop + 4} {...line} />
          <line x1={x - 4} y1={cTop + 4} x2={x + 4} y2={cTop - 4} {...line} />
        </g>
      )}
    </g>
  );
}

/** Residual current device: breaker contact, core-balance toroid and mechanical link. */
export function Rcd({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  const swBot = y2 - 22;
  const cTop = y1 + 12;
  const cBot = swBot - 12;
  const midY = (cTop + cBot) / 2 + 2;
  const torY = y2 - 10;
  return (
    <g>
      <SwitchSym x={x} y1={y1} y2={swBot} kind="breaker" />
      <line x1={x} y1={swBot} x2={x} y2={y2} {...line} />
      <ellipse cx={x} cy={torY} rx={10} ry={4} {...line} />
      <polyline
        points={`${x + 10},${torY} ${x + 20},${torY} ${x + 20},${midY} ${x - 6},${midY}`}
        {...line}
        strokeDasharray="3 2.5"
      />
    </g>
  );
}

/** Signal lamp (S00965): circle with a cross. */
export function Lamp({ x, y }: { x: number; y: number }) {
  const d = 9 * Math.SQRT1_2;
  return (
    <g>
      <circle cx={x} cy={y} r={9} fill="#ffffff" stroke={INK} strokeWidth={1.4} />
      <line x1={x - d} y1={y - d} x2={x + d} y2={y + d} {...line} />
      <line x1={x - d} y1={y + d} x2={x + d} y2={y - d} {...line} />
    </g>
  );
}

/** Protective earth (S00200). */
export function Earth({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x - 9} y1={y} x2={x + 9} y2={y} {...line} />
      <line x1={x - 6} y1={y + 4} x2={x + 6} y2={y + 4} {...line} />
      <line x1={x - 3} y1={y + 8} x2={x + 3} y2={y + 8} {...line} />
    </g>
  );
}

/** Conductor count ticks across a single-line wire. */
export function Ticks({ x, y, count }: { x: number; y: number; count: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, k) => {
        const off = (k - (count - 1) / 2) * 4;
        return (
          <line
            key={k}
            x1={x - 5}
            y1={y + off + 3}
            x2={x + 5}
            y2={y + off - 3}
            stroke={INK}
            strokeWidth={1}
          />
        );
      })}
    </g>
  );
}

export function ArrowDown({ x, y }: { x: number; y: number }) {
  return <polygon points={`${x - 4},${y - 8} ${x + 4},${y - 8} ${x},${y}`} fill={INK} />;
}

export function Txt({
  x,
  y,
  children,
  size = 10,
  weight = "normal",
  anchor = "start",
  fill = INK,
  rotate,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  weight?: "normal" | "bold";
  anchor?: "start" | "middle" | "end";
  fill?: string;
  rotate?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fontFamily={FONT}
      fontSize={size}
      fontWeight={weight}
      textAnchor={anchor}
      fill={fill}
      {...(rotate !== undefined ? { transform: `rotate(${rotate} ${x} ${y})` } : {})}
    >
      {children}
    </text>
  );
}
