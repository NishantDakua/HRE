import { useEffect, type ReactNode } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton, useAuth } from "@clerk/clerk-react";
import { setAuthTokenGetter } from "@/lib/api";
import { Button } from "@/components/ui/button";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/** False when no Clerk key is configured — the app runs in demo mode without auth. */
export const AUTH_ENABLED = Boolean(PUBLISHABLE_KEY);

/** Hands Clerk's session token to the axios interceptor. */
function AuthBridge() {
  const { getToken, isLoaded } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken, isLoaded]);
  return null;
}

/** Must render inside the router (uses navigate for Clerk redirects). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  if (!AUTH_ENABLED) return <>{children}</>;
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY!}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
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
      {children}
    </ClerkProvider>
  );
}

export function NavAuth() {
  if (!AUTH_ENABLED) {
    return (
      <span className="hidden rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:inline-block">
        Demo
      </span>
    );
  }
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

function ClerkGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  if (!isLoaded) {
    return (
      <div className="grid min-h-[40vh] place-items-center" role="status" aria-label="Checking your session">
        <span className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }
  if (!isSignedIn) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?redirect_url=${redirect}`} replace />;
  }
  return <Outlet />;
}

/** Layout route guarding its children. Open access in demo mode. */
export function ProtectedRoute() {
  return AUTH_ENABLED ? <ClerkGate /> : <Outlet />;
}
