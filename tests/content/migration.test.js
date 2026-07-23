import { describe, expect, it } from "vitest";
import legacy from "../fixtures/legacy-content.json";
import { buildContentView } from "../../src/content/loadContent.js";
import { migrateLegacyContent } from "../../src/content/migrations.js";

describe("legacy content migration", () => {
  it("generates a deterministic canonical document from explicit legacy input", () => {
    const first = migrateLegacyContent(legacy);
    expect(migrateLegacyContent(structuredClone(legacy))).toEqual(first);
    expect(first).toMatchObject({ site: { schemaVersion: 1 }, projects: { schemaVersion: 1 }, certificates: { schemaVersion: 1 }, skills: { schemaVersion: 1 }, visuals: { schemaVersion: 1 } });
  });

  it("reconstructs every legacy language field without loss", () => {
    const hydrated = buildContentView(
      migrateLegacyContent(legacy),
      { includeVisual: false },
    );
    expect(hydrated.identity).toEqual(legacy.identity);
    const legacyCompatible = structuredClone(hydrated.content);
    for (const language of Object.values(legacyCompatible)) {
      delete language.nav.login;
      // The About statement is now a segment model; collapse it back to the
      // legacy plain-string form to prove no text was lost in migration.
      language.about.statement = language.about.statement.map((segment) => segment.text);
      for (const skill of language.skills.languages) {
        if (skill.width === "wide") skill.span = "lg:col-span-2";
        delete skill.width;
      }
    }
    expect(legacyCompatible).toEqual(legacy.content);
  });
});
