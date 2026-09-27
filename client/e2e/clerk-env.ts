import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Clerk keys for @clerk/testing, from the environment or server/.env and client/.env (never printed). */
export function loadClerkEnv() {
  for (const file of [path.resolve(here, "../../server/.env"), path.resolve(here, "../.env")]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  process.env.CLERK_PUBLISHABLE_KEY ??= process.env.VITE_CLERK_PUBLISHABLE_KEY;
  return Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY);
}

/**
 * An existing, already-onboarded Clerk account for audits of signed-in pages (e.g. a QA · business
 * created by account-flow.spec). Unset: those specs only cover public pages.
 */
export const QA_EMAIL = process.env.E2E_QA_EMAIL;

let ready: Promise<void> | null = null;
/** Signs the page in as `email` (ticket strategy; no password). The page must be on a Clerk-loading route. */
export async function signInAs(page: Page, email: string) {
  loadClerkEnv();
  ready ??= clerkSetup();
  await ready;
  await clerk.signIn({ page, emailAddress: email });
}
