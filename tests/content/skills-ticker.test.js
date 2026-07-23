import { describe, expect, it } from "vitest";
import { buildContentView, portfolioFiles, selectSkillsTicker } from "../../src/content/loadContent.js";

describe("skills ticker", () => {
  it("uses localized skill cards and additional groups without duplicates", () => {
    const files = structuredClone(portfolioFiles);
    files.skills.additionalGroups[0].items.push({ id: "duplicate", shared: { certified: false }, tr: { name: " c# " }, en: { name: " C# " } });
    const view = buildContentView(files);
    const tr = selectSkillsTicker(view.content.tr.skills);
    const en = selectSkillsTicker(view.content.en.skills);
    expect(tr.map((item) => item.label)).toContain("Yapay Zeka & Algoritmalar");
    expect(en.map((item) => item.label)).toContain("AI & Algorithms");
    expect(tr.filter((item) => item.label.toLocaleLowerCase("tr-TR") === "c#")).toHaveLength(1);
  });

  it("reflects skill add, rename and removal from the canonical view", () => {
    const files = structuredClone(portfolioFiles);
    files.skills.skillCards[0].tr.name = "C# Yenilendi";
    files.skills.skillCards.push({ id: "go", shared: { icon: "Code2", certified: false, width: "normal" }, tr: { name: "Go", description: "", tags: [] }, en: { name: "Go", description: "", tags: [] } });
    files.skills.skillCards = files.skills.skillCards.filter((item) => item.id !== "skill-node-js");
    const names = selectSkillsTicker(buildContentView(files).content.tr.skills).map((item) => item.label);
    expect(names).toContain("C# Yenilendi");
    expect(names).toContain("Go");
    expect(names).not.toContain("Node.js");
  });
});
