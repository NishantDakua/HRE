import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, type Variants } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Armchair, CalendarClock, Check, CheckCheck, IndianRupee, MapPin, Projector, type LucideIcon } from "lucide-react";
import { useLenis } from "@/components/smooth-scroll";
import { cn } from "@/lib/utils";
import {
  CalendarStrip,
  EventCounters,
  MagneticCTAs,
  MatchCards,
  applyCalendar,
  applyCounters,
  applyMatch,
  createCalendarRefs,
  createCounterRefs,
  createMatchRefs,
  type ScreenPoint,
} from "./LateActsUI";
import { StaticActs } from "./StaticActs";
import {
  ACTS,
  ACT_STARTS,
  actAt,
  createStoryState,
  formatClock,
  minutesAt,
  nightUI,
  skyAt,
  sunAt,
  type StoryState,
} from "./story";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const MumbaiScene = lazy(() => import("./MumbaiScene"));

const EASE = [0.22, 1, 0.36, 1] as const;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------ */
/* Mode: full 3D vs static SVG                                         */
/* ------------------------------------------------------------------ */

type Mode = "detecting" | "scene" | "static";

function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function useMode(): Mode {
  const [mode, setMode] = useState<Mode>("detecting");
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const small = window.matchMedia("(max-width: 767px)");
    const update = () => setMode(reduced.matches || small.matches || !supportsWebGL() ? "static" : "scene");
    update();
    reduced.addEventListener("change", update);
    small.addEventListener("change", update);
    return () => {
      reduced.removeEventListener("change", update);
      small.removeEventListener("change", update);
    };
  }, []);
  return mode;
}

/* ------------------------------------------------------------------ */
/* Split-letter headline                                               */
/* ------------------------------------------------------------------ */

const letter: Variants = {
  hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, delay: i * 0.016, ease: EASE },
  }),
  exit: { opacity: 0, y: -16, filter: "blur(6px)", transition: { duration: 0.25, ease: EASE } },
};

function SplitHeadline({ text, emphasis }: { text: string; emphasis?: string }) {
  let i = 0;
  return (
    <span aria-label={text} className="block">
      {text.split(" ").map((word, w) => {
        const letters = Array.from(word).map((ch) => (
          <motion.span key={i} custom={i++} variants={letter} className="inline-block" aria-hidden>
            {ch}
          </motion.span>
        ));
        return (
          <span key={w} className="mr-[0.24em] inline-block whitespace-nowrap">
            {word === emphasis ? <em>{letters}</em> : letters}
          </span>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Act 2 — chat → structured request                                   */
/* ------------------------------------------------------------------ */

const MESSAGE = Array.from("need 150 chairs + 2 projectors, Andheri, Sat 6–11pm, budget 12k 🙏");

const CHIPS: { icon: LucideIcon; label: string; dx: number; dy: number; rot: number }[] = [
  { icon: Armchair, label: "Chairs ×150", dx: 30, dy: -150, rot: -14 },
  { icon: Projector, label: "Projector ×2", dx: -60, dy: -175, rot: 12 },
  { icon: MapPin, label: "Andheri", dx: 80, dy: -190, rot: 20 },
  { icon: CalendarClock, label: "Sat 6–11 PM", dx: 10, dy: -210, rot: -8 },
  { icon: IndianRupee, label: "≤ ₹12,000", dx: -40, dy: -230, rot: 16 },
];

const SHARDS = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2 + 0.3;
  return { x: Math.cos(a) * (90 + (i % 3) * 30), y: Math.sin(a) * (50 + (i % 4) * 14), r: (i % 2 ? 1 : -1) * (40 + i * 9) };
});

interface ChatRefs {
  root: HTMLDivElement | null;
  bubble: HTMLDivElement | null;
  typed: HTMLSpanElement | null;
  caret: HTMLSpanElement | null;
  dots: HTMLSpanElement | null;
  shards: (HTMLSpanElement | null)[];
  chips: (HTMLDivElement | null)[];
  card: HTMLDivElement | null;
  cardHead: HTMLDivElement | null;
}

function ChatToCard({ refs }: { refs: ChatRefs }) {
  return (
    <div
      ref={(el) => void (refs.root = el)}
      style={{ opacity: 0, visibility: "hidden" }}
      className="pointer-events-none absolute inset-x-4 top-[26%] mx-auto w-auto max-w-[360px] md:inset-x-auto md:right-[9%] md:top-1/2 md:w-[360px] md:-translate-y-1/2"
    >
      {/* WhatsApp-style bubble */}
      <div className="relative">
        <div
          ref={(el) => void (refs.bubble = el)}
          className="relative ml-auto w-[88%] rounded-2xl rounded-tr-sm bg-mint px-4 pb-2 pt-3 text-[15px] leading-snug text-ink shadow-card"
        >
          <div className="mb-1 font-sans text-[11px] font-medium text-peacock">Juhu Tara Caterers</div>
          <span ref={(el) => void (refs.dots = el)} className="inline-flex gap-1 py-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 animate-bounce rounded-full bg-ink/40 motion-reduce:animate-none" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </span>
          <span ref={(el) => void (refs.typed = el)} />
          <span ref={(el) => void (refs.caret = el)} className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-ink" style={{ opacity: 0 }} />
          <div className="mt-1 flex items-center justify-end gap-1 font-mono text-[10px] text-ink/50">
            11:32 <CheckCheck className="size-3 text-pending" />
          </div>
        </div>
        {SHARDS.map((_, i) => (
          <span
            key={i}
            ref={(el) => void (refs.shards[i] = el)}
            className="absolute left-1/2 top-1/2 size-3 rounded-[3px] bg-mint"
            style={{ opacity: 0 }}
          />
        ))}
      </div>

      {/* Structured request card */}
      <div className="relative mt-6 p-4">
        <div
          ref={(el) => void (refs.card = el)}
          className="absolute inset-0 rounded-lg border border-border bg-card shadow-card"
          style={{ opacity: 0 }}
        />
        <div ref={(el) => void (refs.cardHead = el)} className="relative mb-3 flex items-center justify-between" style={{ opacity: 0 }}>
          <span className="eyebrow">Request · SPR-24E1</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-available/10 px-2 py-0.5 text-[10px] font-medium text-available">
            <Check className="size-3" /> Structured
          </span>
        </div>
        <div className="relative flex flex-wrap gap-2">
          {CHIPS.map((c, i) => (
            <div
              key={c.label}
              ref={(el) => void (refs.chips[i] = el)}
              style={{ opacity: 0 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1.5 font-mono text-xs text-ink shadow-[0_4px_14px_rgba(120,70,30,0.10)]"
            >
              <c.icon className="size-3.5 text-primary" strokeWidth={1.75} />
              {c.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export function DayInMumbai() {
  const mode = useMode();
  const lenis = useLenis();
  const S = useRef<StoryState>(createStoryState()).current;
  /** Plain React wrapper GSAP never touches — the useGSAP scope. */
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const actRef = useRef(0);
  const [act, setAct] = useState(0);
  const [active, setActive] = useState(true);

  const anchors = useRef<ScreenPoint[]>([]).current;
  const match = useRef(createMatchRefs()).current;
  const calendar = useRef(createCalendarRefs()).current;
  const counters = useRef(createCounterRefs()).current;

  const el = useRef({
    sticky: null as HTMLDivElement | null,
    outro: null as HTMLDivElement | null,
    sky: null as HTMLDivElement | null,
    sun: null as HTMLDivElement | null,
    moon: null as HTMLDivElement | null,
    wordmark: null as HTMLDivElement | null,
    hh: null as HTMLSpanElement | null,
    mm: null as HTMLSpanElement | null,
    ampm: null as HTMLSpanElement | null,
    hourHand: null as SVGLineElement | null,
    minuteHand: null as SVGLineElement | null,
    railFill: null as HTMLDivElement | null,
    counter: null as HTMLDivElement | null,
    counterValue: null as HTMLSpanElement | null,
    layers: [] as (SVGSVGElement | null)[],
  }).current;

  const chat = useRef<ChatRefs>({
    root: null,
    bubble: null,
    typed: null,
    caret: null,
    dots: null,
    shards: [],
    chips: [],
    card: null,
    cardHead: null,
  }).current;

  useGSAP(
    () => {
      if (mode === "detecting") return;
      const section = sectionRef.current;
      if (!section) return;

      let lastClock = "";
      let lastTyped = -1;

      /** Write every scroll-driven DOM value. Called on each timeline update. */
      const apply = () => {
        const p = S.p;

        // Sky + sun/moon
        const sky = skyAt(p);
        const minutes = minutesAt(p);
        const sun = sunAt(minutes);
        if (el.sky) el.sky.style.background = `linear-gradient(180deg, ${sky.top} 0%, ${sky.bottom} 100%)`;
        if (el.sun) {
          el.sun.style.left = `${8 + sun.t * 84}%`;
          el.sun.style.top = `${74 - sun.elevation * 58}%`;
          el.sun.style.opacity = String(1 - sun.night);
          el.sun.style.background = `radial-gradient(circle, #FFF8E8 0%, ${sky.light} 55%, transparent 70%)`;
        }
        if (el.moon) {
          el.moon.style.left = `${74 - sun.moonT * 26}%`;
          el.moon.style.top = `${70 - sun.moonT * 46}%`;
          el.moon.style.opacity = String(sun.night);
        }

        // Act 0 wordmark
        if (el.wordmark) {
          el.wordmark.style.opacity = String(Math.max(0, 1 - S.pull * 1.6));
          el.wordmark.style.transform = `translateY(${-S.pull * 6}vh) scale(${1 + S.pull * 0.12})`;
        }

        // Clock
        const clock = formatClock(minutes);
        const key = clock.hh + clock.mm + clock.ampm;
        if (key !== lastClock) {
          lastClock = key;
          if (el.hh) el.hh.textContent = clock.hh;
          if (el.mm) el.mm.textContent = clock.mm;
          if (el.ampm) el.ampm.textContent = clock.ampm;
        }
        el.hourHand?.setAttribute("transform", `rotate(${((minutes / 60) % 12) * 30} 28 28)`);
        el.minuteHand?.setAttribute("transform", `rotate(${(minutes % 60) * 6} 28 28)`);

        // Act + rail
        const a = actAt(p);
        if (a !== actRef.current) {
          actRef.current = a;
          setAct(a);
        }
        if (el.railFill) el.railFill.style.transform = `scaleY(${p / 100})`;

        // Act 1 counter
        if (el.counter) {
          el.counter.style.opacity = String(S.ui1);
          el.counter.style.transform = `translateY(${(1 - S.ui1) * 16}px)`;
        }
        if (el.counterValue) el.counterValue.textContent = `₹${(4.2 * S.counter).toFixed(1)} Cr`;

        // Act 2 chat → card
        if (chat.root) {
          chat.root.style.opacity = String(S.ui2);
          chat.root.style.visibility = S.ui2 > 0.001 ? "visible" : "hidden";
        }
        const n = Math.round(S.typing * MESSAGE.length);
        if (n !== lastTyped && chat.typed) {
          lastTyped = n;
          chat.typed.textContent = MESSAGE.slice(0, n).join("");
        }
        if (chat.dots) chat.dots.style.display = n === 0 ? "inline-flex" : "none";
        if (chat.caret) chat.caret.style.opacity = S.typing > 0 && S.typing < 1 ? "1" : "0";
        if (chat.bubble) {
          chat.bubble.style.opacity = String(1 - S.shatter);
          chat.bubble.style.transform = `scale(${1 + S.shatter * 0.08})`;
          chat.bubble.style.filter = `blur(${S.shatter * 6}px)`;
        }
        chat.shards.forEach((node, i) => {
          if (!node) return;
          const s = S.shatter;
          const v = SHARDS[i];
          node.style.opacity = String(s > 0 && s < 1 ? Math.sin(s * Math.PI) : 0);
          node.style.transform = `translate(${v.x * s}px, ${v.y * s}px) rotate(${v.r * s}deg)`;
        });
        chat.chips.forEach((node, i) => {
          if (!node) return;
          const c = CHIPS[i];
          const inv = 1 - S.settle;
          node.style.opacity = String(clamp01(S.shatter * 1.6 - i * 0.08));
          node.style.transform = `translate(${c.dx * inv}px, ${c.dy * inv}px) rotate(${c.rot * inv}deg)`;
        });
        if (chat.card) chat.card.style.opacity = String(clamp01(S.settle));
        if (chat.cardHead) chat.cardHead.style.opacity = String(clamp01(S.settle));

        // Overlay text flips to paper at night, back to ink as we blend out.
        {
          const n = nightUI(p) * (1 - S.outro);
          const fg = [42 + (251 - 42) * n, 31 + (244 - 31) * n, 26 + (232 - 26) * n].map(Math.round).join(" ");
          const bg = [251 + (42 - 251) * n, 244 + (31 - 244) * n, 232 + (26 - 232) * n].map(Math.round).join(" ");
          // On :root so the transparent nav above the hero follows too.
          document.documentElement.style.setProperty("--hero-fg", fg);
          document.documentElement.style.setProperty("--hero-bg", bg);
        }

        // Acts 3–5 overlays
        if (el.sticky) applyMatch(match, S, anchors, el.sticky.getBoundingClientRect());
        applyCalendar(calendar, S);
        applyCounters(counters, S);
        if (el.outro) el.outro.style.opacity = String(S.outro);

        // Static fallback crossfade (one layer per act)
        el.layers.forEach((node, i) => {
          if (!node) return;
          const start = ACT_STARTS[i];
          const next = ACT_STARTS[i + 1];
          const fadeIn = i === 0 ? 1 : smooth(start - 3, start + 3, p);
          const fadeOut = next === undefined ? 0 : smooth(next - 3, next + 3, p);
          node.style.opacity = String(fadeIn * (1 - fadeOut));
        });
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: 1 },
        onUpdate: apply,
      });
      tlRef.current = tl;

      // Master clock: 100 units = 100% of the pinned scroll.
      tl.to(S, { p: 100, duration: 100 }, 0);

      // ── Act 0 · intro ─────────────────────────────────────────────
      tl.addLabel("act0", ACT_STARTS[0]).to(S, { pull: 1, duration: 8, ease: "power2.inOut" }, 3.5);

      // ── Act 1 · 07:00 AM IDLE ─────────────────────────────────────
      tl.addLabel("act1", ACT_STARTS[1])
        .to(S, { windows: 1, duration: 9 }, "act1")
        .to(S, { ui1: 1, duration: 2 }, "act1+=2")
        .to(S, { idle: 1, duration: 6 }, "act1+=2")
        .to(S, { counter: 1, duration: 6, ease: "power1.out" }, "act1+=4")
        .to(S, { tags: 1, duration: 3, ease: "power2.out" }, "act1+=5")
        .to(S, { note: 1, duration: 4 }, "act1+=8")
        .to(S, { tags: 0, note: 0, ui1: 0, duration: 2 }, "act1+=16");

      // ── Act 2 · 11:30 AM THE NEED ─────────────────────────────────
      tl.addLabel("act2", ACT_STARTS[2])
        .to(S, { roof: 1, duration: 5, ease: "power2.inOut" }, "act2")
        .to(S, { ui2: 1, duration: 1.5 }, "act2+=2")
        .to(S, { typing: 1, duration: 5 }, "act2+=3")
        .to(S, { shatter: 1, duration: 2, ease: "power2.out" }, "act2+=9")
        .to(S, { settle: 1, duration: 3, ease: "back.out(1.6)" }, "act2+=10.5");

      // ── Act 3 · 02:00 PM MATCH ────────────────────────────────────
      tl.addLabel("act3", ACT_STARTS[3])
        .to(S, { ui2: 0, duration: 1.5 }, "act3-=0.5")
        .to(S, { roof: 0, duration: 4, ease: "power2.inOut" }, "act3")
        .to(S, { radar: 1, duration: 6, ease: "power1.out" }, "act3+=1.5")
        .to(S, { glow: 1, duration: 5 }, "act3+=3")
        .to(S, { ui3: 1, duration: 1 }, "act3+=4")
        .to(S, { cards: 1, duration: 5, ease: "power1.out" }, "act3+=4.5")
        .to(S, { note3: 1, duration: 3 }, "act3+=9")
        .to(S, { merge: 1, duration: 3, ease: "power2.inOut" }, "act3+=11")
        .to(S, { note3: 0, duration: 1 }, "act3+=12")
        .to(S, { ui3: 0, glow: 0, duration: 1.5 }, "act3+=15.5");

      // ── Act 4 · 05:30 PM MOVE ─────────────────────────────────────
      tl.addLabel("act4", ACT_STARTS[4])
        .to(S, { venue: 0.35, duration: 4, ease: "power2.inOut" }, "act4")
        .to(S, { drive: 1, duration: 9, ease: "none" }, "act4+=1")
        .to(S, { arcs: 1, duration: 8 }, "act4+=1.5")
        .to(S, { walk: 1, duration: 12 }, "act4+=1")
        .to(S, { ui4: 1, duration: 1.2 }, "act4+=4")
        .to(S, { conflict: 1, duration: 3 }, "act4+=6")
        .to(S, { reroute: 1, duration: 2.5, ease: "back.out(1.7)" }, "act4+=9.5")
        .to(S, { ui4: 0, duration: 1.5 }, "act4+=16");

      // ── Act 5 · 08:00 PM THE EVENT ────────────────────────────────
      tl.addLabel("act5", ACT_STARTS[5])
        .to(S, { venue: 1, duration: 5, ease: "power2.inOut" }, "act5")
        .to(S, { lights: 1, duration: 5 }, "act5+=2")
        .to(S, { petals: 1, duration: 3 }, "act5+=5")
        .to(S, { ui5: 1, duration: 1.5 }, "act5+=6")
        .to(S, { count5: 1, duration: 6, ease: "power1.out" }, "act5+=6.5")
        .to(S, { outro: 1, duration: 4, ease: "power1.in" }, "act5+=16");

      apply();

      const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: "200px" });
      io.observe(section);

      // Runs when the context reverts (unmount or deps change), after GSAP has undone its tweens.
      return () => {
        io.disconnect();
        tlRef.current = null;
        document.documentElement.style.removeProperty("--hero-fg");
        document.documentElement.style.removeProperty("--hero-bg");
      };
    },
    { scope: containerRef, dependencies: [mode, S, el, chat, anchors, match, calendar, counters], revertOnUpdate: true }
  );

  const goToAct = (i: number) => {
    const st = tlRef.current?.scrollTrigger;
    if (!st) return;
    const y = st.start + ((st.end - st.start) * ACT_STARTS[i]) / 100 + 2;
    if (lenis) lenis.scrollTo(y, { duration: 1.6 });
    else window.scrollTo({ top: y });
  };

  const copy = ACTS[act];

  return (
    <MotionConfig reducedMotion="user">
      <div ref={containerRef}>
        <section ref={sectionRef} data-hero className="relative" style={{ height: "700vh" }} aria-label="A day in Mumbai with Spare">
          <h1 className="sr-only">Spare — Mumbai&apos;s hospitality, shared.</h1>

          <div
            ref={(n) => void (el.sticky = n)}
            className="sticky top-0 h-[100svh] overflow-hidden"
          >
            {/* Sky + sun/moon */}
            <div ref={(n) => void (el.sky = n)} className="absolute inset-0" style={{ background: "linear-gradient(180deg, #FDE8D0, #F9C9A8)" }} />
            <div
              ref={(n) => void (el.sun = n)}
              className="absolute size-28 -translate-x-1/2 -translate-y-1/2 rounded-full md:size-40"
              style={{ left: "8%", top: "74%" }}
            />
            <div
              ref={(n) => void (el.moon = n)}
              className="absolute size-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F6EEDC] shadow-[0_0_60px_rgba(246,238,220,0.5)]"
              style={{ opacity: 0 }}
            />

            {/* Giant wordmark behind the scene */}
            <div
              ref={(n) => void (el.wordmark = n)}
              className="pointer-events-none absolute inset-0 grid select-none place-items-center pb-[8vh]"
              aria-hidden
            >
              <span className="font-display text-[22vw] leading-none tracking-tightest text-sand">SPARE</span>
            </div>

            {/* Scene */}
            {mode === "scene" && (
              <Suspense fallback={null}>
                <MumbaiScene S={S} active={active} anchors={anchors} />
              </Suspense>
            )}
            {mode === "static" && <StaticActs layerRef={(i, n) => void (el.layers[i] = n)} />}

            {/* Outro: blend the bottom into the paper of the next section as we unpin. */}
            <div
              ref={(n) => void (el.outro = n)}
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[55%] bg-gradient-to-t from-paper via-paper/80 to-transparent"
              style={{ opacity: 0 }}
              aria-hidden
            />

            {/* ── Fixed UI ─────────────────────────────────────────── */}
            <div className="pointer-events-none absolute inset-0 z-20">
              {/* Act label + clock */}
              <div className="container absolute inset-x-0 top-28 md:top-24">
                {/* Overlapping crossfade (not mode="wait", which can jam on fast scrolls through several acts). */}
                <div className="grid">
                  <AnimatePresence>
                    <motion.p
                      key={act}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="col-start-1 row-start-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:rgb(var(--hero-fg)/0.7)]"
                    >
                      {copy.time}
                      {copy.name && <span className="text-primary"> — {copy.name}</span>}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <div className="font-mono text-5xl font-medium tabular-nums tracking-tight text-[color:rgb(var(--hero-fg))] md:text-7xl">
                    <span ref={(n) => void (el.hh = n)}>06</span>
                    <span className="animate-pulse text-[color:rgb(var(--hero-fg)/0.4)] motion-reduce:animate-none">:</span>
                    <span ref={(n) => void (el.mm = n)}>00</span>
                    <span ref={(n) => void (el.ampm = n)} className="ml-2 text-base text-[color:rgb(var(--hero-fg)/0.6)] md:text-xl">
                      AM
                    </span>
                  </div>
                  <svg width="56" height="56" viewBox="0 0 56 56" className="hidden shrink-0 text-[color:rgb(var(--hero-fg))] md:block" aria-hidden>
                    <circle cx="28" cy="28" r="26" fill="#FFFDF8" fillOpacity="0.7" stroke="currentColor" strokeOpacity="0.15" />
                    {Array.from({ length: 12 }).map((_, i) => (
                      <line key={i} x1="28" y1="5" x2="28" y2={i % 3 === 0 ? 10 : 8} stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" transform={`rotate(${i * 30} 28 28)`} />
                    ))}
                    <line ref={(n) => void (el.hourHand = n)} x1="28" y1="28" x2="28" y2="15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <line ref={(n) => void (el.minuteHand = n)} x1="28" y1="28" x2="28" y2="9" stroke="#D9653B" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="28" cy="28" r="2.2" fill="currentColor" />
                  </svg>
                </div>
              </div>

              {/* Progress rail */}
              <nav aria-label="Story progress" className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 md:right-8">
                <div className="relative flex flex-col items-center gap-6 py-1">
                  <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-[color:rgb(var(--hero-fg)/0.15)]" />
                  <div
                    ref={(n) => void (el.railFill = n)}
                    className="absolute inset-y-2 left-1/2 w-px origin-top -translate-x-1/2 bg-primary"
                    style={{ transform: "scaleY(0)" }}
                  />
                  {ACTS.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => goToAct(i)}
                      aria-label={`${a.time}${a.name ? ` — ${a.name}` : ""}`}
                      aria-current={i === act ? "step" : undefined}
                      className="group relative grid size-4 place-items-center"
                    >
                      <span
                        className={cn(
                          "block rounded-full border transition-all duration-300",
                          i === act
                            ? "size-3.5 border-primary bg-primary"
                            : i < act
                              ? "size-2 border-primary bg-primary"
                              : "size-2 border-[color:rgb(var(--hero-fg)/0.3)] bg-[color:rgb(var(--hero-bg))]"
                        )}
                      />
                      <span
                        className={cn(
                          "absolute right-6 whitespace-nowrap rounded-full bg-card/90 px-2 py-0.5 font-mono text-[10px] text-ink shadow-card transition-opacity",
                          i === act ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        {a.time}
                      </span>
                    </button>
                  ))}
                </div>
              </nav>

              {/* Headline + subtext */}
              <div className="container absolute inset-x-0 bottom-10 md:bottom-14">
                <div className="max-w-2xl pr-10 [text-shadow:0_1px_28px_rgb(var(--hero-bg)/0.85)]">
                  <div className="grid">
                    <AnimatePresence>
                      {copy.headline && (
                        <motion.div key={act} initial="hidden" animate="show" exit="exit" className="col-start-1 row-start-1 self-end">
                          <h2 className="text-[clamp(1.9rem,1rem+4.5vw,2.4rem)] leading-[1.02] tracking-tightest text-[color:rgb(var(--hero-fg))] md:text-6xl xl:text-7xl">
                            <SplitHeadline text={copy.headline} emphasis={copy.emphasis} />
                          </h2>
                          {copy.sub && (
                            <motion.p
                              variants={{
                                hidden: { opacity: 0, y: 12 },
                                show: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.35, ease: EASE } },
                                exit: { opacity: 0, transition: { duration: 0.2 } },
                              }}
                              className="mt-4 max-w-md text-[15px] leading-relaxed text-[color:rgb(var(--hero-fg)/0.75)] md:text-base"
                            >
                              {copy.sub}
                            </motion.p>
                          )}
                          {copy.cta && (
                            <motion.div
                              variants={{
                                hidden: { opacity: 0, y: 16 },
                                show: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.55, ease: EASE } },
                                exit: { opacity: 0, transition: { duration: 0.2 } },
                              }}
                              className="[text-shadow:none]"
                            >
                              <MagneticCTAs />
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Act 1 — idle counter */}
              <div
                ref={(n) => void (el.counter = n)}
                style={{ opacity: 0 }}
                className="absolute left-5 top-60 rounded-lg border border-border bg-card/90 px-5 py-4 shadow-card backdrop-blur-sm md:bottom-16 md:left-auto md:right-24 md:top-auto"
              >
                <span ref={(n) => void (el.counterValue = n)} className="block font-mono text-3xl font-medium tabular-nums text-ink md:text-4xl">
                  ₹0.0 Cr
                </span>
                <span className="mt-1 block max-w-[14rem] text-xs text-muted">of hospitality assets idle today</span>
              </div>

              {/* Act 2 — chat → card */}
              <ChatToCard refs={chat} />

              {/* Act 3 — ranked cards → bundle */}
              <MatchCards refs={match} />

              {/* Act 4 — calendar conflict → reroute */}
              <CalendarStrip refs={calendar} />

              {/* Act 5 — counters */}
              <EventCounters refs={counters} />
            </div>
          </div>
        </section>
      </div>
    </MotionConfig>
  );
}
