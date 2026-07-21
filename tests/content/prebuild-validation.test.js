import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateContentDirectory } from "../../scripts/validate-content.mjs";

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function invalidContentDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "portfolio-content-"));
  temporaryDirectories.push(directory);
  await cp(path.resolve("src/content"), directory, { recursive: true });
  const fixture = await readFile(path.resolve("tests/fixtures/invalid-projects.json"), "utf8");
  await writeFile(path.join(directory, "projects.json"), fixture, "utf8");
  return directory;
}

async function invalidSiteContentDirectory(mutate) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "portfolio-site-content-"));
  temporaryDirectories.push(directory);
  await cp(path.resolve("src/content"), directory, { recursive: true });
  const sitePath = path.join(directory, "site.json");
  const site = JSON.parse(await readFile(sitePath, "utf8"));
  mutate(site);
  await writeFile(sitePath, `${JSON.stringify(site, null, 2)}\n`, "utf8");
  return directory;
}

async function invalidCertificateContentDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "portfolio-certificate-content-"));
  temporaryDirectories.push(directory);
  await cp(path.resolve("src/content"), directory, { recursive: true });
  const certificatePath = path.join(directory, "certificates.json");
  const certificates = JSON.parse(await readFile(certificatePath, "utf8"));
  certificates.items[0].shared.file = "/media/projects/not-a-certificate.webp";
  await writeFile(certificatePath, `${JSON.stringify(certificates, null, 2)}\n`, "utf8");
  return directory;
}

async function invalidVisualContentDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "portfolio-visual-content-"));
  temporaryDirectories.push(directory);
  await cp(path.resolve("src/content"), directory, { recursive: true });
  const visualPath = path.join(directory, "visuals.json");
  const visuals = JSON.parse(await readFile(visualPath, "utf8"));
  visuals.presets[0].modules.push({
    id: "invalid-line-chart",
    type: "lineChart",
    shared: { placement: { mobileColSpan: 12, desktopColSpan: 12, rowSpan: 1, height: "normal" }, values: [] },
    tr: { title: "Trend" },
    en: { title: "Trend" },
  });
  await writeFile(visualPath, `${JSON.stringify(visuals, null, 2)}\n`, "utf8");
  return directory;
}

async function missingPublishedPresetDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "portfolio-preset-reference-"));
  temporaryDirectories.push(directory);
  await cp(path.resolve("src/content"), directory, { recursive: true });
  const projectPath = path.join(directory, "projects.json");
  const visualPath = path.join(directory, "visuals.json");
  const projects = JSON.parse(await readFile(projectPath, "utf8"));
  const visuals = JSON.parse(await readFile(visualPath, "utf8"));
  const project = projects.items.find((item) => item.publicationStatus === "published");
  project.shared.visual = { mode: "builder", visualId: visuals.presets[0].id };
  visuals.presets = visuals.presets.filter((preset) => preset.id !== project.shared.visual.visualId);
  await writeFile(projectPath, `${JSON.stringify(projects, null, 2)}\n`, "utf8");
  await writeFile(visualPath, `${JSON.stringify(visuals, null, 2)}\n`, "utf8");
  return { directory, project };
}

function runNpm(script, contentDirectory) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("npm CLI yolu test ortamında bulunamadı.");
  return spawnSync(process.execPath, [npmCli, "run", script], {
    cwd: process.cwd(),
    env: { ...process.env, PORTFOLIO_CONTENT_FIXTURE_DIR: contentDirectory },
    encoding: "utf8",
  });
}

describe("production content prebuild validation", () => {
  it("accepts the real canonical content files", async () => {
    await expect(validateContentDirectory(path.resolve("src/content"))).resolves.toMatchObject({ projects: { schemaVersion: 1 } });
  });

  it("rejects a syntactically valid but schema-invalid fixture", async () => {
    const directory = await invalidContentDirectory();
    await expect(validateContentDirectory(directory)).rejects.toThrow(/İçerik şema doğrulaması başarısız/);
  });

  it("rejects a certificate that points at project image media", async () => {
    const directory = await invalidCertificateContentDirectory();
    await expect(validateContentDirectory(directory)).rejects.toThrow(/certificates\.items\.0\.shared\.file/);
  });

  it("returns non-zero before build for a renderer-invalid visual module fixture", async () => {
    const directory = await invalidVisualContentDirectory();
    const result = runNpm("validate:content", directory);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/lineChart modülünün shared\.values alanı geçersiz/);
  });

  it("returns non-zero when a published project references a removed visual preset", async () => {
    const { directory, project } = await missingPublishedPresetDirectory();
    const result = runNpm("validate:content", directory);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(project.id);
    expect(`${result.stdout}\n${result.stderr}`).toContain(project.shared.visual.visualId);
  });

  it.each([
    ["about: {}", (site) => { site.tr.about = {}; }],
    ["missing statement", (site) => { delete site.en.about.statement; }],
    ["missing paragraphs", (site) => { delete site.tr.about.paragraphs; }],
    ["missing facts", (site) => { delete site.en.about.facts; }],
    ["missing terminal command", (site) => { delete site.tr.terminal.cmds.projects; }],
  ])("rejects a site fixture with %s", async (_label, mutate) => {
    const directory = await invalidSiteContentDirectory(mutate);
    await expect(validateContentDirectory(directory)).rejects.toThrow(/İçerik şema doğrulaması başarısız/);
  });

  it("stops build:site before Vite when validation fails", async () => {
    const directory = await invalidSiteContentDirectory((site) => { delete site.tr.projects.stats; });
    const result = runNpm("build:site", directory);
    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status).not.toBe(0);
    expect(output).toContain("İçerik şema doğrulaması başarısız");
    expect(output).not.toMatch(/vite v\d|building for production/i);
  });
});
