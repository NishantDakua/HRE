import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3101);

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1360, height: 900 },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 900 } } }],
  webServer: {
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
