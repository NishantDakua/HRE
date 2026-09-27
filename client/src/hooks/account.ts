import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { useSessionState } from "@/lib/clerk";
import { useAppStore } from "@/store/app";
import type { BusinessRole, Me, OnboardingInput, Role } from "@/lib/types";

export const meKey = ["me"] as const;

/** GET /api/me once Clerk says who is signed in. */
export function useMe() {
  const { isLoaded, isSignedIn, userId } = useSessionState();
  return useQuery({
    queryKey: meKey,
    queryFn: () => api.get<Me>("/me").then((r) => r.data),
    enabled: isLoaded && isSignedIn && Boolean(userId),
    staleTime: 5 * 60_000,
    // A 4xx won't fix itself on retry; network blips might.
    retry: (count, error) => count < 2 && !(axios.isAxiosError(error) && (error.response?.status ?? 500) < 500),
  });
}

export type AccountStatus = "loading" | "signed-out" | "onboarding" | "ready" | "error";

/** Where the signed-in account stands: loading → signed-out | onboarding (no business) | ready. */
export function useAccount() {
  const session = useSessionState();
  const me = useMe();
  let status: AccountStatus;
  if (!session.isLoaded) status = "loading";
  else if (!session.isSignedIn) status = "signed-out";
  else if (me.isPending) status = "loading";
  else if (me.isError) status = "error";
  else status = me.data.business ? "ready" : "onboarding";
  const business = me.data?.business ?? null;
  return { status, me: me.data, business, role: business?.role ?? null, error: me.error, refetch: me.refetch };
}

/**
 * When query hooks may fire. Private data waits for /api/me with a business; public data waits
 * until we know who's asking (so a signed-in search ranks from their own address, once).
 */
export function useApiGate() {
  const { status } = useAccount();
  return {
    publicReady: status === "signed-out" || status === "ready" || status === "error",
    privateReady: status === "ready",
  };
}

/** Views each role gets. BOTH picks with the Seeker/Provider switch. */
export const ROLE_VIEWS: Record<BusinessRole, Role[]> = {
  SEEKER: ["seeker"],
  PROVIDER: ["provider"],
  BOTH: ["seeker", "provider"],
};

/** The view in effect: fixed for single-role businesses, the switch's choice for BOTH. */
export function useMode(): Role {
  const stored = useAppStore((s) => s.mode);
  const { role } = useAccount();
  if (role === "PROVIDER") return "provider";
  if (role === "SEEKER") return "seeker";
  return stored;
}

/** Where a business lands after onboarding (and when it opens a page it has no use for). */
export const homeFor = (role: BusinessRole) => (role === "SEEKER" ? "/discover" : "/dashboard");

export function useOnboard() {
  const qc = useQueryClient();
  const setMode = useAppStore((s) => s.setMode);
  return useMutation({
    mutationFn: (input: OnboardingInput) => api.post<Me>("/onboarding", input).then((r) => r.data),
    onSuccess: async (me) => {
      qc.setQueryData(meKey, me);
      await qc.invalidateQueries({ queryKey: meKey });
      if (me.business) setMode(me.business.role === "SEEKER" ? "seeker" : "provider");
      toast.success("You're on Spare", { description: me.business?.name });
    },
    onError: (e) => toast.error("Couldn't set up your business", { description: apiErrorMessage(e) }),
  });
}
