/**
 * Shared state + copy for the "Day in Mumbai" hero.
 *
 * One master GSAP timeline (duration = 100 units, so 1 unit = 1% of scroll)
 * tweens the numeric fields of `StoryState`. The R3F scene reads them every
 * frame; the DOM overlay reads them in the timeline's onUpdate.
 */

export interface StoryState {
  /** 0–100 linear scroll progress (drives time of day, sky, clock). */
  p: number;

  /* Act 0 — intro */
  /** 0 → 1: hero chair shrinks + drops into the city, camera pulls back. */
  pull: number;

  /* Act 1 — 07:00 AM IDLE */
  windows: number; // windows switching on one by one
  idle: number; // idle items bounce in beside buildings
  tags: number; // HTML tags pinned to 3D positions
  counter: number; // ₹ counter roll-up
  note: number; // Caveat annotation + hand-drawn arrow
  ui1: number; // act-1 overlay visibility

  /* Act 2 — 11:30 AM THE NEED */
  roof: number; // camera dolly to the caterer's rooftop
  ui2: number; // act-2 overlay visibility
  typing: number; // chat bubble typed letter by letter
  shatter: number; // bubble shatters
  settle: number; // chips snap into the request card (not `snap` — reserved by GSAP)

  /* Act 3 — 02:00 PM MATCH */
  radar: number; // peacock radar ring sweeping out from the caterer
  glow: number; // provider buildings glow in rank order
  ui3: number; // act-3 overlay visibility
  cards: number; // ranked score cards fly out + bars fill
  note3: number; // Caveat annotation
  merge: number; // top two cards merge into the bundle

  /* Act 4 — 05:30 PM MOVE */
  venue: number; // camera drifts toward the banquet hall (0.35 in act 4, 1 in act 5)
  drive: number; // vans along road splines
  arcs: number; // chairs on marigold arcs
  walk: number; // capsule-people carrying chairs along the promenade
  ui4: number; // calendar strip visibility
  conflict: number; // slot flashes red + shakes
  reroute: number; // auto-reroute to next free slot

  /* Act 5 — 08:00 PM THE EVENT */
  lights: number; // string lights along the catenaries
  petals: number; // falling marigold petals
  ui5: number; // counters visibility
  count5: number; // counters roll up
  outro: number; // blend out into the next section
}

export const createStoryState = (): StoryState => ({
  p: 0,
  pull: 0,
  windows: 0,
  idle: 0,
  tags: 0,
  counter: 0,
  note: 0,
  ui1: 0,
  roof: 0,
  ui2: 0,
  typing: 0,
  shatter: 0,
  settle: 0,
  radar: 0,
  glow: 0,
  ui3: 0,
  cards: 0,
  note3: 0,
  merge: 0,
  venue: 0,
  drive: 0,
  arcs: 0,
  walk: 0,
  ui4: 0,
  conflict: 0,
  reroute: 0,
  lights: 0,
  petals: 0,
  ui5: 0,
  count5: 0,
  outro: 0,
});

/** Timeline positions (in % of the pinned scroll) of each act label. */
export const ACT_STARTS = [0, 12, 30, 45, 62, 80] as const;

export interface ActCopy {
  time: string;
  name: string;
  headline?: string;
  emphasis?: string;
  sub?: string;
  /** Show the primary CTAs under the headline. */
  cta?: boolean;
}

export const ACTS: ActCopy[] = [
  {
    time: "06:00 AM",
    name: "SPARE",
    headline: "Mumbai's hospitality, shared.",
    emphasis: "shared.",
    sub: "Hotels, caterers and banquet halls lending each other what sits idle — by the hour.",
  },
  {
    time: "07:00 AM",
    name: "IDLE",
    headline: "Your idle assets are someone's emergency.",
    emphasis: "emergency.",
    sub: "Chairs in storerooms. Vans in basements. Ballrooms dark on a Tuesday.",
  },
  {
    time: "11:30 AM",
    name: "THE NEED",
    headline: "Ask like you text. We'll understand.",
    emphasis: "understand.",
    sub: "Forward the WhatsApp message. Spare turns it into a structured request in seconds.",
  },
  {
    time: "02:00 PM",
    name: "MATCH",
    headline: "Ranked for you. Explained, not guessed.",
    emphasis: "Explained,",
    sub: "Every nearby provider scored on price, distance, availability, capacity and reliability.",
  },
  {
    time: "05:30 PM",
    name: "MOVE",
    headline: "No double bookings. Ever.",
    emphasis: "Ever.",
    sub: "Vans routed, chairs counted, calendars locked — conflicts caught before they cost you.",
  },
  {
    time: "08:00 PM",
    name: "THE EVENT",
    headline: "Idle to income. Shortage to solved.",
    emphasis: "solved.",
    sub: "Three businesses, one evening, zero phone calls.",
    cta: true,
  },
];

/* ------------------------------------------------------------------ */
/* Act 3 — ranked providers (order = rank)                             */
/* ------------------------------------------------------------------ */

export interface MatchCard {
  building: "residency" | "cinema" | "hotel" | "restaurant" | "office";
  name: string;
  km: number;
  landed: number;
  chairs: number;
  /** price, distance, availability, capacity, reliability (0–1) */
  score: [number, number, number, number, number];
}

export const MATCHES: MatchCard[] = [
  { building: "residency", name: "Lakeside Residency", km: 1.2, landed: 6300, chairs: 100, score: [0.92, 0.95, 1, 0.7, 0.96] },
  { building: "cinema", name: "Regal Deco Hall", km: 1.8, landed: 3400, chairs: 50, score: [0.88, 0.86, 1, 0.45, 0.9] },
  { building: "hotel", name: "Seaview Juhu Hotel", km: 2.6, landed: 9800, chairs: 150, score: [0.55, 0.72, 0.8, 1, 0.94] },
  { building: "restaurant", name: "Carter Road Kitchen", km: 3.4, landed: 10900, chairs: 80, score: [0.48, 0.6, 0.65, 0.55, 0.82] },
  { building: "office", name: "Metro Events Office", km: 4.1, landed: 11600, chairs: 150, score: [0.4, 0.5, 0.5, 1, 0.7] },
];

export const BUNDLE = {
  label: "Bundle: 100 + 50 chairs",
  from: `${MATCHES[0].name} + ${MATCHES[1].name}`,
  landed: MATCHES[0].landed + MATCHES[1].landed,
};

export function actAt(p: number): number {
  let i = 0;
  for (let k = 0; k < ACT_STARTS.length; k++) if (p >= ACT_STARTS[k]) i = k;
  return i;
}

/* ------------------------------------------------------------------ */
/* Time of day                                                         */
/* ------------------------------------------------------------------ */

/** [progress %, minutes since midnight] */
const CLOCK_KEYS: [number, number][] = [
  [0, 360], // 06:00
  [12, 420], // 07:00
  [30, 690], // 11:30
  [45, 840], // 14:00
  [62, 1050], // 17:30
  [80, 1200], // 20:00
  [100, 1320], // 22:00
];

export function minutesAt(p: number): number {
  for (let i = 1; i < CLOCK_KEYS.length; i++) {
    const [p1, m1] = CLOCK_KEYS[i];
    const [p0, m0] = CLOCK_KEYS[i - 1];
    if (p <= p1) return m0 + ((m1 - m0) * (p - p0)) / (p1 - p0);
  }
  return CLOCK_KEYS[CLOCK_KEYS.length - 1][1];
}

export function formatClock(minutes: number) {
  const m = Math.floor(minutes) % 1440;
  const h24 = Math.floor(m / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return {
    hh: String(h12).padStart(2, "0"),
    mm: String(m % 60).padStart(2, "0"),
    ampm: h24 < 12 ? "AM" : "PM",
  };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Sun/moon position for a given time. `t` 0 = sunrise, 1 = sunset. */
export function sunAt(minutes: number) {
  const t = (minutes - 360) / 780; // 06:00 → 19:00
  const tc = clamp01(t);
  return {
    t: tc,
    elevation: Math.sin(Math.PI * tc), // 0..1
    night: smooth(1100, 1200, minutes),
    moonT: clamp01((minutes - 1150) / 300),
  };
}

/* ------------------------------------------------------------------ */
/* Sky + light keyframes                                               */
/* ------------------------------------------------------------------ */

interface SkyKey {
  at: number;
  top: string;
  bottom: string;
  light: string;
  lightI: number;
  hemiI: number;
}

const SKY_KEYS: SkyKey[] = [
  { at: 0, top: "#FDE8D0", bottom: "#F9C9A8", light: "#FFC9A0", lightI: 1.05, hemiI: 0.72 }, // dawn
  { at: 14, top: "#FDE8D0", bottom: "#F9C9A8", light: "#FFD7B0", lightI: 1.2, hemiI: 0.76 }, // dawn, sun up
  { at: 32, top: "#FFF6E5", bottom: "#CFE7EE", light: "#FFF8EE", lightI: 1.45, hemiI: 0.8 }, // noon
  { at: 50, top: "#FFF6E5", bottom: "#CFE7EE", light: "#FFF8EE", lightI: 1.45, hemiI: 0.8 },
  { at: 62, top: "#FCE3B8", bottom: "#F6D3A0", light: "#FFE2B0", lightI: 1.35, hemiI: 0.76 }, // afternoon
  { at: 72, top: "#F7B27A", bottom: "#E8795A", light: "#FF9A5C", lightI: 1.15, hemiI: 0.62 }, // golden
  { at: 84, top: "#3A2A4A", bottom: "#8A4A5A", light: "#B7A2D8", lightI: 0.32, hemiI: 0.38 }, // warm night
  { at: 100, top: "#3A2A4A", bottom: "#8A4A5A", light: "#B7A2D8", lightI: 0.32, hemiI: 0.38 },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixColor(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** 0 → 1 as the sky turns to night; used to flip overlay text to paper. */
export const nightUI = (p: number) => smooth(74, 82, p);

export function skyAt(p: number) {
  let i = 1;
  while (i < SKY_KEYS.length - 1 && p > SKY_KEYS[i].at) i++;
  const a = SKY_KEYS[i - 1];
  const b = SKY_KEYS[i];
  const t = smooth(a.at, b.at, p);
  return {
    top: mixColor(a.top, b.top, t),
    bottom: mixColor(a.bottom, b.bottom, t),
    light: mixColor(a.light, b.light, t),
    lightI: a.lightI + (b.lightI - a.lightI) * t,
    hemiI: a.hemiI + (b.hemiI - a.hemiI) * t,
  };
}
