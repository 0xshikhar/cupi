import { test, expect } from "@playwright/test";

/**
 * Public-surface smoke tests — everything a reviewer/recipient can hit without login.
 * Auth-gated app pages intentionally live outside this suite (they need a Privy session).
 */

test.describe("landing", () => {
  test("renders hero, logo and nav", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/cUPI/i);
    await expect(page.getByRole("link", { name: /cUPI home/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /get started|launch app|sign in/i }).first()).toBeVisible();
  });
});

test.describe("get-started", () => {
  test("shows sign-in card with continue button", async ({ page }) => {
    await page.goto("/get-started");
    await expect(page.getByRole("heading", { name: /send money like a message/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();
  });

  test("renders inside branded canvas on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/get-started");
    // mint canvas + sticker card should be present at desktop width
    await expect(page.locator(".app-canvas").first()).toBeVisible();
  });
});

test.describe("public payment pages", () => {
  test("pay page shows a friendly not-found state, not a raw 404", async ({ page }) => {
    await page.goto("/pay/definitely-not-a-real-session-123");
    await expect(page.getByText(/not found|couldn't be found|doesn't exist|expired/i).first()).toBeVisible();
    await expect(page.locator(".app-canvas").first()).toBeVisible();
  });

  test("claim page shows a friendly not-found state", async ({ page }) => {
    await page.goto("/claim/definitely-not-a-real-link-123");
    await expect(page.getByText(/not found|couldn't be found|doesn't exist|claimed|expired/i).first()).toBeVisible();
  });
});

test.describe("docs", () => {
  test("developer docs page loads with cUPI branding", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.getByText(/cUPI/).first()).toBeVisible();
    await expect(page.getByText(/documentation|docs|API/i).first()).toBeVisible();
  });
});

test.describe("api probes", () => {
  test("/api/ping responds fast with 200", async ({ request }) => {
    const res = await request.get("/api/ping");
    expect(res.status()).toBe(200);
    expect((await res.json()).pong).toBe(true);
  });

  test("/api/health is ok and does not leak business counts", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.counts).toBeUndefined();
  });

  test("unauthenticated merchant checkout is rejected, not 500", async ({ request }) => {
    const res = await request.post("/api/merchant/checkout", { data: {} });
    expect([400, 401, 403]).toContain(res.status());
  });
});
