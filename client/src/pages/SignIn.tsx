import { useSearchParams } from "react-router-dom";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { AUTH_ENABLED } from "@/components/auth";

function AuthOff() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-10 text-center">
      <p className="eyebrow text-primary">Sign-in unavailable</p>
      <h1 className="text-3xl tracking-tightest">
        Accounts are <em>off.</em>
      </h1>
      <p className="text-muted">
        No Clerk key is configured. Add <code className="font-mono text-xs">VITE_CLERK_PUBLISHABLE_KEY</code> to the client to enable sign-in.
      </p>
    </div>
  );
}

/** After sign-in/up: back to where they were headed. The onboarding guard takes over if there's no business yet. */
function useRedirect() {
  const [params] = useSearchParams();
  const target = params.get("redirect_url") ?? "/dashboard";
  // Only same-app paths.
  return target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";
}

export default function SignInPage() {
  const redirect = useRedirect();
  if (!AUTH_ENABLED) return <AuthOff />;
  return (
    <div className="grid place-items-center py-6">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(redirect)}`}
        fallbackRedirectUrl={redirect}
        signUpFallbackRedirectUrl={redirect}
      />
    </div>
  );
}

export function SignUpPage() {
  const redirect = useRedirect();
  if (!AUTH_ENABLED) return <AuthOff />;
  return (
    <div className="grid place-items-center py-6">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl={`/sign-in?redirect_url=${encodeURIComponent(redirect)}`}
        fallbackRedirectUrl={redirect}
        signInFallbackRedirectUrl={redirect}
      />
    </div>
  );
}
