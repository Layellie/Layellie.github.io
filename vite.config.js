import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tailwindSourceScope } from "./build/tailwind-source-scope.js";
import { adminRedirectPlugin } from "./build/admin-redirect.js";
import { precomputedContentPlugin } from "./build/precomputed-content.js";
import { inlineAndPrerenderShellPlugin } from "./build/prerender-shell.js";

function resolveBuildInfo() {
  let commit = (process.env.GITHUB_SHA || "").slice(0, 7);
  if (!commit) {
    try {
      commit = execSync("git rev-parse --short HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      commit = "local";
    }
  }
  return { commit, builtAt: new Date().toISOString().slice(0, 10) };
}

function resolveTailwindSources() {
  const sources = [
    "./App.jsx",
    "./main.jsx",
    "./components/LegacyProjectVisuals.jsx",
    "./components/PortfolioOverlays.jsx",
    "./components/project-visuals/iconRegistry.jsx",
  ];
  try {
    const raw = JSON.parse(readFileSync(new URL("./src/content/projects.json", import.meta.url), "utf8"));
    const needsCustomVisualStyles = (raw.items || []).some((item) => {
      if (item?.publicationStatus !== "published") return false;
      const visual = item?.shared?.visual;
      return !(visual?.mode === "custom" && String(visual?.componentId || "").startsWith("legacy-"));
    });
    if (needsCustomVisualStyles) {
      sources.push("./components/project-visuals");
    }
  } catch {
    sources.push("./components/project-visuals");
  }
  return sources;
}

// https://vite.dev/config/
export default defineConfig({
  cacheDir: "node_modules/.vite-site",
  define: {
    __SITE_BUILD__: JSON.stringify(resolveBuildInfo()),
  },
  plugins: [
    tailwindSourceScope(resolveTailwindSources()),
    react(),
    tailwindcss(),
    adminRedirectPlugin(),
    precomputedContentPlugin(),
    inlineAndPrerenderShellPlugin(),
  ],
});
