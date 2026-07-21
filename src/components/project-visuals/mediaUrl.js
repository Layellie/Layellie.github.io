const ABSOLUTE_MEDIA_PROTOCOL = /^(?:blob:|data:|https?:\/\/)/i;

export function resolveMediaUrl(value, { publicSiteOrigin, requirePublicOrigin = false } = {}) {
  if (typeof value !== "string" || !value) return null;
  if (ABSOLUTE_MEDIA_PROTOCOL.test(value) || !value.startsWith("/media/")) return value;
  if (!publicSiteOrigin) return requirePublicOrigin ? null : value;
  try {
    const origin = new URL(publicSiteOrigin);
    if (!/^https?:$/.test(origin.protocol) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) return null;
    return new URL(value, origin.origin).href;
  } catch {
    return null;
  }
}
