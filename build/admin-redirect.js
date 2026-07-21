function normalizeAdminOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname) && url.protocol === "http:";
    if (url.protocol !== "https:" && !local) return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function renderAdminRedirect(rawOrigin) {
  const origin = normalizeAdminOrigin(rawOrigin);
  const body = origin
    ? `<p>Güvenli yönetim paneline yönlendiriliyorsun…</p><noscript><a href="${origin}">Yönetim panelini aç</a></noscript><script>location.replace(${JSON.stringify(origin)});</script>`
    : `<p>Yönetim paneli henüz yapılandırılmadı.</p><small>Cloudflare Worker kurulumu tamamlandığında <code>VITE_ADMIN_ORIGIN</code> repository variable'ını tanımla.</small>`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#08080a"><title>Layellie · Admin</title><style>body{min-height:100vh;margin:0;display:grid;place-items:center;background:#08080a;color:#f3f1ec;font-family:system-ui,sans-serif}main{width:min(88vw,520px);padding:32px;border:1px solid #232328;border-radius:24px;background:#101013}b,a,code{color:#d6ff3f}p{font-size:20px}small{color:#9a9aa2;line-height:1.7}</style></head><body><main><b>Layellie.</b>${body}</main></body></html>`;
}

export function adminRedirectPlugin() {
  return {
    name: "layellie-admin-redirect",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "admin/index.html", source: renderAdminRedirect(process.env.VITE_ADMIN_ORIGIN) });
    },
  };
}
