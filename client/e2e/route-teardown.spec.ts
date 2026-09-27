import { expect, test, type Page } from "@playwright/test";
import { QA_EMAIL, signInAs } from "./clerk-env";

/**
 * Regression: GSAP pin-spacers used to reparent React-owned nodes on the landing page,
 * so leaving it threw "Failed to execute 'removeChild' on 'Node'".
 * Navigates client-side (no reloads) so every page really unmounts.
 */

type Step = [path: string, ready: (page: Page) => Promise<unknown>, lands?: RegExp];
const heroReady = (p: Page) => p.locator("[data-hero]").waitFor();
const discoverReady = (p: Page) => p.getByRole("heading", { level: 1 }).first().waitFor();

/** Signed in (E2E_QA_EMAIL, an onboarded account): the app pages. Signed out: they bounce to sign-in. */
const ROUTE: Step[] = QA_EMAIL
  ? [
      ["/", heroReady],
      ["/discover", discoverReady],
      ["/dashboard", (p) => p.getByText(/Dashboard ·/).first().waitFor()],
      ["/", heroReady],
      ["/requests", (p) => p.getByText(/Every/).first().waitFor()],
    ]
  : [
      ["/", heroReady],
      ["/discover", discoverReady],
      ["/dashboard", (p) => p.waitForURL(/\/sign-in/), /\/sign-in\?redirect_url=%2Fdashboard/],
      ["/", heroReady],
      ["/requests", (p) => p.waitForURL(/\/sign-in/), /\/sign-in\?redirect_url=%2Frequests/],
    ];

/** Client-side navigation through React Router's history listener. */
async function go(page: Page, path: string) {
  await page.evaluate((to) => {
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
  }, path);
}

/** Scroll through the hero and into the pinned "On the exchange" section so pins are active. */
async function exerciseLanding(page: Page) {
  await page.getByRole("heading", { name: /Seven kinds of idle/ }).waitFor({ state: "attached" });
  await page.evaluate(async () => {
    const title = document.getElementById("exchange-title");
    const target = (title?.getBoundingClientRect().top ?? 0) + window.scrollY + window.innerHeight;
    for (let y = 0; y <= target; y += Math.max(400, target / 12)) {
      window.scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
  });
  await page.waitForTimeout(400);
  expect(await page.locator(".pin-spacer").count()).toBeGreaterThan(0);
}

test(`Landing → Discover → Dashboard → Landing → Requests, ×3, ${QA_EMAIL ? "signed in" : "signed out"}, with no console errors`, async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  await page.goto("/");
  if (QA_EMAIL) {
    await signInAs(page, QA_EMAIL);
    await page.goto("/");
  }
  await ROUTE[0][1](page);

  for (let round = 1; round <= 3; round++) {
    for (const [i, [path, ready, lands]] of ROUTE.entries()) {
      if (!(round === 1 && i === 0)) await go(page, path);
      await ready(page);
      await expect(page).toHaveURL(lands ?? new RegExp(`${path === "/" ? "/$" : path}`));
      if (path === "/") await exerciseLanding(page);
      else {
        // RouteChangeHandler should have reset scroll and no pin-spacer should survive the landing unmount.
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
        expect(await page.locator(".pin-spacer").count()).toBe(0);
      }
      await page.waitForTimeout(300);
    }
  }

  expect(errors, errors.join("\n")).toEqual([]);
});
