export const VISITOR_KEY = "layellie.analytics.visitor.v1";
export const DAY_KEY = "layellie.analytics.day.v1";
const ISTANBUL = "Europe/Istanbul";

export function istanbulDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: ISTANBUL, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

export async function recordPortfolioVisit({ storage = globalThis.localStorage, fetcher = globalThis.fetch, now = new Date(), origin = import.meta.env.VITE_ADMIN_ORIGIN, navigatorRef = globalThis.navigator } = {}) {
  if (!origin || navigatorRef?.globalPrivacyControl === true || navigatorRef?.doNotTrack === "1") return false;
  try {
    const day = istanbulDay(now);
    if (storage.getItem(DAY_KEY) === day) return false;
    let visitorId = storage.getItem(VISITOR_KEY);
    if (!visitorId) {
      if (typeof crypto?.randomUUID !== "function") return false;
      visitorId = crypto.randomUUID();
      storage.setItem(VISITOR_KEY, visitorId);
    }
    const response = await fetcher(`${origin.replace(/\/$/, "")}/api/analytics/visit`, { method: "POST", mode: "cors", credentials: "omit", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, schemaVersion: 1 }) });
    // Only remember today's visit once the Worker confirmed it (204/2xx). A blocked,
    // CORS-failed or 5xx request must retry on the next load instead of silently
    // suppressing the count for the rest of the day.
    if (!response?.ok) return false;
    storage.setItem(DAY_KEY, day);
    return true;
  } catch { return false; }
}
