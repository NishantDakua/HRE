import { expect, test, type Page } from "@playwright/test";
import { QA_EMAIL, signInAs } from "./clerk-env";

/**
 * Responsive audit at phone (390×844) and tablet (768×1024), touch emulation. Public pages always;
 * signed-in pages too when E2E_QA_EMAIL names an onboarded Clerk account.
 * Screenshots → test-results/responsive/. Fails on:
 *  - horizontal overflow (document.scrollWidth > innerWidth)
 *  - fixed/sticky elements overlapping the mobile tab bar, or page content ending behind it
 *  - visible tap targets under 44×44px (inline text links and third-party internals exempt, per WCAG 2.5.8)
 */

const API = process.env.E2E_API ?? "http://localhost:5000/api";
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
] as const;

interface Target {
  path: string;
  label: string;
  signedIn: boolean;
  mode?: "seeker" | "provider";
}

/** GET through the app's own API client headers (the signed-in page's Clerk token). */
async function apiGet<T>(page: Page, url: string): Promise<T> {
  return page.evaluate(async (u) => {
    const token = await (window as unknown as { Clerk?: { session?: { getToken(): Promise<string | null> } } }).Clerk?.session?.getToken();
    const res = await fetch(`/api${u}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return res.json();
  }, url);
}

async function targets(page: Page): Promise<Target[]> {
  const resources = await (await fetch(`${API}/resources`)).json();
  const list: Target[] = [
    { path: "/", label: "landing", signedIn: false },
    { path: "/discover", label: "discover", signedIn: false },
    { path: "/discover?category=CHAIRS_TABLES&qty=120&area=Bandra", label: "discover-results", signedIn: false },
    ...(resources[0] ? [{ path: `/resource/${resources[0].id}`, label: "resource", signedIn: false }] : []),
    { path: "/sign-in", label: "sign-in", signedIn: false },
    { path: "/nope", label: "not-found", signedIn: false },
  ];
  if (!QA_EMAIL) return list;
  await page.goto("/");
  await signInAs(page, QA_EMAIL);
  list.push(
    { path: "/dashboard", label: "dashboard-seeker", signedIn: true, mode: "seeker" },
    { path: "/dashboard", label: "dashboard-provider", signedIn: true, mode: "provider" },
    { path: "/requests", label: "requests-seeker", signedIn: true, mode: "seeker" },
    { path: "/requests", label: "requests-provider", signedIn: true, mode: "provider" },
    { path: "/analytics", label: "analytics", signedIn: true, mode: "provider" }
  );
  const seekerBookings = await apiGet<{ id: string }[]>(page, "/bookings?role=seeker");
  if (seekerBookings[0]) list.push({ path: `/requests?id=${seekerBookings[0].id}`, label: "request-detail", signedIn: true, mode: "seeker" });
  // A live handover contract, if one exists.
  for (const b of await apiGet<{ id: string; status: string }[]>(page, "/bookings?role=provider")) {
    if (!["ACCEPTED", "CONFIRMED", "IN_USE", "COMPLETED"].includes(b.status)) continue;
    const contracts = await apiGet<{ id: string }[]>(page, `/bookings/${b.id}/contracts`);
    if (Array.isArray(contracts) && contracts[0]) {
      list.push({ path: `/contract/${contracts[0].id}`, label: "contract", signedIn: true, mode: "provider" });
      list.push({ path: `/handover/${contracts[0].id}`, label: "handover", signedIn: true, mode: "provider" });
      break;
    }
  }
  return list;
}

async function audit(page: Page, phone: boolean) {
  return page.evaluate((phone) => {
    const problems: string[] = [];
    const vw = window.innerWidth;
    if (document.documentElement.scrollWidth > vw + 1) {
      const wide = [...document.querySelectorAll("body *")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.right <= vw + 1) return false;
          // Only report the outermost culprit, not its descendants or content of scrolling containers.
          for (let p = el.parentElement; p; p = p.parentElement) {
            const ox = getComputedStyle(p).overflowX;
            if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return false;
            if (p.getBoundingClientRect().right > vw + 1) return false;
          }
          return true;
        })
        .slice(0, 4)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
      problems.push(`overflow: scrollWidth ${document.documentElement.scrollWidth} > ${vw} [${wide.join(" | ")}]`);
    }

    const visible = (el: Element) => {
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2 && r.bottom > 0 && r.right > 0 && r.left < vw;
    };

    const bar = document.querySelector('[data-testid="tab-bar"]');
    if (phone) {
      if (!bar || !visible(bar)) problems.push("tab bar: missing on phone");
      else {
        const b = bar.getBoundingClientRect();
        for (const el of document.querySelectorAll("body *")) {
          if (bar.contains(el) || el.contains(bar) || !visible(el)) continue;
          const pos = getComputedStyle(el).position;
          if (pos !== "fixed") continue;
          const r = el.getBoundingClientRect();
          if (r.height >= window.innerHeight - 1) continue; // full-screen overlays (sheets) sit above it deliberately
          if (r.bottom > b.top + 1 && r.top < b.bottom && r.right > b.left && r.left < b.right) problems.push(`covers tab bar: ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)}`);
        }
        // Content must be able to scroll clear of the bar.
        const main = document.querySelector("main");
        if (main) {
          const pad = parseFloat(getComputedStyle(main).paddingBottom) + parseFloat(getComputedStyle(document.body).paddingBottom || "0");
          if (pad < b.height - 1) problems.push(`main bottom padding ${pad}px < tab bar ${Math.round(b.height)}px`);
        }
      }
    }

    // Header contents must not be clipped (the header hides its own overflow).
    const head = document.querySelector("header .container");
    if (head && head.scrollWidth > head.clientWidth + 1) problems.push(`header clipped: ${head.scrollWidth} > ${head.clientWidth}`);
    for (const el of document.querySelectorAll("header nav a")) {
      if (visible(el) && (el as HTMLElement).getBoundingClientRect().height > 48) problems.push(`nav label wraps: "${el.textContent?.trim()}"`);
    }

    const SELECTOR = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [role="radio"], [role="switch"], [role="checkbox"], [role="option"], [role="menuitem"], summary';
    const small = new Map<string, number>();
    for (const el of document.querySelectorAll(SELECTOR)) {
      if (!visible(el) || el.closest('[class*="cl-"], .leaflet-control-attribution, [data-tap-exempt], [aria-hidden="true"]')) continue;
      if ((el as HTMLElement).classList.contains("sr-only")) continue;
      // Inline links inside running text are exempt (WCAG 2.5.8).
      if (el.tagName === "A" && getComputedStyle(el).display === "inline" && (el.parentElement?.textContent?.trim().length ?? 0) > (el.textContent?.trim().length ?? 0) + 3) continue;
      const r = el.getBoundingClientRect();
      if (r.width >= 43.5 && r.height >= 43.5) continue;
      const label = (el.getAttribute("aria-label") || el.textContent || (el as HTMLInputElement).placeholder || el.getAttribute("type") || "").trim().replace(/\s+/g, " ").slice(0, 28);
      const key = `${el.tagName.toLowerCase()}${el.getAttribute("role") ? `[${el.getAttribute("role")}]` : ""} "${label}" ${Math.round(r.width)}×${Math.round(r.height)}`;
      small.set(key, (small.get(key) ?? 0) + 1);
    }
    for (const [k, n] of small) problems.push(`tap target <44: ${k}${n > 1 ? ` ×${n}` : ""}`);
    return problems;
  }, phone);
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} ${vp.width}×${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

    test(`every page fits and is touch-friendly`, async ({ page }) => {
      test.setTimeout(8 * 60_000);
      const all: string[] = [];
      for (const t of await targets(page)) {
        await page.goto("/");
        // With E2E_QA_EMAIL every target runs signed in; the view switch only matters for BOTH accounts.
        await page.evaluate((mode) => {
          if (mode) localStorage.setItem("spare-app", JSON.stringify({ state: { mode }, version: 0 }));
        }, t.mode);
        await page.goto(t.path);
        await page.waitForLoadState("networkidle");
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 }).catch(() => undefined);
        await page.waitForTimeout(t.label === "landing" ? 1500 : 400);
        // Audit first: a full-page screenshot briefly overrides device metrics (touch emulation included).
        const problems = await audit(page, vp.name === "phone");
        // Viewport-only captures (top, then bottom): full-page capture drops touch emulation for later checks.
        await page.screenshot({ path: `test-results/responsive/${vp.name}-${t.label}.png` });
        if (t.label !== "landing") {
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
          await page.waitForTimeout(250);
          await page.screenshot({ path: `test-results/responsive/${vp.name}-${t.label}-bottom.png` });
        }
        // Landing is long and animated: also check further down the page.
        if (t.label === "landing") {
          for (const y of [0.25, 0.5, 0.75, 1]) {
            await page.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), y);
            await page.waitForTimeout(500);
            problems.push(...(await audit(page, vp.name === "phone")).map((p) => `@${y * 100}%: ${p}`));
          }
        }
        all.push(...[...new Set(problems)].map((p) => `[${t.label}] ${p}`));
      }
      expect(all, all.join("\n")).toEqual([]);
    });
  });
}
