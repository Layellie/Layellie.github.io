import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PUBLIC_SITE_ORIGIN_TOKEN = "{{PUBLIC_SITE_ORIGIN}}";

function stripJsonComments(source) {
  let output = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (inString) {
      output += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      output += character;
      continue;
    }
    if (character === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      output += "\n";
      continue;
    }
    if (character === "/" && next === "*") {
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) index += 1;
      index += 1;
      continue;
    }
    output += character;
  }
  return output;
}

export function validatePublicSiteOrigin(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("PUBLIC_SITE_ORIGIN path, kimlik bilgisi, query veya fragment içermeyen bir HTTPS origin olmalı.");
  }
  return parsed.origin;
}

export async function readPublicSiteOrigin(configPath = path.resolve("worker/wrangler.jsonc")) {
  const config = JSON.parse(stripJsonComments(await readFile(configPath, "utf8")));
  const value = config?.vars?.PUBLIC_SITE_ORIGIN;
  if (typeof value !== "string" || !value.trim()) throw new Error("worker/wrangler.jsonc içinde PUBLIC_SITE_ORIGIN tanımlı olmalı.");
  return validatePublicSiteOrigin(value);
}

export function renderAdminSecurityHeaders(template, publicSiteOrigin) {
  const occurrences = template.split(PUBLIC_SITE_ORIGIN_TOKEN).length - 1;
  if (occurrences !== 1) throw new Error(`Admin _headers şablonu tam bir ${PUBLIC_SITE_ORIGIN_TOKEN} içermeli.`);
  return template.replace(PUBLIC_SITE_ORIGIN_TOKEN, validatePublicSiteOrigin(publicSiteOrigin));
}

export function adminSecurityHeaders({ configPath = path.resolve("worker/wrangler.jsonc") } = {}) {
  let renderedHeaders;
  let templatePath;
  let outputPath;
  return {
    name: "admin-security-headers",
    apply: "build",
    configResolved(config) {
      templatePath = path.resolve(config.root, "public/_headers");
      outputPath = path.resolve(config.root, config.build.outDir, "_headers");
    },
    async buildStart() {
      const template = await readFile(templatePath, "utf8");
      renderedHeaders = renderAdminSecurityHeaders(template, await readPublicSiteOrigin(configPath));
    },
    async closeBundle() {
      await writeFile(outputPath, renderedHeaders, "utf8");
    },
  };
}
