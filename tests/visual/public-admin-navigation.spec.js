import { expect, test } from "@playwright/test";

const SITE_URL = "http://127.0.0.1:4173/";

test.beforeEach(async ({ page }) => {
  await page.route("https://api.github.com/**", (route) => route.fulfill({ status: 403, json: {} }));
});

test("admin access stays localized, keyboard accessible and aligned on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(SITE_URL);

  const controls = page.locator("[data-header-controls]");
  const login = page.locator('[data-admin-login="desktop"]');
  await expect(controls).toBeVisible();
  await expect(login).toBeVisible();
  await expect(login).toHaveText(/Giriş Yap/);
  await expect(login).toHaveAttribute("href", "/admin/");
  await expect(login).toHaveAttribute("aria-label", "Giriş Yap");
  await expect(login.evaluate((element) => element.parentElement?.hasAttribute("data-header-controls"))).resolves.toBe(true);
  await expect(login.evaluate((element) => element.previousElementSibling?.tagName)).resolves.toBe("BUTTON");
  await expect(login.evaluate((element) => element.nextElementSibling?.getAttribute("href")?.startsWith("mailto:"))).resolves.toBe(true);

  await login.focus();
  await expect(login).toBeFocused();
  expect(await login.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe("none");

  await controls.locator('button[aria-label="Dil değiştir / Switch language"]').click();
  await expect(login).toHaveText(/Log in/);
  await expect(login).toHaveAttribute("aria-label", "Log in");

  for (const width of [1280, 1440, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(login).toBeVisible();
    const layout = await page.locator("header nav").evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        left: bounds.left,
        right: bounds.right,
        viewport: window.innerWidth,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      };
    });
    expect(layout.left).toBeGreaterThanOrEqual(0);
    expect(layout.right).toBeLessThanOrEqual(layout.viewport);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  }

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(login).toBeHidden();
  await expect(page.getByRole("button", { name: "Menü" })).toBeVisible();
  const tabletHeader = await page.locator("header nav").evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(tabletHeader.scrollWidth).toBeLessThanOrEqual(tabletHeader.clientWidth);
});

test("mobile menu exposes a full-width localized admin access target", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(SITE_URL);
  await page.evaluate(() => localStorage.setItem("lang", "tr"));
  await page.reload();

  await page.getByRole("button", { name: "Menü" }).click();
  const login = page.locator('[data-admin-login="mobile"]');
  await expect(login).toBeVisible();
  await expect(login).toHaveText(/Giriş Yap/);
  await expect(login).toHaveAttribute("href", "/admin/");
  await expect(login).toHaveAttribute("aria-label", "Giriş Yap");

  const target = await login.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const parent = element.parentElement?.getBoundingClientRect();
    const parentStyle = element.parentElement ? getComputedStyle(element.parentElement) : null;
    const horizontalPadding = parentStyle
      ? parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.paddingRight)
      : 0;
    return {
      height: bounds.height,
      width: bounds.width,
      parentContentWidth: (parent?.width || 0) - horizontalPadding,
    };
  });
  expect(target.height).toBeGreaterThanOrEqual(48);
  expect(Math.abs(target.width - target.parentContentWidth)).toBeLessThanOrEqual(1);

  for (let index = 0; index < 12; index += 1) {
    if (await login.evaluate((element) => document.activeElement === element)) break;
    await page.keyboard.press("Tab");
  }
  await expect(login).toBeFocused();
  expect(await login.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe("none");
  const menu = await page.locator("[data-mobile-menu]").evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      left: bounds.left,
      right: bounds.right,
      viewport: window.innerWidth,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    };
  });
  expect(menu.left).toBeGreaterThanOrEqual(0);
  expect(menu.right).toBeLessThanOrEqual(menu.viewport);
  expect(menu.scrollWidth).toBeLessThanOrEqual(menu.clientWidth);
});
