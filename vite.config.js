import { execSync } from "node:child_process";
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

// https://vite.dev/config/
export default defineConfig({
  cacheDir: "node_modules/.vite-site",
  define: {
    __SITE_BUILD__: JSON.stringify(resolveBuildInfo()),
  },
  plugins: [
    tailwindSourceScope(["./App.jsx", "./main.jsx", "./components/project-visuals"]),
    react(),
    tailwindcss(),
    adminRedirectPlugin(),
    precomputedContentPlugin(),
    inlineAndPrerenderShellPlugin(),
  ],
});
