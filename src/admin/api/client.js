async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  let response;
  try {
    response = await fetch(path, { ...options, headers, credentials: "same-origin", cache: "no-store" });
  } catch {
    throw apiUnavailableError();
  }
  if (response.status === 204) return {};
  if (!response.headers.get("Content-Type")?.toLocaleLowerCase("en-US").includes("application/json")) {
    throw apiUnavailableError(response.status);
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw apiUnavailableError(response.status);
  }
  if (!response.ok) {
    const error = new Error(payload.message || "İşlem tamamlanamadı.");
    error.status = response.status;
    error.code = payload.code;
    error.details = payload.details;
    throw error;
  }
  return payload;
}

function apiUnavailableError(status) {
  return Object.assign(new Error("Admin API bağlantısı kurulamadı. Yerel Worker'ın çalıştığını doğrula ve tekrar dene."), {
    code: "API_UNREACHABLE",
    ...(status ? { status } : {}),
  });
}

function mediaManifest(media = []) {
  return media.map(({ kind, recordId, file }, index) => ({ kind, recordId, index, name: file.name, size: file.size, type: file.type }));
}

function publicationForm(payload) {
  const body = new FormData();
  const media = payload.media || [];
  body.set("payload", JSON.stringify({ ...payload, media: mediaManifest(media) }));
  media.forEach(({ file }, index) => body.set(`file-${index}`, file));
  return body;
}

export const adminApi = {
  session: () => request("/api/session"),
  content: () => request("/api/content"),
  validate: (payload, csrf) => request("/api/validate", { method: "POST", headers: { "X-CSRF-Token": csrf }, body: publicationForm(payload) }),
  publish: (payload, csrf) => {
    return request("/api/publish", { method: "POST", headers: { "X-CSRF-Token": csrf }, body: publicationForm(payload) });
  },
  deployment: (commit) => request(`/api/deployments?commit=${encodeURIComponent(commit)}`),
  analytics: (range = "7d") => request(`/api/admin/analytics?range=${encodeURIComponent(range)}`),
  logout: (csrf) => request("/auth/logout", { method: "POST", headers: { "X-CSRF-Token": csrf } }),
};
