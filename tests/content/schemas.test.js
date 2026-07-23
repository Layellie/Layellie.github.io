import { describe, expect, it } from "vitest";
import certificates from "../../src/content/certificates.json";
import projects from "../../src/content/projects.json";
import site from "../../src/content/site.json";
import skills from "../../src/content/skills.json";
import visuals from "../../src/content/visuals.json";
import {
  certificateMediaPathSchema,
  certificatesFileSchema,
  normalizeLegacyAboutStatement,
  parsePortfolioFiles,
  projectScreenshotPathSchema,
  projectsFileSchema,
  safeGithubUrlSchema,
  siteFileSchema,
  skillsFileSchema,
} from "../../src/content/schemas.js";

describe("portfolio schemas", () => {
  it("accepts the migrated projects", () => {
    expect(projectsFileSchema.parse(projects)).toEqual(projects);
  });

  it.each([
    "/sertifikalar/csharp-programlama.pdf",
    "/media/certificates/certificate-csharp/verified_document-1.pdf",
    "/media/certificates/certificate-csharp/pending.pdf",
  ])("accepts a managed certificate PDF path: %s", (mediaPath) => {
    expect(certificateMediaPathSchema.safeParse(mediaPath).success).toBe(true);
  });

  it.each([
    "/media/projects/x.webp",
    "/media/certificates/certificate-x/document.webp",
    "/media/certificates/certificate-x/pending.webp",
    "/media/projects/project-x/pending.pdf",
    "/media/certificates/certificate-x/document.pdf.exe",
    "/media/certificates/certificate-x/document.PDF",
    "/media/certificates/certificate-x/document.pdf?download=1",
    "/media/certificates/certificate-x/document.pdf#page=1",
    "/media/certificates/../certificate-x/document.pdf",
    "https://example.com/document.pdf",
  ])("rejects an invalid certificate path: %s", (mediaPath) => {
    expect(certificateMediaPathSchema.safeParse(mediaPath).success).toBe(false);
  });

  it.each([
    "/media/projects/project-x/screen.png",
    "/media/projects/project-x/screen.jpg",
    "/media/projects/project-x/screen.jpeg",
    "/media/projects/project-x/screen.webp",
    "/media/projects/project-x/pending.webp",
  ])("accepts a managed project screenshot path: %s", (mediaPath) => {
    expect(projectScreenshotPathSchema.safeParse(mediaPath).success).toBe(true);
  });

  it.each([
    "/media/certificates/x.pdf",
    "/media/certificates/certificate-x/document.pdf",
    "/media/certificates/certificate-x/pending.pdf",
    "/media/projects/project-x/screen.pdf",
    "/media/projects/project-x/pending.pdf",
    "/media/projects/project-x/screen.gif",
    "/media/projects/project-x/screen.svg",
    "/media/projects/project-x/screen.png.exe",
    "/media/projects/project-x/screen.webp?raw=1",
    "/media/projects/project-x/screen.webp#preview",
    "/media/projects/../project-x/screen.webp",
    "https://example.com/screen.webp",
  ])("rejects an invalid project screenshot path: %s", (mediaPath) => {
    expect(projectScreenshotPathSchema.safeParse(mediaPath).success).toBe(false);
  });

  it("applies certificate and screenshot schemas to their canonical fields", () => {
    const invalidCertificate = structuredClone(certificates);
    invalidCertificate.items[0].shared.file = "/media/projects/x.webp";
    expect(certificatesFileSchema.safeParse(invalidCertificate).success).toBe(false);

    const invalidProject = structuredClone(projects);
    invalidProject.items[0].shared.visual = {
      mode: "screenshot",
      path: "/media/certificates/x.pdf",
      objectFit: "contain",
      alt: { tr: "Önizleme", en: "Preview" },
    };
    expect(projectsFileSchema.safeParse(invalidProject).success).toBe(false);
  });

  it.each([
    "javascript:alert(1)",
    "http://github.com/Layellie/EyeHealth",
    "https://evil.example/Layellie/EyeHealth",
    "https://user:pass@github.com/Layellie/EyeHealth",
    "https://github.com/Layellie/EyeHealth/",
    "https://github.com/Layellie/EyeHealth?tab=readme",
    "https://github.com/Layellie/EyeHealth#readme",
    "https://github.com/Layellie/EyeHealth/issues",
    "https://github.com/Layellie%2FEyeHealth/repository",
    "https://github.com/Layellie/EyeHealth%2Fissues",
    "https://github.com/Layellie",
  ])("rejects an unsafe GitHub URL: %s", (url) => {
    expect(safeGithubUrlSchema.safeParse(url).success).toBe(false);
  });

  it("accepts an exact canonical GitHub repository URL", () => {
    expect(safeGithubUrlSchema.parse("https://github.com/owner/repo")).toBe("https://github.com/owner/repo");
  });

  it("rejects duplicate record IDs", () => {
    const duplicate = structuredClone(projects);
    duplicate.items.push(structuredClone(duplicate.items[0]));
    expect(projectsFileSchema.safeParse(duplicate).success).toBe(false);
  });

  it("keeps the migrated skill data valid under global ID validation", () => {
    expect(skillsFileSchema.parse(skills)).toEqual(skills);
  });

  it("accepts both locales in the canonical site content", () => {
    expect(siteFileSchema.parse(site)).toEqual(site);
  });

  it.each([
    ["an empty about section", (value) => { value.tr.about = {}; }],
    ["a missing about statement", (value) => { delete value.tr.about.statement; }],
    ["an empty about statement list", (value) => { value.tr.about.statement = []; }],
    ["an about statement segment missing its tone", (value) => { value.tr.about.statement = [{ text: "orphan segment" }]; }],
    ["an about statement segment with an unknown tone", (value) => { value.tr.about.statement = [{ text: "orphan segment", tone: "rainbow" }]; }],
    ["a legacy string about statement segment", (value) => { value.tr.about.statement = ["still a legacy string"]; }],
    ["missing about paragraphs", (value) => { delete value.en.about.paragraphs; }],
    ["missing about facts", (value) => { delete value.en.about.facts; }],
    ["a missing navigation label", (value) => { delete value.tr.nav.mail; }],
    ["a missing hero field", (value) => { delete value.en.hero.role; }],
    ["an undersized contact headline", (value) => { value.tr.contact.big = [value.tr.contact.big[0]]; }],
    ["a missing project label", (value) => { delete value.en.projects.more.viewAll; }],
    ["a missing terminal command", (value) => { delete value.tr.terminal.cmds.help; }],
    ["a missing command palette label", (value) => { delete value.en.cmd.placeholder; }],
    ["a missing mock label", (value) => { delete value.tr.mock.search; }],
  ])("rejects site content with %s", (_label, mutate) => {
    const invalid = structuredClone(site);
    mutate(invalid);
    expect(siteFileSchema.safeParse(invalid).success).toBe(false);
  });

  describe("legacy About statement migration", () => {
    const legacyFiles = () => {
      const files = structuredClone({ site, projects, certificates, skills, visuals });
      files.site.tr.about.statement = ["A ", "grey", " end."];
      files.site.en.about.statement = ["A ", "grey", " end."];
      return files;
    };

    it("converts legacy string statements into toned segments with a grey middle", () => {
      const normalized = normalizeLegacyAboutStatement(legacyFiles());
      expect(normalized.site.tr.about.statement).toEqual([
        { text: "A ", tone: "normal" },
        { text: "grey", tone: "muted" },
        { text: " end.", tone: "normal" },
      ]);
    });

    it("parses a legacy document through the shared parser without text loss", () => {
      const parsed = parsePortfolioFiles(legacyFiles());
      expect(parsed.site.tr.about.statement.map((segment) => segment.text)).toEqual(["A ", "grey", " end."]);
      expect(parsed.site.en.about.statement[1].tone).toBe("muted");
    });

    it("leaves already-migrated segment statements untouched", () => {
      const files = structuredClone({ site, projects, certificates, skills, visuals });
      const before = structuredClone(files.site.tr.about.statement);
      expect(normalizeLegacyAboutStatement(files).site.tr.about.statement).toEqual(before);
    });
  });

  it("rejects a skill ID duplicated across a card and an additional group", () => {
    const duplicate = structuredClone(skills);
    duplicate.additionalGroups[0].items[0].id = duplicate.skillCards[0].id;
    expect(skillsFileSchema.safeParse(duplicate).success).toBe(false);
  });
});
