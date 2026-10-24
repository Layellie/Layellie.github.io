import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CONTENT_KEYS = ["site", "projects", "certificates", "skills", "visuals"];

/**
 * Public site build'inde `src/content/publicContent.js` modülünü, Zod ile build
 * sırasında doğrulanmış ve görünüme dönüştürülmüş hazır JSON ile değiştirir.
 * Böylece ~70 kB Zod + çalışma zamanı ayrıştırması ilk JS paketinden çıkar.
 * Doğrulama başarısız olursa build hata verir (`npm run validate:content` ile aynı şema).
 */
export function precomputedContentPlugin() {
  let root = process.cwd();
  const contentDir = () => path.resolve(root, "src", "content");
  const target = () => path.join(contentDir(), "publicContent.js");

  return {
    name: "precomputed-portfolio-content",
    apply: "build",
    enforce: "pre",
    configResolved(config) {
      root = config.root;
    },
    async load(id) {
      const clean = path.normalize(id.split("?")[0]);
      if (clean.toLowerCase() !== target().toLowerCase()) return null;

      const files = {};
      for (const key of CONTENT_KEYS) {
        const file = path.join(contentDir(), `${key}.json`);
        this.addWatchFile(file);
        files[key] = JSON.parse(await readFile(file, "utf8"));
      }

      const [{ parsePortfolioFiles }, { buildContentView }] = await Promise.all([
        import(pathToFileURL(path.join(contentDir(), "schemas.js")).href),
        import(pathToFileURL(path.join(contentDir(), "contentView.js")).href),
      ]);
      const parsed = parsePortfolioFiles(files);
      const view = buildContentView(files);

      return [
        'export { selectSkillsTicker } from "./skillsTicker.js";',
        `export const IDENTITY = ${JSON.stringify(view.identity)};`,
        `export const CONTENT = ${JSON.stringify(view.content)};`,
        `export const portfolioFiles = ${JSON.stringify({ visuals: parsed.visuals })};`,
        "",
      ].join("\n");
    },
  };
}
