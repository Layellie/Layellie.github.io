import { describe, expect, it, vi } from "vitest";
import {
  fetchWorkerHealth,
  latestReleaseTag,
  sumReleaseDownloads,
  syncStatusVersion,
} from "../../src/presence/systemStatus.js";

describe("system status and release download helpers", () => {
  it("sums GitHub release installer downloads while ignoring checksum/metadata files", () => {
    expect(sumReleaseDownloads(null)).toBe(0);
    expect(sumReleaseDownloads([])).toBe(0);
    expect(
      sumReleaseDownloads([
        {
          assets: [
            { name: "StandbyAndTimer_Setup_3.0.9.exe", download_count: 5 },
            { name: "StandbyAndTimer_Setup_3.0.9.exe.sha256", download_count: 33 },
          ],
        },
        {
          assets: [
            { name: "EyeHealth-portable.zip", download_count: 4 },
            { name: "checksums.txt", download_count: 90 },
            { name: "bad.exe", download_count: -5 },
            { name: "nan.exe", download_count: "bad" },
          ],
        },
        { assets: null },
      ]),
    ).toBe(9);
  });

  it("measures Worker /api/health latency and parses edge POP metadata", async () => {
    let tick = 100;
    const fetcher = vi.fn(async (url, init) => {
      tick = 142;
      expect(url).toBe("https://admin.layellie.dev/api/health");
      expect(init.method).toBe("GET");
      expect(init.credentials).toBe("omit");
      return Response.json({
        ok: true,
        service: "layellie-edge",
        edge: "IST",
        timestamp: "2026-11-23T19:45:00.000Z",
      });
    });

    const result = await fetchWorkerHealth({
      origin: "https://admin.layellie.dev/",
      fetcher,
      now: () => tick,
    });

    expect(result).toEqual({
      ok: true,
      configured: true,
      service: "layellie-edge",
      edge: "IST",
      timestamp: "2026-11-23T19:45:00.000Z",
      latencyMs: 42,
    });
  });

  it("fails closed without throwing when origin is missing or request errors", async () => {
    expect(await fetchWorkerHealth({ origin: "" })).toEqual({ ok: false, configured: false });
    const failing = vi.fn(async () => {
      throw new Error("network down");
    });
    expect(await fetchWorkerHealth({ origin: "https://admin.layellie.dev", fetcher: failing })).toEqual({
      ok: false,
      configured: true,
    });
  });

  it("extracts latest stable release tag and syncs versioned status pills", () => {
    expect(latestReleaseTag(null)).toBe("");
    expect(
      latestReleaseTag([
        { tag_name: "v1.2.0-rc1", draft: false, prerelease: true },
        { tag_name: "v1.1.0", draft: true, prerelease: false },
        { tag_name: "1.1.0", draft: false, prerelease: false },
        { tag_name: "v1.0.0", draft: false, prerelease: false },
      ]),
    ).toBe("v1.1.0");

    expect(syncStatusVersion(["v1.0.0 Yayında", "Testler Mevcut", "Portable"], "v1.1.0")).toEqual([
      "v1.1.0 Yayında",
      "Testler Mevcut",
      "Portable",
    ]);
    expect(syncStatusVersion(["v1.0.0 Released", "Portable"], "v1.1.0")).toEqual([
      "v1.1.0 Released",
      "Portable",
    ]);
    expect(syncStatusVersion(["v1.0.0 Yayında"], "")).toEqual(["v1.0.0 Yayında"]);
  });
});
