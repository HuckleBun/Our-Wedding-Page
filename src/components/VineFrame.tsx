/**
 * Decorative climbing vines for the corners of a photo. Each corner is one SVG spray,
 * symmetric about its diagonal and flipped for the other corners. Colors match the
 * header logo (rose #9b1c2c, leaf #4a6b3a).
 */

const ROSE = "#9b1c2c";
const ROSE_DARK = "#6e1220";
const ROSE_LIGHT = "#b8394a";
const LEAF = "#4a6b3a";
const LEAF_DARK = "#36502a";
const LEAF_LIGHT = "#6a8a52";

type Leaf = { x: number; y: number; angle: number; size: number; light?: boolean };

// Leaves along the top edge; the left edge is the same set mirrored across the diagonal.
const TOP_LEAVES: Leaf[] = [
  { x: 272, y: 37, angle: -28, size: 0.62 },
  { x: 248, y: 42, angle: 38, size: 0.8, light: true },
  { x: 222, y: 33, angle: -42, size: 0.9 },
  { x: 176, y: 34, angle: 30, size: 0.95, light: true },
  { x: 152, y: 40, angle: -36, size: 1.05 },
  { x: 124, y: 44, angle: 44, size: 0.9 },
  { x: 102, y: 38, angle: -50, size: 1 , light: true },
  { x: 84, y: 30, angle: 20, size: 0.78 },
];

const mirror = (l: Leaf): Leaf => ({ ...l, x: l.y, y: l.x, angle: 90 - l.angle });
const LEAVES = [...TOP_LEAVES, ...TOP_LEAVES.map(mirror)];

// Rosebuds along the stems: [x, y, angle], plus their mirrors.
const TOP_BUDS: Array<[number, number, number]> = [
  [198, 22, -70],
  [136, 52, 110],
];
const BUDS = [...TOP_BUDS, ...TOP_BUDS.map(([x, y, a]) => [y, x, 90 - a] as [number, number, number])];

// Small curling tendrils (top edge, then mirrored).
const TOP_TENDRILS = [
  "M236 37 c 2 -12 16 -16 22 -8 c 5 7 -2 14 -8 10 c -4 -3 -1 -8 3 -6",
  "M164 37 c -2 -14 -18 -18 -24 -9 c -4 7 3 13 8 9 c 3 -3 0 -7 -3 -5",
  "M110 41 c 4 10 -2 22 -12 22 c -8 0 -10 -9 -4 -11 c 4 -1 6 3 3 5",
];
const mirrorPath = (d: string) =>
  d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, a, b) => `${b} ${a}`);
const TENDRILS = [...TOP_TENDRILS, ...TOP_TENDRILS.map(mirrorPath)];

// Two intertwined stems that run along the top edge, round the corner, and down the left.
const MAIN_STEM =
  "M296 34 C 262 48 238 24 206 32 C 168 42 150 50 116 42 C 88 35 70 42 58 58 " +
  "C 42 70 35 88 42 116 C 50 150 42 168 32 206 C 24 238 48 262 34 296";
const SECOND_STEM =
  "M280 44 C 250 30 226 52 192 44 C 160 36 140 30 108 38 C 84 46 66 56 56 56 " +
  "C 56 66 46 84 38 108 C 30 140 36 160 44 192 C 52 226 30 250 44 280";

function LeafShape({ x, y, angle, size, light }: Leaf) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${size})`}>
      <path
        d="M0 0 C 6 -8 18 -11 30 -3 C 32 -1 32 1 30 3 C 18 11 6 8 0 0 Z"
        fill={light ? LEAF_LIGHT : LEAF}
      />
      <path d="M1 0 C 10 -1 20 -1 30 0" stroke={LEAF_DARK} strokeWidth={0.9} fill="none" />
      <path
        d="M9 -1 L 13 -5 M15 -1 L 19 -5 M21 -1 L 24 -4 M9 1 L 13 5 M15 1 L 19 5 M21 1 L 24 4"
        stroke={LEAF_DARK}
        strokeWidth={0.5}
        opacity={0.7}
      />
    </g>
  );
}

function Bud({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path d="M0 0 L 8 0" stroke={LEAF} strokeWidth={1.4} />
      <path d="M8 0 C 12 -6 20 -6 22 0 C 20 6 12 6 8 0 Z" fill={ROSE} />
      <path d="M14 -3 C 18 -2 19 1 16 3" stroke={ROSE_DARK} strokeWidth={0.8} fill="none" />
      <path d="M7 0 C 10 -5 13 -6 15 -5 M7 0 C 10 5 13 6 15 5" stroke={LEAF} strokeWidth={1.6} fill="none" />
    </g>
  );
}

/** A full rose drawn as layered petals with a spiral center. */
function Rose({ x, y, r }: { x: number; y: number; r: number }) {
  const s = r / 16;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <LeafShape x={6} y={10} angle={40} size={0.7} />
      <LeafShape x={10} y={6} angle={50} size={0.7} light />
      <circle r={16} fill={ROSE} />
      {/* outer petals */}
      <path d="M-15 -4 C -14 -14 -4 -17 4 -15" stroke={ROSE_DARK} strokeWidth={1.4} fill="none" />
      <path d="M15 4 C 14 14 4 17 -4 15" stroke={ROSE_DARK} strokeWidth={1.4} fill="none" />
      <path d="M-13 9 C -9 14 -3 15 1 14" stroke={ROSE_DARK} strokeWidth={1.2} fill="none" />
      <path d="M13 -9 C 9 -14 3 -15 -1 -14" stroke={ROSE_DARK} strokeWidth={1.2} fill="none" />
      {/* inner cup */}
      <circle r={9.5} fill={ROSE_LIGHT} />
      <path
        d="M-8 2 C -9 -6 -2 -10 4 -8 C 9 -6 9 2 4 4 C 0 6 -4 2 -2 -2 C 0 -5 4 -3 3 0"
        stroke={ROSE_DARK}
        strokeWidth={1.3}
        fill="none"
        strokeLinecap="round"
      />
      <path d="M-6 7 C -2 10 5 9 8 5" stroke={ROSE_DARK} strokeWidth={1.1} fill="none" />
    </g>
  );
}

function VineCorner({ className }: { className: string }) {
  return (
    <svg
      className={`vine-corner ${className}`}
      viewBox="0 0 300 300"
      aria-hidden="true"
      focusable="false"
    >
      <path d={SECOND_STEM} stroke={LEAF_DARK} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <path d={MAIN_STEM} stroke={LEAF} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      {TENDRILS.map((d, i) => (
        <path key={i} d={d} stroke={LEAF} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      ))}
      {LEAVES.map((l, i) => (
        <LeafShape key={i} {...l} />
      ))}
      {BUDS.map(([x, y, a], i) => (
        <Bud key={i} x={x} y={y} angle={a} />
      ))}
      <Rose x={50} y={50} r={20} />
    </svg>
  );
}

/** Wrap a photo (or placeholder) to frame it with vines at all four corners. */
export function VineFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="vine-frame">
      {children}
      <VineCorner className="vine-tl" />
      <VineCorner className="vine-tr" />
      <VineCorner className="vine-bl" />
      <VineCorner className="vine-br" />
    </div>
  );
}
