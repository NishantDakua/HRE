/**
 * Static layered-SVG version of the Day in Mumbai hero, used for
 * prefers-reduced-motion and small screens. Each act is one layer; the
 * parent crossfades them from scroll progress via `layerRef`.
 */

const P = {
  peach: "#F4C7A1",
  rose: "#E9B8B0",
  mint: "#B9D4C3",
  butter: "#F6DFA0",
  powder: "#CFE0E8",
  sand: "#F3E3C7",
  card: "#FFFDF8",
  trim: "#FFF8EC",
  stone: "#EFE4D2",
  road: "#E2D0B3",
  sea: "#A9CFD8",
  ink: "#2A1F1A",
  muted: "#7A6A5E",
  terracotta: "#D9653B",
  marigold: "#F2A93B",
  pending: "#7A6FB0",
  glass: "#8FA7B2",
  lit: "#FFD27A",
  leaf: "#8DB89C",
};

const BASE = 600;

interface SvgBuilding {
  x: number;
  w: number;
  h: number;
  c: string;
  tiers: number;
  tower?: "left" | "right";
  flag?: boolean;
  tank?: boolean;
}

const CITY: SvgBuilding[] = [
  { x: 60, w: 140, h: 320, c: P.peach, tiers: 3, tower: "right" },
  { x: 215, w: 100, h: 220, c: P.rose, tiers: 2, flag: true },
  { x: 330, w: 180, h: 130, c: P.rose, tiers: 2 },
  { x: 525, w: 120, h: 175, c: P.peach, tiers: 2, tower: "left", flag: true },
  { x: 660, w: 110, h: 120, c: P.butter, tiers: 1 },
  { x: 785, w: 130, h: 160, c: P.mint, tiers: 1, tank: true },
  { x: 935, w: 95, h: 240, c: P.powder, tiers: 2 },
];

const CATERER_ROOF = { x: 850, y: BASE - 160 };

/** Ranked providers in the SVG skyline (index into CITY), in match order. */
const RANKED = [6, 3, 0, 4, 1];
const VENUE = CITY[2];
const roofOf = (b: SvgBuilding) => ({ x: b.x + b.w / 2, y: BASE - b.h - 14 * b.tiers });

function arcPath(from: SvgBuilding) {
  const a = roofOf(from);
  const b = roofOf(VENUE);
  const mx = (a.x + b.x) / 2;
  const my = Math.min(a.y, b.y) - 150;
  return `M${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
}

function catenaryPath(x1: number, y1: number, x2: number, y2: number, sag: number) {
  return `M${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag * 2} ${x2} ${y2}`;
}

function Building({ b, lit }: { b: SvgBuilding; lit: boolean }) {
  const top = BASE - b.h;
  const cols = Math.max(1, Math.floor((b.w - 20) / 22));
  const rows = Math.max(1, Math.floor((b.h - 30) / 30));
  const cw = (b.w - 20) / cols;
  const towerX = b.tower === "left" ? b.x - 22 : b.x + b.w - 22;
  const towerH = b.h + 40;
  return (
    <g>
      <rect x={b.x - 6} y={BASE - 10} width={b.w + 12} height={10} fill={P.trim} />
      <rect x={b.x} y={top} width={b.w} height={b.h} fill={b.c} />
      {Array.from({ length: Math.floor(b.h / 50) }).map((_, i) => (
        <rect key={i} x={b.x - 2} y={BASE - 45 - i * 50} width={b.w + 4} height={4} fill={P.trim} />
      ))}
      {Array.from({ length: b.tiers }).map((_, i) => {
        const w = Math.max(24, b.w - 24 * (i + 1));
        return <rect key={i} x={b.x + (b.w - w) / 2} y={top - 14 * (i + 1)} width={w} height={14} fill={i % 2 ? P.trim : b.c} />;
      })}
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => {
          const on = lit && (r * 7 + c * 3) % 5 !== 0;
          return (
            <rect
              key={`${r}-${c}`}
              x={b.x + 10 + c * cw + cw / 2 - 5}
              y={top + 16 + r * 30}
              width={10}
              height={14}
              rx={1.5}
              fill={on ? P.lit : P.glass}
            />
          );
        })
      )}
      {b.tower && (
        <g>
          <rect x={towerX} y={BASE - towerH} width={44} height={towerH} rx={22} fill={b.c} />
          {Array.from({ length: Math.floor(towerH / 50) }).map((_, i) => (
            <rect key={i} x={towerX - 2} y={BASE - 45 - i * 50} width={48} height={4} fill={P.trim} />
          ))}
          <path d={`M${towerX + 4} ${BASE - towerH + 18} a18 18 0 0 1 36 0 z`} fill={P.marigold} />
          <line x1={towerX + 22} x2={towerX + 22} y1={BASE - towerH} y2={BASE - towerH - 22} stroke={P.marigold} strokeWidth={2} />
        </g>
      )}
      {b.flag && (
        <g>
          <line x1={b.x + b.w / 2} x2={b.x + b.w / 2} y1={top - 14 * b.tiers} y2={top - 14 * b.tiers - 46} stroke={P.trim} strokeWidth={2} />
          <rect x={b.x + b.w / 2} y={top - 14 * b.tiers - 46} width={22} height={14} fill={P.terracotta} />
        </g>
      )}
      {b.tank && (
        <g>
          <line x1={b.x + b.w - 34} x2={b.x + b.w - 34} y1={top} y2={top - 14} stroke={P.muted} strokeWidth={2} />
          <line x1={b.x + b.w - 14} x2={b.x + b.w - 14} y1={top} y2={top - 14} stroke={P.muted} strokeWidth={2} />
          <rect x={b.x + b.w - 40} y={top - 40} width={32} height={28} rx={3} fill={P.terracotta} />
          <path d={`M${b.x + b.w - 42} ${top - 40} l18 -10 l18 10 z`} fill={P.muted} />
        </g>
      )}
    </g>
  );
}

function City({ lit }: { lit: boolean }) {
  return (
    <g>
      <rect x={0} y={BASE} width={1200} height={200} fill={P.sand} />
      <path d="M 1000 800 Q 1060 660 1200 610 L 1200 800 Z" fill={P.sea} />
      <path d="M 985 800 Q 1045 650 1200 596" fill="none" stroke={P.stone} strokeWidth={16} />
      <path d="M 960 800 Q 1020 640 1200 582" fill="none" stroke={P.road} strokeWidth={22} />
      <rect x={0} y={640} width={1000} height={26} fill={P.road} />
      {Array.from({ length: 20 }).map((_, i) => (
        <rect key={i} x={20 + i * 50} y={652} width={24} height={2} fill={P.trim} />
      ))}
      {CITY.map((b) => (
        <Building key={b.x} b={b} lit={lit} />
      ))}
      {[40, 190, 320, 520, 650, 760, 930].map((x) => (
        <g key={x} transform={`translate(${x} ${BASE + 26})`}>
          <rect x={-2} y={0} width={4} height={10} fill="#9A7456" />
          <path d="M-12 2 L0 -26 L12 2 Z" fill={P.leaf} />
        </g>
      ))}
    </g>
  );
}

function GoldChair() {
  const gold = P.marigold;
  return (
    <g stroke={gold} strokeWidth={9} strokeLinecap="round" fill="none">
      <line x1={-62} y1={40} x2={-72} y2={170} />
      <line x1={62} y1={40} x2={72} y2={170} />
      <line x1={-44} y1={30} x2={-48} y2={150} strokeOpacity={0.75} />
      <line x1={44} y1={30} x2={48} y2={150} strokeOpacity={0.75} />
      <line x1={-68} y1={120} x2={68} y2={120} strokeWidth={5} />
      <path d="M-74 36 L74 36 L60 54 L-60 54 Z" fill={gold} />
      <ellipse cx={0} cy={30} rx={70} ry={12} fill="#FFF3E0" stroke="none" />
      <line x1={-50} y1={30} x2={-46} y2={-112} />
      <line x1={50} y1={30} x2={46} y2={-112} />
      <line x1={-50} y1={-112} x2={50} y2={-112} strokeWidth={12} />
      {[-80, -50, -20].map((y) => (
        <line key={y} x1={-47} y1={y} x2={47} y2={y} strokeWidth={5} />
      ))}
      <line x1={-40} y1={-110} x2={-38} y2={20} stroke="#FFD27A" strokeWidth={2.5} />
    </g>
  );
}

const GLYPHS = [
  { x: -230, y: -120, fill: "#3B2E27", w: 50, h: 80, r: 6 }, // speaker
  { x: 200, y: -150, fill: P.card, w: 90, h: 46, r: 8 }, // van
  { x: -260, y: 90, fill: P.card, w: 70, h: 18, r: 9 }, // plates
  { x: 230, y: 80, fill: P.rose, w: 90, h: 34, r: 17 }, // linen roll
  { x: -140, y: -210, fill: P.butter, w: 44, h: 40, r: 20 }, // lamp shade
  { x: 150, y: 190, fill: "#C9996A", w: 70, h: 52, r: 4 }, // crate
];

function Tag({ x, y, text }: { x: number; y: number; text: string }) {
  const w = text.length * 8.4 + 34;
  return (
    <g transform={`translate(${x - w / 2} ${y})`}>
      <rect width={w} height={28} rx={14} fill={P.card} stroke={P.marigold} strokeOpacity={0.6} />
      <circle cx={16} cy={14} r={3.5} fill={P.marigold} />
      <text x={26} y={18.5} fontFamily="var(--font-mono)" fontSize={11} letterSpacing={1.4} fill={P.ink}>
        {text}
      </text>
    </g>
  );
}

export function StaticActs({ layerRef }: { layerRef: (i: number, el: SVGSVGElement | null) => void }) {
  const common = {
    viewBox: "0 0 1200 800",
    preserveAspectRatio: "xMidYMax slice",
    className: "absolute inset-0 h-full w-full transition-none",
    "aria-hidden": true,
  } as const;

  return (
    <div className="absolute inset-0">
      {/* Act 0 — hero chair over a faint skyline */}
      <svg {...common} ref={(el) => layerRef(0, el)} style={{ opacity: 1 }}>
        <g opacity={0.45}>
          <City lit={false} />
        </g>
        <g transform="translate(600 300)">
          {GLYPHS.map((g, i) => (
            <rect key={i} x={g.x - g.w / 2} y={g.y - g.h / 2} width={g.w} height={g.h} rx={g.r} fill={g.fill} opacity={0.9} />
          ))}
          <GoldChair />
        </g>
      </svg>

      {/* Act 1 — 07:00 AM, lit windows, idle items */}
      <svg {...common} ref={(el) => layerRef(1, el)} style={{ opacity: 0 }}>
        <City lit />
        {Array.from({ length: 40 }).map((_, i) => (
          <rect key={i} x={360 + (i % 10) * 14} y={690 + Math.floor(i / 10) * 14} width={9} height={9} rx={2} fill={P.marigold} />
        ))}
        <rect x={690} y={622} width={70} height={30} rx={5} fill={P.card} stroke={P.terracotta} strokeWidth={2} />
        <Tag x={430} y={752} text="40 CHAIRS · IDLE" />
        <Tag x={725} y={582} text="REEFER VAN · IDLE" />
        <Tag x={420} y={420} text="BALLROOM · FREE TUE" />
        <text x={150} y={720} fontFamily="var(--font-hand)" fontSize={30} fill={P.terracotta}>
          sitting here since Sunday
        </text>
        <path d="M300 700 C 320 690, 340 700, 352 705" fill="none" stroke={P.terracotta} strokeWidth={2.5} strokeLinecap="round" />
        <path d="M344 697 L352 705 L342 710" fill="none" stroke={P.terracotta} strokeWidth={2.5} strokeLinecap="round" />
      </svg>

      {/* Act 2 — 11:30 AM, zoomed to the caterer's rooftop */}
      <svg {...common} ref={(el) => layerRef(2, el)} style={{ opacity: 0 }}>
        <g transform={`translate(600 520) scale(2.1) translate(${-CATERER_ROOF.x} ${-CATERER_ROOF.y})`}>
          <City lit />
          {[18, 34, 50].map((r, i) => (
            <circle
              key={r}
              cx={CATERER_ROOF.x - 10}
              cy={CATERER_ROOF.y - 4}
              r={r}
              fill="none"
              stroke={P.pending}
              strokeWidth={2}
              opacity={0.7 - i * 0.2}
            />
          ))}
        </g>
      </svg>

      {/* Act 3 — 02:00 PM, radar from the caterer, providers glow */}
      <svg {...common} ref={(el) => layerRef(3, el)} style={{ opacity: 0 }}>
        <City lit />
        {[80, 200, 340, 500].map((r, i) => (
          <circle key={r} cx={CATERER_ROOF.x} cy={BASE + 10} r={r} fill="none" stroke="#1F6F6B" strokeWidth={2} opacity={0.6 - i * 0.12} />
        ))}
        {RANKED.map((idx, rank) => {
          const b = CITY[idx];
          return (
            <g key={idx}>
              <rect x={b.x - 6} y={BASE - b.h - 6} width={b.w + 12} height={b.h + 6} rx={6} fill="#1F6F6B" fillOpacity={0.1} stroke="#1F6F6B" strokeWidth={2.5} />
              <circle cx={b.x + b.w / 2} cy={BASE - b.h - 14 * b.tiers - 26} r={14} fill="#1F6F6B" />
              <text x={b.x + b.w / 2} y={BASE - b.h - 14 * b.tiers - 21} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={13} fill="#FFFDF8">
                {rank + 1}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Act 4 — 05:30 PM, chairs on marigold arcs, vans on the road */}
      <svg {...common} ref={(el) => layerRef(4, el)} style={{ opacity: 0 }}>
        <City lit />
        {[CITY[6], CITY[3]].map((b, i) => (
          <g key={i}>
            <path d={arcPath(b)} fill="none" stroke={P.marigold} strokeWidth={12} strokeOpacity={0.18} strokeLinecap="round" />
            <path d={arcPath(b)} fill="none" stroke={P.marigold} strokeWidth={3.5} strokeLinecap="round" strokeDasharray="1 14" />
            <path d={arcPath(b)} fill="none" stroke={P.marigold} strokeWidth={2} strokeLinecap="round" />
          </g>
        ))}
        {[
          [540, 646],
          [280, 646],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <rect x={0} y={-18} width={56} height={24} rx={4} fill={P.card} stroke={P.ink} strokeOpacity={0.2} />
            <rect x={0} y={-8} width={56} height={4} fill={P.terracotta} />
            <circle cx={12} cy={8} r={5} fill={P.ink} />
            <circle cx={44} cy={8} r={5} fill={P.ink} />
          </g>
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <g key={i} transform={`translate(${1040 + i * 22} ${700 - i * 18})`}>
            <rect x={-4} y={-18} width={8} height={18} rx={4} fill={[P.terracotta, "#1F6F6B", P.rose, P.pending, P.marigold, P.powder][i]} />
            <circle cx={0} cy={-23} r={4} fill="#C68B63" />
            <rect x={-8} y={-34} width={16} height={4} fill={P.marigold} />
          </g>
        ))}
      </svg>

      {/* Act 5 — 08:00 PM, warm night, string lights + petals over the hall */}
      <svg {...common} ref={(el) => layerRef(5, el)} style={{ opacity: 0 }}>
        <City lit />
        <rect x={0} y={0} width={1200} height={800} fill="#2A1F3A" opacity={0.35} />
        {CITY.map((b) =>
          Array.from({ length: Math.floor(b.h / 40) }).map((_, i) => (
            <rect key={`${b.x}-${i}`} x={b.x + 10} y={BASE - b.h + 16 + i * 30} width={b.w - 20} height={14} fill={P.lit} opacity={0.12} />
          ))
        )}
        {(() => {
          const x1 = VENUE.x;
          const x2 = VENUE.x + VENUE.w;
          const y = BASE - VENUE.h;
          const strands = [
            [x1 - 40, y + 10, x1 + 90, y - 30],
            [x1 + 90, y - 30, x2 + 40, y + 10],
            [x1 - 40, y + 60, x2 + 40, y + 60],
          ];
          return strands.map(([ax, ay, bx, by], i) => (
            <g key={i}>
              <path d={catenaryPath(ax, ay, bx, by, 22)} fill="none" stroke={P.ink} strokeOpacity={0.5} strokeWidth={1.5} />
              {Array.from({ length: 11 }).map((_, k) => {
                const t = (k + 0.5) / 11;
                const cx = ax + (bx - ax) * t;
                const cy = ay + (by - ay) * t + 44 * t * (1 - t) * 2 * 0.5 + 4;
                return (
                  <g key={k}>
                    <circle cx={cx} cy={cy} r={10} fill={P.lit} opacity={0.25} />
                    <circle cx={cx} cy={cy} r={3.5} fill="#FFE3A0" />
                  </g>
                );
              })}
            </g>
          ));
        })()}
        {Array.from({ length: 40 }).map((_, i) => (
          <ellipse
            key={i}
            cx={VENUE.x - 60 + ((i * 53) % (VENUE.w + 120))}
            cy={BASE - VENUE.h - 80 + ((i * 97) % 260)}
            rx={5}
            ry={3}
            fill={[P.marigold, P.terracotta, P.butter][i % 3]}
            transform={`rotate(${(i * 37) % 180} ${VENUE.x - 60 + ((i * 53) % (VENUE.w + 120))} ${BASE - VENUE.h - 80 + ((i * 97) % 260)})`}
          />
        ))}
      </svg>
    </div>
  );
}
