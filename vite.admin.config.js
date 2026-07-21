import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { adminSecurityHeaders } from "./build/admin-security-headers.js";
import { tailwindSourceScope } from "./build/tailwind-source-scope.js";

const DEFAULT_ADMIN_WORKER_DEV_ORIGIN = "http://127.0.0.1:8787";

export function resolveAdminWorkerDevOrigin(value = DEFAULT_ADMIN_WORKER_DEV_ORIGIN) {
  const parsed = new URL(value);
  const localHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if ((!localHttp && parsed.protocol !== "https:") || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("ADMIN_WORKER_DEV_ORIGIN temiz bir HTTPS origin veya localhost HTTP origin olmalı.");
  }
  return parsed.origin;
}

export function createAdminDevProxy(target) {
  const proxy = () => ({ target, changeOrigin: false, secure: target.startsWith("https:") });
  return { "/api": proxy(), "/auth": proxy() };
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  const workerOrigin = resolveAdminWorkerDevOrigin(environment.ADMIN_WORKER_DEV_ORIGIN || DEFAULT_ADMIN_WORKER_DEV_ORIGIN);
  return {
    root: "admin",
    cacheDir: "../node_modules/.vite-admin",
    plugins: [
      tailwindSourceScope(["./admin", "./components/project-visuals", "../admin"]),
      react(),
      tailwindcss(),
      adminSecurityHeaders(),
    ],
    server: {
      port: 5174,
      strictPort: true,
      proxy: createAdminDevProxy(workerOrigin),
    },
    build: {
      outDir: "../dist-admin",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            motion: ["framer-motion"],
            dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          },
        },
      },
    },
  };
});
