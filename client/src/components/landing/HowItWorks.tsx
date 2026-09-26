import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CheckCheck } from "lucide-react";
import { MatchScoreBar } from "@/components/MatchScoreBar";
import { PriceTag } from "@/components/PriceTag";
import { StatusPill } from "@/components/StatusPill";
import { Reveal } from "./Reveal";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* Illustrative mini-UIs for each step (static copy, not live data). */

function TextItVisual() {
  return (
    <div className="space-y-3">
      <div className="ml-auto w-[92%] rounded-2xl rounded-tr-sm bg-mint px-3.5 py-2.5 text-[13px] leading-snug text-ink">
        need 150 chairs + 2 projectors, Andheri, Sat 6–11pm 🙏
        <div className="mt-1 flex items-center justify-end gap-1 font-mono text-[10px] text-ink/50">
          11:32 <CheckCheck className="size-3 text-pending" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["Chairs ×150", "Projector ×2", "Andheri", "Sat 6–11 PM"].map((c) => (
          <span key={c} className="rounded-full border border-border bg-paper px-2.5 py-1 font-mono text-[11px] text-ink">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function MatchedVisual() {
  const rows = [
    { name: "Lakeside Residency", km: 1.2, price: 63, score: { price: 0.92, distance: 0.95, availability: 1, capacity: 0.7, reliability: 0.96 } },
    { name: "Regal Deco Hall", km: 1.8, price: 68, score: { price: 0.88, distance: 0.86, availability: 1, capacity: 0.45, reliability: 0.9 } },
  ];
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="mb-2 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-ink">{r.name}</span>
            <span className="shrink-0 font-mono text-[11px] text-muted">{r.km} km</span>
          </div>
          <MatchScoreBar score={r.score} showTotal={false} showLabels={false} compact />
        </div>
      ))}
    </div>
  );
}

function BookedVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[11px] text-muted">SPR-24E1</div>
          <div className="truncate text-[13px] text-ink">Bundle · 100 + 50 chairs</div>
        </div>
        <StatusPill status="CONFIRMED" />
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted">Landed, both providers</span>
        <PriceTag amount={9700} size="sm" />
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Text it",
    body: "Type what you need — or forward the WhatsApp message your banquet manager sent. We structure it.",
    note: "no forms, promise",
    visual: <TextItVisual />,
  },
  {
    n: "02",
    title: "Get matched",
    body: "Nearby providers are scored on price, distance, availability, capacity and reliability — and we show why.",
    note: "explained, not guessed",
    visual: <MatchedVisual />,
  },
  {
    n: "03",
    title: "Book & relax",
    body: "Split across providers if needed, conflict-checked, tracked to your door. One booking, one invoice.",
    note: "zero double bookings",
    visual: <BookedVisual />,
  },
];

/* Hand-drawn connectors: wide for desktop, tall for mobile. */
const WIDE_PATH =
  "M40 92 C 120 40, 170 40, 200 90 S 280 150, 360 96 C 430 50, 520 60, 600 92 C 660 116, 700 40, 660 44 C 620 48, 650 128, 740 104 C 820 84, 900 40, 1000 92 S 1120 140, 1170 70";
const TALL_PATH =
  "M30 20 C 8 90, 52 140, 30 210 S 10 330, 32 400 C 50 460, 6 520, 30 600 S 54 720, 28 800 C 8 870, 48 930, 30 990";

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      paths.current.forEach((path) => {
        if (!path) return;
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: reduced ? 0 : len });
        if (reduced) return;
        gsap.to(path, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: { trigger: section, start: "top 70%", end: "bottom 75%", scrub: 1 },
        });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} id="how-it-works" className="relative py-24 md:py-36">
      <div className="container">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-primary">How it works</p>
          <h2 className="mt-4 text-4xl leading-[1.05] tracking-tightest text-ink md:text-6xl">
            From shortage to <em>sorted</em> in three steps.
          </h2>
        </Reveal>

        <div className="relative mt-16 md:mt-24">
          {/* Desktop connector */}
          <svg viewBox="0 0 1200 160" preserveAspectRatio="none" className="absolute inset-x-0 top-0 hidden h-40 w-full md:block" aria-hidden>
            <path
              ref={(el) => void (paths.current[0] = el)}
              d={WIDE_PATH}
              fill="none"
              stroke="hsl(var(--terracotta))"
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {/* Mobile connector */}
          <svg viewBox="0 0 60 1000" preserveAspectRatio="none" className="absolute bottom-0 left-0 top-0 w-12 md:hidden" aria-hidden>
            <path
              ref={(el) => void (paths.current[1] = el)}
              d={TALL_PATH}
              fill="none"
              stroke="hsl(var(--terracotta))"
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <ol className="relative grid gap-12 pl-16 md:grid-cols-3 md:gap-8 md:pl-0">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <li className="flex h-full flex-col">
                  <div className="flex md:h-40 md:items-center md:justify-center">
                    <span className="grid size-14 place-items-center rounded-full border-2 border-terracotta bg-paper font-display text-2xl text-terracotta">
                      {i + 1}
                    </span>
                  </div>
                  <div className="mt-6 flex flex-wrap items-baseline gap-x-3">
                    <h3 className="text-3xl text-ink">{s.title}</h3>
                    <span className="-rotate-2 font-hand text-2xl text-terracotta">— {s.note}</span>
                  </div>
                  <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted">{s.body}</p>
                  <div className="mt-auto pt-8">
                    <div className="surface p-5">{s.visual}</div>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
