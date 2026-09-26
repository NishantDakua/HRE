import type { ReactNode } from "react";
import type { ResourceCategory } from "@/lib/types";

/*
 * One flat, ink-outlined illustration per resource category. Drawn on a
 * 360×360 canvas; the parent tilts the whole SVG with scroll.
 */

const C = {
  ink: "#2A1F1A",
  card: "#FFFDF8",
  paper: "#FBF4E8",
  sand: "#F3E3C7",
  line: "#E6D6BD",
  terracotta: "#D9653B",
  marigold: "#F2A93B",
  peacock: "#1F6F6B",
  peach: "#F4C7A1",
  rose: "#E9B8B0",
  mint: "#B9D4C3",
  butter: "#F6DFA0",
  powder: "#CFE0E8",
  pending: "#7A6FB0",
};

const stroke = { stroke: C.ink, strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" } as const;

function Frame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 360 360" className="h-full w-full overflow-visible" role="img" aria-label={label}>
      <ellipse cx="180" cy="322" rx="130" ry="16" fill={C.ink} opacity="0.12" />
      {children}
    </svg>
  );
}

function BanquetHall() {
  return (
    <Frame label="Art-deco banquet hall">
      <rect x="60" y="120" width="240" height="196" rx="6" fill={C.rose} {...stroke} />
      <path d="M92 120 V96 H128 V76 H232 V96 H268 V120" fill={C.card} {...stroke} />
      <path d="M150 76 V58 H210 V76" fill={C.marigold} {...stroke} />
      <path d="M150 316 V236 a30 30 0 0 1 60 0 V316" fill={C.butter} {...stroke} />
      {[84, 112, 236, 264].map((x) => (
        <rect key={x} x={x - 8} y="150" width="16" height="140" rx="3" fill={C.card} {...stroke} />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <circle key={i} cx={78 + i * 25.5} cy={134 + Math.sin((i / 8) * Math.PI) * 10} r="4.5" fill={C.marigold} stroke={C.ink} strokeWidth="1.5" />
      ))}
      <path d="M66 134 Q180 156 294 134" fill="none" stroke={C.ink} strokeWidth="1.5" />
      <rect x="52" y="306" width="256" height="14" rx="3" fill={C.card} {...stroke} />
    </Frame>
  );
}

function ChiavariChair() {
  return (
    <Frame label="Gold banquet chair and round table">
      <ellipse cx="266" cy="206" rx="74" ry="22" fill={C.card} {...stroke} />
      <path d="M192 206 V214 Q266 246 340 214 V206" fill={C.card} {...stroke} />
      <path d="M266 230 V312 M234 312 H298" fill="none" {...stroke} />
      <g {...stroke} fill="none" stroke={C.marigold} strokeWidth="7">
        <path d="M96 196 L86 314 M168 196 L176 314 M110 190 L106 300 M152 190 L156 300" />
        <path d="M100 196 L100 70 M164 196 L164 70" />
        <path d="M98 70 H166" strokeWidth="9" />
        <path d="M102 104 H162 M102 134 H162 M102 164 H162" strokeWidth="4" />
        <path d="M92 270 H172" strokeWidth="4" />
      </g>
      <path d="M78 190 H186 L176 210 H88 Z" fill={C.marigold} {...stroke} />
      <ellipse cx="132" cy="188" rx="54" ry="9" fill={C.card} {...stroke} />
    </Frame>
  );
}

function ReeferVan() {
  return (
    <Frame label="Refrigerated delivery van">
      <path d="M40 140 H232 V290 H40 Z" fill={C.card} {...stroke} />
      <path d="M232 176 H286 L320 226 V290 H232 Z" fill={C.card} {...stroke} />
      <path d="M244 188 H280 L302 222 H244 Z" fill={C.powder} {...stroke} />
      <rect x="64" y="112" width="96" height="28" rx="4" fill={C.powder} {...stroke} />
      <path d="M40 236 H320" stroke={C.terracotta} strokeWidth="12" />
      <path d="M40 230 H320 M40 242 H320" stroke={C.ink} strokeWidth="2" />
      <text x="72" y="196" fontFamily="var(--font-mono)" fontSize="18" fill={C.peacock}>
        2–8°C
      </text>
      {[98, 268].map((x) => (
        <g key={x}>
          <circle cx={x} cy="292" r="26" fill={C.ink} />
          <circle cx={x} cy="292" r="10" fill={C.line} />
        </g>
      ))}
    </Frame>
  );
}

function KitchenLine() {
  return (
    <Frame label="Stove with a steaming pot and a tandoor">
      <rect x="48" y="206" width="180" height="108" rx="6" fill={C.card} {...stroke} />
      <path d="M48 230 H228" {...stroke} />
      {[92, 184].map((x) => (
        <circle key={x} cx={x} cy="270" r="14" fill={C.sand} {...stroke} />
      ))}
      <path d="M78 206 V148 Q78 130 96 130 H180 Q198 130 198 148 V206" fill={C.peach} {...stroke} />
      <path d="M68 130 H208" {...stroke} strokeWidth="5" />
      <path d="M108 110 q10 -16 0 -32 q-10 -16 0 -32 M140 104 q10 -16 0 -32 q-10 -16 0 -32 M172 110 q10 -16 0 -32" fill="none" stroke={C.ink} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <path d="M244 314 V218 Q244 160 284 160 Q324 160 324 218 V314 Z" fill={C.terracotta} {...stroke} />
      <ellipse cx="284" cy="172" rx="22" ry="8" fill={C.ink} />
      <path d="M270 150 q6 -12 0 -24 M298 150 q6 -12 0 -24" fill="none" stroke={C.ink} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <path d="M254 260 H314" stroke={C.marigold} strokeWidth="6" />
    </Frame>
  );
}

function AvRig() {
  return (
    <Frame label="Speaker stack and projector">
      <path d="M226 132 L340 70 V230 Z" fill={C.butter} opacity="0.7" />
      <rect x="160" y="118" width="84" height="46" rx="8" fill={C.card} {...stroke} />
      <circle cx="226" cy="141" r="13" fill={C.powder} {...stroke} />
      <path d="M178 164 L170 312 M226 164 L234 312 M174 250 H230" fill="none" {...stroke} />
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(40 ${176 - i * 104})`}>
          <rect width="96" height="104" rx="8" fill={C.ink} {...stroke} />
          <circle cx="48" cy="64" r="26" fill={C.marigold} stroke={C.card} strokeWidth="3" />
          <circle cx="48" cy="64" r="9" fill={C.ink} />
          <circle cx="48" cy="22" r="10" fill={C.card} />
        </g>
      ))}
      <rect x="40" y="280" width="96" height="34" rx="6" fill={C.card} {...stroke} />
    </Frame>
  );
}

function ParkingBay() {
  return (
    <Frame label="Parking sign above a parked car">
      <path d="M40 300 L110 180 H330 L280 300 Z" fill={C.line} {...stroke} />
      <path d="M180 180 L140 300 M256 180 L216 300" stroke={C.card} strokeWidth="6" />
      <g transform="translate(162 214) rotate(-8)">
        <rect width="70" height="112" rx="18" fill={C.terracotta} {...stroke} />
        <rect x="10" y="18" width="50" height="26" rx="6" fill={C.powder} {...stroke} />
        <rect x="10" y="70" width="50" height="22" rx="6" fill={C.powder} {...stroke} />
      </g>
      <path d="M80 300 V92" {...stroke} strokeWidth="6" />
      <rect x="40" y="40" width="84" height="84" rx="14" fill={C.peacock} {...stroke} />
      <text x="82" y="102" textAnchor="middle" fontFamily="var(--font-display)" fontSize="62" fontWeight="600" fill={C.card}>
        P
      </text>
    </Frame>
  );
}

function LinenTable() {
  return (
    <Frame label="Draped table with a marigold garland and a brass urli">
      <ellipse cx="180" cy="176" rx="136" ry="34" fill={C.card} {...stroke} />
      <path d="M44 176 Q40 250 56 312 H304 Q320 250 316 176 Q180 230 44 176 Z" fill={C.card} {...stroke} />
      <path d="M92 210 Q98 262 88 312 M150 222 Q156 270 146 312 M210 222 Q204 270 214 312 M268 210 Q262 262 272 312" fill="none" stroke={C.line} strokeWidth="3" />
      <path d="M52 186 Q116 238 180 208 Q244 238 308 186" fill="none" stroke={C.marigold} strokeWidth="12" strokeLinecap="round" strokeDasharray="0.1 14" />
      <path d="M52 186 Q116 238 180 208 Q244 238 308 186" fill="none" stroke={C.terracotta} strokeWidth="5" strokeLinecap="round" strokeDasharray="0.1 28" />
      <path d="M130 158 Q180 196 230 158 Z" fill={C.marigold} {...stroke} />
      {[150, 172, 194, 212].map((x, i) => (
        <circle key={x} cx={x} cy={150 - (i % 2) * 6} r="8" fill={i % 2 ? C.rose : C.terracotta} stroke={C.ink} strokeWidth="1.5" />
      ))}
      <path d="M180 132 v-18" stroke={C.ink} strokeWidth="2" />
      <path d="M180 114 q-6 -10 0 -18 q6 8 0 18" fill={C.butter} stroke={C.ink} strokeWidth="1.5" />
    </Frame>
  );
}

/** Pastel background per category (landing panels, listing galleries). */
export const CATEGORY_TINT: Record<ResourceCategory, string> = {
  BANQUET_SPACE: "hsl(var(--rose))",
  CHAIRS_TABLES: "hsl(var(--butter))",
  VEHICLES: "hsl(var(--powder))",
  KITCHEN: "hsl(var(--peach))",
  AV_EQUIPMENT: "hsl(var(--mint))",
  PARKING: "hsl(var(--sand))",
  LINEN_DECOR: "color-mix(in srgb, hsl(var(--pending)) 22%, hsl(var(--paper)))",
};

export const CATEGORY_ART: Record<ResourceCategory, () => JSX.Element> = {
  BANQUET_SPACE: BanquetHall,
  CHAIRS_TABLES: ChiavariChair,
  VEHICLES: ReeferVan,
  KITCHEN: KitchenLine,
  AV_EQUIPMENT: AvRig,
  PARKING: ParkingBay,
  LINEN_DECOR: LinenTable,
};
