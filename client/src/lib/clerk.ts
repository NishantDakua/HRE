import { useAuth } from "@clerk/clerk-react";

export const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

/** Clerk is the only identity. Without a key, nobody can sign in and signed-in pages explain why. */
export const AUTH_ENABLED = Boolean(PUBLISHABLE_KEY);

export interface SessionState {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
}

/** Clerk's session state; a fixed "signed out" when Clerk isn't configured (no provider to ask). */
export const useSessionState: () => SessionState = AUTH_ENABLED
  ? function useSessionState() {
      const { isLoaded, isSignedIn, userId } = useAuth();
      return { isLoaded, isSignedIn: Boolean(isSignedIn), userId: userId ?? null };
    }
  : function useSessionState() {
      return { isLoaded: true, isSignedIn: false, userId: null };
    };
