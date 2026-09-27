import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { loadClerkEnv, signInAs } from "./clerk-env";

/**
 * End to end with real Clerk accounts (test emails, no inbox needed):
 *   new provider → onboarding → empty dashboard → lists a resource;
 *   new seeker → onboarding → finds it on Discover → requests it;
 *   provider accepts → seeker sees Accepted.
 * No console errors and no failed network requests anywhere.
 *
 * Needs the API running against the app's database (pnpm dev) and Clerk keys in server/.env
 * (CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY). Each run creates two Clerk test users and two
 * businesses named "QA · …" through the normal API.
 */

const here = path.dirname(fileURLToPath(import.meta.url));

const hasClerk = loadClerkEnv();

/**
 * Fake camera for the listing wizard: 8 one-second scenes of random 16×16 blocks (so each shot's
 * perceptual hash differs) plus per-pixel noise (so each JPEG is a real-sized photo).
 */
const CAMERA = path.resolve(here, "../test-results/fake-camera.y4m");
function writeFakeCamera(file: string) {
  if (fs.existsSync(file)) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const W = 320;
  const H = 240;
  const FPS = 5;
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const chunks: Buffer[] = [Buffer.from(`YUV4MPEG2 W${W} H${H} F${FPS}:1 Ip A1:1 C420jpeg\n`)];
  for (let scene = 0; scene < 8; scene++) {
    const blocks = Array.from({ length: 256 }, () => Math.round(rand() * 200 + 28));
    const u = Math.round(rand() * 120 + 68);
    const v = Math.round(rand() * 120 + 68);
    for (let f = 0; f < FPS; f++) {
      const y = Buffer.alloc(W * H);
      for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
          const block = blocks[Math.floor(r / (H / 16)) * 16 + Math.floor(c / (W / 16))];
          y[r * W + c] = Math.max(0, Math.min(255, block + Math.round((rand() - 0.5) * 50)));
        }
      }
      chunks.push(Buffer.from("FRAME\n"), y, Buffer.alloc((W * H) / 4, u), Buffer.alloc((W * H) / 4, v));
    }
  }
  fs.writeFileSync(file, Buffer.concat(chunks));
}
writeFakeCamera(CAMERA);

test.use({
  permissions: ["camera"],
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${CAMERA}`],
  },
});
test.describe.configure({ mode: "serial" });

/** Creates a Clerk test user through the Backend API (test email: no inbox, no password). */
async function createClerkUser(label: string) {
  const emailAddress = `qa-${label}-${Date.now().toString(36)}+clerk_test@example.com`;
  const res = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email_address: [emailAddress], first_name: "QA", last_name: label, skip_password_requirement: true }),
  });
  if (!res.ok) throw new Error(`Clerk user create failed: ${res.status} ${await res.text()}`);
  return emailAddress;
}

/** Watches a page for console errors, page errors and failed requests. */
function watch(page: Page, who: string, problems: string[]) {
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`[${who}] console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push(`[${who}] pageerror: ${err.message}`));
  page.on("requestfailed", (req) => {
    const failure = req.failure()?.errorText ?? "";
    // Requests the browser abandons on navigation (or React Query cancels on unmount) aren't failures.
    if (failure.includes("ERR_ABORTED")) return;
    problems.push(`[${who}] request failed: ${req.method()} ${req.url()} ${failure}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400) problems.push(`[${who}] HTTP ${res.status()}: ${res.request().method()} ${res.url()}`);
  });
}

async function signedInPage(browser: Browser, label: string, problems: string[]) {
  // Own context per account (separate Clerk cookies); new contexts don't inherit config `use`.
  const { baseURL, viewport } = test.info().project.use;
  const context = await browser.newContext({ baseURL, viewport, permissions: ["camera"] });
  const page = await context.newPage();
  watch(page, label, problems);
  const email = await createClerkUser(label);
  await page.goto("/");
  await signInAs(page, email);
  return page;
}

async function onboard(page: Page, deepLink: string, role: "I lend" | "I borrow", name: string) {
  // A deep link while signed in without a business lands on onboarding.
  await page.goto(deepLink);
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByText(role, { exact: true }).click();
  await page.getByLabel("Business name").fill(name);
  await page.getByLabel("Business type").selectOption("Caterer");
  await page.getByLabel("Area").selectOption("Andheri");
  await page.getByRole("button", { name: /Continue/ }).click();
}

const stamp = Date.now().toString(36);
const LISTING = `QA · Folding chairs ${stamp}`;
const problems: string[] = [];
let provider: Page;
let seeker: Page;

test.beforeAll(() => {
  test.skip(!hasClerk, "Clerk keys are not configured");
});

test("a new provider onboards, sees empty states and lists a resource", async ({ browser }) => {
  test.setTimeout(180_000);
  provider = await signedInPage(browser, "provider", problems);
  await onboard(provider, "/analytics", "I lend", `QA · Lender ${stamp}`);

  await expect(provider).toHaveURL(/\/dashboard$/);
  await expect(provider.getByText("No listings yet.")).toBeVisible();
  await expect(provider.getByTestId("error-state")).toHaveCount(0);
  // Single-role: no Seeker/Provider switch, no seeker-only nav.
  await expect(provider.getByRole("radiogroup", { name: "Role" })).toHaveCount(0);
  await expect(provider.getByRole("link", { name: "Discover", exact: true })).toHaveCount(0);

  await provider.getByRole("button", { name: "Add resource" }).first().click();
  const wizard = provider.getByRole("dialog");
  await wizard.getByLabel("Title").fill(LISTING);
  await wizard.getByLabel("Category").selectOption("CHAIRS_TABLES");
  await wizard.getByLabel("Unit name").fill("chairs");
  await wizard.getByLabel("Description").fill("Sturdy folding chairs, clean and stacked. Pickup from the loading bay.");
  await wizard.getByLabel("Quantity you own").fill("60");
  await wizard.getByRole("button", { name: /Continue/ }).click();

  for (const shot of ["1. Front", "2. Side", "3. Where it sits"]) {
    await wizard.getByRole("button", { name: new RegExp(shot) }).click();
    const video = wizard.locator("video");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState >= 2 && v.videoWidth > 2)).toBe(true);
    await wizard.getByRole("button", { name: "Take photo" }).click();
    await expect(video).toHaveCount(0);
    await provider.waitForTimeout(1_100); // next camera scene
  }
  await wizard.getByRole("button", { name: /Continue/ }).click();

  await wizard.getByLabel("Price (₹)").fill("25");
  await wizard.getByLabel("Charged").selectOption("DAY");
  await wizard.getByRole("button", { name: /Continue/ }).click(); // pricing
  await wizard.getByRole("button", { name: /Continue/ }).click(); // availability
  await wizard.getByRole("button", { name: /Continue/ }).click(); // conditions
  await wizard.getByRole("button", { name: "Publish listing" }).click();

  await expect(provider.getByText(LISTING).first()).toBeVisible();
  await expect(provider.getByText("No listings yet.")).toHaveCount(0);
});

test("a new seeker finds the listing and requests it", async ({ browser }) => {
  test.setTimeout(120_000);
  seeker = await signedInPage(browser, "seeker", problems);
  await onboard(seeker, "/requests", "I borrow", `QA · Borrower ${stamp}`);
  await expect(seeker).toHaveURL(/\/discover/);

  await seeker.goto("/discover?category=CHAIRS_TABLES&qty=10&area=Andheri");
  const card = seeker.locator('[id^="match-"]', { hasText: LISTING });
  await expect(card).toBeVisible({ timeout: 20_000 });
  await card.getByRole("link", { name: /Details/ }).click();

  await expect(seeker.getByRole("heading", { level: 1, name: LISTING })).toBeVisible();
  const quantity = seeker.getByRole("spinbutton").first();
  await quantity.fill("10");
  await seeker.getByRole("button", { name: /Send request/ }).click();
  await expect(seeker.getByText("Request sent")).toBeVisible();
});

test("the provider accepts and the seeker sees Accepted", async () => {
  test.setTimeout(90_000);
  await provider.goto("/dashboard");
  const row = provider.locator("li, article, div", { hasText: LISTING }).filter({ has: provider.getByRole("button", { name: "Accept", exact: true }) }).last();
  await row.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(provider.getByText("Booking accepted")).toBeVisible();

  await seeker.goto("/requests");
  const item = seeker.getByRole("button", { name: new RegExp(LISTING) }).or(seeker.locator("li", { hasText: LISTING })).first();
  await expect(item).toBeVisible();
  await expect(item.getByText("Accepted")).toBeVisible();
});

test.afterAll(async () => {
  await provider?.context().close();
  await seeker?.context().close();
});

test("no console errors and no failed network requests", () => {
  expect(problems, problems.join("\n")).toEqual([]);
});
