const SESSION_COOKIE = "__Host-layellie-session";
const OAUTH_COOKIE = "__Host-layellie-oauth";

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie") || "";
  for (const entry of header.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0) continue;
    if (entry.slice(0, separator).trim() === name) {
      try { return decodeURIComponent(entry.slice(separator + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

function secureCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export const cookies = {
  sessionName: SESSION_COOKIE,
  oauthName: OAUTH_COOKIE,
  session: (value: string, maxAge: number) => secureCookie(SESSION_COOKIE, value, maxAge),
  oauth: (value: string, maxAge = 600) => secureCookie(OAUTH_COOKIE, value, maxAge),
  clearSession: () => secureCookie(SESSION_COOKIE, "", 0),
  clearOauth: () => secureCookie(OAUTH_COOKIE, "", 0),
};
