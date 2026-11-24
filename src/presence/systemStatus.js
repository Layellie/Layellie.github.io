const METADATA_ASSET_RE = /\.(sha256|sha512|sha1|md5|sig|asc|txt|json|ya?ml|blockmap)$/i;
const LEADING_VERSION_RE = /^v?\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?(?=\s|$)/i;

export function latestReleaseTag(releases) {
  if (!Array.isArray(releases)) return "";
  let fallbackTag = "";
  for (const release of releases) {
    if (!release || release.draft) continue;
    const raw = typeof release.tag_name === "string" ? release.tag_name.trim() : "";
    if (!raw) continue;
    const normalized = /^\d/.test(raw) ? `v${raw}` : raw;
    if (!release.prerelease) return normalized;
    if (!fallbackTag) fallbackTag = normalized;
  }
  return fallbackTag;
}

export function syncStatusVersion(statusList, latestTag) {
  if (!Array.isArray(statusList)) return [];
  const tag = typeof latestTag === "string" ? latestTag.trim() : "";
  if (!tag) return statusList;
  return statusList.map((item) =>
    typeof item === "string" && LEADING_VERSION_RE.test(item)
      ? item.replace(LEADING_VERSION_RE, tag)
      : item,
  );
}

export function sumReleaseDownloads(releases) {
  if (!Array.isArray(releases)) return 0;
  let total = 0;
  for (const release of releases) {
    if (!release || !Array.isArray(release.assets)) continue;
    for (const asset of release.assets) {
      const name = typeof asset?.name === "string" ? asset.name.trim() : "";
      if (name && METADATA_ASSET_RE.test(name)) continue;
      const count = Number(asset?.download_count);
      if (Number.isFinite(count) && count > 0) total += Math.floor(count);
    }
  }
  return total;
}

export async function fetchWorkerHealth({
  origin = import.meta.env.VITE_ADMIN_ORIGIN,
  fetcher = globalThis.fetch,
  timeoutMs = 4500,
  signal,
  now = () => (typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now()),
} = {}) {
  if (!origin || typeof fetcher !== "function") {
    return { ok: false, configured: false };
  }

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) return { ok: false, configured: true };
    signal.addEventListener("abort", onAbort, { once: true });
  }
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = now();

  try {
    const response = await fetcher(`${origin.replace(/\/$/, "")}/api/health`, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      signal: controller.signal,
    });
    const latencyMs = Math.max(1, Math.round(now() - startedAt));
    if (!response?.ok) {
      return { ok: false, configured: true, status: response?.status || 0, latencyMs };
    }
    const payload = await response.json().catch(() => null);
    if (!payload || payload.ok !== true) {
      return { ok: false, configured: true, status: response.status, latencyMs };
    }
    return {
      ok: true,
      configured: true,
      service: typeof payload.service === "string" ? payload.service : "layellie-edge",
      edge: typeof payload.edge === "string" ? payload.edge : "GLOBAL",
      timestamp: typeof payload.timestamp === "string" ? payload.timestamp : "",
      latencyMs,
    };
  } catch {
    return { ok: false, configured: true };
  } finally {
    globalThis.clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
