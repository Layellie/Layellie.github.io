import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareWorkerDevAssets } from "../../scripts/prepare-worker-dev.mjs";

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Worker development assets prerequisite", () => {
  it("builds a missing dist-admin entry before Wrangler starts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "portfolio-worker-dev-"));
    temporaryDirectories.push(root);
    const buildAdmin = vi.fn(async (buildRoot) => {
      const output = path.join(buildRoot, "dist-admin");
      await mkdir(output, { recursive: true });
      await writeFile(path.join(output, "index.html"), "<!doctype html>", "utf8");
    });

    const entry = await prepareWorkerDevAssets({ root, buildAdmin });

    expect(buildAdmin).toHaveBeenCalledOnce();
    expect(buildAdmin).toHaveBeenCalledWith(root);
    expect(await readFile(entry, "utf8")).toContain("<!doctype html>");
    await prepareWorkerDevAssets({ root, buildAdmin });
    expect(buildAdmin).toHaveBeenCalledOnce();
  });

  it("keeps the npm lifecycle non-recursive and production assets config unchanged", async () => {
    const packageJson = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));
    const wrangler = JSON.parse(await readFile(path.resolve("worker/wrangler.jsonc"), "utf8"));
    expect(packageJson.scripts["predev:worker"]).toBe("node scripts/prepare-worker-dev.mjs");
    expect(packageJson.scripts["dev:worker"]).toBe("wrangler dev --config worker/wrangler.jsonc");
    expect(packageJson.scripts["predev:worker"]).not.toContain("dev:worker");
    expect(wrangler.assets.directory).toBe("../dist-admin");
  });
});
