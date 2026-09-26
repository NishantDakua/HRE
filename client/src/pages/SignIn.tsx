import { Link, useSearchParams } from "react-router-dom";
import { SignIn } from "@clerk/clerk-react";
import { AUTH_ENABLED } from "@/components/auth";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const [params] = useSearchParams();
  const redirect = params.get("redirect_url") ?? "/dashboard";

  if (!AUTH_ENABLED) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <p className="eyebrow text-primary">Demo mode</p>
        <h1 className="text-3xl tracking-tightest">
          Sign-in is <em>off.</em>
        </h1>
        <p className="text-muted">
          No Clerk key is configured, so every page is open. Add <code className="font-mono text-xs">VITE_CLERK_PUBLISHABLE_KEY</code> to
          enable auth.
        </p>
        <Button asChild>
          <Link to={redirect}>Continue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid place-items-center py-6">
      <SignIn routing="path" path="/sign-in" fallbackRedirectUrl={redirect} signUpFallbackRedirectUrl={redirect} />
    </div>
  );
}
