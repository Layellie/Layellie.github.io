import { describe, expect, it } from "vitest";
import { formatRelativePush, isAutomatedBrowser, resolveInitialLang } from "../../src/App.jsx";

describe("public site language query and relative push helpers", () => {
  it("detects headless and crawler browsers without flagging regular users", () => {
    expect(isAutomatedBrowser({ webdriver: true, userAgent: "Mozilla/5.0 Chrome/131.0" })).toBe(true);
    expect(isAutomatedBrowser({ webdriver: false, userAgent: "Mozilla/5.0 HeadlessChrome/131.0" })).toBe(true);
    expect(isAutomatedBrowser({ webdriver: false, userAgent: "Mozilla/5.0 Chrome-Lighthouse" })).toBe(true);
    expect(isAutomatedBrowser({ webdriver: false, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36" })).toBe(false);
    expect(isAutomatedBrowser(null)).toBe(false);
  });

  it("prioritizes ?lang query param over stored preference and falls back to tr", () => {
    expect(resolveInitialLang("?lang=en", "tr")).toBe("en");
    expect(resolveInitialLang("?lang=TR", "en")).toBe("tr");
    expect(resolveInitialLang("?lang=de", "en")).toBe("en");
    expect(resolveInitialLang("", "en")).toBe("en");
    expect(resolveInitialLang("", null)).toBe("tr");
  });

  it("formats GitHub pushed_at dates in TR and EN", () => {
    const now = new Date("2026-11-23T12:00:00Z").getTime();
    expect(formatRelativePush("2026-11-23T10:00:00Z", "tr", now)).toBe("bugün");
    expect(formatRelativePush("2026-11-23T10:00:00Z", "en", now)).toBe("today");
    expect(formatRelativePush("2026-11-22T10:00:00Z", "tr", now)).toBe("dün");
    expect(formatRelativePush("2026-11-22T10:00:00Z", "en", now)).toBe("yesterday");
    expect(formatRelativePush("2026-11-18T10:00:00Z", "tr", now)).toBe("5 gün önce");
    expect(formatRelativePush("2026-11-18T10:00:00Z", "en", now)).toBe("5d ago");
    expect(formatRelativePush("2026-09-01T10:00:00Z", "tr", now)).toBe("2 ay önce");
    expect(formatRelativePush("invalid", "tr", now)).toBe("");
  });
});
