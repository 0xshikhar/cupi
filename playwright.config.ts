import { defineConfig } from "@playwright/test";

/**
 * Lightweight E2E smoke suite — uses the locally installed Chrome
 * (`channel: "chrome"`), so no `playwright install` browser download needed.
 *
 *   bun run build
 *   bun run test:e2e        # auto-starts `next start` on :3459
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  workers: 4,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3459",
    channel: "chrome",
    headless: true,
  },
  webServer: {
    command: "npx next start -p 3459",
    url: "http://localhost:3459/api/ping",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
