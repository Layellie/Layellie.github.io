import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { migrateLegacyContent } from "../src/content/migrations.js";

const root = resolve(import.meta.dirname, "..");
const fixturePath = resolve(root, "tests/fixtures/legacy-content.json");

function extractObject(source, declaration, nextDeclaration) {
  const start = source.indexOf(declaration);
  const end = source.indexOf(nextDeclaration, start);
  if (start < 0 || end < 0) {
    throw new Error(`Could not find ${declaration} in src/App.jsx`);
  }
  const expression = source
    .slice(start + declaration.length, end)
    .trim()
    .replace(/;$/, "");
  return Function(`"use strict"; return (${expression});`)();
}

async function captureLegacyFixture() {
  const source = await readFile(resolve(root, "src/App.jsx"), "utf8");
  const identity = extractObject(source, "const IDENTITY =", "\n\n/* ================================================================== */\n/*  İÇERİK");
  const content = extractObject(source, "const CONTENT =", "\n\nconst SECTION_IDS");
  await mkdir(resolve(root, "tests/fixtures"), { recursive: true });
  await writeFile(fixturePath, `${JSON.stringify({ identity, content }, null, 2)}\n`);
}

async function stripLegacyConstants() {
  const appPath = resolve(root, "src/App.jsx");
  const source = await readFile(appPath, "utf8");
  const start = source.indexOf(
    "/* ================================================================== */\n/*  KİMLİK",
  );
  const end = source.indexOf("const SECTION_IDS", start);
  if (start < 0) {
    console.log("Legacy constants are already absent from src/App.jsx.");
    return;
  }
  if (end < 0) throw new Error("Could not find SECTION_IDS after legacy constants");
  await writeFile(appPath, `${source.slice(0, start)}${source.slice(end)}`);
  console.log("Removed migrated legacy constants from src/App.jsx.");
}

async function main() {
  if (process.argv.includes("--capture")) await captureLegacyFixture();
  if (process.argv.includes("--strip-app")) await stripLegacyConstants();
  const legacy = JSON.parse(await readFile(fixturePath, "utf8"));
  const migrated = migrateLegacyContent(legacy);
  await mkdir(resolve(root, "src/content"), { recursive: true });
  await Promise.all(
    Object.entries(migrated).map(([name, value]) =>
      writeFile(resolve(root, `src/content/${name}.json`), `${JSON.stringify(value, null, 2)}\n`),
    ),
  );
  console.log("Migrated legacy CONTENT into versioned JSON files.");
}

await main();
