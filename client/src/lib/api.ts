import axios from "axios";
import type { SlotSuggestion } from "./types";

/** Axios instance for the Express API (proxied to :5000 by Vite in dev). */
export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

type TokenGetter = () => Promise<string | null>;
let getToken: TokenGetter | null = null;

/** Registered by <AuthBridge /> once Clerk is loaded; cleared on unmount. */
export function setAuthTokenGetter(fn: TokenGetter | null) {
  getToken = fn;
}

export async function authHeader(): Promise<Record<string, string>> {
  const token = getToken ? await getToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

api.interceptors.request.use(async (config) => {
  const token = getToken ? await getToken() : null;
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

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
