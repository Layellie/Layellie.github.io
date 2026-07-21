import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [cloudflareTest({
    wrangler: { configPath: "./worker/wrangler.jsonc" },
    miniflare: {
      bindings: {
        GITHUB_CLIENT_ID: "test-client-id",
        GITHUB_CLIENT_SECRET: "test-client-secret",
        GITHUB_OWNER: "Layellie",
        GITHUB_REPOSITORY: "Layellie.github.io",
        GITHUB_DEFAULT_BRANCH: "main",
        GITHUB_ALLOWED_USER: "Layellie",
        GITHUB_ALLOWED_USER_ID: "12345",
        SESSION_SECRET: "test-session-secret-that-is-longer-than-32-bytes",
        ADMIN_ORIGIN: "https://admin.test",
        PUBLIC_SITE_ORIGIN: "https://layellie.github.io",
      },
    },
  })],
  test: {
    include: ["tests/worker/**/*.test.js"],
  },
});
