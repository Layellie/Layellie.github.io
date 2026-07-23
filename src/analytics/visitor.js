// Balanced, unlinkable daily analytics client.
//
// Privacy model: a single localStorage record holds one *daily* random UUID.
// The UUID is regenerated whenever the Istanbul calendar day changes, so visits
// on different days share no identifier and cannot be linked to one person. No
// raw UUID, IP, User-Agent, referrer, URL or fingerprint ever leaves as durable
// data — the Worker only stores an HMAC(uuid+day), the device class and a day.
// Because each day's record is anonymous and unlinkable, the measurement runs
// even under GPC / Do-Not-Track (whose values are never read or transmitted),
// while a footer opt-out fully disables it.

export const DAILY_KEY = "layellie.analytics.daily.v1";
export const OPTOUT_KEY = "layellie.analytics.optout.v1";
// Retired persistent-identity keys from the previous model.
const LEGACY_KEYS = ["layellie.analytics.visitor.v1", "layellie.analytics.day.v1"];
const ISTANBUL = "Europe/Istanbul";

export function istanbulDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: ISTANBUL, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

function clearLegacyKeys(storage) {
  for (const key of LEGACY_KEYS) {
    try { storage.removeItem(key); } catch { /* storage unavailable */ }
  }
}

export function analyticsOptedOut(storage = globalThis.localStorage) {
  try { return storage?.getItem(OPTOUT_KEY) === "1"; } catch { return false; }
}

export function setAnalyticsOptOut(optedOut, { storage = globalThis.localStorage } = {}) {
  try {
    if (optedOut) storage.setItem(OPTOUT_KEY, "1");
    else storage.removeItem(OPTOUT_KEY);
    // Either direction erases the stored daily identity: opting out removes the
    // local record entirely, and opting back in starts a brand-new daily UUID.
    storage.removeItem(DAILY_KEY);
    clearLegacyKeys(storage);
  } catch { /* storage unavailable */ }
  return optedOut;
}

function readDailyRecord(storage) {
  try {
    const raw = storage.getItem(DAILY_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw);
    if (!record || typeof record.day !== "string" || typeof record.visitorId !== "string") return null;
    return { day: record.day, visitorId: record.visitorId, sent: record.sent === true };
  } catch { return null; }
}

export async function recordPortfolioVisit({ storage = globalThis.localStorage, fetcher = globalThis.fetch, now = new Date(), origin = import.meta.env.VITE_ADMIN_ORIGIN } = {}) {
  if (!origin) return false;
  try {
    // Retire the old persistent-UUID / day-marker keys so a stale marker can
    // never suppress today's first attempt under the new daily model.
    clearLegacyKeys(storage);
    if (storage.getItem(OPTOUT_KEY) === "1") return false;

    const day = istanbulDay(now);
    let record = readDailyRecord(storage);
    if (!record || record.day !== day) {
      // First visit or the Istanbul day rolled over: mint a fresh daily UUID so
      // records from different days cannot be linked to the same visitor.
      if (typeof crypto?.randomUUID !== "function") return false;
      record = { day, visitorId: crypto.randomUUID(), sent: false };
      storage.setItem(DAILY_KEY, JSON.stringify(record));
    }
    if (record.sent) return false;

    const response = await fetcher(`${origin.replace(/\/$/, "")}/api/analytics/visit`, { method: "POST", mode: "cors", credentials: "omit", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId: record.visitorId, schemaVersion: 1 }) });
    // Only remember the day as counted after a confirmed 204/2xx. A blocked,
    // CORS-failed or 5xx request leaves the record unsent so the next load
    // retries with the same daily UUID (staying idempotent for the day).
    if (!response?.ok) return false;
    storage.setItem(DAILY_KEY, JSON.stringify({ ...record, sent: true }));
    return true;
  } catch { return false; }
}
