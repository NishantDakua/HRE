import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton, useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter, setOnboardingRequiredHandler, setUnauthenticatedHandler } from "@/lib/api";
import { AUTH_ENABLED, PUBLISHABLE_KEY } from "@/lib/clerk";
import { meKey, useAccount } from "@/hooks/account";
import { DevErrorDetail } from "@/components/DevErrorDetail";
import { Button } from "@/components/ui/button";

export { AUTH_ENABLED };

/** Pages a signed-in account without a business may still open. */
const ACCOUNT_PAGES = /^\/(onboarding|sign-in|sign-up)(\/|$)/;

/**
 * Hands Clerk's session token to the axios interceptor (before any query effect runs), and drops
 * every cached answer when the signed-in user changes so one account never sees another's data.
 */
function AuthBridge() {
  const { getToken, isLoaded, userId } = useAuth();
  const qc = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);

  useLayoutEffect(() => {
    if (!isLoaded) return;
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken, isLoaded]);

  useLayoutEffect(() => {
    if (!isLoaded) return;
    const now = userId ?? null;
    if (previous.current !== undefined && previous.current !== now) qc.clear();
    previous.current = now;
  }, [isLoaded, userId, qc]);
  return null;
}

/** Where the API client sends people: 401 → sign-in, ONBOARDING_REQUIRED → onboarding. */
function SessionRedirects() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  useEffect(() => {
    const here = location.pathname + location.search;
    setUnauthenticatedHandler(() => {
      if (!AUTH_ENABLED || ACCOUNT_PAGES.test(location.pathname)) return;
      navigate(`/sign-in?redirect_url=${encodeURIComponent(here)}`, { replace: true });
    });
    setOnboardingRequiredHandler(() => {
      // The business may have gone away since /api/me was loaded: refresh it, then set one up.
      void qc.invalidateQueries({ queryKey: meKey });
      if (ACCOUNT_PAGES.test(location.pathname)) return;
      navigate(`/onboarding?redirect=${encodeURIComponent(here)}`, { replace: true });
    });
    return () => {
      setUnauthenticatedHandler(null);
      setOnboardingRequiredHandler(null);
    };
  }, [navigate, qc, location.pathname, location.search]);
  return null;
}

/** A signed-in account with no business goes to onboarding from any page, deep links included. */
function OnboardingRedirect() {
  const { status } = useAccount();
  const location = useLocation();
  if (status !== "onboarding" || ACCOUNT_PAGES.test(location.pathname)) return null;
  return <Navigate to={`/onboarding?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
}

/** Must render inside the router (uses navigate for Clerk redirects). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  if (!AUTH_ENABLED) {
    return (
      <>
        <SessionRedirects />
        {children}
      </>
    );
  }
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY!}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#D9653B",
          colorText: "#2A1F1A",
          colorTextSecondary: "#7A6A5E",
          colorBackground: "#FFFDF8",
          borderRadius: "14px",
          fontFamily: '"DM Sans", system-ui, sans-serif',
        },
      }}
    >
      <AuthBridge />
      <SessionRedirects />
      <OnboardingRedirect />
      {children}
    </ClerkProvider>
  );
}

export function NavAuth() {
  if (!AUTH_ENABLED) return null;
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <Button size="sm">Sign in</Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton appearance={{ elements: { avatarBox: "size-9" } }} />
      </SignedIn>
    </>
  );
}

function Checking({ label }: { label: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center" role="status" aria-label={label} aria-busy="true">
      <span className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

function AuthNotConfigured() {
  return (
    <div className="mx-auto max-w-md space-y-3 py-10 text-center">
      <p className="eyebrow text-primary">Sign-in unavailable</p>
      <h1 className="text-3xl tracking-tightest">
        Accounts are <em>off.</em>
      </h1>
      <p className="text-muted">
        This page needs a Spare account. Add <code className="font-mono text-xs">VITE_CLERK_PUBLISHABLE_KEY</code> to the client to turn on
        sign-in.
      </p>
    </div>
  );
}

/** Layout route for pages that act as a business: a Clerk session and a business are required. */
export function ProtectedRoute() {
  const { status, error, refetch } = useAccount();
  const location = useLocation();
  if (!AUTH_ENABLED) return <AuthNotConfigured />;
  if (status === "loading") return <Checking label="Checking your session" />;
  if (status === "signed-out") {
    return <Navigate to={`/sign-in?redirect_url=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (status === "onboarding") return <Checking label="Setting up your business" />; // <OnboardingRedirect /> navigates
  if (status === "error") {
    return (
      <div className="surface mx-auto max-w-md space-y-3 p-6" data-testid="error-state">
        <p className="text-text">We couldn&apos;t load your account.</p>
        <DevErrorDetail error={error} />
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  return <Outlet />;
}
