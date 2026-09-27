import axios, { CanceledError } from "axios";
import type { SlotSuggestion } from "./types";

/** Same-origin `/api` in development (Vite proxies it to the API port); VITE_API_URL for a separately hosted API. */
export const API_BASE = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

type TokenGetter = () => Promise<string | null>;
let getToken: TokenGetter | null = null;
let onUnauthenticated: (() => void) | null = null;
let onOnboardingRequired: (() => void) | null = null;

/** Registered by <AuthBridge /> once Clerk is loaded; cleared on unmount. */
export function setAuthTokenGetter(fn: TokenGetter | null) {
  getToken = fn;
}

/** Where to send someone with no usable Clerk session (sign-in). */
export function setUnauthenticatedHandler(fn: (() => void) | null) {
  onUnauthenticated = fn;
}

/** Where to send a signed-in account that has no business yet (onboarding). */
export function setOnboardingRequiredHandler(fn: (() => void) | null) {
  onOnboardingRequired = fn;
}

/** Reads anyone may make: browsing listings, parsing a need, matching, newsletter, health. */
function isPublic(method: string, url: string) {
  const path = url.split("?")[0];
  if (method === "get" && /^\/resources(\/(?!mine)[^/]+(\/availability)?)?$/.test(path)) return true;
  if (method === "post" && ["/requests/parse", "/matches", "/newsletter"].includes(path)) return true;
  return path === "/health";
}

api.interceptors.request.use(async (config) => {
  const token = getToken ? await getToken() : null;
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  else if (!isPublic((config.method ?? "get").toLowerCase(), config.url ?? "")) {
    // No session: don't fire a request that can only 401 — send them to sign in.
    onUnauthenticated?.();
    throw new CanceledError("Not signed in");
  }
  return config;
});

/** The API's answer for a signed-in account with no business: 409 { code: "ONBOARDING_REQUIRED" }. */
export function isOnboardingRequired(error: unknown): boolean {
  return axios.isAxiosError<{ code?: string }>(error) && error.response?.status === 409 && error.response.data?.code === "ONBOARDING_REQUIRED";
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) onUnauthenticated?.();
    else if (isOnboardingRequired(error)) onOnboardingRequired?.();
    return Promise.reject(error);
  }
);

/** 409 from the booking API: the window is no longer free. Carries nearby free slots. */
export class ConflictError extends Error {
  readonly alternatives: SlotSuggestion[];
  readonly remaining: number;

  constructor(message: string, alternatives: SlotSuggestion[] = [], remaining = 0) {
    super(message);
    this.name = "ConflictError";
    this.alternatives = alternatives;
    this.remaining = remaining;
  }
}

/** Normalise a thrown error into a ConflictError when it represents a 409. */
export function asConflict(error: unknown): ConflictError | null {
  if (error instanceof ConflictError) return error;
  if (isOnboardingRequired(error)) return null;
  if (axios.isAxiosError<{ message?: string; alternatives?: SlotSuggestion[]; remaining?: number }>(error) && error.response?.status === 409) {
    const body = error.response.data;
    return new ConflictError(body?.message ?? "That time is no longer available", body?.alternatives ?? [], body?.remaining ?? 0);
  }
  return null;
}

/** Pull a human-readable message out of an API error. */
export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string; error?: string }>(error)) {
    return error.response?.data?.message ?? error.response?.data?.error ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
