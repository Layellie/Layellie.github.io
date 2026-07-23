// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DAILY_KEY,
  OPTOUT_KEY,
  analyticsOptedOut,
  istanbulDay,
  recordPortfolioVisit,
  setAnalyticsOptOut,
} from "../../src/analytics/visitor.js";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

function ok204() {
  return vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
}

const ADMIN = "https://admin.example";
const DAY_ONE = new Date("2026-07-23T20:30:00.000Z"); // Istanbul 2026-07-23
const DAY_TWO = new Date("2026-07-24T20:30:00.000Z"); // Istanbul 2026-07-24

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("unlinkable daily visitor client", () => {
  it("measures anonymously even when GPC is enabled", async () => {
    const storage = memoryStorage();
    const fetcher = ok204();
    const navigatorRef = { globalPrivacyControl: true };
    await expect(recordPortfolioVisit({ storage, fetcher, now: DAY_ONE, origin: ADMIN, navigatorRef })).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body).toMatchObject({ schemaVersion: 1, visitorId: expect.stringMatching(/^[0-9a-f-]{36}$/i) });
    // GPC/DNT signals are never transmitted.
    expect(Object.keys(body)).toEqual(["visitorId", "schemaVersion"]);
  });

  it("measures anonymously even when Do Not Track is '1'", async () => {
    const storage = memoryStorage();
    const fetcher = ok204();
    await expect(recordPortfolioVisit({ storage, fetcher, now: DAY_ONE, origin: ADMIN, navigatorRef: { doNotTrack: "1" } })).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("sends only once per browser per Istanbul day across reloads", async () => {
    const storage = memoryStorage();
    const fetcher = ok204();
    await recordPortfolioVisit({ storage, fetcher, now: DAY_ONE, origin: ADMIN });
    await recordPortfolioVisit({ storage, fetcher, now: DAY_ONE, origin: ADMIN });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.parse(storage.getItem(DAILY_KEY))).toMatchObject({ day: "2026-07-23", sent: true });
  });

  it("rotates to a new unlinkable UUID when the Istanbul day changes", async () => {
    const storage = memoryStorage();
    const fetcher = ok204();
    await recordPortfolioVisit({ storage, fetcher, now: DAY_ONE, origin: ADMIN });
    await recordPortfolioVisit({ storage, fetcher, now: DAY_TWO, origin: ADMIN });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const first = JSON.parse(fetcher.mock.calls[0][1].body).visitorId;
    const second = JSON.parse(fetcher.mock.calls[1][1].body).visitorId;
    // Different days carry different UUIDs, so they cannot be linked together.
    expect(first).not.toBe(second);
    expect(JSON.parse(storage.getItem(DAILY_KEY))).toMatchObject({ day: "2026-07-24" });
  });

  it("does not mark the day sent on a failed response and retries with the same UUID", async () => {
    const storage = memoryStorage();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("bad", { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(recordPortfolioVisit({ storage, fetcher, now: DAY_ONE, origin: ADMIN })).resolves.toBe(false);
    expect(JSON.parse(storage.getItem(DAILY_KEY)).sent).toBe(false);
    await expect(recordPortfolioVisit({ storage, fetcher, now: DAY_ONE, origin: ADMIN })).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).visitorId).toBe(JSON.parse(fetcher.mock.calls[1][1].body).visitorId);
    expect(JSON.parse(storage.getItem(DAILY_KEY)).sent).toBe(true);
  });

  it("does not mark the day sent when the request throws (blocked/CORS/network)", async () => {
    const storage = memoryStorage();
    const fetcher = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(recordPortfolioVisit({ storage, fetcher, now: DAY_ONE, origin: ADMIN })).resolves.toBe(false);
    expect(JSON.parse(storage.getItem(DAILY_KEY)).sent).toBe(false);
  });

  it("sends nothing while opted out", async () => {
    const storage = memoryStorage({ [OPTOUT_KEY]: "1" });
    const fetcher = ok204();
    await expect(recordPortfolioVisit({ storage, fetcher, now: DAY_ONE, origin: ADMIN })).resolves.toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("opting out clears every analytics key and blocks sending", async () => {
    const storage = memoryStorage({
      [DAILY_KEY]: JSON.stringify({ day: "2026-07-23", visitorId: "abc", sent: true }),
      "layellie.analytics.visitor.v1": "legacy-uuid",
      "layellie.analytics.day.v1": "2026-07-23",
    });
    setAnalyticsOptOut(true, { storage });
    expect(analyticsOptedOut(storage)).toBe(true);
    expect(storage.getItem(DAILY_KEY)).toBeNull();
    expect(storage.getItem("layellie.analytics.visitor.v1")).toBeNull();
    expect(storage.getItem("layellie.analytics.day.v1")).toBeNull();
    const fetcher = ok204();
    await recordPortfolioVisit({ storage, fetcher, now: DAY_ONE, origin: ADMIN });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("opting back in mints a fresh daily identity and resumes measuring", async () => {
    const storage = memoryStorage({ [OPTOUT_KEY]: "1", [DAILY_KEY]: JSON.stringify({ day: "2026-07-23", visitorId: "old", sent: true }) });
    setAnalyticsOptOut(false, { storage });
    expect(analyticsOptedOut(storage)).toBe(false);
    expect(storage.getItem(DAILY_KEY)).toBeNull();
    const fetcher = ok204();
    await expect(recordPortfolioVisit({ storage, fetcher, now: DAY_ONE, origin: ADMIN })).resolves.toBe(true);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).visitorId).not.toBe("old");
  });

  it("migrates away from the legacy persistent keys so a stale marker cannot skip today", async () => {
    const storage = memoryStorage({
      "layellie.analytics.visitor.v1": "legacy-uuid",
      "layellie.analytics.day.v1": "2026-07-23", // old model would have skipped today
    });
    const fetcher = ok204();
    await expect(recordPortfolioVisit({ storage, fetcher, now: DAY_ONE, origin: ADMIN })).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(storage.getItem("layellie.analytics.visitor.v1")).toBeNull();
    expect(storage.getItem("layellie.analytics.day.v1")).toBeNull();
    // The new record does not reuse the legacy UUID.
    expect(JSON.parse(fetcher.mock.calls[0][1].body).visitorId).not.toBe("legacy-uuid");
  });

  it("keeps the Istanbul calendar-day helper stable", () => {
    expect(istanbulDay(DAY_ONE)).toBe("2026-07-23");
    expect(istanbulDay(DAY_TWO)).toBe("2026-07-24");
  });
});
