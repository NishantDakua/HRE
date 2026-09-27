import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, MapPin, Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/PriceTag";
import { useAppStore } from "@/store/app";
import { cn, formatINR } from "@/lib/utils";
import { Reveal } from "./Reveal";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Cycles 0..steps-1 while the element is in view; parks on the last step under reduced motion. */
function useLoop(steps: number, interval: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) {
      setStep(steps - 1);
      return;
    }
    if (!inView) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % steps), interval);
    return () => window.clearInterval(id);
  }, [inView, reduced, steps, interval]);

  return { ref, step };
}

/* ------------------------------------------------------------------ */
/* Provider mock: request arrives → accept → earnings tick up          */
/* ------------------------------------------------------------------ */

function ProviderMock() {
  const { ref, step } = useLoop(4, 1900);
  const earned = step >= 3 ? 42_300 : 37_200;

  return (
    <div ref={ref} className="relative h-[300px] overflow-hidden rounded-lg border border-border bg-paper p-4" aria-hidden>
      <div className="flex items-center justify-between">
        <span className="eyebrow">This month</span>
        <span className="inline-flex items-center gap-1 text-[11px] text-available">
          <TrendingUp className="size-3.5" /> from idle stock
        </span>
      </div>
      <motion.div key={earned} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, ease: EASE }}>
        <PriceTag amount={earned} size="lg" className="mt-1" />
      </motion.div>

      <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-[13px]">
        <span className="text-ink">Chiavari Chairs — Gold</span>
        <span className="font-mono text-[11px] text-muted">260/400 idle</span>
      </div>

      <AnimatePresence>
        {step >= 1 && (
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className={cn(
              "absolute inset-x-4 bottom-4 rounded-lg border bg-card p-4 shadow-card-hover transition-colors duration-300",
              step >= 2 ? "border-available/50" : "border-border"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[13px] font-medium text-ink">Juhu Tara Caterers</div>
                <div className="font-mono text-[11px] text-muted">60 chairs · Sat 6–11 PM · 1.4 km</div>
              </div>
              <PriceTag amount={5100} size="sm" />
            </div>
            <div className="mt-3 flex gap-2">
              <motion.span
                animate={step === 2 ? { scale: [1, 0.94, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
                className={cn(
                  "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium",
                  step >= 2 ? "bg-available text-card" : "bg-primary text-ink"
                )}
              >
                {step >= 2 ? (
                  <>
                    <Check className="size-3.5" /> Accepted
                  </>
                ) : (
                  "Accept"
                )}
              </motion.span>
              <span className="inline-flex h-8 flex-1 items-center justify-center rounded-full border border-ink/15 text-xs text-ink">
                Counter
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step >= 3 && (
          <motion.span
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -16, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="absolute right-4 top-12 font-mono text-sm text-available"
          >
            +₹{formatINR(5100)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Seeker mock: type a need → ranked results → request sent            */
/* ------------------------------------------------------------------ */

const QUERY = "200 chairs near Bandra, tonight";
const RESULTS = [
  { name: "Carter Road Kitchen", km: 0.8, match: 92 },
  { name: "Bandstand Events", km: 1.3, match: 84 },
  { name: "Seaview Juhu Hotel", km: 3.9, match: 71 },
];

function SeekerMock() {
  const { ref, step } = useLoop(4, 2100);
  const typed = step === 0 ? QUERY.slice(0, Math.ceil(QUERY.length * 0.55)) : QUERY;

  return (
    <div ref={ref} className="relative h-[300px] overflow-hidden rounded-lg border border-border bg-paper p-4" aria-hidden>
      <div className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-[13px] text-ink">
        <Search className="size-4 text-muted" />
        <span className="truncate">{typed}</span>
        {step === 0 && <span className="h-4 w-px animate-pulse bg-ink" />}
      </div>

      <ul className="mt-4 space-y-2">
        {RESULTS.map((r, i) => (
          <AnimatePresence key={r.name}>
            {step >= 1 && (
              <motion.li
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: step >= 2 && i > 0 ? 0.5 : 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: step === 1 ? i * 0.12 : 0, ease: EASE }}
                className={cn(
                  "rounded-md border bg-card px-3 py-2 transition-colors",
                  step >= 2 && i === 0 ? "border-available/50" : "border-border"
                )}
              >
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="truncate text-ink">{r.name}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted">
                    <MapPin className="size-3" /> {r.km} km
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
                  <motion.span
                    className={cn("block h-full rounded-full", r.match >= 80 ? "bg-available" : "bg-accent")}
                    initial={{ width: 0 }}
                    animate={{ width: `${r.match}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.12, ease: EASE }}
                  />
                </div>
              </motion.li>
            )}
          </AnimatePresence>
        ))}
      </ul>

      <AnimatePresence>
        {step >= 3 && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-full bg-ink px-4 py-2.5 text-xs text-paper"
          >
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-marigold" /> Request sent to Carter Road Kitchen
            </span>
            <span className="font-mono text-marigold">92%</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-2.5">
      {items.map((b) => (
        <li key={b} className="flex gap-3 text-[15px] text-ink/85">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} />
          {b}
        </li>
      ))}
    </ul>
  );
}

export function RoleSplit() {
  const setMode = useAppStore((s) => s.setMode);

  return (
    <section id="roles" className="py-24 md:py-32">
      <div className="container">
        <Reveal className="max-w-3xl">
          <p className="eyebrow text-primary">Two sides, one exchange</p>
          <h2 className="mt-4 text-[clamp(1.75rem,0.9rem+4vw,2.25rem)] leading-[1.05] tracking-tightest [overflow-wrap:anywhere] text-ink md:text-6xl">
            A provider on Monday. A <em>seeker</em> on Saturday.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <Reveal className="h-full">
            <div className="flex h-full flex-col rounded-lg border border-border bg-peach/40 p-7 md:p-9">
              <p className="eyebrow text-terracotta">For providers</p>
              <h3 className="mt-3 text-3xl leading-tight text-ink">Turn Tuesday&apos;s empty ballroom into revenue.</h3>
              <Bullets
                items={[
                  "List idle space, gear and vehicles in two minutes.",
                  "Set a floor price — negotiate only above it.",
                  "Your calendar syncs, so nothing double-sells.",
                ]}
              />
              <div className="mt-8">
                <ProviderMock />
              </div>
              <div className="mt-8">
                <Button asChild size="lg" variant="outline" onClick={() => setMode("provider")}>
                  <Link to="/dashboard">
                    List your assets
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>

          <Reveal className="h-full" delay={0.08}>
            <div className="flex h-full flex-col rounded-lg border border-border bg-mint/40 p-7 md:p-9">
              <p className="eyebrow text-peacock">For seekers</p>
              <h3 className="mt-3 text-3xl leading-tight text-ink">Short 200 chairs at 6pm? Sorted by 6:20.</h3>
              <Bullets
                items={[
                  "Search by radius, not by who's in your phone book.",
                  "One request can be split across several providers.",
                  "Verified businesses, tracked delivery, one invoice.",
                ]}
              />
              <div className="mt-8">
                <SeekerMock />
              </div>
              <div className="mt-8">
                <Button asChild size="lg" onClick={() => setMode("seeker")}>
                  <Link to="/discover">
                    Find a resource
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
