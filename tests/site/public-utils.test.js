import { describe, expect, it } from "vitest";
import { formatRelativePush, resolveInitialLang } from "../../src/App.jsx";

describe("public site language query and relative push helpers", () => {
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
