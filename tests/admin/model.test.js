import { afterEach, describe, expect, it, vi } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import {
  clonePortfolio,
  certificateSkillOptions,
  createCertificate,
  createGroupSkillItem,
  createProject,
  createSkillCard,
  createDiffSummary,
  duplicateProject,
  hasDiff,
  moveItem,
  publicationIssues,
  formatLocalDate,
  skillIdScope,
  synchronizeUploads,
  translationWarnings,
  validatePortfolio,
} from "../../src/admin/data/model.js";

describe("admin data model", () => {
  afterEach(() => vi.useRealTimers());

  it("duplicates a project as a uniquely identified draft", () => {
    const result = duplicateProject(portfolioFiles.projects.items, "clipboard");
    expect(result).toHaveLength(portfolioFiles.projects.items.length + 1);
    expect(result[1].id).toBe("clipboard-copy");
    expect(result[1].publicationStatus).toBe("draft");
  });

  it("reorders without mutating the source", () => {
    const source = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const result = moveItem(source, 0, 2);
    expect(result.map((item) => item.id)).toEqual(["b", "c", "a"]);
    expect(source.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("detects bilingual omissions before publish", () => {
    const draft = clonePortfolio(portfolioFiles);
    draft.projects.items[0].en.description = "";
    expect(translationWarnings(draft)).toContain("projects.clipboard.en.description");
    expect(() => validatePortfolio(draft)).toThrow();
  });

  it("summarizes added, changed and removed records", () => {
    const draft = clonePortfolio(portfolioFiles);
    draft.projects.items[0].tr.name = "Changed";
    draft.certificates.items.pop();
    draft.visuals.presets.push({ ...structuredClone(draft.visuals.presets[0]), id: "new-visual", name: "New" });
    const summary = createDiffSummary(portfolioFiles, draft);
    expect(summary.projects.changed).toContain("clipboard");
    expect(summary.certificates.removed).toHaveLength(1);
    expect(summary.visuals.added).toEqual(["new-visual"]);
    expect(hasDiff(summary)).toBe(true);
  });

  it.each([
    ["projects", (draft) => draft.projects.items.reverse(), "projects"],
    ["certificates", (draft) => draft.certificates.items.reverse(), "certificates"],
    ["focus areas", (draft) => draft.skills.focusAreas.reverse(), "skills"],
    ["skill cards", (draft) => draft.skills.skillCards.reverse(), "skills"],
    ["additional groups", (draft) => draft.skills.additionalGroups.reverse(), "skills"],
    ["skills inside a group", (draft) => draft.skills.additionalGroups.find((group) => group.items.length > 1).items.reverse(), "skills"],
    ["visual presets", (draft) => draft.visuals.presets.reverse(), "visuals"],
  ])("treats a %s-only reorder as a publishable change", (_label, reorder, summaryKey) => {
    const draft = clonePortfolio(portfolioFiles);
    reorder(draft);
    const summary = createDiffSummary(portfolioFiles, draft);
    expect(summary[summaryKey].changed.length).toBeGreaterThan(0);
    expect(hasDiff(summary)).toBe(true);
  });

  it("removes a screenshot upload after switching away from screenshot mode", () => {
    const draft = clonePortfolio(portfolioFiles);
    const project = draft.projects.items[0];
    project.shared.visual = { mode: "screenshot", path: `/media/projects/${project.id}/pending.png`, objectFit: "contain", alt: { tr: "x", en: "x" } };
    const upload = { kind: "screenshot", recordId: project.id, file: { name: "screen.png" } };
    expect(synchronizeUploads(draft, [upload])).toEqual([upload]);
    project.shared.visual = { mode: "builder", visualId: "clipboard" };
    expect(synchronizeUploads(draft, [upload])).toEqual([]);
  });

  it("removes uploads when their project or certificate record is deleted", () => {
    const draft = clonePortfolio(portfolioFiles);
    const project = draft.projects.items[0];
    const certificate = draft.certificates.items[0];
    project.shared.visual = { mode: "screenshot", path: `/media/projects/${project.id}/pending.webp`, objectFit: "contain", alt: { tr: "x", en: "x" } };
    certificate.shared.file = `/media/certificates/${certificate.id}/pending.pdf`;
    const uploads = [
      { kind: "screenshot", recordId: project.id, file: { name: "screen.webp" } },
      { kind: "certificate", recordId: certificate.id, file: { name: "certificate.pdf" } },
    ];
    draft.projects.items.shift();
    draft.certificates.items.shift();
    expect(synchronizeUploads(draft, uploads)).toEqual([]);
  });

  it("keeps only the newest active upload for a media record", () => {
    const draft = clonePortfolio(portfolioFiles);
    const certificate = draft.certificates.items[0];
    certificate.shared.file = `/media/certificates/${certificate.id}/pending.pdf`;
    const oldUpload = { kind: "certificate", recordId: certificate.id, file: { name: "old.pdf" } };
    const replacement = { kind: "certificate", recordId: certificate.id, file: { name: "new.pdf" } };
    expect(synchronizeUploads(draft, [oldUpload, replacement])).toEqual([replacement]);
  });

  it("does not carry a pending upload across an id change or project copy", () => {
    const draft = clonePortfolio(portfolioFiles);
    const project = draft.projects.items[0];
    project.shared.visual = { mode: "screenshot", path: `/media/projects/${project.id}/pending.jpg`, objectFit: "contain", alt: { tr: "x", en: "x" } };
    const upload = { kind: "screenshot", recordId: project.id, file: { name: "screen.jpg" } };
    const copied = duplicateProject(draft.projects.items, project.id, draft.visuals.presets);
    expect(copied[1].shared.visual.mode).toBe("builder");
    expect(copied[1].shared.visual.visualId).toBe(draft.visuals.presets[0].id);
    project.id = "renamed-project";
    expect(synchronizeUploads(draft, [upload])).toEqual([]);
  });

  it("keeps a new incomplete project publishable while it remains a draft", () => {
    const files = clonePortfolio(portfolioFiles);
    const draftProject = createProject(files.projects.items);
    files.projects.items.push(draftProject);
    const issues = publicationIssues(files);
    expect(issues.warnings).toContain(`projects.${draftProject.id}.tr.features`);
    expect(issues.errors).toEqual([]);
    expect(() => validatePortfolio(files)).not.toThrow();
  });

  it("accepts a published builder project only while its preset exists", () => {
    const files = clonePortfolio(portfolioFiles);
    files.projects.items[0].shared.visual = { mode: "builder", visualId: files.visuals.presets[0].id };
    expect(() => validatePortfolio(files)).not.toThrow();
    const project = files.projects.items[0];
    files.visuals.presets = files.visuals.presets.filter((preset) => preset.id !== project.shared.visual.visualId);
    expect(() => validatePortfolio(files)).toThrow(new RegExp(`${project.id}.*${project.shared.visual.visualId}`));
  });

  it.each([undefined, "legacy-clipboard"])("does not let fallback %s hide a missing published preset", (fallbackComponentId) => {
    const files = clonePortfolio(portfolioFiles);
    const project = files.projects.items[0];
    project.shared.visual = { mode: "builder", visualId: "missing-preset", ...(fallbackComponentId ? { fallbackComponentId } : {}) };
    expect(publicationIssues(files).errors.join(" ")).toContain("missing-preset");
    expect(() => validatePortfolio(files)).toThrow(/missing-preset/);
  });

  it("warns for a missing draft preset without blocking unrelated changes", () => {
    const files = clonePortfolio(portfolioFiles);
    const project = createProject(files.projects.items, files.visuals.presets, files.visuals.presets[0].id);
    project.shared.visual.visualId = "missing-draft-preset";
    files.projects.items.push(project);
    files.certificates.items[0].tr.title = "Unrelated change";
    const issues = publicationIssues(files);
    expect(issues.warnings.join(" ")).toContain("missing-draft-preset");
    expect(issues.errors).toEqual([]);
    expect(() => validatePortfolio(files)).not.toThrow();
  });

  it("creates a project with the selected existing preset", () => {
    const presets = portfolioFiles.visuals.presets;
    const project = createProject([], presets, presets[1].id);
    expect(project.publicationStatus).toBe("draft");
    expect(project.shared.visual).toMatchObject({ mode: "builder", visualId: presets[1].id });
  });

  it("uses the first existing preset when clipboard and the selected preset are unavailable", () => {
    const presets = portfolioFiles.visuals.presets.filter((preset) => preset.id !== "clipboard");
    const project = createProject([], presets, "missing-selection");
    expect(project.shared.visual).toMatchObject({ mode: "builder", visualId: presets[0].id });
    expect(project.shared.visual.visualId).not.toBe("clipboard");
  });

  it("uses a valid custom fallback instead of creating a dangling visualId when no preset exists", () => {
    const project = createProject([], []);
    expect(project.publicationStatus).toBe("draft");
    expect(project.shared.visual).toEqual({ mode: "custom", componentId: "legacy-clipboard" });
    expect(project.shared.visual).not.toHaveProperty("visualId");
  });

  it("can publish a created draft after assigning a valid preset and completing required fields", () => {
    const files = clonePortfolio(portfolioFiles);
    const project = createProject(files.projects.items, files.visuals.presets, files.visuals.presets[1].id);
    project.publicationStatus = "published";
    project.tr.features = ["Özellik"];
    project.tr.status = ["Hazır"];
    project.en.features = ["Feature"];
    project.en.status = ["Ready"];
    files.projects.items.push(project);
    expect(() => validatePortfolio(files)).not.toThrow();
  });

  it("allows unrelated content changes while an incomplete draft project exists", () => {
    const files = clonePortfolio(portfolioFiles);
    files.projects.items.push(createProject(files.projects.items));
    files.certificates.items[0].tr.title = "Unrelated certificate change";
    expect(() => validatePortfolio(files)).not.toThrow();
    expect(hasDiff(createDiffSummary(portfolioFiles, files))).toBe(true);
  });

  it("turns incomplete project fields into blocking errors when the project is published", () => {
    const files = clonePortfolio(portfolioFiles);
    const project = createProject(files.projects.items);
    project.publicationStatus = "published";
    files.projects.items.push(project);
    const issues = publicationIssues(files);
    expect(issues.errors).toContain(`projects.${project.id}.tr.features`);
    expect(issues.errors).toContain(`projects.${project.id}.en.status`);
    expect(() => validatePortfolio(files)).toThrow();
  });

  it("creates globally unique IDs across different groups and a new skill card", () => {
    const skills = structuredClone(portfolioFiles.skills);
    const first = createGroupSkillItem(skillIdScope(skills));
    skills.additionalGroups[0].items.push(first);
    const second = createGroupSkillItem(skillIdScope(skills));
    skills.additionalGroups[1].items.push(second);
    const card = createSkillCard(skillIdScope(skills));
    expect([first.id, second.id, card.id]).toEqual(["new-skill", "new-skill-2", "new-skill-3"]);
  });

  it("builds certificate skill options with unique keys and values", () => {
    const options = certificateSkillOptions(portfolioFiles.skills);
    expect(new Set(options.map((option) => option.id)).size).toBe(options.length);
    expect(options.every((option) => option.id && option.label)).toBe(true);
  });

  it("creates a certificate with a type-safe pending PDF path", () => {
    expect(createCertificate([], null).shared.file).toBe("/media/certificates/new-certificate/pending.pdf");
  });

  it("uses the Europe/Istanbul local calendar day for a certificate created after midnight", () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = "Europe/Istanbul";
    try {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-12-31T21:30:00.000Z"));
      expect(createCertificate([], null).shared.date).toBe("2027-01-01");
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
    }
  });

  it("zero-pads local month and day components", () => {
    expect(formatLocalDate({ getFullYear: () => 2026, getMonth: () => 2, getDate: () => 4 })).toBe("2026-03-04");
  });
});
