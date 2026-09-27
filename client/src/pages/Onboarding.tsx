import type { ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2, Package, Search, Repeat } from "lucide-react";
import { AUTH_ENABLED } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { homeFor, useAccount, useOnboard } from "@/hooks/account";
import { AREAS } from "@/lib/geo";
import type { BusinessRole, BusinessType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES: BusinessType[] = ["Hotel", "Restaurant", "Caterer", "Banquet Hall"];

const ROLES: { value: BusinessRole; title: string; body: string; icon: typeof Package }[] = [
  { value: "PROVIDER", title: "I lend", body: "List idle chairs, vans, halls and kitchens. Answer requests.", icon: Package },
  { value: "SEEKER", title: "I borrow", body: "Find what you're short of nearby and request it.", icon: Search },
  { value: "BOTH", title: "Both", body: "Lend what's idle and borrow what's missing. Switch views any time.", icon: Repeat },
];

const schema = z.object({
  name: z.string().trim().min(2, "Enter your business name").max(80, "Keep it under 80 characters"),
  type: z.enum(["Hotel", "Restaurant", "Caterer", "Banquet Hall"], { errorMap: () => ({ message: "Choose a business type" }) }),
  area: z.enum(["Andheri", "Bandra", "Powai", "Lower Parel", "Juhu", "Vashi"], { errorMap: () => ({ message: "Choose your area" }) }),
  address: z.string().trim().max(200, "Keep it under 200 characters").optional(),
  role: z.enum(["SEEKER", "PROVIDER", "BOTH"], { errorMap: () => ({ message: "Choose how you'll use Spare" }) }),
});
type Values = z.infer<typeof schema>;

const control = (invalid?: boolean) =>
  cn(
    "h-11 w-full rounded-md border bg-card px-3 text-sm text-text placeholder:text-muted/60 [color-scheme:light] focus-visible:border-primary/60",
    invalid ? "border-conflict/60" : "border-border"
  );

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2 text-xs text-muted">
        {label}
        {hint && <span className="text-muted/70">{hint}</span>}
      </span>
      {children}
      {error && (
        <span className="block text-xs text-conflict" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

export default function OnboardingPage() {
  const { status, business, me } = useAccount();
  const onboard = useOnboard();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", address: "" } });
  const role = watch("role");

  if (!AUTH_ENABLED || status === "signed-out") return <Navigate to="/sign-in?redirect_url=%2Fonboarding" replace />;
  if (status === "loading") {
    return (
      <div className="grid min-h-[40vh] place-items-center" role="status" aria-label="Checking your session" aria-busy="true">
        <span className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }
  // Already set up (or just finished): go where this business works.
  if (status === "ready" && business && !onboard.isPending) return <Navigate to={homeFor(business.role)} replace />;

  const onSubmit = handleSubmit((values) =>
    onboard.mutate(
      { ...values, address: values.address || undefined },
      { onSuccess: (next) => next.business && navigate(homeFor(next.business.role), { replace: true }) }
    )
  );

  const firstName = me?.user.firstName;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="eyebrow">Welcome{firstName ? `, ${firstName}` : ""}</p>
        <h1 className="mt-2 text-[clamp(1.75rem,0.9rem+4vw,2.25rem)] leading-[1.05] tracking-tightest [overflow-wrap:anywhere] md:text-5xl">
          Set up your <em>business.</em>
        </h1>
        <p className="mt-3 max-w-lg text-muted">Tell nearby hotels, caterers and halls who you are. You can change these details later.</p>
      </header>

      <form onSubmit={onSubmit} noValidate className="surface space-y-6 p-5 md:p-8" aria-label="Business details">
        <fieldset className="space-y-3">
          <legend className="text-xs text-muted">How will you use Spare?</legend>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="How will you use Spare?">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-1.5 rounded-lg border p-4 transition-colors",
                  role === r.value ? "border-primary bg-primary/5" : "border-border hover:border-text/30"
                )}
              >
                <input type="radio" value={r.value} className="sr-only" {...register("role")} />
                <r.icon className={cn("size-5", role === r.value ? "text-primary" : "text-muted")} strokeWidth={1.5} />
                <span className="font-medium text-text">{r.title}</span>
                <span className="text-xs leading-relaxed text-muted">{r.body}</span>
              </label>
            ))}
          </div>
          {errors.role && (
            <p className="text-xs text-conflict" role="alert">
              {errors.role.message}
            </p>
          )}
        </fieldset>

        <Field label="Business name" error={errors.name?.message}>
          <input className={control(!!errors.name)} autoComplete="organization" placeholder="e.g. Seaview Juhu Hotel" {...register("name")} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Business type" error={errors.type?.message}>
            <select className={control(!!errors.type)} defaultValue="" {...register("type")}>
              <option value="" disabled>
                Choose…
              </option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Area" error={errors.area?.message}>
            <select className={control(!!errors.area)} defaultValue="" {...register("area")}>
              <option value="" disabled>
                Choose…
              </option>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Address" hint="Optional" error={errors.address?.message}>
          <input className={control(!!errors.address)} autoComplete="street-address" placeholder="Street, building" {...register("address")} />
        </Field>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={onboard.isPending}>
            {onboard.isPending ? <Loader2 className="animate-spin" /> : null}
            Continue <ArrowRight />
          </Button>
        </div>
      </form>
    </div>
  );
}
