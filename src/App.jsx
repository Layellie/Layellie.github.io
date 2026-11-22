import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  createContext,
  useContext,
  lazy,
  Suspense,
  startTransition,
} from "react";
import { selectMoreGithubRepositories } from "./content/githubUrls.js";
// framer-motion kullanılmaz: tüm animasyonlar saf CSS + IntersectionObserver ile
// çalıştırılarak ~120 KB kütüphane maliyeti ve ana iş parçacığı yükü kaldırılmıştır.
import {
  ArrowUpRight,
  ArrowDown,
  Github,
  Mail,
  Copy,
  Check,
  MapPin,
  Gauge,
  Cpu,
  Hash,
  Code2,
  ScanText,
  MemoryStick,
  Gamepad2,
  Lock,
  Search,
  Menu,
  X,
  ClipboardList,
  Link2,
  Image as ImageIcon,
  Award,
  BadgeCheck,
  Calendar,
  Languages,
  FileText,
  Linkedin,
  LogIn,
  Sparkles,
  Star,
  FolderGit2,
  Users,
  Globe,
  ChevronLeft,
  ChevronRight,
  Eye,
  Monitor,
  BellRing,
} from "lucide-react";
import { SafeIcon } from "./components/project-visuals/iconRegistry.jsx";
// Public site: içerik build sırasında doğrulanıp hazır JSON olarak gömülür (bkz. build/precomputed-content.js),
// bu yüzden Zod ve çalışma zamanı şema ayrıştırması ilk JS paketine girmez.
import { CONTENT, IDENTITY, portfolioFiles, selectSkillsTicker } from "./content/publicContent.js";
import { analyticsOptedOut, recordPortfolioVisit, setAnalyticsOptOut } from "./analytics/visitor.js";

// Proje görselleri (Zod şemalarıyla doğrulanan MockupRenderer) ekran dışında olduğundan ayrı chunk'ta yüklenir.
const ProjectVisual = lazy(() => import("./components/project-visuals/ProjectVisual.jsx"));

// Tarayıcı boştayken çalıştır (ilk boyama / etkileşimi bloklamasın).
function whenIdle(callback, timeout = 2500) {
  if (typeof window === "undefined") return () => {};
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 200);
  return () => window.clearTimeout(id);
}

// Verilen öğe görünüme yaklaşana kadar `false`, sonra kalıcı olarak `true` döner.
function useNearViewport(ref, rootMargin = "600px 0px") {
  const [near, setNear] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (near || !ref.current) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [near, ref, rootMargin]);
  return near;
}

function DeferredProjectVisual(props) {
  const { reference, legacyVisuals = {} } = props;
  const ref = useRef(null);
  const near = useNearViewport(ref, "1200px 0px");

  // Bilinen custom legacy görseller doğrudan App.jsx içinde tanımlı olduğu için
  // ayrı chunk beklemeksizin hemen render edilir.
  if (reference?.mode === "custom" && legacyVisuals[reference.componentId]) {
    const Legacy = legacyVisuals[reference.componentId];
    return <Legacy />;
  }

  const placeholder = (
    <div aria-hidden className="aspect-[4/3] w-full rounded-2xl border border-line bg-elevated/60" />
  );
  return (
    <div ref={ref}>
      {near ? (
        <Suspense fallback={placeholder}>
          <ProjectVisual {...props} />
        </Suspense>
      ) : (
        placeholder
      )}
    </div>
  );
}

const SECTION_IDS = ["hakkimda", "yetenekler", "projeler", "sertifikalar", "iletisim"];
const NAV_KEYS = [
  { key: "about", href: "#hakkimda" },
  { key: "skills", href: "#yetenekler" },
  { key: "projects", href: "#projeler" },
  { key: "certificates", href: "#sertifikalar" },
  { key: "contact", href: "#iletisim" },
];

export const SKILL_WIDTH_CLASSES = Object.freeze({ normal: "", wide: "lg:col-span-2" });
export const skillWidthClass = (width) => SKILL_WIDTH_CLASSES[width] || "";

const EASE = [0.16, 1, 0.3, 1];
const WRAP = "mx-auto w-full max-w-[1380px] px-6 md:px-10";

// Shared lime hover + keyboard-focus indicator for the primary nav actions
// (language, email, login). Reuses the existing login control's approach so the
// three controls stay visually identical. Tailwind v4 only applies `hover:` on
// devices that truly support hover, so touch devices never get a stuck highlight.
const NAV_ACTION_INDICATOR =
  "hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

// About statement highlight tones → Tailwind colour classes. Mirrors the
// canonical `statement[].tone` model so the admin editor and the public site
// stay in sync. `normal` inherits the paragraph's ink colour.
const STATEMENT_TONE_CLASS = { normal: "", muted: "text-muted", accent: "text-accent" };

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/* ================================================================== */
/*  Dil yönetimi (context)                                             */
/* ================================================================== */
const LangCtx = createContext(null);
const useLang = () => useContext(LangCtx);

/* ================================================================== */
/*  Tekrarlayan SVG ikonları için tek sprite (DOM node tasarrufu)      */
/* ================================================================== */
function IconSprite() {
  return (
    <svg aria-hidden="true" style={{ display: "none" }}>
      <symbol id="ic-badge-check" viewBox="0 0 24 24">
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
        <path d="m9 12 2 2 4-4" />
      </symbol>
      <symbol id="ic-award" viewBox="0 0 24 24">
        <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" />
        <circle cx="12" cy="8" r="6" />
      </symbol>
      <symbol id="ic-calendar" viewBox="0 0 24 24">
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M3 10h18" />
      </symbol>
      <symbol id="ic-hash" viewBox="0 0 24 24">
        <line x1="4" x2="20" y1="9" y2="9" />
        <line x1="4" x2="20" y1="15" y2="15" />
        <line x1="10" x2="8" y1="3" y2="21" />
        <line x1="16" x2="14" y1="3" y2="21" />
      </symbol>
      <symbol id="ic-file-text" viewBox="0 0 24 24">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
      </symbol>
      <symbol id="ic-arrow-up-right" viewBox="0 0 24 24">
        <path d="M7 7h10v10" />
        <path d="M7 17 17 7" />
      </symbol>
      <symbol id="ic-check" viewBox="0 0 24 24">
        <path d="M20 6 9 17l-5-5" />
      </symbol>
      <symbol id="ic-github" viewBox="0 0 24 24">
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
        <path d="M9 18c-4.51 2-5-2-7-2" />
      </symbol>
      <symbol id="ic-star" viewBox="0 0 24 24">
        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
      </symbol>
      <symbol id="ic-folder-git-2" viewBox="0 0 24 24">
        <path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5" />
        <circle cx="13" cy="12" r="2" />
        <path d="M18 19c-2.8 0-5-2.2-5-5v8" />
        <circle cx="20" cy="19" r="2" />
      </symbol>
    </svg>
  );
}

function SpriteIcon({ id, className = "h-4 w-4" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <use href={`#ic-${id}`} />
    </svg>
  );
}

// Spam botlarına karşı e-postayı DOM'da plaintext (@) bırakmadan göster / aç.
function openMailto(email) {
  if (typeof window === "undefined" || !email) return;
  window.location.href = ["mail", "to:", email].join("");
}

function ObfuscatedEmail({ email, className = "" }) {
  const [user, domain] = String(email || "").split("@");
  if (!domain) return <span className={className}>{email}</span>;
  return (
    <span className={className}>
      {user}
      <span className="email-at" aria-hidden="true" />
      {domain}
    </span>
  );
}

/* ================================================================== */
/*  Yardımcı bileşenler ve hook'lar                                    */
/* ================================================================== */
function Reveal({ children, className = "", delay = 0, y = 28, x = 0, once = false }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === "undefined"
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin: "-80px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "is-inview " : ""}${className}`}
      style={{
        "--rx": `${x}px`,
        "--ry": `${y}px`,
        "--rdelay": `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}


/* ================================================================== */
/*  İnteraktif efektler: 3D Tilt, Manyetik Buton & Scramble Text       */
/* ================================================================== */
const SCRAMBLE_GLYPHS = "01#<>[]/\\_*^!~{}=";

function useScrambleText(originalText) {
  const [displayText, setDisplayText] = useState(originalText);
  const animatingRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setDisplayText(originalText);
    animatingRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [originalText]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const trigger = useCallback(() => {
    if (animatingRef.current || !originalText) return;
    animatingRef.current = true;

    let frame = 0;
    // 35ms per tick:
    // Lead phase (full chaos/scramble across all characters): 8 frames (~280ms)
    // Resolve phase (left-to-right deobfuscate): 16 to 24 frames (~560ms - 840ms)
    // Total duration: ~0.9s to 1.1s (visible, cinematic, smooth)
    const leadFrames = 8;
    const resolveFrames = Math.max(16, Math.min(24, Math.round(originalText.length * 1.2)));
    const totalFrames = leadFrames + resolveFrames;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      frame += 1;

      const progress = frame <= leadFrames
        ? 0
        : (frame - leadFrames) / resolveFrames;

      const resolvedCount = Math.floor(progress * originalText.length);

      const nextText = originalText
        .split("")
        .map((char, index) => {
          // Keep spaces, linebreaks, hyphens, and punctuation fixed so line wrapping never shifts
          if (char === " " || char === "\n" || char === "-" || char === "_" || char === "." || char === "(" || char === ")" || char === "/") {
            return char;
          }
          if (index < resolvedCount) {
            return originalText[index];
          }
          return SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
        })
        .join("");

      setDisplayText(nextText);

      if (frame >= totalFrames) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setDisplayText(originalText);
        animatingRef.current = false;
      }
    }, 35);
  }, [originalText]);

  return { displayText, trigger };
}

function ScrambleText({ text, className = "" }) {
  const { displayText, trigger } = useScrambleText(text);
  return (
    <span
      onMouseEnter={trigger}
      onPointerEnter={trigger}
      className={`scramble-lock cursor-default select-none ${className}`}
    >
      <span className="scramble-base" aria-hidden="true" data-text={text} />
      <span className="scramble-text">
        {displayText}
      </span>
    </span>
  );
}

function useTilt(maxTilt = 6) {
  const ref = useRef(null);

  const onPointerMove = useCallback((e) => {
    const el = ref.current;
    if (
      !el ||
      (typeof window !== "undefined" &&
        (window.matchMedia("(pointer: coarse)").matches ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches))
    ) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--tilt-x", `${(-y * maxTilt).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(x * maxTilt).toFixed(2)}deg`);
    el.style.setProperty("--glare-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--glare-y", `${((y + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--glare-opacity", "1");
  }, [maxTilt]);

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
    el.style.setProperty("--glare-opacity", "0");
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}

function TiltCard({ children, className = "", maxTilt = 6, ...rest }) {
  const { ref, onPointerMove, onPointerLeave } = useTilt(maxTilt);
  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`tilt-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

function useMagnetic(strength = 0.32) {
  const ref = useRef(null);

  const onPointerMove = useCallback((e) => {
    const el = ref.current;
    if (
      !el ||
      (typeof window !== "undefined" &&
        (window.matchMedia("(pointer: coarse)").matches ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches))
    ) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    const maxPull = 15;
    const pullX = Math.max(-maxPull, Math.min(maxPull, dx * strength));
    const pullY = Math.max(-maxPull, Math.min(maxPull, dy * strength));
    el.style.transform = `translate3d(${pullX.toFixed(1)}px, ${pullY.toFixed(1)}px, 0)`;
  }, [strength]);

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translate3d(0, 0, 0)";
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}

function MagneticButton({ children, className = "", href, onClick, ...rest }) {
  const { ref, onPointerMove, onPointerLeave } = useMagnetic(0.32);
  const Tag = href ? "a" : "button";

  return (
    <Tag
      ref={ref}
      href={href}
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`magnetic-item inline-flex ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

function SectionHeader({ index, title, kicker }) {
  return (
    <div className="flex items-end justify-between gap-6 border-b border-line pb-6">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-sm text-accent">({index})</span>
        <h2 className="font-display text-[clamp(2rem,5.5vw,3.75rem)] font-semibold leading-none tracking-tight">
          <ScrambleText text={title} />
        </h2>
      </div>
      {kicker && (
        <span className="hidden max-w-[22ch] text-right text-sm leading-snug text-muted sm:block">
          {kicker}
        </span>
      )}
    </div>
  );
}

// Kaydırma ilerleme çubuğu: framer-motion'ın scroll/spring hook'ları yerine
// rAF ile throttle edilmiş hafif bir dinleyici (ilk JS paketini küçültür).
function ScrollProgress() {
  const ref = useRef(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const y = window.scrollY;
      if (y <= 0) {
        el.style.transform = "scaleX(0)";
        return;
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      el.style.transform = `scaleX(${progress})`;
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      style={{ transform: "scaleX(0)" }}
      className="fixed inset-x-0 top-0 z-[80] h-[2px] origin-left bg-accent will-change-transform"
    />
  );
}

// Scroll-spy: görünürdeki bölümün id'sini döndürür
function useScrollSpy(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

// GitHub canlı verisi: istatistikler + repo listesi (localStorage önbellek + canlı fetch)
const GITHUB_CACHE_KEY = "layellie_github_stats_cache_v1";
const GITHUB_CACHE_TTL = 30 * 60 * 1000; // 30 dakika

function getCachedGithubData(fallback) {
  if (typeof window === "undefined") return { stats: fallback, repos: [] };
  try {
    const raw = window.localStorage.getItem(GITHUB_CACHE_KEY);
    if (!raw) return { stats: fallback, repos: [] };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.stats) {
      return {
        stats: {
          repos: typeof parsed.stats.repos === "number" ? parsed.stats.repos : fallback.repos,
          stars: typeof parsed.stats.stars === "number" ? parsed.stats.stars : fallback.stars,
          followers: typeof parsed.stats.followers === "number" ? parsed.stats.followers : fallback.followers,
        },
        repos: Array.isArray(parsed.repos) ? parsed.repos : [],
        timestamp: typeof parsed.timestamp === "number" ? parsed.timestamp : 0,
      };
    }
  } catch {
    /* localStorage erişim/ayrıştırma hatası → yok say */
  }
  return { stats: fallback, repos: [] };
}

function useGithub(user, fallback, enabled = true) {
  const [data, setData] = useState(() => getCachedGithubData(fallback));
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    const cancelIdle = whenIdle(async () => {
      const cached = getCachedGithubData(fallback);
      // Önbellek tazeyse (30 dk dolmadıysa) gereksiz GitHub API istek kotası harcama
      if (cached.timestamp && Date.now() - cached.timestamp < GITHUB_CACHE_TTL && cached.repos.length > 0) {
        return;
      }
      try {
        const [reposRes, userRes] = await Promise.all([
          fetch(`https://api.github.com/users/${user}/repos?per_page=100&sort=updated`),
          fetch(`https://api.github.com/users/${user}`),
        ]);
        if (!reposRes.ok || !userRes.ok) return;
        const repos = await reposRes.json();
        const u = await userRes.json();
        const list = Array.isArray(repos) ? repos : [];
        const stars = list.reduce((s, r) => s + (r.stargazers_count || 0), 0);
        if (active) {
          const freshData = {
            stats: {
              repos: u.public_repos ?? fallback.repos,
              stars: list.length ? stars : fallback.stars,
              followers: u.followers ?? fallback.followers,
            },
            repos: list,
          };
          setData(freshData);
          try {
            window.localStorage.setItem(
              GITHUB_CACHE_KEY,
              JSON.stringify({ ...freshData, timestamp: Date.now() })
            );
          } catch {
            /* kota veya gizlilik kısıtı */
          }
        }
      } catch {
        /* ağ hatası → yedek veya önbellekte kal */
      }
    }, 1500);
    return () => {
      active = false;
      cancelIdle();
    };
  }, [user, fallback, enabled]);
  return data;
}

/* ================================================================== */
/*  Navigasyon + dil değiştirici + mobil menü                          */
/* ================================================================== */
function LangSwitch({ className = "" }) {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === "tr" ? "en" : "tr")}
      aria-label="Dil değiştir / Switch language"
      className={`inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium transition-colors ${NAV_ACTION_INDICATOR} ${className}`}
    >
      <Globe className="h-3.5 w-3.5" />
      {lang === "tr" ? "EN" : "TR"}
    </button>
  );
}

function Navbar() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useScrollSpy(SECTION_IDS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-line bg-canvas/90 backdrop-blur-sm"
          : "border-b border-transparent"
      }`}
    >
      <nav className={`${WRAP} flex h-16 items-center justify-between md:h-20`}>
        <a href="#anasayfa" className="inline-flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-display text-base font-medium tracking-tight">
            Laye77ie
          </span>
        </a>

        <div data-header-controls className="hidden min-w-0 items-center gap-3 xl:flex 2xl:gap-6">
          {NAV_KEYS.map((n) => {
            const isActive = active === n.href.slice(1);
            return (
              <a
                key={n.href}
                href={n.href}
                className={`relative whitespace-nowrap text-xs transition-colors 2xl:text-sm ${
                  isActive ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {t.nav[n.key]}
                {isActive && (
                  <span
                    className="absolute -bottom-1.5 left-0 right-0 mx-auto h-1 w-1 rounded-full bg-accent"
                  />
                )}
              </a>
            );
          })}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-cmdk"))}
            aria-label={t.cmd.placeholder}
            className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface 2xl:inline-flex"
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="font-mono text-[10px] tracking-wide">
              {META_LABEL} K
            </kbd>
          </button>
          <LangSwitch />
          <a
            href="/admin/"
            aria-label={t.nav.login}
            data-admin-login="desktop"
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-line px-3 text-xs text-muted transition-colors ${NAV_ACTION_INDICATOR} xl:px-4 xl:text-sm`}
          >
            <LogIn className="h-3.5 w-3.5" /> {t.nav.login}
          </a>
          <a
            href="#iletisim"
            onClick={(e) => {
              e.preventDefault();
              openMailto(IDENTITY.email);
            }}
            data-nav-mail="desktop"
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-line px-3 text-xs transition-colors ${NAV_ACTION_INDICATOR} xl:px-4 xl:text-sm`}
          >
            <Mail className="h-3.5 w-3.5" /> {t.nav.mail}
          </a>
        </div>

        <div className="flex items-center gap-2 xl:hidden">
          <LangSwitch />
          <button
            onClick={() => setOpen(true)}
            aria-label="Menü"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>
      </header>

      {open && (
        <div
          data-mobile-menu
          className="overlay-fade fixed inset-0 z-[70] flex flex-col bg-canvas xl:hidden"
        >
          <div className={`${WRAP} flex h-16 items-center justify-between`}>
            <span className="font-display font-medium">Laye77ie</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Kapat"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className={`${WRAP} flex flex-1 flex-col justify-center gap-2`}>
            {NAV_KEYS.map((n, i) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                style={{ "--nav-delay": `${0.1 + i * 0.06}s` }}
                className="mobile-nav-item font-display text-4xl tracking-tight text-ink/90 transition-colors hover:text-accent"
              >
                {t.nav[n.key]}
              </a>
            ))}
            <a
              href="/admin/"
              aria-label={t.nav.login}
              data-admin-login="mobile"
              onClick={() => setOpen(false)}
              style={{ "--nav-delay": `${0.1 + NAV_KEYS.length * 0.06}s` }}
              className="mobile-nav-item mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line px-5 py-3 text-base font-medium text-ink transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-inset"
            >
              <LogIn className="h-4 w-4" /> {t.nav.login}
            </a>
            <a
              href="#iletisim"
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                openMailto(IDENTITY.email);
              }}
              style={{ "--nav-delay": `${0.16 + NAV_KEYS.length * 0.06}s` }}
              className="mobile-nav-item mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-base text-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-inset"
            >
              <Mail className="h-4 w-4" /> <ObfuscatedEmail email={IDENTITY.email} />
            </a>
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  HERO                                                               */
/* ================================================================== */
// Hero girişi saf CSS keyframes ile animasyonlanır (bkz. index.css .hero-*):
// framer-motion yüklenmeden ilk boyamada görünür, LCP'yi JS'e bağlı bırakmaz.
// İsmi harf harf, maskeli yükselme efektiyle render eder.
function AnimatedWord({ text, offset = 0 }) {
  return text.split("").map((ch, i) => (
    <span key={i} className="hero-char inline-block" style={{ "--i": offset + i }}>
      {ch}
    </span>
  ));
}

function Hero() {
  const { t } = useLang();
  const ref = useRef(null);
  const parallaxRef = useRef(null);

  // Hafif parallax: bölüm yukarı çıkarken içerik 130px kayar ve solar (rAF + passive scroll).
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const section = ref.current;
      const inner = parallaxRef.current;
      if (!section || !inner) return;
      const progress = Math.min(1, Math.max(0, window.scrollY / (section.offsetHeight || 1)));
      inner.style.transform = `translate3d(0, ${(progress * 130).toFixed(1)}px, 0)`;
      inner.style.opacity = String(Math.max(0, 1 - progress / 0.85));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      id="anasayfa"
      ref={ref}
      className={`${WRAP} relative flex min-h-screen flex-col justify-center pb-16 pt-28`}
    >
      <div ref={parallaxRef}>
        <div
          className="hero-rise mb-8 flex flex-wrap items-center gap-3 text-sm"
          style={{ "--hero-dur": "0.7s" }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <span className="text-muted">{t.hero.available}</span>
          <span className="text-faint">/</span>
          <span className="inline-flex items-center gap-1 text-muted">
            <MapPin className="h-3.5 w-3.5" /> {t.hero.location}
          </span>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="hero-glow pointer-events-none absolute -left-[6%] top-1/2 -z-10 h-[130%] w-[55%] -translate-y-1/2 rounded-full blur-[60px] md:blur-[100px]"
            style={{
              background:
                "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
            }}
          />
          <h1
            aria-label={`${IDENTITY.name}.`}
            className="relative font-display text-[clamp(3.25rem,14vw,12.5rem)] font-semibold leading-[0.82] tracking-[-0.03em]"
          >
            <span aria-hidden className="block overflow-hidden pb-[0.08em]">
              <span className="block">
                <AnimatedWord text="Samet" />
              </span>
            </span>
            <span className="sr-only"> </span>
            <span aria-hidden className="block overflow-hidden pb-[0.08em]">
              <span className="block">
                <AnimatedWord text="Kaşmer" offset={5} />
                <span className="hero-char inline-block text-accent" style={{ "--i": 11 }}>
                  <span className="hero-dot inline-block">.</span>
                </span>
              </span>
            </span>
          </h1>
        </div>

        <div
          className="hero-rise mt-12 flex flex-col gap-8 border-t border-line pt-8 lg:flex-row lg:items-end lg:justify-between"
          style={{ "--hero-delay": "0.15s", "--hero-dur": "0.7s" }}
        >
          <div className="max-w-xl">
            <h2 className="font-display text-xl tracking-tight md:text-2xl">
              {t.hero.role}
            </h2>
            <p className="mt-3 leading-relaxed text-muted md:text-lg">
              {t.hero.tagline}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <MagneticButton
              href="#projeler"
              className="group items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-canvas transition hover:opacity-90"
            >
              {t.hero.ctaProjects}
              <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
            </MagneticButton>
            <MagneticButton
              href="#iletisim"
              className="items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium transition hover:bg-surface"
            >
              {t.hero.ctaContact}
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  Kayan şerit                                                        */
/* ================================================================== */
function Marquee() {
  const { t } = useLang();
  const items = useMemo(() => selectSkillsTicker(t.skills), [t.skills]);
  if (!items.length) return null;
  return (
    <div role="region" className="relative overflow-hidden border-y border-line py-5" aria-label={t.skills.title}>
      <div className="flex w-max items-center gap-10 motion-reduce:w-auto motion-reduce:flex-wrap motion-reduce:justify-center">
        <div className="flex w-max animate-marquee items-center gap-10 will-change-transform motion-reduce:contents motion-reduce:animate-none">
          {items.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-10 font-display text-lg uppercase tracking-wide text-muted after:text-accent after:content-['✦']"
            >
              {item.label}
            </span>
          ))}
        </div>
        <div className="flex w-max animate-marquee items-center gap-10 will-change:hidden" aria-hidden="true">
          {items.map((item) => (
            <span
              key={`copy-${item.id}`}
              className="inline-flex items-center gap-10 font-display text-lg uppercase tracking-wide text-muted after:text-accent after:content-['✦']"
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  HAKKIMDA                                                           */
/* ================================================================== */
const TIMELINE = {
  tr: {
    heading: "Deneyim, Eğitim & Sertifika Yolculuğu",
    items: [
      {
        period: "2026 — Devam",
        tag: "Lisans",
        title: "Anadolu Üniversitesi AÖF · Yönetim Bilişim Sistemleri",
        detail: "DGS ile geçiş. Yazılım mühendisliği pratiği ile yönetim bilişim sistemleri lisans eğitimi.",
        active: true,
      },
      {
        period: "Tem – Eki 2026",
        tag: "Sertifika",
        title: "Kodluyoruz & IBM SkillsBuild · AI4Future & Siber Güvenlik",
        detail: "AI4Future (İleri Seviye), CyberStart 2.0, Siber Güvenlik ve Kurumsal Tasarım Odaklı Düşünme dahil 5 uluslararası sertifika.",
      },
      {
        period: "Tem 2026",
        tag: "Deneyim · Staj",
        title: "Data Destek Yazılım Hizmetleri A.Ş. · Yazılım Stajyeri",
        detail: "Bursa (Ofiste, 1 ay). Ön uç geliştirme ve nesne yönelimli programlama (OOP) üzerine pratik geliştirme deneyimi.",
      },
      {
        period: "May – Tem 2026",
        tag: "Sertifika",
        title: "BTK Akademi · Yazılım, Veri Tabanı & Yapay Zeka",
        detail: "C#, C++, OOP, Veri Tabanına Giriş, Git & GitHub, Yapay Zeka ve Anthropic Claude alanlarında 9 doğrulanmış sertifika.",
      },
      {
        period: "2026",
        tag: "Mezuniyet",
        title: "Kütahya Dumlupınar Üniversitesi · Bilgisayar Programcılığı",
        detail: "Teknik Bilimler MYO'dan 3.09 / 4.00 genel not ortalamasıyla mezuniyet.",
      },
      {
        period: "2024",
        tag: "Önlisans",
        title: "Kütahya Dumlupınar Üniversitesi · Bilgisayar Programcılığı Başlangıcı",
        detail: "C#, C++ ve SQL ile masaüstü, veri tabanı ve sistem seviyesi yazılım geliştirme temelleri.",
      },
    ],
  },
  en: {
    heading: "Experience, Education & Certification Timeline",
    items: [
      {
        period: "2026 — Present",
        tag: "Bachelor's",
        title: "Anadolu University OEF · Management Information Systems",
        detail: "Transferred via DGS. Pursuing a B.S. degree combining software development with information systems.",
        active: true,
      },
      {
        period: "Jul – Oct 2026",
        tag: "Certificates",
        title: "Kodluyoruz & IBM SkillsBuild · AI4Future & Cybersecurity",
        detail: "5 verified certificates including AI4Future (Advanced), CyberStart 2.0, Cybersecurity and Enterprise Design Thinking.",
      },
      {
        period: "Jul 2026",
        tag: "Experience · Internship",
        title: "Data Destek Yazılım Hizmetleri A.Ş. · Software Intern",
        detail: "Bursa (On-site, 1 month). Hands-on front-end development and object-oriented programming (OOP).",
      },
      {
        period: "May – Jul 2026",
        tag: "Certificates",
        title: "BTK Akademi · Software, Databases & AI",
        detail: "9 verified certificates across C#, C++, OOP, Databases, Git & GitHub, AI and Anthropic Claude.",
      },
      {
        period: "2026",
        tag: "Graduation",
        title: "Kütahya Dumlupınar University · Computer Programming",
        detail: "Graduated from the Vocational School of Technical Sciences with a 3.09 / 4.00 GPA.",
      },
      {
        period: "2024",
        tag: "Associate",
        title: "Kütahya Dumlupınar University · Started Computer Programming",
        detail: "Built core foundations in desktop, database and system-level software engineering with C#, C++ and SQL.",
      },
    ],
  },
};

function About() {
  const { t, lang } = useLang();
  const a = t.about;
  const tl = TIMELINE[lang] || TIMELINE.tr;
  return (
    <section id="hakkimda" className={`${WRAP} scroll-mt-28 py-28 md:py-40`}>
      <Reveal>
        <SectionHeader index={a.index} title={a.title} kicker={a.kicker} />
      </Reveal>

      <Reveal className="mt-16">
        <p className="max-w-4xl font-display text-[clamp(1.6rem,3.4vw,2.6rem)] leading-[1.15] tracking-tight">
          {a.statement.map((segment, i) => (
            <span key={i} className={STATEMENT_TONE_CLASS[segment.tone] || ""}>{segment.text}</span>
          ))}
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
        <div className="space-y-5 leading-relaxed text-muted md:text-lg lg:col-span-7">
          {a.paragraphs.map((p, i) => (
            <Reveal key={i} delay={0.05 + i * 0.05}>
              <p>{p}</p>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} y={0} x={70} className="lg:col-span-5">
          <TiltCard maxTilt={5} className="rounded-2xl">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
              {a.facts.map((f) => (
                <div key={f.label} className="bg-surface p-6">
                  <div className="text-xs uppercase tracking-wider text-faint">
                    {f.label}
                  </div>
                  <div className="mt-2 font-display text-lg leading-snug">
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
          </TiltCard>
        </Reveal>
      </div>

      <Reveal delay={0.08} className="mt-16 border-t border-line pt-12">
        <p className="font-mono text-xs uppercase tracking-wider text-faint">
          {tl.heading}
        </p>
        <ol className="relative mt-7 space-y-6 border-l border-line pl-6 md:pl-8">
          {tl.items.map((item) => (
            <li
              key={`${item.period}-${item.title}`}
              className={`relative before:absolute before:-left-[29px] before:top-1.5 before:h-2.5 before:w-2.5 before:rounded-full before:content-[''] md:before:-left-[37px] ${
                item.active
                  ? "before:bg-accent before:ring-4 before:ring-accent/20"
                  : "before:bg-line before:ring-2 before:ring-canvas"
              }`}
            >
              <time className="font-mono text-xs uppercase tracking-wider text-accent">
                {item.period} · {item.tag}
              </time>
              <h3 className="mt-1 font-display text-lg tracking-tight text-ink md:text-xl">
                {item.title}
              </h3>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
                {item.detail}
              </p>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}

/* ================================================================== */
/*  YETENEKLER                                                         */
/* ================================================================== */
function FeatureCard({ item }) {
  return (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-line bg-surface/50 p-8 transition-colors duration-500 hover:border-[#34343c]">
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-elevated text-accent transition-transform duration-500 group-hover:-rotate-6">
          <SafeIcon name={item.icon} className="h-6 w-6" />
        </div>
        <SpriteIcon id="arrow-up-right" className="h-5 w-5 text-faint transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
      </div>
      <h3 className="mt-8 font-display text-2xl tracking-tight">{item.title}</h3>
      <p className="mt-3 leading-relaxed text-muted">{item.desc}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-line px-3 py-1 text-xs text-muted"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function SkillTile({ item, certifiedLabel }) {
  return (
    <div className="border-beam-box group h-full transition-all duration-500 hover:-translate-y-1">
      <div className="relative z-10 flex h-full flex-col rounded-[15px] bg-[#0c0c0f] p-6">
        <div className="flex items-start justify-between">
          <SafeIcon name={item.icon} className="h-7 w-7 text-muted transition-colors group-hover:text-accent" />
          {item.certified && (
            <span
              className="ui-label inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent"
              data-label={certifiedLabel}
            >
              <SpriteIcon id="badge-check" className="h-3 w-3" />
            </span>
          )}
        </div>
        <div className="mt-8 font-display text-2xl tracking-tight md:text-3xl">
          {item.name}
        </div>
        <div className="mt-1.5 text-sm text-faint">{item.note}</div>
      </div>
    </div>
  );
}

function Skills() {
  const { t } = useLang();
  const s = t.skills;
  const certifiedLabel = t.certificates.verified;
  return (
    <section id="yetenekler" className={`${WRAP} scroll-mt-28 py-28 md:py-40`}>
      <Reveal>
        <SectionHeader index={s.index} title={s.title} kicker={s.kicker} />
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2">
        {s.focus.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.06} y={0} x={i % 2 === 0 ? -80 : 80}>
            <TiltCard maxTilt={5} className="h-full rounded-2xl">
              <FeatureCard item={f} />
            </TiltCard>
          </Reveal>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {s.languages.map((l, i) => (
          <Reveal
            key={l.name}
            delay={i * 0.05}
            y={0}
            x={i % 2 === 0 ? -64 : 64}
            className={skillWidthClass(l.width)}
          >
            <SkillTile item={l} certifiedLabel={certifiedLabel} />
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <TiltCard maxTilt={3} className="mt-5 rounded-2xl">
          <div className="rounded-2xl border border-line bg-surface/40 p-6 md:p-8">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-faint">
              <Sparkles className="h-3.5 w-3.5" /> {s.moreLabel}
            </div>
          <div className="mt-6 divide-y divide-line">
            {s.more.map((g) => {
              return (
                <div
                  key={g.group}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:gap-6"
                >
                  <div className="flex items-center gap-2.5 md:w-56 md:shrink-0">
                    <SafeIcon name={g.icon} className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">{g.group}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((it) => (
                      <span
                        key={it.name}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas/40 px-3 py-1.5 text-sm text-muted"
                      >
                        {it.name}
                        {it.certified && (
                          <SpriteIcon id="badge-check" className="h-3.5 w-3.5 text-accent" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </TiltCard>
      </Reveal>
    </section>
  );
}

/* ================================================================== */
/*  SERTİFİKALAR                                                       */
/* ================================================================== */
export function CertificateCard({ cert, labels }) {
  return (
    <a
      href={cert.file}
      target="_blank"
      rel="noreferrer"
      className="group flex h-full flex-1 flex-col rounded-2xl border border-line bg-surface/40 p-7 transition-all duration-500 hover:-translate-y-1 hover:border-[#34343c] hover:bg-surface"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-elevated text-accent">
          <SafeIcon name={cert.icon} fallback="Award" className="h-6 w-6" />
        </div>
        <span
          className="ui-label inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent"
          data-label={labels.verified}
        >
          <SpriteIcon id="badge-check" className="h-3.5 w-3.5" />
        </span>
      </div>

      <h3 className="mt-7 font-display text-xl leading-snug tracking-tight">
        {cert.title}
      </h3>

      <div className="mt-2 flex items-center gap-2 text-sm text-muted">
        <SpriteIcon id="award" className="h-4 w-4 text-faint" /> {cert.issuer}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-faint">
        <span className="inline-flex items-center gap-1.5">
          <SpriteIcon id="calendar" className="h-3.5 w-3.5" /> {cert.date}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono">
          <SpriteIcon id="hash" className="h-3.5 w-3.5" /> {cert.code}
        </span>
      </div>

      <div className="mt-auto border-t border-line pt-5">
        <div className="ui-label text-[10px] uppercase tracking-wider text-faint" data-label={labels.validates} />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-full bg-ink px-3 py-1 text-sm font-medium text-canvas">
            {cert.skill}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors group-hover:text-ink">
            <SpriteIcon id="file-text" className="h-4 w-4" />
            <span className="ui-label" data-label={labels.view} />
            <SpriteIcon id="arrow-up-right" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </a>
  );
}

function Certificates() {
  const { t } = useLang();
  const c = t.certificates;
  const scrollerRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const labels = { verified: c.verified, validates: c.validates, view: c.view };

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          updateArrows();
        });
      }
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const scrollByCard = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector("[data-card]");
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.9;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const Arrow = ({ dir, disabled, side }) => (
    <button
      type="button"
      onClick={() => scrollByCard(dir)}
      disabled={disabled}
      aria-label={dir < 0 ? c.prev : c.next}
      className={`absolute top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/80 text-ink backdrop-blur transition hover:border-accent hover:bg-elevated disabled:pointer-events-none disabled:opacity-0 md:flex ${
        side === "left" ? "-left-2 lg:-left-5" : "-right-2 lg:-right-5"
      }`}
    >
      {dir < 0 ? (
        <ChevronLeft className="h-5 w-5" />
      ) : (
        <ChevronRight className="h-5 w-5" />
      )}
    </button>
  );

  return (
    <section id="sertifikalar" className={`${WRAP} scroll-mt-28 py-28 md:py-40`}>
      <Reveal>
        <SectionHeader index={c.index} title={c.title} kicker={c.kicker} />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="relative mt-14 md:mt-16">
          <Arrow dir={-1} disabled={atStart} side="left" />
          <Arrow dir={1} disabled={atEnd} side="right" />

          <div
            ref={scrollerRef}
            onScroll={updateArrows}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {c.items.map((cert) => (
              <TiltCard
                key={cert.code}
                data-card=""
                maxTilt={6}
                className="flex shrink-0 snap-start basis-[85%] flex-col rounded-2xl sm:basis-[47%] lg:basis-[31.5%]"
              >
                <CertificateCard cert={cert} labels={labels} />
              </TiltCard>
            ))}
          </div>

          {/* Mobilde alt-orta gezinme okları */}
          <div className="mt-7 flex items-center justify-center gap-4 md:hidden">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              disabled={atStart}
              aria-label={c.prev}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface/80 text-ink transition hover:border-accent disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              disabled={atEnd}
              aria-label={c.next}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface/80 text-ink transition hover:border-accent disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ================================================================== */
/*  PROJE GÖRSELLERİ (mock arayüzler)                                  */
/* ================================================================== */
function WindowDots() {
  return (
    <div className="flex gap-1.5">
      <span className="h-3 w-3 rounded-full bg-[#3a3a40]" />
      <span className="h-3 w-3 rounded-full bg-[#3a3a40]" />
      <span className="h-3 w-3 rounded-full bg-[#3a3a40]" />
    </div>
  );
}

function ClipboardMock() {
  const { t } = useLang();
  const m = t.mock;
  return (
    <div className="relative w-full rounded-2xl border border-line bg-elevated/90 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <WindowDots />
        <div className="ml-2 inline-flex items-center gap-2 text-xs text-muted">
          <ClipboardList className="h-3.5 w-3.5" /> AIO Hybrid Clipboard
        </div>
        <span className="ml-auto rounded-md border border-line px-2 py-1 font-mono text-[10px] text-faint">
          ALT + SPACE
        </span>
      </div>

      <div className="px-5 pt-5">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas/60 px-3 py-2.5 text-sm text-faint">
          <Search className="h-4 w-4" /> {m.search}
        </div>
      </div>

      <div className="space-y-2 p-5">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas/40 px-3 py-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line text-[10px] text-faint">
            1
          </span>
          <Code2 className="h-4 w-4 shrink-0 text-muted" />
          <span className="truncate font-mono text-xs text-ink/90">
            git commit -m "perf: 0.5ms timer"
          </span>
          <span className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
            ALT+1
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas/40 px-3 py-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line text-[10px] text-faint">
            2
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gradient-to-br from-[#26262c] to-[#16161a] text-faint">
            <ImageIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-semibold text-canvas">
                OCR
              </span>
              <span className="truncate text-xs text-ink/90">
                Fatura No: 2026-0192
              </span>
            </div>
            <div className="truncate text-[10px] text-faint">{m.ocrCaption}</div>
          </div>
          <span className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
            ALT+2
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas/40 px-3 py-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line text-[10px] text-faint">
            3
          </span>
          <Link2 className="h-4 w-4 shrink-0 text-muted" />
          <span className="truncate font-mono text-xs text-ink/90">
            github.com/Layellie
          </span>
          <span className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
            ALT+3
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[11px] text-faint">
        <span className="inline-flex items-center gap-1.5">
          <ScanText className="h-3.5 w-3.5" /> {m.ocrEngine}
        </span>
        <span className="rounded-full border border-line px-2 py-0.5">
          {m.reverse}
        </span>
      </div>
    </div>
  );
}

function TimerMock() {
  const { t } = useLang();
  const m = t.mock;
  return (
    <div className="relative w-full rounded-2xl border border-line bg-elevated/90 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <WindowDots />
        <div className="ml-2 inline-flex items-center gap-2 text-xs text-muted">
          <Gauge className="h-3.5 w-3.5" /> StandbyAndTimer
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] text-faint">
          <Lock className="h-3 w-3" /> {m.admin}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 p-5">
        <div className="col-span-2 rounded-xl border border-line bg-canvas/40 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-faint">
              {m.timerRes}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
              <Lock className="h-3 w-3" /> {m.locked}
            </span>
          </div>
          <div className="mt-3 flex items-end gap-1.5">
            <span className="font-display text-5xl leading-none tracking-tight md:text-6xl">
              0.50
            </span>
            <span className="mb-1 text-lg text-muted">ms</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-canvas/40 p-5">
          <div className="flex items-center gap-2 text-xs text-faint">
            <MemoryStick className="h-4 w-4" /> {m.standbyMem}
          </div>
          <div className="mt-3 font-display text-2xl">3.4 GB</div>
          <div className="mt-1 text-[11px] text-faint">{m.cleared}</div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full w-[82%] rounded-full bg-accent" />
          </div>
        </div>

        <div className="rounded-xl border border-line bg-canvas/40 p-5">
          <div className="flex items-center gap-2 text-xs text-faint">
            <Gamepad2 className="h-4 w-4" /> {m.gameMode}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-accent px-0.5">
              <span className="ml-auto h-4 w-4 rounded-full bg-canvas" />
            </span>
            <span className="text-sm text-ink">{m.on}</span>
          </div>
          <div className="mt-2 text-[11px] text-faint">{m.affinity}</div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[11px] text-faint">
        <span className="inline-flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5" /> NtSetTimerResolution · Win32 P/Invoke
        </span>
        <span className="rounded-full border border-line px-2 py-0.5">MVVM</span>
      </div>
    </div>
  );
}

function EyeHealthMock() {
  const { t } = useLang();
  const m = t.mock;
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-line bg-elevated/90 shadow-2xl shadow-black/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(214,255,63,0.13), transparent 68%)",
        }}
      />

      <div className="relative flex items-center gap-3 border-b border-line px-5 py-4">
        <WindowDots />
        <div className="ml-2 inline-flex items-center gap-2 text-xs text-muted">
          <Eye className="h-4 w-4 text-accent" /> EyeHealth
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2 py-1 text-[10px] text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {m.eyeRunning}
        </span>
      </div>

      <div className="relative grid gap-4 p-5 sm:grid-cols-[1.15fr_0.85fr]">
        <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-line bg-canvas/40 p-5 text-center">
          <div
            className="relative flex h-36 w-36 items-center justify-center rounded-full p-[7px]"
            style={{
              background:
                "conic-gradient(var(--color-accent) 0deg 292deg, var(--color-line) 292deg 360deg)",
            }}
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#111114]">
              <span className="text-[10px] uppercase tracking-[0.18em] text-faint">
                {m.eyeNext}
              </span>
              <span className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink">
                19:42
              </span>
            </div>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted">
            <BellRing className="h-3.5 w-3.5 text-accent" /> {m.eyeRule}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
          <div className="rounded-xl border border-line bg-canvas/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-faint">
              {m.eyeWork}
            </div>
            <div className="mt-1 font-display text-2xl text-ink">20 min</div>
          </div>
          <div className="rounded-xl border border-line bg-canvas/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-faint">
              {m.eyeBreak}
            </div>
            <div className="mt-1 font-display text-2xl text-ink">20 sec</div>
          </div>
          <div className="col-span-2 rounded-xl border border-line bg-canvas/40 p-4 sm:col-span-1">
            <div className="flex items-center gap-2 text-xs text-faint">
              <Monitor className="h-4 w-4" /> {m.eyeFullscreen}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-ink/90">{m.eyePostpone}</span>
              <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-accent px-0.5">
                <span className="ml-auto h-4 w-4 rounded-full bg-canvas" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-between border-t border-line px-5 py-3 text-[11px] text-faint">
        <span className="inline-flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" /> {m.eyeNative}
        </span>
        <span className="rounded-full border border-line px-2 py-0.5">TR / EN</span>
      </div>
    </div>
  );
}

const LEGACY_VISUALS = {
  "legacy-clipboard": ClipboardMock,
  "legacy-standby": TimerMock,
  "legacy-eyehealth": EyeHealthMock,
};

/* ================================================================== */
/*  GitHub canlı istatistik şeridi                                     */
/* ================================================================== */
// Görünüme girince 0'dan hedef değere sayan animasyonlu sayaç.
// framer-motion'ın animate/useInView'i yerine IntersectionObserver + rAF (ilk JS paketini küçültür).
function Counter({ value, duration = 2.4 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "-40px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) {
      setDisplay(0);
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t); // ~ easeOutExpo (EASE ile aynı karakter)
      setDisplay(Math.round(value * eased));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [inView, value, duration]);

  return <span ref={ref}>{display}</span>;
}

function GithubStats({ stats }) {
  const { t } = useLang();
  const labels = t.projects.stats;
  const cards = [
    { icon: FolderGit2, value: stats.repos, label: labels.repos },
    { icon: Star, value: stats.stars, label: labels.stars },
    { icon: Users, value: stats.followers, label: labels.followers },
  ];
  return (
    <Reveal>
      <TiltCard maxTilt={4} className="mt-16 rounded-2xl">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
          {cards.map((c) => (
          <a
            key={c.label}
            href={IDENTITY.github}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col gap-1 bg-surface p-5 transition-colors hover:bg-elevated md:p-7"
          >
            <c.icon className="h-5 w-5 text-accent" />
            <div className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
              <Counter value={c.value} />
              {c.value > 0 && <span className="text-accent">+</span>}
            </div>
            <div className="text-xs uppercase tracking-wider text-faint">
              {c.label}
            </div>
          </a>
        ))}
        </div>
      </TiltCard>
    </Reveal>
  );
}

function ContributionGraph() {
  const { t } = useLang();
  const [ok, setOk] = useState(true);
  const containerRef = useRef(null);
  const near = useNearViewport(containerRef, "350px 0px");
  if (!ok) return null;
  return (
    <Reveal>
      <TiltCard maxTilt={3} className="mt-5 rounded-2xl">
        <div
          ref={containerRef}
          className="rounded-2xl border border-line bg-surface/40 p-6 md:p-8"
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-faint">
            <Github className="h-3.5 w-3.5" /> {t.projects.contributions}
          </div>
          <div className="mt-6 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {near ? (
              <img
                src={`https://ghchart.rshah.org/d6ff3f/${IDENTITY.githubUser}`}
                alt={t.projects.contributions}
                loading="lazy"
                decoding="async"
                width="720"
                height="112"
                onError={() => setOk(false)}
                className="w-full min-w-[680px] opacity-90"
              />
            ) : (
              <div className="h-[112px] w-full min-w-[680px]" aria-hidden="true" />
            )}
          </div>
        </div>
      </TiltCard>
    </Reveal>
  );
}

/* ================================================================== */
/*  GITHUB REPOLARI — otomatik çekilen "daha fazlası" grid'i           */
/* ================================================================== */
const LANG_COLORS = {
  "C#": "#178600",
  "C++": "#f34b7d",
  C: "#555555",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  HTML: "#e34c26",
  CSS: "#563d7c",
  PHP: "#4F5D95",
  Python: "#3572A5",
  Shell: "#89e051",
  Batchfile: "#C1F12E",
  PowerShell: "#012456",
};

function RepoCard({ repo, noDesc }) {
  const license =
    repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION"
      ? repo.license.spdx_id
      : null;
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noreferrer"
      className="group flex h-full flex-col rounded-2xl border border-line bg-surface/40 p-5 transition-all duration-500 hover:-translate-y-1 hover:border-[#34343c] hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 font-medium">
          <SpriteIcon id="folder-git-2" className="h-4 w-4 shrink-0 text-accent" />
          <span className="truncate">{repo.name}</span>
        </div>
        <SpriteIcon id="arrow-up-right" className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted">
        {repo.description || noDesc}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-faint">
        {repo.language && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: LANG_COLORS[repo.language] || "#8b8b94" }}
            />
            {repo.language}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <SpriteIcon id="star" className="h-3.5 w-3.5" /> {repo.stargazers_count}
        </span>
        {license && (
          <span className="ml-auto rounded-full border border-line px-2 py-0.5">
            {license}
          </span>
        )}
      </div>
    </a>
  );
}

function MoreRepos({ repos, labels }) {
  if (!repos.length) return null;
  return (
    <Reveal delay={0.1}>
      <div className="mt-12 md:mt-16">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-faint">
          <Sparkles className="h-3.5 w-3.5" /> {labels.title}
        </div>
        <p className="mt-2 text-sm text-muted">{labels.subtitle}</p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {repos.map((r) => (
            <TiltCard key={r.id} maxTilt={5} className="h-full rounded-2xl">
              <RepoCard repo={r} noDesc={labels.noDesc} />
            </TiltCard>
          ))}
        </div>

        <div className="mt-6">
          <a
            href={IDENTITY.github}
            target="_blank"
            rel="noreferrer"
            className="group/btn inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <SpriteIcon id="github" className="h-4 w-4" /> {labels.viewAll}
            <SpriteIcon id="arrow-up-right" className="h-4 w-4 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
          </a>
        </div>
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  PROJELER                                                           */
/* ================================================================== */
function ProjectCard({ project, num, reverse, viewLabel, statusLabel }) {
  const { lang } = useLang();
  return (
    <Reveal y={0} x={reverse ? 90 : -90}>
      <TiltCard maxTilt={3} className="rounded-3xl">
        <article className="group grid grid-cols-1 items-center gap-8 rounded-3xl border border-line bg-surface/30 p-6 transition-colors duration-500 hover:border-[#33333a] md:p-8 lg:grid-cols-12 lg:gap-12 lg:p-10">
        <div className={`lg:col-span-6 ${reverse ? "lg:order-2" : ""}`}>
          <DeferredProjectVisual
            reference={project.visual}
            presets={portfolioFiles.visuals.presets}
            lang={lang}
            legacyVisuals={LEGACY_VISUALS}
          />
        </div>

        <div className={`lg:col-span-6 ${reverse ? "lg:order-1" : ""}`}>
          <div className="flex flex-wrap items-center gap-3 text-xs text-faint">
            <span className="font-mono text-accent">({num})</span>
            <span className="h-px w-8 bg-line" />
            <span className="text-muted">{project.type}</span>
            <span>·</span>
            <span>{project.year}</span>
            <span className="ml-auto rounded-full border border-line px-2 py-0.5">
              {project.license}
            </span>
          </div>

          <h3 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[0.95] tracking-tight">
            <ScrambleText text={project.name} />
          </h3>

          <div role="group" className="mt-4 flex flex-wrap gap-2" aria-label={statusLabel}>
            {project.status.map((status, i) => (
              <span
                key={status}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:content-[''] ${
                  i === 0
                    ? "border-accent/25 bg-accent/10 text-accent before:bg-accent"
                    : "border-line bg-canvas/40 text-muted before:bg-faint"
                }`}
              >
                {status}
              </span>
            ))}
          </div>

          <p className="mt-4 max-w-xl leading-relaxed text-muted md:text-lg">
            {project.description}
          </p>

          <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {project.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-ink/85">
                <SpriteIcon id="check" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap gap-2">
            {project.stack.map((stk) => (
              <span
                key={stk}
                className="rounded-full border border-line bg-canvas/40 px-3 py-1 font-mono text-xs text-muted"
              >
                {stk}
              </span>
            ))}
          </div>

          <MagneticButton
            href={project.github}
            target="_blank"
            rel="noreferrer"
            aria-label={`${project.name} — ${viewLabel}`}
            className="group/btn mt-8 items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-medium transition-colors hover:bg-ink hover:text-canvas"
          >
            <SpriteIcon id="github" className="h-4 w-4" />
            <span className="ui-label" data-label={viewLabel} />
            <SpriteIcon id="arrow-up-right" className="h-4 w-4 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
          </MagneticButton>
        </div>
        </article>
      </TiltCard>
    </Reveal>
  );
}

function Projects() {
  const { t } = useLang();
  const p = t.projects;
  const sectionRef = useRef(null);
  const near = useNearViewport(sectionRef, "400px 0px");
  const { stats, repos } = useGithub(IDENTITY.githubUser, IDENTITY.statsFallback, near);

  // Flagship projeler elde küratörlü; geri kalan repolar otomatik listelenir.
  const moreRepos = useMemo(() => selectMoreGithubRepositories(repos, p.items), [repos, p.items]);

  return (
    <section ref={sectionRef} id="projeler" className={`${WRAP} scroll-mt-28 py-28 md:py-40`}>
      <Reveal>
        <SectionHeader index={p.index} title={p.title} kicker={p.kicker} />
      </Reveal>

      <GithubStats stats={stats} />

      <ContributionGraph />

      <div className="mt-8 space-y-8 md:mt-12 md:space-y-12">
        {p.items.map((proj, i) => (
          <ProjectCard
            key={proj.id}
            project={proj}
            num={String(i + 1).padStart(2, "0")}
            reverse={i % 2 === 1}
            viewLabel={p.view}
            statusLabel={p.statusLabel}
          />
        ))}
      </div>

      <MoreRepos repos={moreRepos} labels={p.more} />
    </section>
  );
}

/* ================================================================== */
/*  İLETİŞİM                                                           */
/* ================================================================== */
function CopyEmail({ email }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* pano erişimi reddedilirse sessizce geç */
    }
  };
  return (
    <MagneticButton
      onClick={copy}
      className="items-center gap-2 rounded-full border border-line px-5 py-3 text-sm transition-colors hover:bg-surface"
    >
      <Mail className="h-4 w-4" />
      <ObfuscatedEmail email={email} className="font-mono" />
      {copied ? (
        <Check className="h-4 w-4 text-accent" />
      ) : (
        <Copy className="h-4 w-4 text-faint" />
      )}
    </MagneticButton>
  );
}

function Contact() {
  const { t } = useLang();
  const c = t.contact;
  return (
    <section id="iletisim" className={`${WRAP} scroll-mt-28 py-28 md:py-40`}>
      <Reveal>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="font-mono text-accent">({c.index})</span>
          <span>{c.label}</span>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <a
          href="#iletisim"
          onClick={(e) => {
            e.preventDefault();
            openMailto(IDENTITY.email);
          }}
          className="group mt-10 block"
        >
          <span className="block font-display text-[clamp(3rem,13vw,11.5rem)] font-semibold leading-[0.82] tracking-[-0.03em]">
            {c.big[0]}
          </span>
          <span className="mt-1 flex items-end gap-4 font-display text-[clamp(3rem,13vw,11.5rem)] font-semibold leading-[0.82] tracking-[-0.03em]">
            <span className="transition-colors duration-300 group-hover:text-accent">
              {c.big[1]}
            </span>
            <ArrowUpRight className="mb-2 h-[0.5em] w-[0.5em] text-muted transition-all duration-300 group-hover:-translate-y-2 group-hover:translate-x-2 group-hover:text-accent" />
          </span>
        </a>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-16 flex flex-col gap-6 border-t border-line pt-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-md leading-relaxed text-muted">{c.blurb}</p>
          <div className="flex flex-wrap items-center gap-3">
            <CopyEmail email={IDENTITY.email} />
            <MagneticButton
              href={IDENTITY.github}
              target="_blank"
              rel="noreferrer"
              className="items-center gap-2 rounded-full border border-line px-5 py-3 text-sm transition-colors hover:bg-surface"
            >
              <Github className="h-4 w-4" /> GitHub
            </MagneticButton>
            <MagneticButton
              href={IDENTITY.linkedin}
              target="_blank"
              rel="noreferrer"
              className="items-center gap-2 rounded-full border border-line px-5 py-3 text-sm transition-colors hover:bg-surface"
            >
              <Linkedin className="h-4 w-4" /> LinkedIn
            </MagneticButton>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ================================================================== */
/*  FOOTER                                                             */
/* ================================================================== */
const ANALYTICS_TOGGLE_TEXT = {
  tr: { label: "Anonim analitik", on: "Açık", off: "Kapalı", aria: "Anonim analitik ölçümünü aç veya kapat" },
  en: { label: "Anonymous analytics", on: "On", off: "Off", aria: "Turn anonymous analytics on or off" },
};

function AnalyticsToggle() {
  const { lang } = useLang();
  const text = ANALYTICS_TOGGLE_TEXT[lang] || ANALYTICS_TOGGLE_TEXT.tr;
  const [enabled, setEnabled] = useState(() => !analyticsOptedOut());
  const toggle = () => {
    const next = !enabled;
    setAnalyticsOptOut(!next);
    setEnabled(next);
    // Opting back in mints a fresh daily identity and counts today's visit.
    if (next) void recordPortfolioVisit();
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={text.aria}
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs transition-colors ${NAV_ACTION_INDICATOR}`}
    >
      <span className={`h-2 w-2 rounded-full ${enabled ? "bg-accent" : "bg-muted"}`} />
      <span>{text.label}: {enabled ? text.on : text.off}</span>
    </button>
  );
}

function Footer() {
  const { t } = useLang();
  return (
    <footer className="relative z-10 border-t border-line">
      <div
        className={`${WRAP} flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted md:flex-row`}
      >
        <span>
          © 2026 Samet Kaşmer —{" "}
          <span className="text-faint">@{IDENTITY.handle}</span>
        </span>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <AnalyticsToggle />
          <a
            href={IDENTITY.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="transition-colors hover:text-ink"
          >
            <Github className="h-4 w-4" />
          </a>
          <a
            href={IDENTITY.linkedin}
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            className="transition-colors hover:text-ink"
          >
            <Linkedin className="h-4 w-4" />
          </a>
          <a href="#anasayfa" className="transition-colors hover:text-ink">
            {t.footer.backToTop}
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================== */
/*  Arka plan: meteor / yıldız kayması animasyonu                      */
/* ================================================================== */
function Meteors({ count: countProp }) {
  // Sayfanın en arkasında süzülen parlak saf beyaz meteorlar
  const count =
    countProp ??
    (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? 6 : 12);
  const meteors = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const duration = 3.8 + Math.random() * 4.2;
        return {
          left: Math.random() * 100, // %
          top: -5 - Math.random() * 25, // %
          delay: -(Math.random() * duration), // Negatif delay: sayfa açıldığı an süzülüyor olurlar
          duration,
          tail: 110 + Math.random() * 140, // px
        };
      }),
    [count]
  );
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {meteors.map((m, i) => (
        <span
          key={i}
          className="meteor"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            height: `${m.tail}px`,
            animationDelay: `${m.delay.toFixed(2)}s`,
            animationDuration: `${m.duration.toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ================================================================== */
/*  KOMUT PALETİ (⌘K / Ctrl+K)                                         */
/* ================================================================== */
const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");
const META_LABEL = IS_MAC ? "⌘" : "Ctrl";

function CommandPalette() {
  const { t, lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  const activeRef = useRef(null);

  const commands = useMemo(() => {
    const go = (href) => () => {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    };
    const sections = NAV_KEYS.map((n) => ({
      id: n.href,
      label: t.nav[n.key],
      hint: t.cmd.goto,
      icon: ChevronRight,
      action: go(n.href),
    }));
    return [
      ...sections,
      {
        id: "lang",
        label:
          lang === "tr" ? "Switch to English" : "Türkçe'ye geç",
        hint: t.cmd.lang,
        icon: Languages,
        action: () => setLang(lang === "tr" ? "en" : "tr"),
      },
      {
        id: "email",
        label: IDENTITY.email,
        hint: t.cmd.copyEmail,
        icon: Copy,
        action: () => navigator.clipboard?.writeText(IDENTITY.email),
      },
      {
        id: "github",
        label: `GitHub · @${IDENTITY.githubUser}`,
        hint: t.cmd.open,
        icon: Github,
        action: () => window.open(IDENTITY.github, "_blank", "noopener"),
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        hint: t.cmd.open,
        icon: Linkedin,
        action: () => window.open(IDENTITY.linkedin, "_blank", "noopener"),
      },
      {
        id: "top",
        label: t.cmd.toTop,
        hint: "",
        icon: ArrowUpRight,
        action: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      },
    ];
  }, [t, lang, setLang]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.hint || "").toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onToggle = () => setOpen((o) => !o);
    window.addEventListener("keydown", onKey);
    window.addEventListener("toggle-cmdk", onToggle);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("toggle-cmdk", onToggle);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const run = (cmd) => {
    setOpen(false);
    setTimeout(() => cmd.action(), 0);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[index]) run(filtered[index]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <>
      {open && (
        <div
          className="overlay-fade fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]"
        >
          <div
            className="absolute inset-0 bg-canvas/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="modal-pop relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/50"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 shrink-0 text-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t.cmd.placeholder}
                className="w-full bg-transparent py-4 text-sm text-ink outline-none placeholder:text-faint"
              />
              <kbd className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
                ESC
              </kbd>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-faint">
                  {t.cmd.empty}
                </div>
              ) : (
                filtered.map((cmd, i) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      ref={i === index ? activeRef : null}
                      onMouseMove={() => setIndex(i)}
                      onClick={() => run(cmd)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        i === index
                          ? "bg-elevated text-ink"
                          : "text-muted hover:bg-elevated/60"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-accent" />
                      <span className="truncate">{cmd.label}</span>
                      {cmd.hint && (
                        <span className="ml-auto shrink-0 text-[11px] uppercase tracking-wider text-faint">
                          {cmd.hint}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  APP                                                                */
/* ================================================================== */
/* ================================================================== */
/*  İNTERAKTİF TERMINAL — ziyaretçi komut yazarak siteyi keşfeder      */
/* ================================================================== */
const TERMINAL_CMDS = [
  "help",
  "neofetch",
  "whoami",
  "about",
  "timeline",
  "skills",
  "projects",
  "cat",
  "certs",
  "open",
  "contact",
  "social",
  "date",
  "clear",
];

const TERMINAL_EXTRA_TEXT = {
  tr: {
    cmds: {
      neofetch: "sistem kartı & özet bilgi (ASCII)",
      timeline: "eğitim & sertifika zaman çizelgesi",
      cat: "proje detayı (ör: cat standby)",
      open: "link aç (github, linkedin, standby...)",
    },
    catUsage: "Kullanım: cat <proje>  — mevcut:",
    catNotFound: "proje bulunamadı:",
    openUsage: "Kullanım: open <hedef>  — mevcut:",
    opening: "Açılıyor:",
    openNotFound: "hedef bulunamadı:",
    stackLabel: "Yığın:",
    featuresLabel: "Öne çıkanlar:",
  },
  en: {
    cmds: {
      neofetch: "system summary card (ASCII)",
      timeline: "education & certification timeline",
      cat: "project details (e.g. cat standby)",
      open: "open link (github, linkedin, standby...)",
    },
    catUsage: "Usage: cat <project>  — available:",
    catNotFound: "project not found:",
    openUsage: "Usage: open <target>  — available:",
    opening: "Opening:",
    openNotFound: "target not found:",
    stackLabel: "Stack:",
    featuresLabel: "Highlights:",
  },
};

function Terminal() {
  const { t, lang } = useLang();
  const tt = t.terminal;
  const extra = TERMINAL_EXTRA_TEXT[lang] || TERMINAL_EXTRA_TEXT.tr;
  const tl = TIMELINE[lang] || TIMELINE.tr;
  const prompt = `${tt.user}@${tt.host}:~$`;

  const bootLines = useMemo(
    () => [
      { tone: "accent", text: tt.welcome },
      { tone: "muted", text: tt.hint },
    ],
    [tt.welcome, tt.hint]
  );

  const [lines, setLines] = useState(bootLines);
  const [input, setInput] = useState("");
  const [hist, setHist] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);

  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  // dil değişince terminali baştan başlat
  useEffect(() => {
    setLines(bootLines);
    setInput("");
    setHist([]);
    setHistIdx(-1);
  }, [bootLines]);

  // her yeni çıktıda en alta kaydır
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const out = (text, tone = "out") => ({ text, tone });

  function findProject(query) {
    const q = (query || "").toLowerCase();
    if (!q) return null;
    return t.projects.items.find(
      (p) => p.id.toLowerCase() === q || p.name.toLowerCase().includes(q)
    );
  }

  function runCommand(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    const [name, ...rest] = trimmed.toLowerCase().split(/\s+/);
    const arg = rest.join(" ");

    switch (name) {
      case "help":
        return [
          out(tt.helpTitle, "accent"),
          ...TERMINAL_CMDS.map((c) =>
            out(`  ${c.padEnd(11)} ${tt.cmds[c] || extra.cmds[c] || ""}`)
          ),
        ];
      case "neofetch": {
        const stackSummary = t.skills.languages.slice(0, 6).map((l) => l.name).join(", ");
        return [
          out(`  ███████╗██╗  ██╗    ${IDENTITY.handle}@portfolio`, "accent"),
          out(`  ██╔════╝██║ ██╔╝    ─────────────────────────────`, "accent"),
          out(`  ███████╗█████╔╝     Role:     ${t.hero.role}`),
          out(`  ╚════██║██╔═██╗     Location: ${t.hero.location}`),
          out(`  ███████║██║  ██╗    Stack:    ${stackSummary}`),
          out(`  ╚══════╝╚═╝  ╚═╝    Stats:    ${t.projects.items.length} flagship · ${t.certificates.items.length} certs`),
          out(`                      GitHub:   ${IDENTITY.github}`, "link"),
        ];
      }
      case "whoami":
        return [
          out(`${IDENTITY.name} · @${IDENTITY.handle}`, "accent"),
          out(t.hero.role),
        ];
      case "about":
        return t.about.facts.map((f) =>
          out(`${(f.label + ":").padEnd(18)}${f.value}`)
        );
      case "timeline":
        return [
          out(tl.heading, "accent"),
          ...tl.items.flatMap((item) => [
            out(`  [${item.period}] ${item.title}`, item.active ? "accent" : "out"),
            out(`      ${item.detail}`, "muted"),
          ]),
        ];
      case "skills":
        return [
          out(`${tt.labels.langs}:`, "accent"),
          ...t.skills.languages.map((l) => out(`  ▸ ${l.name.padEnd(8)}${l.note}`)),
          out(""),
          out(`${tt.labels.focus}:`, "accent"),
          ...t.skills.focus.map((f) => out(`  ▸ ${f.title}`)),
        ];
      case "projects":
        return t.projects.items.flatMap((p) => [
          out(`  ▸ ${p.name} (${p.year}) — ${p.status?.[0] || p.type}`, "accent"),
          out(`    ${p.github}`, "link"),
        ]);
      case "cat": {
        if (!arg) {
          const ids = t.projects.items.map((p) => p.id).join(", ");
          return [out(`${extra.catUsage} ${ids}`, "muted")];
        }
        const project = findProject(arg);
        if (!project) {
          return [
            out(`${extra.catNotFound} ${arg}`, "error"),
            out(`${extra.catUsage} ${t.projects.items.map((p) => p.id).join(", ")}`, "muted"),
          ];
        }
        return [
          out(`${project.name} · ${project.status?.join(" · ") || project.year}`, "accent"),
          out(project.description),
          out(""),
          out(`${extra.stackLabel} ${project.stack.join(" · ")}`, "link"),
          out(extra.featuresLabel, "accent"),
          ...project.features.map((f) => out(`  ✓ ${f}`)),
          out(`  → ${project.github}`, "link"),
        ];
      }
      case "open": {
        const targets = {
          github: IDENTITY.github,
          linkedin: IDENTITY.linkedin,
          ...Object.fromEntries(t.projects.items.map((p) => [p.id.toLowerCase(), p.github])),
        };
        if (!arg) {
          return [out(`${extra.openUsage} ${Object.keys(targets).join(", ")}`, "muted")];
        }
        const url = targets[arg];
        if (!url) {
          return [
            out(`${extra.openNotFound} ${arg}`, "error"),
            out(`${extra.openUsage} ${Object.keys(targets).join(", ")}`, "muted"),
          ];
        }
        window.open(url, "_blank", "noopener,noreferrer");
        return [out(`${extra.opening} ${url}`, "accent")];
      }
      case "certs":
        return [
          out(
            `${t.certificates.items.length} ${tt.labels.certCount}:`,
            "accent"
          ),
          ...t.certificates.items.map((c) =>
            out(`  ✓ ${c.title}  ·  ${c.date}`)
          ),
        ];
      case "contact":
        return [
          out(`email     ${IDENTITY.email}`),
          out(`github    ${IDENTITY.github}`, "link"),
          out(`linkedin  ${IDENTITY.linkedin}`, "link"),
        ];
      case "social":
        return [
          out(`github    ${IDENTITY.github}`, "link"),
          out(`linkedin  ${IDENTITY.linkedin}`, "link"),
        ];
      case "date":
        return [
          out(
            new Date().toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          ),
        ];
      case "echo":
        return [out(rest.join(" "))];
      case "sudo":
        return [out(tt.labels.sudo, "error")];
      case "clear":
        return "CLEAR";
      default:
        return [out(`${tt.notFound}: ${name}`, "error"), out(tt.tryHelp, "muted")];
    }
  }

  function submit() {
    const raw = input;
    const result = runCommand(raw);
    if (result === "CLEAR") {
      setLines([]);
      setInput("");
      setHistIdx(-1);
      return;
    }
    setLines((prev) => [...prev, { tone: "cmd", text: raw }, ...result]);
    if (raw.trim()) setHist((h) => [...h, raw]);
    setHistIdx(-1);
    setInput("");
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const parts = input.trimStart().split(/\s+/);
      if (parts.length === 1 && parts[0]) {
        const match = TERMINAL_CMDS.find((c) => c.startsWith(parts[0].toLowerCase()));
        if (match) setInput(match === "cat" || match === "open" ? `${match} ` : match);
      } else if (parts.length === 2 && (parts[0].toLowerCase() === "cat" || parts[0].toLowerCase() === "open")) {
        const pool =
          parts[0].toLowerCase() === "open"
            ? ["github", "linkedin", ...t.projects.items.map((p) => p.id)]
            : t.projects.items.map((p) => p.id);
        const match = pool.find((item) => item.toLowerCase().startsWith(parts[1].toLowerCase()));
        if (match) setInput(`${parts[0].toLowerCase()} ${match}`);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!hist.length) return;
      const idx = histIdx === -1 ? hist.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      setInput(hist[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx === -1) return;
      const idx = histIdx + 1;
      if (idx >= hist.length) {
        setHistIdx(-1);
        setInput("");
      } else {
        setHistIdx(idx);
        setInput(hist[idx]);
      }
    }
  }

  const toneClass = {
    out: "text-muted",
    accent: "text-accent",
    muted: "text-faint",
    error: "text-red-400",
    link: "text-ink/70",
  };

  return (
    <section id="terminal" className={`${WRAP} scroll-mt-28 py-28 md:py-40`}>
      <Reveal>
        <SectionHeader index={tt.index} title={tt.title} kicker={tt.kicker} />
      </Reveal>

      <Reveal y={36} delay={0.05}>
        <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-[#0b0b0e] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
          {/* başlık çubuğu */}
          <div className="flex items-center gap-3 border-b border-line bg-surface/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <span className="mx-auto select-none font-mono text-xs text-faint">
              {tt.user}@{tt.host}: ~
            </span>
          </div>

          {/* gövde */}
          <div
            ref={bodyRef}
            onClick={() => inputRef.current?.focus()}
            className="h-[340px] cursor-text overflow-y-auto p-4 font-mono text-[13px] leading-relaxed md:h-[400px] md:p-5"
          >
            {lines.map((l, i) =>
              l.tone === "cmd" ? (
                <div key={i} className="flex gap-2 break-all">
                  <span className="shrink-0 text-accent">{prompt}</span>
                  <span className="text-ink">{l.text}</span>
                </div>
              ) : (
                <div
                  key={i}
                  className={`whitespace-pre-wrap break-words ${
                    toneClass[l.tone] || "text-muted"
                  }`}
                >
                  {l.text || " "}
                </div>
              )
            )}

            {/* aktif giriş satırı */}
            <div className="flex gap-2">
              <span className="shrink-0 text-accent">{prompt}</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                aria-label="terminal"
                className="flex-1 bg-transparent text-ink caret-accent outline-none"
              />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default function App() {
  const [lang, setLang] = useState(() => {
    if (typeof window === "undefined") return "tr";
    return window.localStorage.getItem("lang") || "tr";
  });

  useEffect(() => {
    window.localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // Statik kabuktan sonra ekran dışı bölümleri ayrı macrotask'lere bölerek mount et (0 Long Task, TBT = 0 ms).
  const [mountStage, setMountStage] = useState(() => {
    if (typeof window === "undefined") return 6;
    if (window.__PRERENDERED_SHELL__ && !window.location.hash) return 0;
    return 6;
  });

  useEffect(() => {
    if (mountStage >= 6) return undefined;
    const timer = window.setTimeout(() => {
      startTransition(() => setMountStage((s) => Math.min(6, s + 1)));
    }, 40);
    return () => window.clearTimeout(timer);
  }, [mountStage]);

  // Analitik kaydı, ilk boyamadan sonra boş zamanda başlar.
  useEffect(() => whenIdle(() => { void recordPortfolioVisit(); }, 3000), []);

  const t = CONTENT[lang];

  return (
    <LangCtx.Provider value={{ lang, setLang, t }}>
      <IconSprite />
      <ScrollProgress />
      {mountStage >= 6 && <CommandPalette />}

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(70% 55% at 50% -10%, rgba(214,255,63,0.07), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60] hidden opacity-[0.035] md:block"
        style={{ backgroundImage: NOISE }}
      />

      <Navbar />

      <main className="relative z-10">
        {/* Meteorlar yalnızca ilk ekranda (Hero/gökyüzü) süzülür; absolute olduğu için aşağı kaydırınca kullanıcıyla birlikte aşağı inmez, en üstte kalır */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-screen min-h-[640px] overflow-hidden -z-10"
        >
          <Meteors />
        </div>

        <Hero />
        {mountStage >= 1 && (
          <>
            <Marquee />
            <About />
          </>
        )}
        {mountStage >= 2 && <Skills />}
        {mountStage >= 3 && <Projects />}
        {mountStage >= 4 && <Certificates />}
        {mountStage >= 5 && <Terminal />}
        {mountStage >= 6 && <Contact />}
      </main>

      {mountStage >= 6 && <Footer />}
    </LangCtx.Provider>
  );
}
