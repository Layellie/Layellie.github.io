import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const readmePath = path.join(root, "README.md");
const imageRelativePath = "docs/assets/portfolio-admin-dashboard.png";
const imagePath = path.join(root, imageRelativePath);

function pngChunks(buffer) {
  const chunks = [];
  for (let offset = 8; offset + 12 <= buffer.length;) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    chunks.push(type);
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return chunks;
}

describe("README admin backend showcase", () => {
  it("references an accessible, repository-local 1920x1080 PNG without text metadata", async () => {
    const readme = await readFile(readmePath, "utf8");
    expect(readme).toMatch(
      /!\[[^\]\n]{20,}\]\(docs\/assets\/portfolio-admin-dashboard\.png\)/,
    );
    await expect(access(imagePath)).resolves.toBeUndefined();

    const png = await readFile(imagePath);
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(1920);
    expect(png.readUInt32BE(20)).toBe(1080);
    expect(pngChunks(png)).not.toEqual(
      expect.arrayContaining(["tEXt", "zTXt", "iTXt", "eXIf"]),
    );
  });

  it("uses valid relative documentation links and a compact GitHub Mermaid flowchart", async () => {
    const readme = await readFile(readmePath, "utf8");
    for (const relativePath of ["docs/admin-architecture.md", "docs/admin-setup.md"]) {
      expect(readme).toContain(`](${relativePath})`);
      await expect(access(path.join(root, relativePath))).resolves.toBeUndefined();
    }

    const mermaid = readme.match(/```mermaid\n([\s\S]*?)```/)?.[1];
    expect(mermaid).toBeTruthy();
    expect(mermaid.trimStart().startsWith("flowchart LR")).toBe(true);
    const edges = mermaid.split("\n").filter((line) => line.includes("-->"));
    expect(edges).toHaveLength(7);
    for (const edge of edges) {
      expect(edge).toMatch(
        /^\s*[a-z][\w-]*(?:\[[^\]\n]+\])?\s*-->\s*[a-z][\w-]*\[[^\]\n]+\]\s*$/,
      );
    }
    for (const label of [
      "Portfolio Owner",
      "Admin UI",
      "Cloudflare Worker",
      "GitHub App",
      "GitHub Repository",
      "GitHub Actions",
      "GitHub Pages",
      "Public Portfolio",
    ]) {
      expect(mermaid).toContain(`[${label}]`);
    }
  });

  it("does not disclose production identifiers, credentials or commit references", async () => {
    const readme = await readFile(readmePath, "utf8");
    const pngText = (await readFile(imagePath)).toString("latin1");
    const forbidden = [
      /\bIv[0-9A-Za-z]{18}\b/,
      /\b\d{8,12}\b/,
      /[a-z0-9-]+(?:\.[a-z0-9-]+)*\.workers\.dev/i,
      /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/,
      /\b(?:GITHUB_CLIENT_SECRET|SESSION_SECRET)\s*=/,
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
      /\b[A-Za-z]:\\[^\r\n]*/,
    ];
    for (const pattern of forbidden) {
      expect(readme).not.toMatch(pattern);
      expect(pngText).not.toMatch(pattern);
    }
    expect(readme).not.toMatch(/\b(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]{20,}\b/);
    expect(readme).not.toMatch(/\b[0-9a-f]{40}\b/i);
  });
});
