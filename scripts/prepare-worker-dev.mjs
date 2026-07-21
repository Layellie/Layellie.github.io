import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function prepareWorkerDevAssets({ root = process.cwd(), buildAdmin = runAdminBuild } = {}) {
  const entry = path.resolve(root, "dist-admin/index.html");
  if (!existsSync(entry)) await buildAdmin(root);
  if (!existsSync(entry)) throw new Error("Worker geliştirme assets build'i dist-admin/index.html üretmedi.");
  return entry;
}

function runAdminBuild(root) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("npm CLI yolu bulunamadı; komutu npm run dev:worker üzerinden çalıştır.");
  const result = spawnSync(process.execPath, [npmCli, "run", "build:admin"], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`Admin assets build'i başarısız oldu (${result.status ?? "başlatılamadı"}).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await prepareWorkerDevAssets();
}
