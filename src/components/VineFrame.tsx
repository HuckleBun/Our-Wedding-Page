/**
 * Decorative climbing vines for the corners of a photo. Each corner is one SVG spray,
 * symmetric about its diagonal and flipped for the other corners. Greens match the
 * header logo leaves (#34502a).
 */

const LEAF = "#34502a";
const LEAF_DARK = "#22361a";
const LEAF_LIGHT = "#4b673a";

type Leaf = { x: number; y: number; angle: number; size: number; light?: boolean };

// Leaves along the top edge; the left edge is the same set mirrored across the diagonal.
const TOP_LEAVES: Leaf[] = [
  { x: 272, y: 37, angle: -28, size: 0.62 },
  { x: 248, y: 42, angle: 38, size: 0.8, light: true },
  { x: 222, y: 33, angle: -42, size: 0.9 },
  { x: 198, y: 30, angle: 32, size: 0.72, light: true },
  { x: 176, y: 34, angle: 30, size: 0.95, light: true },
  { x: 152, y: 40, angle: -36, size: 1.05 },
  { x: 136, y: 46, angle: 120, size: 0.7 },
  { x: 124, y: 44, angle: 44, size: 0.9 },
  { x: 102, y: 38, angle: -50, size: 1, light: true },
  { x: 84, y: 30, angle: 20, size: 0.78 },
];

const mirror = (l: Leaf): Leaf => ({ ...l, x: l.y, y: l.x, angle: 90 - l.angle });
const LEAVES = [...TOP_LEAVES, ...TOP_LEAVES.map(mirror)];

// A small leaf cluster where the stems meet at the corner.
const CORNER_LEAVES: Leaf[] = [
  { x: 54, y: 54, angle: -135, size: 0.7 },
  { x: 56, y: 52, angle: 5, size: 0.85, light: true },
  { x: 52, y: 56, angle: 85, size: 0.85, light: true },
  { x: 54, y: 54, angle: 45, size: 1.15 },
];

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
      {CORNER_LEAVES.map((l, i) => (
        <LeafShape key={`c${i}`} {...l} />
      ))}
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
