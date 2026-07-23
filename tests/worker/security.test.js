import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedGithubUser } from "../../worker/src/auth/github.ts";
import {
  PUBLICATION_LIMITS,
  parseContent,
  preparePublication,
  readPublicationRequest,
  validateMediaReferences,
  validateMediaSignature,
  validatePublicationPayload,
  validatePublicationByteLimits,
} from "../../worker/src/content/validation.ts";
import { portfolioFiles } from "../../src/content/loadContent.js";
import { createProject, validatePortfolio } from "../../src/admin/data/model.js";
import { createDraftRecord, restoreDraftRecord } from "../../src/admin/draft/storage.js";
import { deploymentForCommit, githubFetch } from "../../worker/src/github/client.ts";
import { analyticsVisitorHash, decryptToken, encryptToken } from "../../worker/src/security/crypto.ts";
import { ConfigurationError, getConfig, parseOrigin } from "../../worker/src/security/config.ts";
import { cookies } from "../../worker/src/security/cookies.ts";
import { redirect } from "../../worker/src/security/responses.ts";

const config = {
  clientId: "client",
  clientSecret: "secret",
  owner: "Layellie",
  repository: "Layellie.github.io",
  branch: "main",
  allowedUser: "Layellie",
  allowedUserId: 12345,
  sessionSecret: "x".repeat(40),
  adminOrigin: "https://admin.example.workers.dev",
  publicSiteOrigin: "https://layellie.github.io",
};

function repositorySnapshot(files = portfolioFiles, blobSuffix = "a") {
  const blobShas = Object.fromEntries(["site", "projects", "certificates", "skills", "visuals"].map((name) => [`src/content/${name}.json`, `${name}-${blobSuffix}`]));
  return { commitSha: blobSuffix.repeat(40).slice(0, 40), treeSha: "f".repeat(40), blobShas, rawFiles: files };
}

function publishPayload(files, snapshot, media = []) {
  return { files, base: { commitSha: snapshot.commitSha, blobShas: snapshot.blobShas }, media };
}

function resultingRepositoryFiles(snapshot, changes) {
  const files = structuredClone(snapshot.rawFiles);
  for (const change of changes) {
    const key = Object.entries({
      site: "src/content/site.json",
      projects: "src/content/projects.json",
      certificates: "src/content/certificates.json",
      skills: "src/content/skills.json",
      visuals: "src/content/visuals.json",
    }).find(([, path]) => path === change.path)?.[0];
    if (key) files[key] = JSON.parse(change.content);
  }
  return files;
}

afterEach(() => vi.unstubAllGlobals());

describe("Worker security primitives", () => {
  it("derives an AES-GCM key with HKDF and decrypts only with the same secret", async () => {
    const token = "ghu_sensitive_token";
    const encrypted = await encryptToken(token, config.sessionSecret);
    expect(encrypted).not.toContain(token);
    await expect(decryptToken(encrypted, config.sessionSecret)).resolves.toBe(token);
    await expect(decryptToken(encrypted, "y".repeat(40))).rejects.toThrow();
  });

  it("derives an unlinkable per-day HMAC that never stores or equals the raw UUID", async () => {
    const uuid = "11111111-1111-4111-8111-111111111111";
    const monday = await analyticsVisitorHash(uuid, "2026-07-23", config.sessionSecret);
    const tuesday = await analyticsVisitorHash(uuid, "2026-07-24", config.sessionSecret);
    // Hash, not raw identity: never equals or contains the UUID.
    expect(monday).not.toBe(uuid);
    expect(monday).not.toContain(uuid);
    // Same UUID on two days yields two unlinkable hashes.
    expect(monday).not.toBe(tuesday);
    // Matches the Durable Object's accepted visitor_hash shape.
    expect(monday).toMatch(/^[A-Za-z0-9_-]{32,128}$/);
    // A different secret produces a different hash (keyed, not a plain digest).
    expect(await analyticsVisitorHash(uuid, "2026-07-23", "z".repeat(40))).not.toBe(monday);
  });

  it("rejects every GitHub user except the configured immutable id and login", () => {
    expect(isAllowedGithubUser({ id: 12345, login: "layellie" }, config)).toBe(true);
    expect(isAllowedGithubUser({ id: 99999, login: "Layellie" }, config)).toBe(false);
    expect(isAllowedGithubUser({ id: 12345, login: "SomeoneElse" }, config)).toBe(false);
  });

  it("rejects globally duplicated skill IDs at the Worker validation boundary", () => {
    const files = structuredClone(portfolioFiles);
    files.skills.additionalGroups[1].items[0].id = files.skills.skillCards[0].id;
    expect(() => parseContent(files)).toThrowError(expect.objectContaining({ code: "CONTENT_VALIDATION_FAILED" }));
  });

  it("fails closed for missing or unsafe configuration", () => {
    expect(() => getConfig({ ...config, GITHUB_ALLOWED_USER: "SomeoneElse" })).toThrow();
    expect(() => getConfig({})).toThrow();
  });

  it.each([
    [undefined, "ADMIN_ORIGIN"],
    ["not a valid URL", "ADMIN_ORIGIN"],
    ["ftp://admin.example", "ADMIN_ORIGIN"],
    ["https://admin.example/path", "ADMIN_ORIGIN"],
    ["https://admin.example/%2e%2e", "ADMIN_ORIGIN"],
    ["https://admin.example\\unexpected", "ADMIN_ORIGIN"],
    ["https://admin.example?mode=test", "ADMIN_ORIGIN"],
    ["https://admin.example#fragment", "ADMIN_ORIGIN"],
    ["http://public.example", "PUBLIC_SITE_ORIGIN"],
  ])("reports an invalid %s origin as ConfigurationError", (value, name) => {
    let error;
    try { parseOrigin(value, name, name === "ADMIN_ORIGIN"); } catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(ConfigurationError);
    expect(error).toMatchObject({ code: "CONFIGURATION_ERROR" });
    expect(error.message).toContain(name);
    if (value) expect(error.message).not.toContain(value);
  });

  it("accepts canonical production and explicitly allowed local origins", () => {
    expect(parseOrigin("https://admin.example", "ADMIN_ORIGIN", true)).toBe("https://admin.example");
    expect(parseOrigin("http://localhost:5174", "ADMIN_ORIGIN", true)).toBe("http://localhost:5174");
    expect(parseOrigin("http://127.0.0.1:5174", "ADMIN_ORIGIN", true)).toBe("http://127.0.0.1:5174");
    expect(parseOrigin("https://portfolio.example", "PUBLIC_SITE_ORIGIN")).toBe("https://portfolio.example");
  });

  it.each([
    ["certificate field with project media", (files) => { files.certificates.items[0].shared.file = "/media/projects/x.webp"; }],
    ["certificate field with an image extension", (files) => { files.certificates.items[0].shared.file = "/media/certificates/certificate-x/document.webp"; }],
    ["screenshot field with certificate media", (files) => { files.projects.items[0].shared.visual = { mode: "screenshot", path: "/media/certificates/x.pdf", objectFit: "contain", alt: { tr: "Önizleme", en: "Preview" } }; }],
    ["screenshot field with a PDF", (files) => { files.projects.items[0].shared.visual = { mode: "screenshot", path: "/media/projects/project-x/screen.pdf", objectFit: "contain", alt: { tr: "Önizleme", en: "Preview" } }; }],
  ])("keeps admin preflight and Worker publish validation aligned for %s", (_label, mutate) => {
    const files = structuredClone(portfolioFiles);
    mutate(files);
    expect(() => validatePortfolio(files)).toThrow();
    expect(() => validatePublicationPayload({ files, base: { commitSha: "a".repeat(40), blobShas: {} }, media: [] })).toThrowError(expect.objectContaining({ code: "CONTENT_VALIDATION_FAILED" }));
  });

  it("accepts the same persistent PDF and image paths at admin and Worker boundaries", () => {
    const files = structuredClone(portfolioFiles);
    files.certificates.items[0].shared.file = "/media/certificates/certificate-x/document.pdf";
    files.projects.items[0].shared.visual = { mode: "screenshot", path: "/media/projects/project-x/screen.webp", objectFit: "contain", alt: { tr: "Önizleme", en: "Preview" } };
    expect(() => validatePortfolio(files)).not.toThrow();
    expect(() => validatePublicationPayload({ files, base: { commitSha: "a".repeat(40), blobShas: {} }, media: [] })).not.toThrow();
  });

  it("accepts a published builder project while its referenced preset exists", () => {
    const files = structuredClone(portfolioFiles);
    files.projects.items[0].shared.visual = { mode: "builder", visualId: files.visuals.presets[0].id };
    expect(() => validatePortfolio(files)).not.toThrow();
    expect(() => parseContent(files)).not.toThrow();
  });

  it.each([undefined, "legacy-clipboard"])("rejects a missing published preset before Worker changes with fallback %s", async (fallbackComponentId) => {
    const files = structuredClone(portfolioFiles);
    const project = files.projects.items[0];
    project.shared.visual = { mode: "builder", visualId: "missing-preset", ...(fallbackComponentId ? { fallbackComponentId } : {}) };
    const snapshot = repositorySnapshot(portfolioFiles, "a");
    expect(() => validatePortfolio(files)).toThrow(/missing-preset/);
    await expect(preparePublication(publishPayload(files, snapshot), new FormData(), snapshot)).rejects.toMatchObject({ code: "CONTENT_VALIDATION_FAILED", details: expect.arrayContaining([expect.objectContaining({ message: expect.stringMatching(new RegExp(`${project.id}.*missing-preset`)) })]) });
  });

  it("allows unrelated publication while only a draft references a removed preset", async () => {
    const files = structuredClone(portfolioFiles);
    const project = files.projects.items[0];
    const removedPresetId = files.visuals.presets[0].id;
    project.publicationStatus = "draft";
    project.shared.visual = { mode: "builder", visualId: removedPresetId };
    files.visuals.presets = files.visuals.presets.filter((preset) => preset.id !== removedPresetId);
    files.certificates.items[0].tr.title = "Unrelated certificate change";
    const snapshot = repositorySnapshot(portfolioFiles, "a");
    expect(() => validatePortfolio(files)).not.toThrow();
    await expect(preparePublication(publishPayload(files, snapshot), new FormData(), snapshot)).resolves.toMatchObject({ files: { projects: { items: expect.arrayContaining([expect.objectContaining({ id: project.id, publicationStatus: "draft" })]) } } });
  });

  it.each([
    ["progress above 100", (module) => { module.shared.progress = 101; }],
    ["negative progress", (module) => { module.shared.progress = -1; }],
  ])("blocks a circularProgress module with %s at both preflight and publish boundaries", (_label, mutate) => {
    const files = structuredClone(portfolioFiles);
    const module = files.visuals.presets.flatMap((preset) => preset.modules).find((item) => item.type === "circularProgress");
    mutate(module);
    expect(() => validatePortfolio(files)).toThrow();
    expect(() => validatePublicationPayload({ files, base: { commitSha: "a".repeat(40), blobShas: {} }, media: [] })).toThrowError(expect.objectContaining({ code: "CONTENT_VALIDATION_FAILED" }));
  });

  it("rejects empty chart values before publication changes can be created", async () => {
    const files = structuredClone(portfolioFiles);
    files.visuals.presets[0].modules.push({
      id: "invalid-line-chart",
      type: "lineChart",
      shared: { placement: { mobileColSpan: 12, desktopColSpan: 12, rowSpan: 1, height: "normal" }, values: [] },
      tr: { title: "Trend" },
      en: { title: "Trend" },
    });
    const snapshot = repositorySnapshot();
    await expect(preparePublication(publishPayload(files, snapshot), new FormData(), snapshot)).rejects.toMatchObject({ code: "CONTENT_VALIDATION_FAILED" });
  });

  it("accepts a restored screenshot manifest for the same pending file reference", () => {
    const files = structuredClone(portfolioFiles);
    const project = files.projects.items[0];
    project.shared.visual = { mode: "screenshot", path: `/media/projects/${project.id}/pending.webp`, objectFit: "contain", alt: { tr: "Önizleme", en: "Preview" } };
    const manifest = { kind: "screenshot", recordId: project.id, index: 0, name: "selected.webp", size: 128, type: "image/webp" };
    expect(() => validateMediaReferences(files, [manifest])).not.toThrow();
  });

  it("emits separate hardened session and OAuth cookies", () => {
    const response = redirect("https://admin.test", [
      ["Set-Cookie", cookies.session("session", 300)],
      ["Set-Cookie", cookies.clearOauth()],
    ]);
    const values = response.headers.getSetCookie();
    expect(values).toHaveLength(2);
    expect(values[0]).toContain("HttpOnly; Secure; SameSite=Lax");
    expect(values[0]).toContain("__Host-layellie-session");
  });

  it("validates server-side PDF and image magic bytes", () => {
    expect(validateMediaSignature(new TextEncoder().encode("%PDF-1.7"), "application/pdf", "certificate")).toBe("pdf");
    expect(validateMediaSignature(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg", "screenshot")).toBe("jpg");
    expect(() => validateMediaSignature(new TextEncoder().encode("fake"), "application/pdf", "certificate")).toThrow();
  });

  it.each([
    ["lower", PUBLICATION_LIMITS.maxPayloadBytes - 1],
    ["exact", PUBLICATION_LIMITS.maxPayloadBytes],
  ])("accepts the %s publication payload boundary", (_label, payloadBytes) => {
    expect(() => validatePublicationByteLimits({ payloadBytes })).not.toThrow();
  });

  it("rejects only values above the shared request, payload and JSON boundaries", () => {
    expect(() => validatePublicationByteLimits({ requestBytes: PUBLICATION_LIMITS.maxRequestBytes })).not.toThrow();
    expect(() => validatePublicationByteLimits({ jsonBytes: { projects: PUBLICATION_LIMITS.maxJsonBytes } })).not.toThrow();
    expect(() => validatePublicationByteLimits({ requestBytes: PUBLICATION_LIMITS.maxRequestBytes + 1 })).toThrowError(expect.objectContaining({ code: "PUBLISH_TOO_LARGE" }));
    expect(() => validatePublicationByteLimits({ payloadBytes: PUBLICATION_LIMITS.maxPayloadBytes + 1 })).toThrowError(expect.objectContaining({ code: "PUBLISH_PAYLOAD_INVALID" }));
    expect(() => validatePublicationByteLimits({ jsonBytes: { projects: PUBLICATION_LIMITS.maxJsonBytes + 1 } })).toThrowError(expect.objectContaining({ code: "JSON_TOO_LARGE" }));
  });

  it.each([
    ["lower", [PUBLICATION_LIMITS.maxFileBytes, PUBLICATION_LIMITS.maxMediaBytes - PUBLICATION_LIMITS.maxFileBytes - 1]],
    ["exact", [PUBLICATION_LIMITS.maxFileBytes, PUBLICATION_LIMITS.maxMediaBytes - PUBLICATION_LIMITS.maxFileBytes]],
  ])("accepts the %s aggregate media boundary", (_label, mediaBytes) => {
    expect(() => validatePublicationByteLimits({ mediaBytes })).not.toThrow();
  });

  it("rejects media above either the per-file or aggregate boundary", () => {
    expect(() => validatePublicationByteLimits({ mediaBytes: [PUBLICATION_LIMITS.maxFileBytes + 1] })).toThrowError(expect.objectContaining({ code: "MEDIA_FILE_TOO_LARGE" }));
    expect(() => validatePublicationByteLimits({ mediaBytes: [PUBLICATION_LIMITS.maxFileBytes, PUBLICATION_LIMITS.maxMediaBytes - PUBLICATION_LIMITS.maxFileBytes + 1] })).toThrowError(expect.objectContaining({ code: "MEDIA_TOTAL_TOO_LARGE" }));
  });

  it("accepts the former 1.2-1.5 MB validation gap through the shared multipart reader", async () => {
    const snapshot = repositorySnapshot(portfolioFiles, "a");
    const rawPayload = JSON.stringify({
      ...publishPayload(portfolioFiles, snapshot),
      padding: "x".repeat(1_350_000),
    });
    const form = new FormData();
    form.set("payload", rawPayload);
    const request = new Request("https://admin.test/api/validate", { method: "POST", body: form });
    const publication = await readPublicationRequest(request);
    expect(publication.payloadBytes).toBeGreaterThan(1_200_000);
    expect(publication.payloadBytes).toBeLessThan(1_500_000);
    expect(publication.payload.files.projects.items).toHaveLength(portfolioFiles.projects.items.length);
  });

  it("maps GitHub quota and SHA conflict failures to safe errors", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("secret upstream body", { status: 403, headers: { "X-RateLimit-Remaining": "0" } }))
      .mockResolvedValueOnce(new Response("conflict details", { status: 422 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(githubFetch(config, "token", "/rate")).rejects.toMatchObject({ status: 429, code: "GITHUB_QUOTA_EXCEEDED" });
    await expect(githubFetch(config, "token", "/conflict")).rejects.toMatchObject({ status: 422, code: "GITHUB_CONFLICT" });
  });

  it("publishes a restored draft against base A so remote B produces 409 instead of being overwritten", async () => {
    const baseFilesA = structuredClone(portfolioFiles);
    const draftFiles = structuredClone(baseFilesA);
    draftFiles.projects.items[0].tr.name = "Local on A";
    const snapshotA = repositorySnapshot(baseFilesA, "a");
    const stored = createDraftRecord({ files: draftFiles, baseFiles: baseFilesA, base: { commitSha: snapshotA.commitSha, blobShas: snapshotA.blobShas }, uploads: [] });
    const restored = restoreDraftRecord(stored);
    const remoteFilesB = structuredClone(baseFilesA);
    remoteFilesB.projects.items[0].tr.name = "Remote on B";
    const snapshotB = repositorySnapshot(remoteFilesB, "b");

    await expect(preparePublication({ files: restored.files, base: restored.base, media: [] }, new FormData(), snapshotB)).rejects.toMatchObject({ status: 409, code: "CONTENT_CONFLICT" });
  });

  it("prepares unrelated changes while an incomplete project remains a draft", async () => {
    const snapshot = repositorySnapshot(portfolioFiles, "a");
    const files = structuredClone(portfolioFiles);
    files.projects.items.push(createProject(files.projects.items));
    files.certificates.items[0].tr.title = "Unrelated change";
    await expect(preparePublication(publishPayload(files, snapshot), new FormData(), snapshot)).resolves.toMatchObject({
      files: { projects: { items: expect.arrayContaining([expect.objectContaining({ publicationStatus: "draft" })]) } },
    });
  });

  it("preserves remote-only fields through model edits and commit serialization", async () => {
    const remote = structuredClone(portfolioFiles);
    const projectId = remote.projects.items[0].id;
    remote.projects.futureFileMetadata = { source: "remote", revision: 7 };
    remote.projects.items[0].futureRecordMetadata = { owner: "remote-project" };
    remote.projects.items[0].shared.futureNestedMetadata = { renderer: { version: 2 } };
    remote.certificates.items[0].futureRecordMetadata = { issuerId: 42 };
    remote.certificates.items[0].shared.futureNestedMetadata = { verified: true };
    remote.skills.focusAreas[0].futureRecordMetadata = { category: "future" };
    remote.skills.focusAreas[0].shared.futureNestedMetadata = { score: 99 };
    remote.visuals.futureFileMetadata = { engine: "v2" };
    const snapshot = repositorySnapshot(remote, "a");
    const adminFiles = parseContent(remote);
    adminFiles.projects.items.reverse();
    adminFiles.projects.items.find((item) => item.id === projectId).tr.name = "Unrelated modeled project edit";
    adminFiles.certificates.items[0].tr.title = "Unrelated modeled certificate edit";
    adminFiles.skills.focusAreas[0].tr.title = "Unrelated modeled skill edit";
    adminFiles.visuals.presets[0].name = "Unrelated modeled visual edit";
    adminFiles.projects.clientInjectedExtension = "must-not-publish";
    adminFiles.projects.items[0].clientInjectedExtension = "must-not-publish";
    const newProject = createProject(adminFiles.projects.items);
    newProject.clientInjectedExtension = "must-not-publish";
    adminFiles.projects.items.push(newProject);

    const prepared = await preparePublication(publishPayload(adminFiles, snapshot), new FormData(), snapshot);
    const result = resultingRepositoryFiles(snapshot, prepared.changes);
    const persistedProject = result.projects.items.find((item) => item.id === projectId);
    expect(result.projects.futureFileMetadata).toEqual({ source: "remote", revision: 7 });
    expect(persistedProject.futureRecordMetadata).toEqual({ owner: "remote-project" });
    expect(persistedProject.shared.futureNestedMetadata).toEqual({ renderer: { version: 2 } });
    expect(result.certificates.items[0].futureRecordMetadata).toEqual({ issuerId: 42 });
    expect(result.certificates.items[0].shared.futureNestedMetadata).toEqual({ verified: true });
    expect(result.skills.focusAreas[0].futureRecordMetadata).toEqual({ category: "future" });
    expect(result.skills.focusAreas[0].shared.futureNestedMetadata).toEqual({ score: 99 });
    expect(result.visuals.futureFileMetadata).toEqual({ engine: "v2" });
    expect(result.projects.clientInjectedExtension).toBeUndefined();
    expect(result.projects.items.some((item) => item.clientInjectedExtension)).toBe(false);
    expect(result.projects.items.find((item) => item.id === newProject.id)).toBeTruthy();
  });

  it("does not report a false diff when Zod strips remote-only fields from the admin model", async () => {
    const remote = structuredClone(portfolioFiles);
    remote.projects.futureFileMetadata = { keep: true };
    remote.projects.items[0].shared.futureNestedMetadata = { keep: "exactly" };
    const snapshot = repositorySnapshot(remote, "a");
    const unchangedAdminModel = parseContent(remote);
    await expect(preparePublication(publishPayload(unchangedAdminModel, snapshot), new FormData(), snapshot)).rejects.toMatchObject({ code: "NO_CHANGES" });
  });

  it("still removes a record instead of resurrecting its remote-only fields", async () => {
    const remote = structuredClone(portfolioFiles);
    const deletedId = remote.projects.items[0].id;
    remote.projects.items[0].futureRecordMetadata = { mustDisappear: true };
    const snapshot = repositorySnapshot(remote, "a");
    const adminFiles = parseContent(remote);
    adminFiles.projects.items = adminFiles.projects.items.filter((item) => item.id !== deletedId);
    const prepared = await preparePublication(publishPayload(adminFiles, snapshot), new FormData(), snapshot);
    const result = resultingRepositoryFiles(snapshot, prepared.changes);
    expect(result.projects.items.some((item) => item.id === deletedId)).toBe(false);
  });

  it("publishes an edited About section as a canonical site.json change", async () => {
    const snapshot = repositorySnapshot(portfolioFiles, "a");
    const adminFiles = parseContent(portfolioFiles);
    adminFiles.site.tr.about.title = "Hakkımda (güncel)";
    adminFiles.site.tr.about.statement[1].tone = "accent";
    adminFiles.site.tr.about.facts.push({ label: "Yeni etiket", value: "Yeni değer" });
    const prepared = await preparePublication(publishPayload(adminFiles, snapshot), new FormData(), snapshot);
    expect(prepared.changes.some((change) => change.path === "src/content/site.json")).toBe(true);
    const result = resultingRepositoryFiles(snapshot, prepared.changes);
    expect(result.site.tr.about.title).toBe("Hakkımda (güncel)");
    expect(result.site.tr.about.statement[1].tone).toBe("accent");
    expect(result.site.tr.about.facts.at(-1)).toEqual({ label: "Yeni etiket", value: "Yeni değer" });
  });

  it("preserves unknown remote fields inside the About tree when publishing a site edit", async () => {
    const remote = structuredClone(portfolioFiles);
    remote.site.tr.about.futureAboutMetadata = { layout: "v2" };
    const snapshot = repositorySnapshot(remote, "a");
    const adminFiles = parseContent(remote); // Zod strips the unknown key from the client model.
    expect(adminFiles.site.tr.about.futureAboutMetadata).toBeUndefined();
    adminFiles.site.tr.about.paragraphs.push("Yayınlanacak yeni paragraf");
    const prepared = await preparePublication(publishPayload(adminFiles, snapshot), new FormData(), snapshot);
    const result = resultingRepositoryFiles(snapshot, prepared.changes);
    expect(result.site.tr.about.futureAboutMetadata).toEqual({ layout: "v2" });
    expect(result.site.tr.about.paragraphs.at(-1)).toBe("Yayınlanacak yeni paragraf");
  });

  it("rejects the same incomplete project when it is marked as published", async () => {
    const snapshot = repositorySnapshot(portfolioFiles, "a");
    const files = structuredClone(portfolioFiles);
    const project = createProject(files.projects.items);
    project.publicationStatus = "published";
    files.projects.items.push(project);
    await expect(preparePublication(publishPayload(files, snapshot), new FormData(), snapshot)).rejects.toMatchObject({ code: "CONTENT_VALIDATION_FAILED" });
  });

  it("requires and resolves a certificate PDF manifest before final publish validation", async () => {
    const files = structuredClone(portfolioFiles);
    const certificate = files.certificates.items[0];
    certificate.shared.file = `/media/certificates/${certificate.id}/pending.pdf`;
    expect(() => validateMediaReferences(files, [])).toThrowError(expect.objectContaining({ code: "CERTIFICATE_UPLOAD_REQUIRED" }));

    const snapshot = repositorySnapshot(portfolioFiles, "a");
    const file = new File([new TextEncoder().encode("%PDF-1.7\n")], "certificate.pdf", { type: "application/pdf" });
    const manifest = { kind: "certificate", recordId: certificate.id, index: 0, name: file.name, size: file.size, type: file.type };
    const form = new FormData();
    form.set("file-0", file);
    const prepared = await preparePublication(publishPayload(files, snapshot, [manifest]), form, snapshot);
    expect(prepared.files.certificates.items[0].shared.file).toMatch(/^\/media\/certificates\/.+\.pdf$/);
    expect(JSON.stringify(prepared.files)).not.toMatch(/\/pending(?:\.|\")/i);
  });

  it("requires and resolves a project screenshot manifest before final publish validation", async () => {
    const files = structuredClone(portfolioFiles);
    const project = files.projects.items[0];
    project.shared.visual = { mode: "screenshot", path: `/media/projects/${project.id}/pending.png`, objectFit: "contain", alt: { tr: "Önizleme", en: "Preview" } };
    expect(() => validateMediaReferences(files, [])).toThrowError(expect.objectContaining({ code: "SCREENSHOT_UPLOAD_REQUIRED" }));

    const snapshot = repositorySnapshot(portfolioFiles, "a");
    const file = new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "screen.png", { type: "image/png" });
    const manifest = { kind: "screenshot", recordId: project.id, index: 0, name: file.name, size: file.size, type: file.type };
    const form = new FormData();
    form.set("file-0", file);
    const prepared = await preparePublication(publishPayload(files, snapshot, [manifest]), form, snapshot);
    expect(prepared.files.projects.items[0].shared.visual.path).toMatch(/^\/media\/projects\/.+\.png$/);
    expect(JSON.stringify(prepared.files)).not.toMatch(/\/pending(?:\.|\")/i);
  });

  it("normalizes a legacy default list-row tone during Worker publish validation", () => {
    const files = structuredClone(portfolioFiles);
    const row = files.visuals.presets[0].modules.find((module) => module.type === "listRow");
    row.shared.tone = "default";
    const parsed = parseContent(files);
    expect(parsed.visuals.presets[0].modules.find((module) => module.id === row.id).shared.tone).toBe("text");
  });

  it("reports the pending deploy.yml run even when admin checks are successful", async () => {
    const commit = "a".repeat(40);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ workflow_runs: [
      { status: "completed", conclusion: "success", html_url: "https://github.test/admin", name: "Admin checks", path: ".github/workflows/admin-checks.yml@main", updated_at: "2026-07-18T12:00:00Z" },
      { status: "in_progress", conclusion: null, html_url: "https://github.test/pages", name: "Deploy to GitHub Pages", path: ".github/workflows/deploy.yml@main", updated_at: "2026-07-18T12:01:00Z" },
    ] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(deploymentForCommit(config, "token", commit)).resolves.toMatchObject({ status: "in_progress", conclusion: null, name: "Deploy to GitHub Pages" });
    expect(fetchMock.mock.calls[0][0]).toContain("/actions/workflows/deploy.yml/runs?event=push&head_sha=");
  });

  it("reports a failed deploy.yml run instead of a successful admin-checks run", async () => {
    const commit = "b".repeat(40);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ workflow_runs: [
      { status: "completed", conclusion: "success", html_url: "https://github.test/admin", name: "Admin checks", path: ".github/workflows/admin-checks.yml@main", updated_at: "2026-07-18T12:00:00Z" },
      { status: "completed", conclusion: "failure", html_url: "https://github.test/pages", name: "Deploy to GitHub Pages", path: ".github/workflows/deploy.yml@main", updated_at: "2026-07-18T12:01:00Z" },
    ] }), { status: 200, headers: { "Content-Type": "application/json" } })));
    await expect(deploymentForCommit(config, "token", commit)).resolves.toMatchObject({ status: "completed", conclusion: "failure", name: "Deploy to GitHub Pages" });
  });
});
