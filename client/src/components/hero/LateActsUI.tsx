import { Link } from "react-router-dom";
import { useRef, type ReactNode } from "react";
import { motion, useSpring } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatINR } from "@/lib/utils";
import { BUNDLE, MATCHES, type StoryState } from "./story";

/*
 * DOM overlays for acts 3–5. Each block exposes a refs object and an
 * `apply*` function the master timeline calls on every update, so all of
 * it scrubs (and reverses) with scroll.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
function backOut(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export interface ScreenPoint {
  x: number;
  y: number;
}

/* ------------------------------------------------------------------ */
/* Score bar                                                           */
/* ------------------------------------------------------------------ */

const segTone = (v: number) => (v >= 0.75 ? "bg-available" : v >= 0.5 ? "bg-accent" : "bg-conflict");

function ScoreBar({ score, refs }: { score: readonly number[]; refs: (HTMLSpanElement | null)[] }) {
  return (
    <div className="mt-2.5 grid grid-cols-5 gap-1" aria-hidden>
      {score.map((v, j) => (
        <span key={j} className="h-1.5 overflow-hidden rounded-full bg-border">
          <span ref={(el) => void (refs[j] = el)} className={cn("block h-full rounded-full", segTone(v))} style={{ width: 0 }} />
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Act 3 — ranked match cards → bundle                                 */
/* ------------------------------------------------------------------ */

export interface MatchRefs {
  column: HTMLDivElement | null;
  cards: (HTMLDivElement | null)[];
  fills: (HTMLSpanElement | null)[][];
  bundle: HTMLDivElement | null;
  bundleFills: (HTMLSpanElement | null)[];
  note: HTMLDivElement | null;
  noteText: HTMLSpanElement | null;
}

export const createMatchRefs = (): MatchRefs => ({
  column: null,
  cards: [],
  fills: MATCHES.map(() => []),
  bundle: null,
  bundleFills: [],
  note: null,
  noteText: null,
});

const BUNDLE_SCORE = MATCHES[0].score.map((v, j) => Math.max(v, MATCHES[1].score[j], 0.9));

export function MatchCards({ refs }: { refs: MatchRefs }) {
  return (
    <div
      ref={(el) => void (refs.column = el)}
      style={{ opacity: 0, visibility: "hidden" }}
      className="pointer-events-none absolute inset-x-4 top-[24%] mx-auto max-w-[320px] md:inset-x-auto md:right-[8%] md:top-[17%] md:w-[310px]"
    >
      {MATCHES.map((m, i) => (
        <div
          key={m.name}
          ref={(el) => void (refs.cards[i] = el)}
          style={{ opacity: 0 }}
          className={cn(
            "relative mb-2 rounded-lg border border-border bg-card px-4 py-3 shadow-card will-change-transform",
            i >= 3 && "hidden md:block"
          )}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2 text-sm font-medium text-ink">
              <span className="font-mono text-[10px] text-muted">#{i + 1}</span>
              <span className="truncate">{m.name}</span>
            </span>
            <span className="shrink-0 font-mono text-sm tabular-nums text-ink">₹{formatINR(m.landed)}</span>
          </div>
          <div className="mt-0.5 flex justify-between font-mono text-[10px] tabular-nums text-muted">
            <span>
              {m.km} km · {m.chairs} chairs
            </span>
            <span>landed</span>
          </div>
          <ScoreBar score={m.score} refs={refs.fills[i]} />
        </div>
      ))}

      {/* Bundle — takes the place of #1 + #2 */}
      <div
        ref={(el) => void (refs.bundle = el)}
        style={{ opacity: 0 }}
        className="absolute inset-x-0 top-0 rounded-lg border-2 border-available/60 bg-card px-4 py-3.5 shadow-card-hover"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="whitespace-nowrap font-display text-base leading-tight text-ink">{BUNDLE.label}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-available/10 px-2 py-0.5 text-[10px] font-medium text-available">
            <Sparkles className="size-3" /> Best match
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3 text-xs text-muted">
          <span className="truncate">{BUNDLE.from}</span>
          <span className="shrink-0 font-mono text-sm tabular-nums text-ink">₹{formatINR(BUNDLE.landed)}</span>
        </div>
        <ScoreBar score={BUNDLE_SCORE} refs={refs.bundleFills} />
      </div>

      {/* Caveat annotation, left of #1 */}
      <div ref={(el) => void (refs.note = el)} style={{ opacity: 0 }} className="absolute right-full top-3 mr-4 hidden md:block">
        <span
          ref={(el) => void (refs.noteText = el)}
          className="block whitespace-nowrap font-hand text-[26px] leading-none text-terracotta [text-shadow:0_1px_12px_rgba(251,244,232,0.9)]"
          style={{ clipPath: "inset(0 100% 0 0)" }}
        >
          1.2 km away, cheaper, and free at 6 →
        </span>
      </div>
    </div>
  );
}

export function applyMatch(r: MatchRefs, S: StoryState, anchors: ScreenPoint[], root: DOMRect) {
  const col = r.column;
  if (!col) return;
  col.style.opacity = String(S.ui3);
  col.style.visibility = S.ui3 > 0.001 ? "visible" : "hidden";
  if (S.ui3 <= 0.001) return;

  const colRect = col.getBoundingClientRect();
  const m = S.merge;
  const move = smooth(0, 0.5, m);
  const swap = smooth(0.42, 0.58, m);
  const [c0, c1] = r.cards;
  const pair = c0 && c1 ? (c1.offsetTop - c0.offsetTop) / 2 : 0;

  r.cards.forEach((card, i) => {
    if (!card) return;
    const fly = clamp01((S.cards - i * 0.12) / 0.4);
    const e = backOut(fly);
    const fx = colRect.left - root.left + card.offsetLeft + card.offsetWidth / 2;
    const fy = colRect.top - root.top + card.offsetTop + card.offsetHeight / 2;
    const a = anchors[i] ?? { x: root.width * (0.3 + i * 0.1), y: root.height * 0.6 };
    let dy = (a.y - fy) * (1 - e);
    const dx = (a.x - fx) * (1 - e);
    let op = clamp01(fly * 3);
    if (i === 0) {
      dy += pair * move;
      op *= 1 - swap;
    } else if (i === 1) {
      dy -= pair * move;
      op *= 1 - swap;
    } else {
      op *= 1 - 0.45 * swap;
    }
    card.style.opacity = op.toFixed(3);
    card.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${(0.3 + 0.7 * e).toFixed(3)})`;

    const fill = clamp01((S.cards - 0.25 - i * 0.1) / 0.45);
    r.fills[i].forEach((seg, j) => {
      if (seg) seg.style.width = `${MATCHES[i].score[j] * clamp01(fill * 5 - j) * 100}%`;
    });
  });

  if (r.bundle && c0 && c1) {
    const snapK = backOut(clamp01((m - 0.45) / 0.4));
    const mid = (c0.offsetTop + c1.offsetTop + c1.offsetHeight) / 2;
    r.bundle.style.top = `${mid - r.bundle.offsetHeight / 2}px`;
    r.bundle.style.opacity = swap.toFixed(3);
    r.bundle.style.transform = `scale(${(0.82 + 0.18 * snapK).toFixed(3)})`;
    r.bundleFills.forEach((seg, j) => {
      if (seg) seg.style.width = `${BUNDLE_SCORE[j] * clamp01(snapK * 5 - j) * 100}%`;
    });
  }

  if (r.note) r.note.style.opacity = S.note3 > 0 ? "1" : "0";
  if (r.noteText) r.noteText.style.clipPath = `inset(0 ${(100 - clamp01(S.note3) * 100).toFixed(1)}% 0 0)`;
}

/* ------------------------------------------------------------------ */
/* Act 4 — calendar strip: conflict → auto-reroute                     */
/* ------------------------------------------------------------------ */

const SLOTS = ["4:00", "4:30", "5:00", "5:30", "6:00", "6:30"];
const CONFLICT_SLOT = 2;
const NEXT_SLOT = 3;

export interface CalendarRefs {
  root: HTMLDivElement | null;
  slots: (HTMLDivElement | null)[];
  cursor: HTMLDivElement | null;
  booked: HTMLSpanElement | null;
  rerouted: HTMLSpanElement | null;
}

export const createCalendarRefs = (): CalendarRefs => ({ root: null, slots: [], cursor: null, booked: null, rerouted: null });

export function CalendarStrip({ refs }: { refs: CalendarRefs }) {
  return (
    <div className="pointer-events-none absolute inset-x-4 top-[26%] mx-auto max-w-[400px] md:inset-x-auto md:right-[8%] md:top-1/2 md:w-[400px] md:-translate-y-1/2">
      <div ref={(el) => void (refs.root = el)} style={{ opacity: 0 }} className="rounded-lg border border-border bg-card p-4 shadow-card">
        <div className="flex items-baseline justify-between gap-3">
          <span className="eyebrow">Pickup · Sat 12 Oct</span>
          <span className="truncate font-mono text-[11px] text-muted">{MATCHES[1].name}</span>
        </div>
        <div className="relative mt-3 grid grid-cols-6 gap-1.5">
          {SLOTS.map((s, i) => (
            <div
              key={s}
              ref={(el) => void (refs.slots[i] = el)}
              className="rounded-md border border-border bg-paper py-2 text-center font-mono text-[11px] tabular-nums text-muted"
            >
              {s}
              <span className="block text-[9px] opacity-70">PM</span>
            </div>
          ))}
          <div ref={(el) => void (refs.cursor = el)} className="absolute inset-y-0 rounded-md" style={{ opacity: 0 }} />
        </div>
        <div className="relative mt-3 h-7">
          <span
            ref={(el) => void (refs.booked = el)}
            style={{ opacity: 0 }}
            className="absolute left-0 top-0 inline-flex h-7 items-center rounded-full bg-conflict/10 px-3 text-xs font-medium text-conflict"
          >
            Already booked · 5:00 PM
          </span>
          <span
            ref={(el) => void (refs.rerouted = el)}
            style={{ opacity: 0 }}
            className="absolute left-0 top-0 inline-flex h-7 items-center gap-1.5 rounded-full bg-available/10 px-3 text-xs font-medium text-available"
          >
            <Check className="size-3.5" /> Rerouted → 5:30 PM
          </span>
        </div>
      </div>
    </div>
  );
}

export function applyCalendar(r: CalendarRefs, S: StoryState) {
  if (!r.root) return;
  r.root.style.opacity = String(S.ui4);
  r.root.style.transform = `translateX(${((1 - S.ui4) * 40).toFixed(1)}px)`;
  if (S.ui4 <= 0.001) return;

  const c = S.conflict;
  const rr = S.reroute;
  const flash = c > 0 ? 0.55 + 0.45 * Math.abs(Math.sin(c * Math.PI * 3)) : 0;
  const red = flash * (1 - smooth(0, 0.5, rr));
  const shake = c > 0 && c < 1 ? Math.sin(c * Math.PI * 12) * 7 * (1 - c) : 0;

  const bad = r.slots[CONFLICT_SLOT];
  const next = r.slots[NEXT_SLOT];
  if (bad) {
    bad.style.backgroundColor = red > 0 ? `hsl(var(--conflict) / ${(0.16 * red).toFixed(3)})` : "";
    bad.style.borderColor = red > 0 ? `hsl(var(--conflict) / ${(0.3 + 0.6 * red).toFixed(3)})` : "";
    bad.style.color = red > 0 ? "hsl(var(--conflict))" : "";
    bad.style.textDecoration = rr > 0.5 ? "line-through" : "";
    bad.style.transform = `translateX(${shake.toFixed(1)}px)`;
  }
  if (next) {
    next.style.backgroundColor = rr > 0 ? `hsl(var(--peacock) / ${(0.14 * clamp01(rr)).toFixed(3)})` : "";
    next.style.borderColor = rr > 0 ? `hsl(var(--peacock) / ${(0.3 + 0.6 * clamp01(rr)).toFixed(3)})` : "";
    next.style.color = rr > 0.3 ? "hsl(var(--peacock))" : "";
  }

  if (r.cursor && bad && next) {
    const tone = rr > 0.35 ? "var(--peacock)" : c > 0 ? "var(--conflict)" : "var(--terracotta)";
    r.cursor.style.opacity = "1";
    r.cursor.style.left = `${bad.offsetLeft}px`;
    r.cursor.style.width = `${bad.offsetWidth}px`;
    r.cursor.style.boxShadow = `0 0 0 2px hsl(${tone})`;
    r.cursor.style.transform = `translateX(${((next.offsetLeft - bad.offsetLeft) * rr + shake).toFixed(1)}px)`;
  }
  if (r.booked) {
    r.booked.style.opacity = (c > 0.15 ? 1 - smooth(0, 0.4, rr) : 0).toFixed(3);
    r.booked.style.transform = `translateX(${shake.toFixed(1)}px)`;
  }
  if (r.rerouted) {
    r.rerouted.style.opacity = smooth(0.2, 0.7, rr).toFixed(3);
    r.rerouted.style.transform = `scale(${(0.9 + 0.1 * backOut(clamp01(rr))).toFixed(3)})`;
  }
}

/* ------------------------------------------------------------------ */
/* Act 5 — counters                                                    */
/* ------------------------------------------------------------------ */

const COUNTERS = [
  { caption: "earned from idle assets", value: (k: number) => `₹${formatINR(Math.round(48200 * k))}` },
  { caption: "double bookings", value: () => "0" },
  { caption: "businesses, 1 evening", value: (k: number) => String(Math.round(3 * k)) },
];

export interface CounterRefs {
  root: HTMLDivElement | null;
  items: (HTMLDivElement | null)[];
  values: (HTMLSpanElement | null)[];
}

export const createCounterRefs = (): CounterRefs => ({ root: null, items: [], values: [] });

export function EventCounters({ refs }: { refs: CounterRefs }) {
  return (
    <div
      ref={(el) => void (refs.root = el)}
      style={{ opacity: 0, visibility: "hidden" }}
      className="pointer-events-none absolute inset-x-4 top-[24%] mx-auto grid max-w-[420px] grid-cols-3 gap-2 md:inset-x-auto md:right-[8%] md:top-[20%] md:w-[300px] md:grid-cols-1 md:gap-2.5"
    >
      {COUNTERS.map((c, i) => (
        <div
          key={c.caption}
          ref={(el) => void (refs.items[i] = el)}
          style={{ opacity: 0 }}
          className="rounded-lg border border-border bg-card/95 px-3 py-2.5 shadow-card md:px-5 md:py-4"
        >
          <span ref={(el) => void (refs.values[i] = el)} className="block font-mono text-lg font-medium tabular-nums text-ink md:text-3xl">
            {c.value(0)}
          </span>
          <span className="mt-0.5 block text-[10px] leading-tight text-muted md:text-xs">{c.caption}</span>
        </div>
      ))}
    </div>
  );
}

export function applyCounters(r: CounterRefs, S: StoryState) {
  if (!r.root) return;
  r.root.style.opacity = String(S.ui5);
  r.root.style.visibility = S.ui5 > 0.001 ? "visible" : "hidden";
  COUNTERS.forEach((c, i) => {
    const k = clamp01((S.count5 - i * 0.15) / 0.55);
    const item = r.items[i];
    if (item) {
      item.style.opacity = clamp01(k * 3).toFixed(3);
      item.style.transform = `translateY(${((1 - easeOut(k)) * 18).toFixed(1)}px)`;
    }
    const v = r.values[i];
    if (v) v.textContent = c.value(easeOut(k));
  });
}

/* ------------------------------------------------------------------ */
/* Magnetic CTAs                                                       */
/* ------------------------------------------------------------------ */

function Magnetic({ children, strength = 0.35 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 260, damping: 18, mass: 0.4 });
  const y = useSpring(0, { stiffness: 260, damping: 18, mass: 0.4 });

  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      className="inline-block"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export function MagneticCTAs() {
  return (
    <div className="pointer-events-auto mt-7 flex flex-wrap items-center gap-3">
      <Magnetic>
        <Button asChild size="lg">
          <Link to="/discover">
            Find a resource
            <ArrowRight />
          </Link>
        </Button>
      </Magnetic>
      <Magnetic>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="border-[color:rgb(var(--hero-fg)/0.35)] text-[color:rgb(var(--hero-fg))] hover:border-[color:rgb(var(--hero-fg))] hover:bg-[color:rgb(var(--hero-fg))] hover:text-[color:rgb(var(--hero-bg))]"
        >
          <Link to="/dashboard">List your assets</Link>
        </Button>
      </Magnetic>
    </div>
  );
}
