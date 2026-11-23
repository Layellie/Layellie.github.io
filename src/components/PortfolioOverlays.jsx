import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  Copy,
  FileText,
  Github,
  Languages,
  Linkedin,
  Mail,
  Search,
  X,
} from "lucide-react";

function SpriteIcon({ id, className = "h-4 w-4" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`ic ${className}`}>
      <use href={`#ic-${id}`} />
    </svg>
  );
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

function openMailto(email) {
  if (typeof window === "undefined" || !email) return;
  window.location.href = ["mail", "to:", email].join("");
}

export function CommandPaletteOverlay({ t, lang, setLang, navKeys, identity, onClose }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  const activeRef = useRef(null);

  const commands = useMemo(() => {
    const go = (href) => () => {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    };
    const sections = navKeys.map((n) => ({
      id: n.href,
      label: t.nav[n.key],
      hint: t.cmd.goto,
      icon: ChevronRight,
      action: go(n.href),
    }));
    return [
      ...sections,
      {
        id: "summary",
        label: lang === "tr" ? "30 Saniyelik Özet (İK / TL;DR)" : "30-Second Overview (TL;DR)",
        hint: t.cmd.open,
        icon: FileText,
        action: () => window.dispatchEvent(new CustomEvent("toggle-summary")),
      },
      {
        id: "lang",
        label: lang === "tr" ? "Switch to English" : "Türkçe'ye geç",
        hint: t.cmd.lang,
        icon: Languages,
        action: () => setLang(lang === "tr" ? "en" : "tr"),
      },
      {
        id: "email",
        label: identity.email,
        hint: t.cmd.copyEmail,
        icon: Copy,
        action: () => navigator.clipboard?.writeText(identity.email),
      },
      {
        id: "github",
        label: `GitHub · @${identity.githubUser}`,
        hint: t.cmd.open,
        icon: Github,
        action: () => window.open(identity.github, "_blank", "noopener"),
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        hint: t.cmd.open,
        icon: Linkedin,
        action: () => window.open(identity.linkedin, "_blank", "noopener"),
      },
      {
        id: "top",
        label: t.cmd.toTop,
        hint: "",
        icon: ArrowUpRight,
        action: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      },
    ];
  }, [t, lang, setLang, navKeys, identity]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.hint || "").toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const run = (cmd) => {
    onClose();
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
      onClose();
    }
  };

  return (
    <div className="overlay-fade fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]">
      <div
        className="absolute inset-0 bg-canvas/70 backdrop-blur-sm"
        onClick={onClose}
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
  );
}

const SUMMARY_TEXT = {
  tr: {
    badge: "30 sn Özet · TL;DR",
    print: "Yazdır / PDF",
    close: "Kapat",
    stackTitle: "Ana Teknoloji Yığını",
    projectsTitle: "Öne Çıkan Açık Kaynak Projeler",
    timelineTitle: "Deneyim & Eğitim",
    certsNote: "doğrulanmış sertifika (BTK Akademi, Kodluyoruz & IBM SkillsBuild)",
    copied: "Kopyalandı",
    copyEmail: "E-posta kopyala",
    mailBtn: "Mail gönder",
  },
  en: {
    badge: "30s Overview · TL;DR",
    print: "Print / PDF",
    close: "Close",
    stackTitle: "Core Tech Stack",
    projectsTitle: "Featured Open-Source Projects",
    timelineTitle: "Experience & Education",
    certsNote: "verified certificates (BTK Akademi, Kodluyoruz & IBM SkillsBuild)",
    copied: "Copied",
    copyEmail: "Copy email",
    mailBtn: "Send email",
  },
};

export function QuickSummaryOverlay({ t, lang, identity, onClose }) {
  const [copied, setCopied] = useState(false);
  const s = SUMMARY_TEXT[lang] || SUMMARY_TEXT.tr;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("summary-open");
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("summary-open");
    };
  }, []);

  const timeline = Array.isArray(t.about.timeline) ? [...t.about.timeline].reverse() : [];
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(identity.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* pano reddedilirse geç */
    }
  };

  return (
    <div
      data-summary-modal=""
      role="dialog"
      aria-modal="true"
      aria-label={s.badge}
      onClick={onClose}
      className="overlay-fade fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm md:p-6"
    >
      <div
        data-summary-card=""
        onClick={(e) => e.stopPropagation()}
        className="modal-pop flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl shadow-black/80"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-elevated/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="font-mono text-xs uppercase tracking-wider text-accent">
              {s.badge}
            </span>
          </div>
          <div data-print-hide="" className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas/60 px-3.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent"
            >
              <SpriteIcon id="file-text" className="h-3.5 w-3.5" />
              {s.print}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={s.close}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent/50 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-6 overflow-y-auto p-6 md:p-7">
          <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                {identity.name}
                <span className="text-accent">.</span>
              </h2>
              <p className="mt-1 text-sm font-medium text-ink/90">{t.hero.role}</p>
              <p className="mt-1 text-xs text-muted">
                {t.hero.location} · {t.hero.available}
              </p>
            </div>
            <div className="font-mono text-xs text-muted">
              {t.certificates.items.length} {s.certsNote}
            </div>
          </div>

          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-faint">
              {s.stackTitle}
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {t.skills.languages.map((l) => (
                <span
                  key={l.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas/50 px-3 py-1 text-xs text-ink"
                >
                  <span className="font-medium">{l.name}</span>
                  <span className="text-faint">· {l.note}</span>
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-faint">
              {s.projectsTitle}
            </h3>
            <div className="mt-2.5 grid gap-3">
              {t.projects.items.map((p) => (
                <a
                  key={p.id}
                  href={p.github}
                  target="_blank"
                  rel="noreferrer"
                  className="group block rounded-2xl border border-line bg-canvas/40 p-4 transition-colors hover:border-accent/40 hover:bg-canvas/70"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-medium text-ink group-hover:text-accent">
                        {p.name}
                      </span>
                      {p.status?.[0] && (
                        <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent">
                          {p.status[0]}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted group-hover:text-ink">
                      {p.stack.slice(0, 4).join(" · ")}
                      <SpriteIcon id="arrow-up-right" className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    {p.description}
                  </p>
                </a>
              ))}
            </div>
          </div>

          {timeline.length > 0 && (
            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-faint">
                {s.timelineTitle}
              </h3>
              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                {timeline.map((item, i) => (
                  <div
                    key={`${item.period}-${i}`}
                    className={`rounded-xl border p-3.5 ${
                      item.active ? "border-accent/35 bg-accent/[0.06]" : "border-line bg-canvas/35"
                    }`}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
                      {item.period} · {item.tag}
                    </div>
                    <div className="mt-1 font-display text-sm font-medium text-ink">
                      {item.title}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          data-print-hide=""
          className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-elevated/50 px-6 py-3.5"
        >
          <button
            type="button"
            onClick={copyEmail}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas/60 px-3.5 py-1.5 text-xs text-ink transition-colors hover:border-accent/40"
          >
            <Mail className="h-3.5 w-3.5 text-accent" />
            <ObfuscatedEmail email={identity.email} className="font-mono" />
            <span className="text-faint">{copied ? `✓ ${s.copied}` : ""}</span>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={identity.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-ink"
            >
              <SpriteIcon id="github" className="h-3.5 w-3.5" /> GitHub
            </a>
            <a
              href={identity.linkedin}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-ink"
            >
              <SpriteIcon id="linkedin" className="h-3.5 w-3.5" /> LinkedIn
            </a>
            <button
              type="button"
              onClick={() => openMailto(identity.email)}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-canvas transition-opacity hover:opacity-90"
            >
              {s.mailBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
