import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parsePortfolioFiles } from "../src/content/schemas.js";

const CONTENT_KEYS = ["site", "projects", "certificates", "skills", "visuals"];

export async function validateContentDirectory(contentDirectory = path.resolve(process.cwd(), "src", "content")) {
  const files = {};
  for (const key of CONTENT_KEYS) {
    const filename = `${key}.json`;
    try {
      files[key] = JSON.parse(await readFile(path.join(contentDirectory, filename), "utf8"));
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(`${filename}: geçerli JSON değil.`, { cause: error });
      throw new Error(`${filename}: içerik dosyası okunamadı.`, { cause: error });
    }
  }

  try {
    return parsePortfolioFiles(files);
  } catch (error) {
    if (!Array.isArray(error?.issues)) throw error;
    const issues = error.issues.slice(0, 20).map((issue) => {
      const location = issue.path?.length ? issue.path.join(".") : "content";
      return `- ${location}: ${issue.message}`;
    });
    if (error.issues.length > issues.length) issues.push(`- ${error.issues.length - issues.length} ek şema hatası`);
    throw new Error(`İçerik şema doğrulaması başarısız:\n${issues.join("\n")}`, { cause: error });
  }
}

async function main() {
  try {
    await validateContentDirectory();
    if (process.env.PORTFOLIO_CONTENT_FIXTURE_DIR) {
      await validateContentDirectory(path.resolve(process.env.PORTFOLIO_CONTENT_FIXTURE_DIR));
    }
    process.stdout.write("İçerik şema doğrulaması başarılı.\n");
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "İçerik doğrulanamadı."}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
