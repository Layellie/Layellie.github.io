import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/visual",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  outputDir: "test-results",
  reporter: "line",
  use: {
    channel: "msedge",
    headless: true,
    colorScheme: "dark",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npm run dev:site -- --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev:admin -- --host 127.0.0.1 --port 4174 --strictPort",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
