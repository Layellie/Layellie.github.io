import { expect, test } from "@playwright/test";
import site from "../../src/content/site.json" with { type: "json" };
import projects from "../../src/content/projects.json" with { type: "json" };
import certificates from "../../src/content/certificates.json" with { type: "json" };
import skills from "../../src/content/skills.json" with { type: "json" };
import visuals from "../../src/content/visuals.json" with { type: "json" };

const portfolioFiles = { site, projects, certificates, skills, visuals };

test("public portfolio keeps legacy project visuals on desktop and mobile", async ({ page }, testInfo) => {
  await page.route("https://api.github.com/**", (route) => route.fulfill({ status: 403, json: {} }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.getByRole("heading", { name: "AIO-Hybrid-Clipboard" })).toBeVisible();
  await expect(page.getByText("ALT + SPACE")).toBeVisible();
  await expect(page.getByText("StandbyAndTimer", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("EyeHealth", { exact: true }).first()).toBeVisible();
  const wideSkill = page.locator("#yetenekler .lg\\:col-span-2").first();
  await expect(wideSkill).toHaveCount(1);
  await expect(wideSkill).toHaveCSS("grid-column-end", "span 2");
  await page.getByRole("heading", { name: "AIO-Hybrid-Clipboard" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({ path: testInfo.outputPath("public-project-desktop.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole("heading", { name: "AIO-Hybrid-Clipboard" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await expect(page.getByText("ALT + SPACE")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("public-project-mobile.png") });
});

test("public site respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:4173/");
  const meteor = page.locator(".meteor").first();
  await expect(meteor).toHaveCSS("display", "none");
});

test("admin dashboard and builder use the portfolio visual language", async ({ page }, testInfo) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { authenticated: true, user: { id: 12345, login: "Layellie" }, csrfToken: "visual-test", expiresAt: Date.now() + 60_000 } }));
  await page.route("**/api/content", (route) => route.fulfill({ json: { files: portfolioFiles, base: { commitSha: "0123456789abcdef0123456789abcdef01234567", blobShas: {} } } }));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://127.0.0.1:4174/");
  await expect(page.getByText("Portfolio Control")).toBeVisible();
  await expect(page.getByRole("heading", { name: /İçerik.*Görsel.*Yayın/ })).toBeVisible();
  await expect(page.getByText("Yayındaki projeler")).toBeVisible();
  await expect(page.getByText(/Ziyaretler günlük ve anonim olarak ölçülür/)).toBeVisible();
  await expect(page.getByText(/farklı günlerdeki kayıtlar birbirine bağlanmaz/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ziyaret analitiği" })).toBeVisible();
  // Publish-safety checklist moved off the dashboard into the Publish Center.
  await expect(page.getByText("Durable Object publish kilidi")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("admin-dashboard-desktop.png"), fullPage: true });

  await page.getByRole("button", { name: "Görsel oluşturucu" }).click();
  await expect(page.getByRole("heading", { name: "Kod yazmadan proje görseli oluştur" })).toBeVisible();
  await expect(page.getByText("Canlı önizleme")).toBeVisible();
  await expect(page.locator("span", { hasText: "AIO Hybrid Clipboard" }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("admin-builder-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  await expect(page.getByText("Portfolio Control")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("admin-dashboard-tablet.png"), fullPage: true });
});

test("publish center keeps the send button in view above the relocated safety panel", async ({ page }) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { authenticated: true, user: { id: 12345, login: "Layellie" }, csrfToken: "publish-layout", expiresAt: Date.now() + 60_000 } }));
  await page.route("**/api/content", (route) => route.fulfill({ json: { files: portfolioFiles, base: { commitSha: "0123456789abcdef0123456789abcdef01234567", blobShas: {} } } }));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://127.0.0.1:4174/");
  await page.getByRole("button", { name: "Doğrula & yayınla" }).click();

  const send = page.getByRole("button", { name: /GitHub.a gönder ve yayınla/ });
  await expect(send).toBeVisible();
  // The user must see the send button without scrolling the page.
  await expect(send).toBeInViewport();

  // The publish-safety checklist now lives here, below the send button.
  const safety = page.getByText("Durable Object publish kilidi");
  await expect(safety).toBeVisible();
  const sendBox = await send.boundingBox();
  const safetyBox = await safety.boundingBox();
  expect(safetyBox.y).toBeGreaterThan(sendBox.y);
});

test("admin Hakkımda editor opens from the sidebar and edits localized About content", async ({ page }, testInfo) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { authenticated: true, user: { id: 12345, login: "Layellie" }, csrfToken: "about-test", expiresAt: Date.now() + 60_000 } }));
  await page.route("**/api/content", (route) => route.fulfill({ json: { files: portfolioFiles, base: { commitSha: "0123456789abcdef0123456789abcdef01234567", blobShas: {} } } }));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://127.0.0.1:4174/");
  await expect(page.getByText("Portfolio Control")).toBeVisible();

  await page.getByRole("button", { name: "Hakkımda" }).click();
  await expect(page.getByRole("heading", { name: "Hakkımda bölümünü düzenle" })).toBeVisible();
  // Canonical TR content is loaded into the editor.
  await expect(page.getByLabel("Başlık", { exact: true })).toHaveValue("Hakkımda");
  const firstSegment = page.getByRole("textbox", { name: "Parça 1" });
  await expect(firstSegment).toHaveValue(/Kodun yalnızca/);

  // The live preview mirrors an edit without touching production data.
  const preview = page.locator("[data-about-preview]");
  await expect(preview).toBeVisible();
  await firstSegment.fill("Denemelik giriş cümlesi");
  await expect(preview).toContainText("Denemelik giriş cümlesi");

  // Keyboard-accessible tone control keeps the current grey highlight selectable.
  const greyTone = page.getByRole("group", { name: "Vurgu rengi" }).first().getByRole("button", { name: "Gri" });
  await greyTone.focus();
  await expect(greyTone).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("admin-about-desktop.png"), fullPage: true });

  // Localization mirrors the certificates/projects editors.
  await page.getByRole("tab", { name: "English" }).click();
  await expect(page.getByLabel("Başlık", { exact: true })).toHaveValue("About");

  // Reachable through the mobile navigation drawer.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page.getByRole("button", { name: "Hakkımda" }).click();
  await expect(page.getByRole("heading", { name: "Hakkımda bölümünü düzenle" })).toBeVisible();
});

test("admin reveal follows reduced-motion while preserving normal animation", async ({ page }) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { authenticated: true, user: { id: 12345, login: "Layellie" }, csrfToken: "motion-test", expiresAt: Date.now() + 60_000 } }));
  await page.route("**/api/content", (route) => route.fulfill({ json: { files: portfolioFiles, base: { commitSha: "0123456789abcdef0123456789abcdef01234567", blobShas: {} } } }));

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:4174/");
  const reveal = page.locator("[data-admin-reveal]").first();
  await expect(reveal).toHaveAttribute("data-motion-duration", "0");
  await expect(reveal).toHaveCSS("transform", "none");
  await expect(reveal).toHaveCSS("opacity", "1");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await expect(page.locator("[data-admin-reveal]").first()).toHaveAttribute("data-motion-duration", "0.45");
});

test("admin mobile and desktop previews match the public responsive renderer", async ({ page, context }) => {
  const publicPage = await context.newPage();
  await publicPage.setViewportSize({ width: 390, height: 844 });
  await publicPage.goto("http://127.0.0.1:4173/");
  const pageErrors = [];
  publicPage.on("pageerror", (error) => pageErrors.push(error.message));
  await publicPage.goto("http://127.0.0.1:4173/tests/visual/renderer-harness.html");
  await expect.poll(() => pageErrors).toEqual([]);
  const publicModule = publicPage.locator('[data-module-id="eye-next-break"]');
  await expect(publicModule).toBeVisible();
  const placement = (locator) => locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { columnStart: style.gridColumnStart, columnEnd: style.gridColumnEnd, rowStart: style.gridRowStart, rowEnd: style.gridRowEnd };
  });
  const publicMobile = await placement(publicModule);

  await page.route("**/api/session", (route) => route.fulfill({ json: { authenticated: true, user: { id: 12345, login: "Layellie" }, csrfToken: "visual-test", expiresAt: Date.now() + 60_000 } }));
  await page.route("**/api/content", (route) => route.fulfill({ json: { files: portfolioFiles, base: { commitSha: "0123456789abcdef0123456789abcdef01234567", blobShas: {} } } }));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://127.0.0.1:4174/");
  await page.getByRole("button", { name: "Görsel oluşturucu" }).click();
  await page.getByRole("combobox").first().selectOption("eyehealth");
  await page.getByRole("button", { name: "Mobil önizleme" }).click();
  const adminMobileModule = page.locator('[data-preview-viewport="mobile"] [data-module-id="eye-next-break"]');
  await expect(adminMobileModule).toBeVisible();
  expect(await placement(adminMobileModule)).toEqual(publicMobile);

  await publicPage.setViewportSize({ width: 1280, height: 900 });
  const publicDesktop = await placement(publicModule);
  await page.getByRole("button", { name: "Masaüstü önizleme" }).click();
  const adminDesktopModule = page.locator('[data-preview-viewport="desktop"] [data-module-id="eye-next-break"]');
  await expect(adminDesktopModule).toBeVisible();
  expect(await placement(adminDesktopModule)).toEqual(publicDesktop);
  expect(publicMobile.columnEnd).not.toBe(publicDesktop.columnEnd);
  await publicPage.close();
});
