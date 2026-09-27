import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

/*
 * Placeholder testimonials for the demo — fictional people and businesses.
 * Replace with real, consented customer quotes before launch.
 */
const TESTIMONIALS = [
  {
    quote: "We were 80 chairs short an hour before a sangeet. Spare found two hotels within 2 km and the chairs arrived before the mehendi artist did.",
    name: "Farah Irani",
    role: "Owner",
    business: "Juhu Tara Caterers",
    area: "Juhu",
    tint: "bg-rose/40",
    tilt: "-rotate-1",
  },
  {
    quote: "Our ballroom used to sit dark every Tuesday. Now it pays for our linen budget for the month.",
    name: "Rohan Shetty",
    role: "GM, Events",
    business: "Lakeside Residency",
    area: "Powai",
    tint: "bg-powder/50",
    tilt: "rotate-1",
  },
  {
    quote: "I forwarded a WhatsApp from my chef and got three quotes back before chai. The score breakdown actually told me why.",
    name: "Anjali Deshmukh",
    role: "Operations",
    business: "Carter Road Kitchen",
    area: "Bandra",
    tint: "bg-butter/50",
    tilt: "rotate-[0.5deg]",
  },
  {
    quote: "Our reefer vans idle between 11 and 4. Spare fills that window three days a week.",
    name: "Sameer Qureshi",
    role: "Fleet lead",
    business: "Marol Central Kitchen",
    area: "Andheri",
    tint: "bg-mint/50",
    tilt: "-rotate-[0.5deg]",
  },
  {
    quote: "The calendar caught a double booking I'd have made myself. That alone is worth it.",
    name: "Neha Kulkarni",
    role: "Banquet manager",
    business: "Mill Compound Banquets",
    area: "Lower Parel",
    tint: "bg-peach/50",
    tilt: "rotate-1",
  },
  {
    quote: "Split fulfilment is the magic — 100 chairs from one place, 50 from another, one invoice.",
    name: "Kabir Mehta",
    role: "Founder",
    business: "Phoenix Social House",
    area: "Lower Parel",
    tint: "bg-card",
    tilt: "-rotate-1",
  },
];

function Squiggle() {
  return (
    <svg viewBox="0 0 120 12" className="mt-0.5 h-3 w-28 text-terracotta" aria-hidden>
      <path d="M2 8 C 18 2, 30 12, 46 6 S 76 2, 92 8 S 112 10, 118 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 md:py-32">
      <div className="container">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-primary">From the exchange</p>
          <h2 className="mt-4 text-[clamp(1.75rem,0.9rem+4vw,2.25rem)] leading-[1.05] tracking-tightest [overflow-wrap:anywhere] text-ink md:text-6xl">
            Mumbai, <em>sharing</em> notes.
          </h2>
        </Reveal>

        <div className="mt-14 gap-5 [column-fill:_balance] sm:columns-2 lg:columns-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={(i % 3) * 0.08} className="mb-5 break-inside-avoid">
              <figure className={cn("rounded-lg border border-border p-6 shadow-card transition-transform duration-300 hover:rotate-0", t.tint, t.tilt)}>
                <blockquote className="font-display text-xl leading-snug text-ink">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-6">
                  <span className="block -rotate-2 font-hand text-3xl leading-none text-terracotta">{t.name}</span>
                  <Squiggle />
                  <span className="mt-2 block text-xs text-muted">
                    {t.role}, {t.business} · {t.area}
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
