import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import site from "../../src/content/site.json" with { type: "json" };
import projects from "../../src/content/projects.json" with { type: "json" };
import certificates from "../../src/content/certificates.json" with { type: "json" };
import skills from "../../src/content/skills.json" with { type: "json" };
import visuals from "../../src/content/visuals.json" with { type: "json" };

const portfolioFiles = { site, projects, certificates, skills, visuals };
const ADMIN_URL = "http://127.0.0.1:4174/";
const FORBIDDEN_TEXT = [
  /\bIv[0-9A-Za-z]{18}\b/,
  /\b\d{8,12}\b/,
  /[a-z0-9-]+(?:\.[a-z0-9-]+)*\.workers\.dev/i,
  /callback\s*url/i,
  /installation\s*id/i,
  /oauth\s*state/i,
  /pkce\s*(?:verifier|challenge)/i,
  /client\s*(?:secret|id)/i,
  /session\s*(?:secret|id)/i,
  /\b[A-Fa-f0-9]{7,40}\b/,
  /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/,
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
];

test("README dashboard capture is deterministic and uses only local mock authentication", async ({ page, context }, testInfo) => {
  const unexpectedAuthRequests = [];
  const mockedRequests = [];

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/session") {
      mockedRequests.push(url.pathname);
      expect(request.headers().authorization).toBeUndefined();
      expect(request.headers().cookie).toBeUndefined();
      await route.fulfill({
        json: {
          authenticated: true,
          user: { login: "Layellie" },
          expiresAt: 0,
          publicSiteOrigin: "https://layellie.github.io",
        },
      });
      return;
    }
    if (url.pathname === "/api/content") {
      mockedRequests.push(url.pathname);
      expect(request.headers().authorization).toBeUndefined();
      expect(request.headers().cookie).toBeUndefined();
      await route.fulfill({
        json: {
          files: portfolioFiles,
          base: { commitSha: "", blobShas: {} },
        },
      });
      return;
    }
    if (url.pathname === "/api/admin/analytics") {
      mockedRequests.push(url.pathname);
      await route.fulfill({ json: { range: "7d", today: { uniqueVisitors: 24, desktop: 15, mobileTablet: 9 }, total: 112, days: [{ day: "2026-07-17", uniqueVisitors: 11, desktop: 7, mobileTablet: 4 }, { day: "2026-07-18", uniqueVisitors: 14, desktop: 9, mobileTablet: 5 }, { day: "2026-07-19", uniqueVisitors: 17, desktop: 10, mobileTablet: 7 }, { day: "2026-07-20", uniqueVisitors: 12, desktop: 8, mobileTablet: 4 }, { day: "2026-07-21", uniqueVisitors: 18, desktop: 12, mobileTablet: 6 }, { day: "2026-07-22", uniqueVisitors: 16, desktop: 10, mobileTablet: 6 }, { day: "2026-07-23", uniqueVisitors: 24, desktop: 15, mobileTablet: 9 }] } });
      return;
    }
    if (
      url.hostname.endsWith("workers.dev")
      || url.hostname === "github.com"
      || url.hostname === "api.github.com"
      || url.pathname.startsWith("/auth/")
      || url.pathname.startsWith("/api/")
    ) {
      unexpectedAuthRequests.push(request.url());
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(ADMIN_URL);
  await expect(page.getByText("Portfolio Control")).toBeVisible();
  await expect(page.getByRole("heading", { name: /İçerik.*Görsel.*Yayın/ })).toBeVisible();
  await expect(page.getByText("Yayındaki projeler")).toBeVisible();
  await expect(page.getByText("Sertifikalar", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Yetenek kartları")).toBeVisible();
  await expect(page.getByText("Görsel presetleri")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proje görünümü" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ziyaret analitiği" })).toBeVisible();
  await expect(page.getByText("@Layellie")).toBeVisible();

  await page.evaluate(async () => {
    await document.fonts.ready;
    document.documentElement.style.caretColor = "transparent";
  });
  expect(await page.evaluate(() => document.fonts.status)).toBe("loaded");
  expect([...new Set(mockedRequests)].sort()).toEqual(["/api/admin/analytics", "/api/content", "/api/session"]);
  expect(mockedRequests.filter((pathname) => pathname === "/api/content")).toHaveLength(1);
  expect(mockedRequests.filter((pathname) => pathname === "/api/session").length).toBeGreaterThanOrEqual(1);
  expect(unexpectedAuthRequests).toEqual([]);
  expect(await context.cookies()).toEqual([]);

  const visibleText = await page.locator("body").innerText();
  for (const pattern of FORBIDDEN_TEXT) expect(visibleText).not.toMatch(pattern);

  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  }));
  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight);

  const outputPath = process.env.README_SCREENSHOT_PATH
    ? path.resolve(process.env.README_SCREENSHOT_PATH)
    : testInfo.outputPath("portfolio-admin-dashboard.png");
  await mkdir(path.dirname(outputPath), { recursive: true });
  const first = await page.screenshot({ animations: "disabled" });
  const second = await page.screenshot({ path: outputPath, animations: "disabled" });
  expect(createHash("sha256").update(first).digest("hex")).toBe(
    createHash("sha256").update(second).digest("hex"),
  );
});
