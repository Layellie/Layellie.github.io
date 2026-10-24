import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

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

/**
 * Hero + üst bar için statik başlangıç HTML'i üretir.
 * Tarayıcı JS'i indirmeden ilk boyamada (FCP + LCP) "Samet Kaşmer." başlığını
 * ve alt metinleri çizer; React yüklendiğinde #root'u devralır.
 */
export function renderInitialShellHtml({ identity, tr }) {
  const hero = tr.hero;
  const nav = tr.nav;
  return [
    '<div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0" style="background:radial-gradient(70% 55% at 50% -10%, rgba(214,255,63,0.07), transparent 70%)"></div>',
    '<header class="fixed inset-x-0 top-0 z-50 border-b border-transparent transition-all duration-500">',
    '<nav class="mx-auto w-full max-w-[1380px] px-6 md:px-10 flex h-16 items-center justify-between md:h-20">',
    '<a href="#anasayfa" class="inline-flex items-center gap-2.5"><span class="h-2.5 w-2.5 rounded-full bg-accent"></span><span class="font-display text-base font-medium tracking-tight">Laye77ie</span></a>',
    '<div data-header-controls class="hidden min-w-0 items-center gap-3 xl:flex 2xl:gap-6">',
    `<a href="#hakkimda" class="relative whitespace-nowrap text-xs transition-colors 2xl:text-sm text-ink">${escapeHtml(nav.about)}<span class="absolute -bottom-1.5 left-0 right-0 mx-auto h-1 w-1 rounded-full bg-accent"></span></a>`,
    `<a href="#yetenekler" class="relative whitespace-nowrap text-xs transition-colors 2xl:text-sm text-muted hover:text-ink">${escapeHtml(nav.skills)}</a>`,
    `<a href="#projeler" class="relative whitespace-nowrap text-xs transition-colors 2xl:text-sm text-muted hover:text-ink">${escapeHtml(nav.projects)}</a>`,
    `<a href="#sertifikalar" class="relative whitespace-nowrap text-xs transition-colors 2xl:text-sm text-muted hover:text-ink">${escapeHtml(nav.certificates)}</a>`,
    `<a href="#iletisim" class="relative whitespace-nowrap text-xs transition-colors 2xl:text-sm text-muted hover:text-ink">${escapeHtml(nav.contact)}</a>`,
    '<button type="button" aria-label="Dil değiştir / Switch language" class="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium transition-colors">EN</button>',
    `<a href="/admin/" aria-label="${escapeHtml(nav.login)}" data-admin-login="desktop" class="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-line px-3 text-xs text-muted transition-colors xl:px-4 xl:text-sm">${escapeHtml(nav.login)}</a>`,
    `<a href="mailto:${escapeHtml(identity.email)}" data-nav-mail="desktop" class="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-line px-3 text-xs transition-colors xl:px-4 xl:text-sm">${escapeHtml(nav.mail)}</a>`,
    "</div>",
    '<div class="flex items-center gap-2 xl:hidden">',
    '<button type="button" aria-label="Dil değiştir / Switch language" class="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium transition-colors">EN</button>',
    '<button type="button" aria-label="Menü" class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5" aria-hidden="true"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg></button>',
    "</div>",
    "</nav></header>",
    '<main class="relative z-10">',
    '<section id="anasayfa" class="mx-auto w-full max-w-[1380px] px-6 md:px-10 relative flex min-h-screen flex-col justify-center pb-16 pt-28">',
    "<div>",
    '<div class="hero-rise mb-8 flex flex-wrap items-center gap-3 text-sm" style="--hero-dur:0.7s">',
    '<span class="relative flex h-2.5 w-2.5"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60"></span><span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent"></span></span>',
    `<span class="text-muted">${escapeHtml(hero.available)}</span>`,
    '<span class="text-faint">/</span>',
    `<span class="inline-flex items-center gap-1 text-muted"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg> ${escapeHtml(hero.location)}</span>`,
    "</div>",
    '<div class="relative">',
    '<div aria-hidden="true" class="hero-glow pointer-events-none absolute -left-[12%] top-1/2 -z-10 h-[160%] w-[70%] -translate-y-1/2 rounded-full" style="background:radial-gradient(closest-side, rgba(214,255,63,0.55) 0%, rgba(214,255,63,0.18) 45%, rgba(214,255,63,0.04) 72%, transparent 100%)"></div>',
    `<h1 aria-label="${escapeHtml(identity.name)}." class="relative font-display text-[clamp(3.25rem,14vw,12.5rem)] font-semibold leading-[0.82] tracking-[-0.03em]">`,
    `<span aria-hidden="true" class="block overflow-hidden pb-[0.08em]"><span class="block">${renderAnimatedWord("Samet", 0)}</span></span>`,
    `<span aria-hidden="true" class="block overflow-hidden pb-[0.08em]"><span class="block">${renderAnimatedWord("Kaşmer", 5)}<span class="hero-char inline-block text-accent" style="--i:11"><span class="hero-dot inline-block">.</span></span></span></span>`,
    "</h1>",
    "</div>",
    '<div class="hero-rise mt-12 flex flex-col gap-8 border-t border-line pt-8 lg:flex-row lg:items-end lg:justify-between" style="--hero-delay:0.15s;--hero-dur:0.7s">',
    '<div class="max-w-xl">',
    `<p class="font-display text-xl tracking-tight md:text-2xl">${escapeHtml(hero.role)}</p>`,
    `<p class="mt-3 leading-relaxed text-muted md:text-lg">${escapeHtml(hero.tagline)}</p>`,
    "</div>",
    '<div class="flex flex-wrap items-center gap-4">',
    `<a href="#projeler" class="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-canvas transition hover:opacity-90">${escapeHtml(hero.ctaProjects)}<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg></a>`,
    `<a href="#iletisim" class="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium transition hover:bg-surface">${escapeHtml(hero.ctaContact)}</a>`,
    "</div></div></div></section></main>",
  ].join("");
}

/**
 * Public site build'inde:
 * 1) `index.html` içindeki harici `.css` dosyasını `<style>` olarak inline eder (0 render-blocking CSS isteği).
 * 2) İlk ekranın (Navbar + Hero) statik HTML'ini `<div id="root">` içine gömer; böylece FCP ve LCP
 *    JavaScript indirilmesini/çalışmasını beklemeden ilk HTML paketiyle anında boyanır.
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
      });

      let html = String(htmlAsset.source);

      // Harici stylesheet bağlantısını bulup CSS içeriğini inline <style> olarak göm.
      for (const [fileName, item] of Object.entries(bundle)) {
        if (item.type === "asset" && fileName.endsWith(".css")) {
          const cssHref = `/${fileName.replaceAll("\\", "/")}`;
          const linkRegex = new RegExp(
            `<link\\s+[^>]*rel=["']stylesheet["'][^>]*href=["']${cssHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
            "i",
          );
          if (linkRegex.test(html)) {
            const cssText = String(item.source).replaceAll("</style", "<\\/style");
            html = html.replace(linkRegex, `<style>${cssText}</style>`);
            delete bundle[fileName];
          }
        }
      }

      // <div id="root"></div> içine ilk ekran HTML'ini yerleştir.
      html = html.replace(
        '<div id="root"></div>',
        `<div id="root">${shellHtml}</div>`,
      );

      htmlAsset.source = html;
    },
  };
}
