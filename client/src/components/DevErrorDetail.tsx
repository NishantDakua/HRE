import axios from "axios";
import { apiErrorMessage } from "@/lib/api";

/** "401 · Not signed in" — the HTTP status and server message behind a failed request. */
export function describeApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (!status) return `network · ${error.code === "ERR_CANCELED" ? "request not sent (no session)" : "API unreachable"}`;
    return `${status} · ${apiErrorMessage(error)}`;
  }
  return apiErrorMessage(error);
}

/** Development only: shows why a request failed, under the friendly text. Renders nothing in production. */
export function DevErrorDetail({ error }: { error: unknown }) {
  if (!import.meta.env.DEV || !error) return null;
  return (
    <p className="font-mono text-[11px] text-muted" data-testid="dev-error-detail">
      {describeApiError(error)}
    </p>
  );
}
