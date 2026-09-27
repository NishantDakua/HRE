import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Heart } from "lucide-react";
import { useSubscribeNewsletter } from "@/hooks/queries";
import { CATEGORY_LABEL, RESOURCE_CATEGORIES, type Area } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

const PRODUCT = [
  { href: "/discover", label: "Discover" },
  { href: "/requests?new=1", label: "Post Need" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/requests", label: "Requests" },
  { href: "/analytics", label: "Analytics" },
];

const AREAS: Area[] = ["Andheri", "Bandra", "Powai", "Lower Parel", "Juhu", "Vashi"];

const newsletterSchema = z.object({
  email: z.string().trim().min(1, "Enter your email").email("That doesn't look like an email").max(254),
});
type NewsletterForm = z.infer<typeof newsletterSchema>;

function Newsletter() {
  const subscribe = useSubscribeNewsletter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewsletterForm>({ resolver: zodResolver(newsletterSchema), defaultValues: { email: "" } });

  const onSubmit = ({ email }: NewsletterForm) => subscribe.mutate(email, { onSuccess: () => reset() });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-md">
      <label htmlFor="newsletter-email" className="eyebrow">
        Idle-to-income notes, monthly
      </label>
      <div
        className={cn(
          "mt-3 flex h-14 items-center rounded-full border bg-card p-1.5 pl-5 shadow-card transition-colors focus-within:border-primary/60",
          errors.email ? "border-conflict/60" : "border-border"
        )}
      >
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder="you@yourhotel.in"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "newsletter-error" : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/70 focus-visible:ring-0 focus-visible:ring-offset-0"
          {...register("email")}
        />
        <button
          type="submit"
          disabled={subscribe.isPending}
          className="inline-flex h-full shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-primary disabled:opacity-60"
        >
          {subscribe.isPending ? "Joining…" : "Subscribe"}
          <ArrowRight className="size-4" />
        </button>
      </div>
      <AnimatePresence>
        {errors.email && (
          <motion.p
            id="newsletter-error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 pl-5 text-xs text-conflict"
          >
            {errors.email.message}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm text-muted">{children}</ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-sand/40">
      <div className="container pb-10 pt-24 md:pt-32">
        <Reveal>
          <h2 className="font-display text-[13vw] leading-[0.88] tracking-tightest text-ink md:text-[9.5vw]">
            Every empty chair is an <em className="text-terracotta">opportunity.</em>
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-12 md:mt-24 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <Reveal>
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-[9px] border border-primary/40 bg-primary/10">
                <span className="font-display text-[15px] font-semibold leading-none text-primary">S</span>
              </span>
              <span className="font-display text-xl tracking-tight text-text">Spare</span>
            </Link>
            <p className="mb-8 mt-4 max-w-xs text-sm leading-relaxed text-muted">
              The resource exchange for Mumbai&apos;s hotels, restaurants, caterers and banquet halls.
            </p>
            <Newsletter />
          </Reveal>

          <Reveal delay={0.05}>
            <FooterColumn title="Product">
              {PRODUCT.map((l) => (
                <li key={l.label}>
                  <Link to={l.href} className="inline-flex items-center transition-colors hover:text-text touch:min-h-[44px]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </FooterColumn>
          </Reveal>

          <Reveal delay={0.1}>
            <FooterColumn title="Categories">
              {RESOURCE_CATEGORIES.map((c) => (
                <li key={c}>
                  <Link to={`/discover?category=${c}`} className="inline-flex items-center transition-colors hover:text-text touch:min-h-[44px]">
                    {CATEGORY_LABEL[c]}
                  </Link>
                </li>
              ))}
            </FooterColumn>
          </Reveal>

          <Reveal delay={0.15}>
            <FooterColumn title="Live in">
              {AREAS.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </FooterColumn>
          </Reveal>
        </div>

        <div className="mt-20 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center">
          <span>© {format(new Date(), "yyyy")} Spare. All rights reserved.</span>
          <span className="inline-flex items-center gap-1.5 font-hand text-xl text-terracotta">
            Made in Mumbai <Heart className="size-3.5 fill-terracotta text-terracotta" />
          </span>
          <span className="font-mono tabular-nums">v0.1 · MVP</span>
        </div>
      </div>
    </footer>
  );
}
