import { describe, expect, it } from "vitest";
import legacy from "../fixtures/legacy-content.json";
import site from "../../src/content/site.json";
import projects from "../../src/content/projects.json";
import certificates from "../../src/content/certificates.json";
import skills from "../../src/content/skills.json";
import visuals from "../../src/content/visuals.json";
import { buildContentView } from "../../src/content/loadContent.js";
import { migrateLegacyContent } from "../../src/content/migrations.js";

describe("legacy content migration", () => {
  it("generates the committed canonical JSON files", () => {
    expect(migrateLegacyContent(legacy)).toEqual({
      site,
      projects,
      certificates,
      skills,
      visuals,
    });
  });

  it("reconstructs every legacy language field without loss", () => {
    const hydrated = buildContentView(
      { site, projects, certificates, skills, visuals },
      { includeVisual: false },
    );
    expect(hydrated.identity).toEqual(legacy.identity);
    const legacyCompatible = structuredClone(hydrated.content);
    for (const language of Object.values(legacyCompatible)) {
      for (const skill of language.skills.languages) {
        if (skill.width === "wide") skill.span = "lg:col-span-2";
        delete skill.width;
      }
    }
    expect(legacyCompatible).toEqual(legacy.content);
  });
});
