import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight } from "lucide-react";
import { useResources } from "@/hooks/queries";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { CATEGORY_LABEL, RESOURCE_CATEGORIES, type ResourceCategory, type ResourceWithBusiness } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { CATEGORY_ART, CATEGORY_TINT } from "./CategoryArt";
import { Reveal } from "./Reveal";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Pastel per category — each panel's background, crossfaded on scroll. */
const PANEL_BG = CATEGORY_TINT;

const BLURB: Record<ResourceCategory, string> = {
  BANQUET_SPACE: "Ballrooms dark on a Tuesday, terraces free before sunset, lawns between weddings.",
  CHAIRS_TABLES: "Chiavari chairs, rounds and buffet counters sitting in storerooms after the weekend rush.",
  VEHICLES: "Reefer vans, guest shuttles and tempo travellers idling in basements between runs.",
  KITCHEN: "Night-shift hot lines, tandoors and walk-in cold rooms with hours to spare.",
  AV_EQUIPMENT: "LED walls, line arrays and projectors that only work on Saturdays.",
  PARKING: "Basement bays, coach-friendly lots and valet crews for the overflow.",
  LINEN_DECOR: "Pressed linen, brass urlis and floral backdrops — ready for the next function.",
};

const UNIT_SUFFIX = { HOUR: "/hr", DAY: "/day", UNIT: "" } as const;

function singular(label: string) {
  if (label.endsWith("ches")) return label.slice(0, -2);
  if (label.endsWith("s") && !label.endsWith("ss")) return label.slice(0, -1);
  return label;
}

interface CategoryStats {
  listings: number;
  providers: number;
  reply: number;
  from?: ResourceWithBusiness;
}

function statsFor(resources: ResourceWithBusiness[] | undefined, category: ResourceCategory): CategoryStats | undefined {
  if (!resources) return undefined;
  const list = resources.filter((r) => r.category === category);
  const from = [...list].sort((a, b) => a.price - b.price)[0];
  const reply = list.length ? Math.round(list.reduce((s, r) => s + r.business.avgResponseMins, 0) / list.length) : 0;
  return {
    listings: list.length,
    providers: new Set(list.map((r) => r.businessId)).size,
    reply,
    from,
  };
}

/** "Chairs & Tables" → "Chairs & *Tables*" */
function CategoryName({ label }: { label: string }) {
  const words = label.split(" ");
  const last = words.pop();
  return (
    <>
      {words.join(" ")} <em>{last}</em>
    </>
  );
}

function PricePill({ stats, horizontal }: { stats?: CategoryStats; horizontal: boolean }) {
  const reduced = useReducedMotion();
  const r = stats?.from;
  return (
    <motion.div
      animate={reduced || !horizontal ? undefined : { y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="inline-flex items-baseline gap-1.5 rounded-full border border-ink/10 bg-card px-4 py-2 font-mono text-sm shadow-card"
    >
      <span className="text-muted">from</span>
      {r ? (
        <span className="text-ink">
          ₹{formatINR(r.price)}
          <span className="text-muted">
            /{singular(r.unitLabel)}
            {UNIT_SUFFIX[r.unit]}
          </span>
        </span>
      ) : (
        <span className="inline-block h-3 w-20 animate-pulse rounded bg-sand" />
      )}
    </motion.div>
  );
}

function Panel({
  category,
  index,
  stats,
  horizontal,
  artRef,
  pillRef,
}: {
  category: ResourceCategory;
  index: number;
  stats?: CategoryStats;
  horizontal: boolean;
  artRef: (el: HTMLDivElement | null) => void;
  pillRef: (el: HTMLDivElement | null) => void;
}) {
  const Art = CATEGORY_ART[category];
  const label = CATEGORY_LABEL[category];
  const mini = [
    { value: stats?.listings, label: "live listings" },
    { value: stats?.providers, label: "providers" },
    { value: stats ? `${stats.reply}m` : undefined, label: "avg. reply" },
  ];

  return (
    <article
      className={cn("relative flex shrink-0 items-center", horizontal ? "h-screen w-screen pt-16" : "min-h-[85vh] w-full py-20")}
      style={horizontal ? undefined : { background: PANEL_BG[category] }}
      aria-label={label}
    >
      <div className="container grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
        <div className="relative z-10">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink/60">
            {String(index + 1).padStart(2, "0")} / {String(RESOURCE_CATEGORIES.length).padStart(2, "0")}
          </p>
          <h3 className="mt-4 font-display text-[15vw] leading-[0.9] tracking-tightest text-ink md:text-[8.5vw]">
            <CategoryName label={label} />
          </h3>
          <p className="mt-6 max-w-md text-base leading-relaxed text-ink/75">{BLURB[category]}</p>

          <dl className="mt-8 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-lg border border-ink/10 bg-ink/10">
            {mini.map((m) => (
              <div key={m.label} className="bg-card/80 px-4 py-3 backdrop-blur-sm">
                <dt className="text-[11px] text-muted">{m.label}</dt>
                <dd className="mt-1 font-mono text-xl tabular-nums text-ink">
                  {m.value ?? <span className="inline-block h-5 w-8 animate-pulse rounded bg-sand" />}
                </dd>
              </div>
            ))}
          </dl>

          <Link
            to={`/discover?category=${category}`}
            className="group mt-8 inline-flex items-center gap-2 border-b border-ink/30 pb-1 text-sm font-medium text-ink transition-colors hover:border-ink"
          >
            Browse {label.toLowerCase()}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[460px] [perspective:1000px]">
          <div ref={artRef} className="h-full w-full will-change-transform [transform-style:preserve-3d]">
            <Art />
          </div>
          <div ref={pillRef} className="absolute -left-2 top-6 will-change-transform md:-left-10">
            <PricePill stats={stats} horizontal={horizontal} />
          </div>
        </div>
      </div>
    </article>
  );
}

export function CategoryExchange() {
  const horizontal = useMediaQuery("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
  const { data: resources } = useResources();
  const stats = useMemo(
    () => Object.fromEntries(RESOURCE_CATEGORIES.map((c) => [c, statsFor(resources, c)])) as Record<ResourceCategory, CategoryStats | undefined>,
    [resources]
  );

  /** Plain React wrapper GSAP never touches; the pin-spacer lives inside it. */
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const bgRefs = useRef<(HTMLDivElement | null)[]>([]);
  const artRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!horizontal) return;
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track) return;
      const n = RESOURCE_CATEGORIES.length;

      const apply = (progress: number) => {
        const pos = progress * (n - 1);
        bgRefs.current.forEach((el, i) => {
          if (el) el.style.opacity = String(Math.max(0, 1 - Math.abs(i - pos)));
        });
        artRefs.current.forEach((el, i) => {
          if (!el) return;
          const d = Math.max(-1.5, Math.min(1.5, i - pos));
          const s = 1 - Math.min(1, Math.abs(d)) * 0.12;
          el.style.transform = `translateX(${(d * -60).toFixed(1)}px) rotateY(${(d * -28).toFixed(2)}deg) rotateX(${(6 - Math.abs(d) * 6).toFixed(2)}deg) rotateZ(${(d * -6).toFixed(2)}deg) scale(${s.toFixed(3)})`;
        });
        pillRefs.current.forEach((el, i) => {
          if (el) el.style.transform = `translateX(${((i - pos) * -140).toFixed(1)}px)`;
        });
        const current = Math.min(n, Math.round(pos) + 1);
        if (counterRef.current) counterRef.current.textContent = String(current).padStart(2, "0");
        if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
      };

      const distance = () => track.scrollWidth - window.innerWidth;
      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true, // pins the inner <section>; the pin-spacer stays inside containerRef
          scrub: 1,
          invalidateOnRefresh: true,
        },
        onUpdate() {
          apply(this.progress());
        },
      });
      apply(0);
      // Pin spacing shifts every trigger below this one.
      ScrollTrigger.refresh();
    },
    // Created inside the useGSAP context → reverted (pin-spacer unwrapped) before React removes the DOM.
    { scope: containerRef, dependencies: [horizontal], revertOnUpdate: true }
  );

  return (
    <div ref={containerRef}>
      <section ref={sectionRef} className="relative overflow-hidden" aria-labelledby="exchange-title">
        {horizontal && (
          <div className="absolute inset-0" aria-hidden>
            {RESOURCE_CATEGORIES.map((c, i) => (
              <div
                key={c}
                ref={(el) => void (bgRefs.current[i] = el)}
                className="absolute inset-0"
                style={{ background: PANEL_BG[c], opacity: i === 0 ? 1 : 0 }}
              />
            ))}
          </div>
        )}

        <div className={cn("z-10", horizontal ? "pointer-events-none absolute inset-x-0 top-20" : "relative bg-paper pb-4 pt-24")}>
          <div className="container flex items-end justify-between gap-6">
            <Reveal>
              <p className="eyebrow text-primary">On the exchange</p>
              <h2 id="exchange-title" className="mt-2 text-2xl tracking-tightest text-ink md:text-3xl">
                Seven kinds of idle, one marketplace.
              </h2>
            </Reveal>
            {horizontal && (
              <div className="hidden w-40 shrink-0 md:block" aria-hidden>
                <div className="flex justify-between font-mono text-xs tabular-nums text-ink/70">
                  <span ref={counterRef}>01</span>
                  <span>{String(RESOURCE_CATEGORIES.length).padStart(2, "0")}</span>
                </div>
                <div className="mt-2 h-px bg-ink/15">
                  <span ref={barRef} className="block h-full origin-left bg-ink" style={{ transform: "scaleX(0)" }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div ref={trackRef} className={cn("relative", horizontal ? "flex h-screen w-max" : "flex flex-col")}>
          {RESOURCE_CATEGORIES.map((c, i) => (
            <Panel
              key={c}
              category={c}
              index={i}
              stats={stats[c]}
              horizontal={horizontal}
              artRef={(el) => void (artRefs.current[i] = el)}
              pillRef={(el) => void (pillRefs.current[i] = el)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
