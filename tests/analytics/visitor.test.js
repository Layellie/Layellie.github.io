// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { DAY_KEY, istanbulDay, recordPortfolioVisit } from "../../src/analytics/visitor.js";

describe("privacy-friendly visitor client", () => {
  it("uses the Istanbul calendar day and sends one request per day", async () => {
    const storage = new Map();
    const local = { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const now = new Date("2026-07-23T20:30:00.000Z");
    await recordPortfolioVisit({ storage: local, fetcher, now, origin: "https://admin.example", navigatorRef: {} });
    await recordPortfolioVisit({ storage: local, fetcher, now, origin: "https://admin.example", navigatorRef: {} });
    expect(istanbulDay(now)).toBe("2026-07-23");
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ schemaVersion: 1, visitorId: expect.stringMatching(/^[0-9a-f-]{36}$/i) });
  });

  it("respects GPC/DNT and storage failures without breaking the site", async () => {
    const fetcher = vi.fn();
    await expect(recordPortfolioVisit({ origin: "https://admin.example", fetcher, navigatorRef: { globalPrivacyControl: true } })).resolves.toBe(false);
    await expect(recordPortfolioVisit({ origin: "https://admin.example", fetcher, storage: { getItem() { throw new Error("blocked"); } }, navigatorRef: {} })).resolves.toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("marks the day as sent only after a successful 204 response", async () => {
    const storage = new Map();
    const local = { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const now = new Date("2026-07-23T20:30:00.000Z");
    await expect(recordPortfolioVisit({ storage: local, fetcher, now, origin: "https://admin.example", navigatorRef: {} })).resolves.toBe(true);
    expect(storage.get(DAY_KEY)).toBe("2026-07-23");
  });

  it("does not mark the day on a failed response and retries on the next visit", async () => {
    const storage = new Map();
    const local = { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("bad", { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const now = new Date("2026-07-23T20:30:00.000Z");
    await expect(recordPortfolioVisit({ storage: local, fetcher, now, origin: "https://admin.example", navigatorRef: {} })).resolves.toBe(false);
    expect(storage.get(DAY_KEY)).toBeUndefined();
    // Same UUID reused on retry; the day is only marked after the second call succeeds.
    await expect(recordPortfolioVisit({ storage: local, fetcher, now, origin: "https://admin.example", navigatorRef: {} })).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).visitorId).toBe(JSON.parse(fetcher.mock.calls[1][1].body).visitorId);
    expect(storage.get(DAY_KEY)).toBe("2026-07-23");
  });

  it("does not mark the day when the request throws (blocked/CORS/network) and retries later", async () => {
    const storage = new Map();
    const local = { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const now = new Date("2026-07-23T20:30:00.000Z");
    await expect(recordPortfolioVisit({ storage: local, fetcher, now, origin: "https://admin.example", navigatorRef: {} })).resolves.toBe(false);
    expect(storage.get(DAY_KEY)).toBeUndefined();
    await expect(recordPortfolioVisit({ storage: local, fetcher, now, origin: "https://admin.example", navigatorRef: {} })).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(storage.get(DAY_KEY)).toBe("2026-07-23");
  });
});
