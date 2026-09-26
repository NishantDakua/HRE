import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const ROW_ONE = [
  "Five-star hotels",
  "Wedding caterers",
  "Banquet halls",
  "Irani cafés",
  "Rooftop bars",
  "Gymkhanas",
  "Cloud kitchens",
  "Boutique stays",
];

const ROW_TWO = [
  "Event agencies",
  "Tiffin services",
  "Party lawns",
  "Coastal seafood joints",
  "Corporate canteens",
  "Resort chains",
  "Udupi restaurants",
  "Film-set caterers",
];

function Row({ items, reverse = false, duration, outline = false }: { items: string[]; reverse?: boolean; duration: number; outline?: boolean }) {
  const reduced = useReducedMotion();
  const loop = [...items, ...items];
  return (
    <div className="flex overflow-hidden">
      <motion.ul
        className="flex w-max shrink-0 items-center"
        animate={reduced ? undefined : { x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      >
        {loop.map((item, i) => (
          <li key={`${item}-${i}`} className="flex items-center" aria-hidden={i >= items.length}>
            <span
              className={cn(
                "whitespace-nowrap px-6 font-display text-5xl italic leading-none tracking-tight md:px-10 md:text-7xl",
                outline ? "text-transparent [-webkit-text-stroke:1.5px_hsl(var(--ink))]" : "text-ink"
              )}
            >
              {item}
            </span>
            <span className="text-3xl text-marigold md:text-4xl" aria-hidden>
              ✺
            </span>
          </li>
        ))}
      </motion.ul>
    </div>
  );
}

export function BusinessMarquee() {
  return (
    <section
      aria-label="Businesses on Spare"
      className="space-y-4 overflow-hidden border-y border-border bg-sand/50 py-12 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] md:space-y-6 md:py-16"
    >
      <Row items={ROW_ONE} duration={45} />
      <Row items={ROW_TWO} duration={55} reverse outline />
    </section>
  );
}
