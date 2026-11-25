import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { FAQ_CONTENT } from "../src/content/faq.js";

const CONTENT_KEYS = ["site", "projects", "certificates", "skills", "visuals"];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderAnimatedWord(text, offset = 0) {
  return [...text]
    .map(
      (ch, i) =>
        `<span class="hero-char inline-block" style="--i:${offset + i}">${escapeHtml(ch)}</span>`,
    )
    .join("");
}

const GLOBE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>';

const IDLE_MARQUEE_TEXT = "C 0 D 3 · C 0 D 3 · C 0 D 3 · C 0 D 3 · C 0 D 3 ·\u00A0";

function isValidDiscordUserId(value) {
  return /^\d{17,20}$/.test(String(value ?? "").trim());
}

function renderDiscordCardShell({ identity, hero, discordPresence }) {
  const bannerPath = discordPresence?.bannerPath || "";
  const avatarPath = discordPresence?.avatarPath || "";
  const bannerSrcSet =
    bannerPath === "/media/profile/banner/layellie-banner.webp"
      ? ' srcset="/media/profile/banner/layellie-banner-1x.webp 1x, /media/profile/banner/layellie-banner.webp 1.25x"'
      : "";
  const avatarSrcSet =
    avatarPath === "/media/profile/avatar/layellie-pp.webp"
      ? ' srcset="/media/profile/avatar/layellie-pp-1x.webp 1x, /media/profile/avatar/layellie-pp.webp 1.25x"'
      : "";

  return [
    '<aside aria-label="Discord canlı profil kartı" data-discord-presence="offline" data-presence-kind="offline" class="mx-auto flex w-full max-w-[342px] flex-col overflow-hidden rounded-2xl border border-[#1f1f24] bg-[#050507] shadow-[0_24px_60px_rgba(0,0,0,0.75)] lg:mx-0 lg:w-[326px] lg:shrink-0">',
    '<div class="relative aspect-[3/1] w-full shrink-0 overflow-hidden bg-[radial-gradient(circle_at_82%_20%,rgba(214,255,63,0.18),transparent_58%),linear-gradient(135deg,#0f0f14_0%,#050507_100%)]">',
    bannerPath
      ? `<img src="${escapeHtml(bannerPath)}"${bannerSrcSet} alt="Layellie profil banner" width="324" height="108" fetchpriority="high" class="absolute inset-0 h-full w-full object-cover" />`
      : "",
    "</div>",
    '<div class="px-4 pb-3.5">',
    '<div class="-mt-8"><div class="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-[#050507] bg-[#0d0d11] font-display text-xl font-semibold text-accent">',
    avatarPath
      ? `<img src="${escapeHtml(avatarPath)}"${avatarSrcSet} alt="${escapeHtml(identity.name)}" width="56" height="56" class="h-full w-full rounded-full object-cover" decoding="async" />`
      : "L",
    '<span aria-hidden="true" class="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-[#050507] bg-[#52525b]"></span>',
    "</div></div>",
    '<div class="mt-2 flex items-center justify-between gap-2">',
    `<div class="truncate font-display text-lg font-semibold leading-tight tracking-tight text-ink">${escapeHtml(identity.name)}</div>`,
    '<span class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium border-[#1f1f24] bg-[#0a0a0d] text-faint">Çevrimdışı</span>',
    "</div>",
    `<div class="mt-0.5 flex items-center justify-between gap-2 font-mono text-[11px] text-faint">@${escapeHtml(String(identity.handle || "").toLowerCase())}</div>`,
    `<p class="mt-1.5 truncate text-xs text-muted">${escapeHtml(hero.role)}</p>`,
    '<div class="mt-3 overflow-hidden rounded-xl border border-[#1f1f24] bg-[#0a0a0d] px-3 py-2.5"><div class="profile-marquee-mask flex items-center overflow-hidden"><div class="animate-profile-marquee whitespace-nowrap font-mono text-xs font-medium tracking-[0.14em] text-ink">',
    `<span>${IDLE_MARQUEE_TEXT}</span><span aria-hidden="true">${IDLE_MARQUEE_TEXT}</span>`,
    "</div></div></div>",
    "</div></aside>",
  ].join("");
}

/**
 * Hero + üst bar için statik başlangıç HTML'i üretir.
 * Tarayıcı JS'i indirmeden ilk boyamada (FCP + LCP) başlığı, alt metinleri
 * ve Hero profil kartını çizer; React yüklendiğinde #root'u devralır.
 */
export function renderInitialShellHtml({ identity, tr, discordPresence = null }) {
  const hero = tr.hero;
  const nav = tr.nav;
  const showDiscordCard =
    Boolean(discordPresence?.enabled) && isValidDiscordUserId(discordPresence?.userId);

  return [
    '<div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0" style="background:radial-gradient(70% 55% at 50% -10%, rgba(214,255,63,0.07), transparent 70%)"></div>',
    '<header class="fixed inset-x-0 top-0 z-50 border-b border-transparent transition-all duration-500">',
    '<nav class="mx-auto w-full max-w-[1380px] px-6 md:px-10 flex h-16 items-center justify-between md:h-20">',
    '<a href="#anasayfa" class="inline-flex items-center gap-2.5"><span class="h-2.5 w-2.5 rounded-full bg-accent"></span><span class="font-brand text-xl leading-none tracking-[0.04em]">Laye77ie</span></a>',
    '<div data-header-controls class="hidden min-w-0 items-center gap-3 xl:flex 2xl:gap-6">',
    `<a href="#hakkimda" class="relative whitespace-nowrap text-xs transition-colors 2xl:text-sm text-ink">${escapeHtml(nav.about)}<span class="absolute -bottom-1.5 left-0 right-0 mx-auto h-1 w-1 rounded-full bg-accent"></span></a>`,
    `<a href="#yetenekler" class="relative whitespace-nowrap text-xs transition-colors 2xl:text-sm text-muted hover:text-ink">${escapeHtml(nav.skills)}</a>`,
    `<a href="#projeler" class="relative whitespace-nowrap text-xs transition-colors 2xl:text-sm text-muted hover:text-ink">${escapeHtml(nav.projects)}</a>`,
    `<a href="#sertifikalar" class="relative whitespace-nowrap text-xs transition-colors 2xl:text-sm text-muted hover:text-ink">${escapeHtml(nav.certificates)}</a>`,
    `<a href="#iletisim" class="relative whitespace-nowrap text-xs transition-colors 2xl:text-sm text-muted hover:text-ink">${escapeHtml(nav.contact)}</a>`,
    `<button type="button" data-summary-trigger="desktop" class="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-accent/35 bg-accent/10 px-3 text-xs font-medium text-accent transition-colors">Özet</button>`,
    `<button type="button" aria-label="Dil değiştir / Switch language" class="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium transition-colors">${GLOBE_SVG}EN</button>`,
    `<a href="/admin/" aria-label="${escapeHtml(nav.login)}" data-admin-login="desktop" class="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-line px-3 text-xs text-muted transition-colors xl:px-4 xl:text-sm">${escapeHtml(nav.login)}</a>`,
    `<a href="#iletisim" data-nav-mail="desktop" class="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-line px-3 text-xs transition-colors xl:px-4 xl:text-sm">${escapeHtml(nav.mail)}</a>`,
    "</div>",
    '<div class="flex items-center gap-2 xl:hidden">',
    `<button type="button" data-summary-trigger="mobile" class="inline-flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors">Özet</button>`,
    `<button type="button" aria-label="Dil değiştir / Switch language" class="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium transition-colors">${GLOBE_SVG}EN</button>`,
    '<button type="button" aria-label="Menü" class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5" aria-hidden="true"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg></button>',
    "</div>",
    "</nav></header>",
    '<main class="relative z-10 overflow-x-clip">',
    '<section id="anasayfa" class="mx-auto w-full max-w-[1380px] px-6 md:px-10 relative flex flex-col justify-center pb-14 pt-24 lg:min-h-screen lg:pb-16 lg:pt-28">',
    "<div>",
    '<div class="hero-rise mb-5 flex flex-wrap items-center gap-2.5 text-xs sm:text-sm lg:mb-8 lg:gap-3" style="--hero-dur:0.7s">',
    '<span class="relative flex h-2.5 w-2.5"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60"></span><span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent"></span></span>',
    `<span class="text-muted">${escapeHtml(hero.available)}</span>`,
    '<span class="text-faint">/</span>',
    `<span class="inline-flex items-center gap-1 text-muted"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg> ${escapeHtml(hero.location)}</span>`,
    "</div>",
    `<div class="${showDiscordCard ? "relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between lg:gap-10" : "relative"}">`,
    '<div class="relative min-w-0">',
    '<div aria-hidden="true" class="hero-glow pointer-events-none absolute -left-[6%] top-1/2 -z-10 h-[130%] w-[55%] -translate-y-1/2 rounded-full blur-[60px] md:blur-[100px]" style="background:radial-gradient(circle, var(--color-accent) 0%, transparent 70%)"></div>',
    `<h1 aria-label="${escapeHtml(identity.name)}." class="relative font-display font-semibold tracking-[-0.03em] leading-[0.9] lg:leading-[0.82] ${showDiscordCard ? "text-[clamp(3rem,13.5vw,4.5rem)] lg:text-[clamp(3.25rem,10.5vw,10.5rem)]" : "text-[clamp(3.25rem,14vw,12.5rem)]"}">`,
    `<span aria-hidden="true" class="block overflow-hidden pb-[0.08em]"><span class="block">${renderAnimatedWord("Samet", 0)}</span></span><span class="sr-only"> </span>`,
    `<span aria-hidden="true" class="block overflow-hidden pb-[0.08em]"><span class="block">${renderAnimatedWord("Kaşmer", 5)}<span class="hero-char inline-block text-accent" style="--i:11"><span class="hero-dot inline-block">.</span></span></span></span>`,
    "</h1>",
    "</div>",
    showDiscordCard ? renderDiscordCardShell({ identity, hero, discordPresence }) : "",
    "</div>",
    '<div class="hero-rise mt-8 flex flex-col gap-6 border-t border-line pt-6 lg:mt-12 lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:pt-8" style="--hero-delay:0.15s;--hero-dur:0.7s">',
    '<div class="max-w-xl">',
    `<h2 class="font-display text-lg tracking-tight sm:text-xl md:text-2xl">${escapeHtml(hero.role)}</h2>`,
    `<p class="mt-2.5 text-sm leading-relaxed text-muted sm:text-base md:mt-3 md:text-lg">${escapeHtml(hero.tagline)}</p>`,
    "</div>",
    '<div class="flex flex-wrap items-center gap-3 sm:gap-4">',
    `<a href="#projeler" class="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-canvas transition hover:opacity-90">${escapeHtml(hero.ctaProjects)}<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg></a>`,
    `<a href="#iletisim" class="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium transition hover:bg-surface">${escapeHtml(hero.ctaContact)}</a>`,
    "</div></div></div></section></main>",
  ].join("");
}

/**
 * Yapay zeka arama motorları ve LLM tarayıcıları için standart `llms.txt` üretir.
 * İçerik doğrudan `src/content/*.json` dosyalarından geldiği için admin paneli
 * güncellemelerinde otomatik olarak taze kalır.
 */
export function renderLlmsTxt({ identity, tr, en }) {
  const siteUrl = "https://layellie.dev";
  const lines = [
    `# ${identity.name} (${identity.handle})`,
    "",
    `> ${en.hero.role} (${tr.hero.role}) — ${en.hero.location}. ${en.hero.tagline}`,
    "",
    "## About",
    "",
    ...en.about.paragraphs,
    "",
    "### Key Facts",
    ...en.about.facts.map((f) => `- **${f.label}:** ${f.value}`),
    "",
    "## Skills",
    "",
    "### Focus Areas",
    ...en.skills.focus.map((f) => `- **${f.title}:** ${f.desc} (${f.tags.join(", ")})`),
    "",
    "### Core Technologies",
    ...en.skills.languages.map((l) => `- **${l.name}:** ${l.note}`),
    "",
    "### Additional Tools & Stack",
    ...en.skills.more.map((g) => `- **${g.group}:** ${g.items.map((it) => it.name).join(", ")}`),
    "",
    "## Open-Source Projects",
    "",
    ...en.projects.items.map(
      (p) =>
        `- [${p.name}](${p.github}): ${p.description} (Stack: ${p.stack.join(", ")}; License: ${p.license}; Year: ${p.year})`,
    ),
    "",
    "## Verified Certificates",
    "",
    ...tr.certificates.items.map(
      (c) => `- ${c.title} — ${c.issuer} (${c.skill}, ${c.date})`,
    ),
    "",
    "## Frequently Asked Questions",
    "",
    ...FAQ_CONTENT.en.items.map((item) => `- **${item.q}** ${item.a}`),
    "",
    "## Links",
    "",
    `- [Portfolio](${siteUrl}/): Main portfolio website (Turkish & English)`,
    `- [GitHub](${identity.github}): Open-source repositories and contributions`,
    `- [LinkedIn](${identity.linkedin}): Professional profile`,
    `- [Sitemap](${siteUrl}/sitemap.xml): XML sitemap`,
    "",
  ];
  return `${lines.join("\n")}`;
}

/**
 * Güncel portfolyo içeriğinden Schema.org `@graph` JSON-LD üretir
 * (ProfilePage + Person + Credentials + WebSite + yayınlı açık kaynak projeler).
 */
export function renderStructuredData({ identity, tr, en }, today = new Date().toISOString().slice(0, 10)) {
  const siteUrl = "https://layellie.dev/";
  const personId = `${siteUrl}#person`;
  const websiteId = `${siteUrl}#website`;
  const knowsAbout = [
    ...new Set([
      ...tr.skills.languages.map((l) => l.name),
      ...tr.skills.focus.map((f) => f.title),
    ]),
  ];

  const certsByIssuer = new Map();
  for (const cert of tr.certificates?.items || []) {
    certsByIssuer.set(cert.issuer, (certsByIssuer.get(cert.issuer) || 0) + 1);
  }
  const credentials = [...certsByIssuer.entries()].map(([issuer, count]) => ({
    "@type": "EducationalOccupationalCredential",
    name: `${issuer} (${count} doğrulanmış sertifika)`,
    credentialCategory: "certificate",
    recognizedBy: { "@type": "Organization", name: issuer },
  }));

  const graph = [
    {
      "@type": "ProfilePage",
      "@id": `${siteUrl}#profilepage`,
      url: siteUrl,
      name: `${identity.name} — ${tr.hero.role}`,
      dateModified: today,
      mainEntity: { "@id": personId },
      isPartOf: { "@id": websiteId },
    },
    {
      "@type": "Person",
      "@id": personId,
      name: identity.name,
      alternateName: [identity.handle, "Laye77ie", "Samet Kasmer"],
      url: siteUrl,
      image: `${siteUrl}og.png`,
      jobTitle: tr.hero.role,
      description: tr.hero.tagline,
      homeLocation: {
        "@type": "Place",
        name: "Bursa, Türkiye",
      },
      knowsLanguage: ["tr", "en"],
      alumniOf: [
        { "@type": "CollegeOrUniversity", name: "Kütahya Dumlupınar Üniversitesi" },
        { "@type": "CollegeOrUniversity", name: "Anadolu Üniversitesi" },
      ],
      sameAs: [
        identity.github,
        identity.linkedin,
      ].filter(Boolean),
      knowsAbout,
      ...(credentials.length ? { hasCredential: credentials } : {}),
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: siteUrl,
      name: `${identity.name} — ${tr.hero.role}`,
      inLanguage: ["tr", "en"],
      author: { "@id": personId },
    },
    ...tr.projects.items.map((p) => ({
      "@type": "SoftwareSourceCode",
      name: p.name,
      description: p.description,
      codeRepository: p.github,
      programmingLanguage: p.stack,
      ...(p.license === "MIT"
        ? { license: "https://opensource.org/licenses/MIT" }
        : p.license
          ? { license: p.license }
          : {}),
      ...(p.year ? { datePublished: String(p.year) } : {}),
      author: { "@id": personId },
    })),
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}#faq`,
      mainEntity: FAQ_CONTENT.tr.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    },
  ];

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replaceAll(
    "</script",
    "<\\/script",
  );
}

/**
 * JavaScript çalıştırmayan arama motoru ve AI tarayıcıları (OAI-SearchBot, PerplexityBot vb.)
 * için biyografi, zaman çizelgesi, projeler ve sertifikaları saf HTML olarak sunar.
 */
export function renderNoScriptSummary({ identity, tr }) {
  const projects = (tr.projects?.items || [])
    .map((p) => `<a href="${escapeHtml(p.github)}">${escapeHtml(p.name)}</a>`)
    .join(" · ");
  const certCount = (tr.certificates?.items || []).length;
  return `<noscript><article><h2>${escapeHtml(identity.name)} (${escapeHtml(identity.handle)})</h2><p>${escapeHtml(tr.hero.role)} — ${escapeHtml(tr.hero.location)}. DPÜ Bilgisayar Programcılığı (3.09 GPA), Anadolu Üni. YBS, Data Destek Yazılım Stajyeri. ${certCount} doğrulanmış sertifika.</p><p>Projeler: ${projects}</p><p><a href="${escapeHtml(identity.github)}">GitHub</a> · <a href="${escapeHtml(identity.linkedin)}">LinkedIn</a> · <a href="https://layellie.dev/llms.txt">llms.txt</a></p></article></noscript>`;
}

/**
 * Her build'de güncel `<lastmod>` tarihiyle `sitemap.xml` üretir.
 */
export function renderSitemapXml(today = new Date().toISOString().slice(0, 10)) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    "    <loc>https://layellie.dev/</loc>",
    `    <lastmod>${today}</lastmod>`,
    "    <changefreq>monthly</changefreq>",
    "    <priority>1.0</priority>",
    "  </url>",
    "</urlset>",
    "",
  ].join("\n");
}

/**
 * Public site build'inde:
 * 1) `index.html` içindeki harici `.css` dosyasını `<style>` olarak inline eder (0 render-blocking CSS isteği).
 * 2) İlk ekranın (Navbar + Hero) statik HTML'ini `<div id="root">` içine gömer; böylece FCP ve LCP
 *    JavaScript indirilmesini/çalışmasını beklemeden ilk HTML paketiyle anında boyanır.
 * 3) Güncel portfolyo içeriğinden JSON-LD (`@graph`), `llms.txt` ve `sitemap.xml` dosyalarını otomatik üretir.
 */
export function inlineAndPrerenderShellPlugin() {
  let root = process.cwd();

  return {
    name: "inline-css-and-prerender-shell",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      root = config.root;
    },
    async generateBundle(_options, bundle) {
      const htmlAsset = bundle["index.html"];
      if (!htmlAsset || htmlAsset.type !== "asset") return;

      const contentDir = path.resolve(root, "src", "content");
      const files = {};
      for (const key of CONTENT_KEYS) {
        files[key] = JSON.parse(await readFile(path.join(contentDir, `${key}.json`), "utf8"));
      }
      const { buildContentView } = await import(
        pathToFileURL(path.join(contentDir, "contentView.js")).href
      );
      const view = buildContentView(files, { includeVisual: false });
      const shellHtml = renderInitialShellHtml({
        identity: view.identity,
        tr: view.content.tr,
        discordPresence: view.discordPresence,
      });

      let html = String(htmlAsset.source);

      // Harici stylesheet bağlantısını bulup CSS içeriğini inline <style> olarak göm
      // ve index.html'deki küçük başlangıç <style> bloğunu tek etikette birleştir.
      for (const [fileName, item] of Object.entries(bundle)) {
        if (item.type === "asset" && fileName.endsWith(".css")) {
          const cssHref = `/${fileName.replaceAll("\\", "/")}`;
          const linkRegex = new RegExp(
            `<link\\s+[^>]*rel=["']stylesheet["'][^>]*href=["']${cssHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
            "i",
          );
          if (linkRegex.test(html)) {
            const cssText = String(item.source).replaceAll("</style", "<\\/style");
            html = html.replace("<style>html{background:#08080a;color-scheme:dark}</style>", "");
            html = html.replace(linkRegex, `<style>html{background:#08080a;color-scheme:dark}${cssText}</style>`);
            delete bundle[fileName];
          }
        }
      }

      // Hero Discord kartı aktifse LCP banner görselini <head> başında (inline CSS ve fontlardan önce) ön-yükle.
      const bannerPath = view.discordPresence?.enabled ? view.discordPresence.bannerPath : "";
      if (bannerPath) {
        const imageSrcSet =
          bannerPath === "/media/profile/banner/layellie-banner.webp"
            ? ' imagesrcset="/media/profile/banner/layellie-banner-1x.webp 1x, /media/profile/banner/layellie-banner.webp 1.25x"'
            : "";
        const preloadTag = `<link rel="preload" as="image" href="${escapeHtml(bannerPath)}"${imageSrcSet} fetchpriority="high" />`;
        const viewportTag = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';
        html = html.includes(viewportTag)
          ? html.replace(viewportTag, `${viewportTag}\n    ${preloadTag}`)
          : html.replace("</head>", `    ${preloadTag}\n  </head>`);
      }

      // Yapısal veriyi (JSON-LD) güncel portfolyo içeriğiyle (@graph) değiştir.
      const structuredDataJson = renderStructuredData({
        identity: view.identity,
        tr: view.content.tr,
        en: view.content.en,
      });
      html = html.replace(
        /<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i,
        `<script type="application/ld+json">${structuredDataJson}</script>`,
      );

      // <div id="root"></div> içine ilk ekran HTML'ini + JS-siz tarayıcılar için <noscript> özetini yerleştir.
      const noScriptHtml = renderNoScriptSummary({
        identity: view.identity,
        tr: view.content.tr,
      });
      html = html.replace(
        '<div id="root"></div>',
        `<div id="root">${shellHtml}</div>\n    ${noScriptHtml}`,
      );

      // Vite'ın <head>'e eklediği module script etiketini </body> öncesine taşı
      // ve açık `defer` ekleyerek statik render-blocking denetleyicilerini de memnun et.
      const movedScripts = [];
      html = html.replace(
        /\s*<script\s+type=["']module["'][^>]*src=["'][^"']+["'][^>]*><\/script>/gi,
        (match) => {
          const normalized = /\b(?:defer|async)\b/i.test(match)
            ? match.trim()
            : match.trim().replace("<script ", "<script defer ");
          movedScripts.push(normalized);
          return "";
        },
      );
      if (movedScripts.length) {
        html = html.replace(
          "</body>",
          `    ${movedScripts.join("\n    ")}\n  </body>`,
        );
      }

      // Üretim HTML'indeki yorum satırlarını ve etiketler arası gereksiz girintileri temizle.
      html = html
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/>\r?\n\s+</g, "><");

      htmlAsset.source = html;

      this.emitFile({
        type: "asset",
        fileName: "llms.txt",
        source: renderLlmsTxt({
          identity: view.identity,
          tr: view.content.tr,
          en: view.content.en,
        }),
      });

      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: renderSitemapXml(),
      });
    },
  };
}
