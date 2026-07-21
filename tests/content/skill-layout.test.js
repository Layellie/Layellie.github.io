import { describe, expect, it } from "vitest";
import { portfolioFiles, buildContentView } from "../../src/content/loadContent.js";
import { skillWidthClass } from "../../src/App.jsx";

describe("public skill card width mapping", () => {
  it("keeps width semantic in the view model and maps wide to a static Tailwind class", () => {
    const { content } = buildContentView(portfolioFiles);
    const wide = content.tr.skills.languages.find((item) => item.width === "wide");
    const normal = content.tr.skills.languages.find((item) => item.width === "normal");
    expect(wide).toBeTruthy();
    expect(wide.span).toBeUndefined();
    expect(skillWidthClass(wide.width)).toBe("lg:col-span-2");
    expect(skillWidthClass(normal.width)).toBe("");
  });
});
