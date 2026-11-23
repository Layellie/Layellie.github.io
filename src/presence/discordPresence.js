export const DISCORD_USER_ID_PATTERN = /^\d{17,20}$/;
export const LANYARD_API_ORIGIN = "https://api.lanyard.rest";

const ALLOWED_STATUSES = new Set(["online", "idle", "dnd"]);

const STATUS_LABELS = Object.freeze({
  tr: {
    online: "Discord · Çevrimiçi",
    idle: "Discord · Boşta",
    dnd: "Discord · Meşgul",
  },
  en: {
    online: "Discord · Online",
    idle: "Discord · Idle",
    dnd: "Discord · Busy",
  },
});

const PROFESSIONAL_APP_PATTERNS = [
  /^visual studio code\b/i,
  /^vs\s?code\b/i,
  /^code(\s+-\s+insiders)?$/i,
  /^visual studio\b/i,
  /^jetbrains\b/i,
  /^(rider|intellij|webstorm|clion|pycharm|datagrip|phpstorm|goland)\b/i,
  /^android studio\b/i,
  /^cursor\b/i,
  /^antigravity\b/i,
  /^windsurf\b/i,
  /^zed\b/i,
  /^(neo)?vim\b/i,
  /^nvim\b/i,
  /^sublime text\b/i,
  /^qt creator\b/i,
  /^xcode\b/i,
  /^docker\b/i,
  /^(postman|insomnia)\b/i,
  /^figma\b/i,
  /^github\b/i,
  /^(windows\s+)?terminal\b/i,
  /^(powershell|wsl|warp|alacritty|wezterm)\b/i,
  /^(dbeaver|sql server|ssms)\b/i,
];

const SHORT_APP_NAMES = [
  [/^visual studio code/i, "VS Code"],
  [/^windows terminal/i, "Terminal"],
];

export function isValidDiscordUserId(userId) {
  return typeof userId === "string" && DISCORD_USER_ID_PATTERN.test(userId.trim());
}

export function cleanPresenceText(value, maxLength = 40) {
  if (typeof value !== "string") return "";
  const cleaned = value.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trimEnd()}…` : cleaned;
}

export function isProfessionalActivity(activity) {
  if (!activity || typeof activity !== "object") return false;
  if (activity.type === 4) return false;
  const name = cleanPresenceText(activity.name, 80);
  if (!name) return false;
  return PROFESSIONAL_APP_PATTERNS.some((pattern) => pattern.test(name));
}

function formatAppName(rawName) {
  const cleaned = cleanPresenceText(rawName, 28);
  for (const [pattern, shortLabel] of SHORT_APP_NAMES) {
    if (pattern.test(cleaned)) return shortLabel;
  }
  return cleaned;
}

function formatActivityDetail(activity) {
  const candidates = [activity?.details, activity?.state];
  for (const candidate of candidates) {
    const cleaned = cleanPresenceText(candidate, 32);
    if (!cleaned) continue;
    // VS Code / IDE presence sıkça "Workspace: ProjeAdi" veya "Editing foo.js" formatında gelir.
    const workspaceMatch = cleaned.match(/^(?:Workspace|Working on|Editing)\s*:?\s*(.+)$/i);
    return cleanPresenceText(workspaceMatch ? workspaceMatch[1] : cleaned, 28);
  }
  return "";
}

function buildActivityResult(status, activity, kind = "coding") {
  const app = formatAppName(activity.name);
  const detail = formatActivityDetail(activity);
  const label = detail && detail.toLowerCase() !== app.toLowerCase() ? `${app} · ${detail}` : app;
  return {
    status,
    kind,
    app,
    detail,
    label: cleanPresenceText(label, 52),
  };
}

export function parseLanyardPresence(payload, { professionalFilter = true, lang = "tr" } = {}) {
  if (!payload || payload.success !== true || !payload.data || typeof payload.data !== "object") {
    return null;
  }

  const data = payload.data;
  const status = typeof data.discord_status === "string" ? data.discord_status.toLowerCase() : "";
  if (!ALLOWED_STATUSES.has(status)) {
    return null;
  }

  const localeLabels = STATUS_LABELS[lang === "en" ? "en" : "tr"];
  const activities = Array.isArray(data.activities)
    ? data.activities.filter((act) => act && typeof act === "object" && act.type !== 4 && cleanPresenceText(act.name, 80))
    : [];

  const codingActivity = activities.find(isProfessionalActivity);
  if (codingActivity) {
    return buildActivityResult(status, codingActivity, "coding");
  }

  if (professionalFilter) {
    return {
      status,
      kind: "status",
      app: "Discord",
      detail: "",
      label: localeLabels[status],
    };
  }

  if (data.listening_to_spotify && data.spotify && typeof data.spotify === "object") {
    const song = cleanPresenceText(data.spotify.song, 28);
    const artist = cleanPresenceText(data.spotify.artist, 22);
    if (song) {
      const label = artist ? `Spotify · ${song} — ${artist}` : `Spotify · ${song}`;
      return {
        status,
        kind: "spotify",
        app: "Spotify",
        detail: artist ? `${song} — ${artist}` : song,
        label: cleanPresenceText(label, 54),
      };
    }
  }

  const fallbackActivity = activities.find((act) => cleanPresenceText(act.name, 80).toLowerCase() !== "spotify");
  if (fallbackActivity) {
    return buildActivityResult(status, fallbackActivity, "activity");
  }

  return {
    status,
    kind: "status",
    app: "Discord",
    detail: "",
    label: localeLabels[status],
  };
}

export async function fetchDiscordPresence(
  userId,
  { fetcher = globalThis.fetch, timeoutMs = 4500, signal } = {}
) {
  if (!isValidDiscordUserId(userId) || typeof fetcher !== "function") return null;

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) return null;
    signal.addEventListener("abort", onAbort, { once: true });
  }
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(`${LANYARD_API_ORIGIN}/v1/users/${encodeURIComponent(userId.trim())}`, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response?.ok) return null;
    const json = await response.json();
    return json && typeof json === "object" ? json : null;
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
