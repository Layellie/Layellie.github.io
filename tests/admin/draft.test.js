import { describe, expect, it } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import { createDraftRecord, restoreDraftRecord } from "../../src/admin/draft/storage.js";

describe("admin draft base snapshots", () => {
  it("restores the draft's original files, base commit and blob SHAs instead of a newer remote snapshot", () => {
    const baseFilesA = structuredClone(portfolioFiles);
    const draftFiles = structuredClone(baseFilesA);
    draftFiles.projects.items[0].tr.name = "Local draft";
    const baseA = { commitSha: "a".repeat(40), blobShas: { "src/content/projects.json": "blob-a" } };
    const record = createDraftRecord({ files: draftFiles, baseFiles: baseFilesA, base: baseA, uploads: [] }, "2026-07-18T12:00:00.000Z");

    const remoteB = { files: structuredClone(portfolioFiles), base: { commitSha: "b".repeat(40), blobShas: { "src/content/projects.json": "blob-b" } } };
    remoteB.files.projects.items[0].tr.name = "Remote change";
    const restored = restoreDraftRecord(record);

    expect(restored.base).toEqual(baseA);
    expect(restored.baseFiles.projects.items[0].tr.name).not.toBe(remoteB.files.projects.items[0].tr.name);
    expect(restored.files.projects.items[0].tr.name).toBe("Local draft");
    expect(restored.needsRebase).toBe(false);
  });

  it("marks legacy drafts without an atomic base snapshot as non-publishable", () => {
    const restored = restoreDraftRecord({ files: portfolioFiles, uploads: [], savedAt: "2026-07-18T12:00:00.000Z" });
    expect(restored.needsRebase).toBe(true);
    expect(restored.base).toBeNull();
    expect(restored.baseFiles).toBeNull();
  });
});
