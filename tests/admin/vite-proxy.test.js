import { describe, expect, it } from "vitest";
import { createAdminDevProxy, resolveAdminWorkerDevOrigin } from "../../vite.admin.config.js";

describe("admin Vite development proxy", () => {
  it("proxies both API and auth paths to the configurable local Worker", () => {
    const target = resolveAdminWorkerDevOrigin("http://localhost:8790");
    const proxy = createAdminDevProxy(target);
    expect(proxy["/api"]).toMatchObject({ target: "http://localhost:8790", changeOrigin: false, secure: false });
    expect(proxy["/auth"]).toMatchObject({ target: "http://localhost:8790", changeOrigin: false, secure: false });
  });

  it("rejects unsafe or path-bearing proxy targets", () => {
    expect(() => resolveAdminWorkerDevOrigin("http://worker.example/api")).toThrow();
    expect(() => resolveAdminWorkerDevOrigin("https://user:pass@worker.example")).toThrow();
  });
});
