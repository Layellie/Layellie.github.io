import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  GitCommitHorizontal,
  Github,
  Globe,
  HeartPulse,
  HelpCircle,
  History,
  ImageUp,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Plus,
  Radio,
  Redo2,
  RefreshCw,
  Rocket,
  Save,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  Trash2,
  Undo2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { portfolioFiles as bundledFiles } from "../content/loadContent.js";
import { mediaTypeForMetadata } from "../content/mediaTypes.js";
import { DEFAULT_DISCORD_PRESENCE, DISCORD_USER_ID_REGEX } from "../content/schemas.js";
import { adminApi } from "./api/client.js";
import { validateFileSignature } from "./validation/files.js";
import { optimizeImageUpload } from "./validation/imageOptimize.js";
import { clearDraft, loadDraft, restoreDraftRecord, saveDraft } from "./draft/storage.js";
import {
  buildContentHealthReport,
  clonePortfolio,
  certificateSkillOptions,
  createAnalyticsCsv,
  createCertificate,
  createDiffSummary,
  createPortfolioBackup,
  createProject,
  duplicateProject,
  hasDiff,
  MAX_BACKUP_BYTES,
  moveItem,
  parsePortfolioBackup,
  publicationIssues,
  synchronizeUploads,
  validatePortfolio,
} from "./data/model.js";
import { mergePortfolioFiles } from "./data/merge.js";
import AboutEditor from "./editors/AboutEditor.jsx";
import CertificateEditor from "./editors/CertificateEditor.jsx";
import FaqEditor from "./editors/FaqEditor.jsx";
import ProjectEditor from "./editors/ProjectEditor.jsx";
import SiteSettingsEditor from "./editors/SiteSettingsEditor.jsx";
import SkillsEditor from "./editors/SkillsEditor.jsx";
import VisualBuilder from "./editors/VisualBuilder.jsx";
import ReleaseDownloadsPanel from "./components/ReleaseDownloadsPanel.jsx";
import {
  AdminReveal,
  Button,
  ConfirmDialog,
  LoadingState,
  Notice,
  Panel,
  SortableList,
  TextField,
} from "./components/AdminUi.jsx";

const NAVIGATION_GROUPS = [
  {
    label: "Genel bakış",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "analytics", label: "Analitik", icon: BarChart3 },
    ],
  },
  {
    label: "Site içeriği",
    items: [
      { id: "site", label: "Hero & İletişim", icon: SlidersHorizontal },
      { id: "faq", label: "SSS (FAQ)", icon: HelpCircle },
      { id: "discord", label: "Discord Kartı", icon: Radio },
      { id: "about", label: "Hakkımda", icon: UserRound },
      { id: "projects", label: "Projeler", icon: ClipboardList },
      { id: "certificates", label: "Sertifikalar", icon: Award },
      { id: "skills", label: "Yetenekler", icon: Boxes },
      { id: "visuals", label: "Görsel oluşturucu", icon: Sparkles },
    ],
  },
  {
    label: "Yayın",
    items: [
      { id: "publish", label: "Doğrula & yayınla", icon: Send },
    ],
  },
];

const NAVIGATION = NAVIGATION_GROUPS.flatMap((group) => group.items);

const MAX_UNDO_HISTORY = 30;

function isEditableKeyboardTarget(target) {
  if (!target || typeof target !== "object") return false;
  const tag = String(target.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || Boolean(target.isContentEditable);
}

export default function AdminApp({ initialSession, initialContent }) {
  const [sessionState, setSessionState] = useState(initialSession ? { status: "authenticated", data: initialSession } : { status: "loading" });
  const [contentState, setContentState] = useState(initialContent ? { status: "ready", data: initialContent } : { status: "idle" });
  const [screen, setScreen] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [draft, setDraft] = useState(initialContent?.files ? clonePortfolio(initialContent.files) : null);
  const [history, setHistory] = useState({ past: [], future: [] });
  const [baseFiles, setBaseFiles] = useState(initialContent?.files || null);
  const [base, setBase] = useState(initialContent?.base || null);
  const [uploads, setUploads] = useState([]);
  const [savedDraft, setSavedDraft] = useState(null);
  const [draftNeedsRebase, setDraftNeedsRebase] = useState(false);
  const [flash, setFlash] = useState(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [savedSignature, setSavedSignature] = useState(null);

  const pendingChangeCount = useMemo(() => {
    if (!draft || !baseFiles) return uploads.length;
    const summary = createDiffSummary(baseFiles, draft);
    const diffCount = Object.values(summary).reduce(
      (total, group) => total + group.added.length + group.changed.length + group.removed.length,
      0,
    );
    return diffCount + uploads.length;
  }, [baseFiles, draft, uploads.length]);

  const currentSignature = useMemo(() => {
    if (!draft) return "";
    return `${JSON.stringify(draft)}|${uploads.map((entry) => `${entry.kind}:${entry.recordId}:${entry.file?.name || ""}`).join(",")}`;
  }, [draft, uploads]);

  const hasUnsavedWork = pendingChangeCount > 0 && currentSignature !== savedSignature;
  const saveLocalDraftRef = useRef(null);
  const undoRef = useRef(null);
  const redoRef = useRef(null);

  const commitDraftChange = (nextDraft) => {
    if (!nextDraft) return;
    setDraft((current) => {
      if (current && JSON.stringify(current) !== JSON.stringify(nextDraft)) {
        setHistory((prev) => ({
          past: [...prev.past.slice(-(MAX_UNDO_HISTORY - 1)), clonePortfolio(current)],
          future: [],
        }));
      }
      return nextDraft;
    });
  };

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  function undoDraft() {
    if (!draft || !history.past.length) return;
    const previous = history.past[history.past.length - 1];
    setHistory((prev) => ({
      past: prev.past.slice(0, -1),
      future: [clonePortfolio(draft), ...prev.future.slice(0, MAX_UNDO_HISTORY - 1)],
    }));
    setDraft(clonePortfolio(previous));
  }

  function redoDraft() {
    if (!draft || !history.future.length) return;
    const next = history.future[0];
    setHistory((prev) => ({
      past: [...prev.past.slice(-(MAX_UNDO_HISTORY - 1)), clonePortfolio(draft)],
      future: prev.future.slice(1),
    }));
    setDraft(clonePortfolio(next));
  }

  undoRef.current = undoDraft;
  redoRef.current = redoDraft;

  useEffect(() => {
    if (initialSession) return;
    adminApi.session().then((data) => setSessionState({ status: "authenticated", data })).catch((error) => setSessionState({ status: "unauthenticated", error }));
  }, [initialSession]);

  useEffect(() => {
    if (sessionState.status !== "authenticated" || initialContent) return;
    setContentState({ status: "loading" });
    adminApi.content().then((data) => {
      setContentState({ status: "ready", data });
      setBaseFiles(data.files); setDraft(clonePortfolio(data.files)); setBase(data.base); setSavedSignature(null); setHistory({ past: [], future: [] });
      loadDraft().then((local) => local && setSavedDraft(local)).catch(() => {});
    }).catch((error) => setContentState({ status: "error", error }));
  }, [sessionState.status, initialContent]);

  useEffect(() => {
    if (!draft) return;
    setUploads((current) => {
      const next = synchronizeUploads(draft, current);
      return next.length === current.length && next.every((entry, index) => entry === current[index]) ? current : next;
    });
  }, [draft]);

  const updateFiles = (key, value) => commitDraftChange({ ...draft, [key]: value });
  const addUpload = (entry) => setUploads((current) => [...current.filter((item) => !(item.kind === entry.kind && item.recordId === entry.recordId)), entry]);
  const switchScreen = (id) => { setScreen(id); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  async function saveLocalDraft() {
    if (!base || !baseFiles || draftNeedsRebase) {
      setFlash({ tone: "warning", title: "Taslak yeniden tabanlanmalı", message: "Bu eski taslak base snapshot içermiyor. Güvenli biçimde kaydetmek veya yayınlamak için uzak sürümü yeniden yükle." });
      return;
    }
    await saveDraft({ files: draft, base, baseFiles, uploads: synchronizeUploads(draft, uploads) });
    setSavedSignature(currentSignature);
    setFlash({ tone: "success", title: "Taslak yerel olarak korundu", message: "İçerik ve seçtiğin dosyalar bu tarayıcının IndexedDB alanına kaydedildi." });
  }
  saveLocalDraftRef.current = saveLocalDraft;

  useEffect(() => {
    if (sessionState.status !== "authenticated" || !draft) return undefined;
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        void saveLocalDraftRef.current?.();
        return;
      }
      if (isEditableKeyboardTarget(event.target)) return;
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoRef.current?.();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redoRef.current?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sessionState.status, draft]);

  useEffect(() => {
    if (!hasUnsavedWork) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedWork]);
  function restoreSavedDraft() {
    const restored = restoreDraftRecord(savedDraft);
    if (!restored) return;
    setDraft(clonePortfolio(restored.files));
    setUploads(synchronizeUploads(restored.files, restored.uploads));
    setBaseFiles(restored.baseFiles ? clonePortfolio(restored.baseFiles) : null);
    setBase(restored.base);
    setDraftNeedsRebase(restored.needsRebase);
    setSavedDraft(null);
    if (restored.needsRebase) {
      setFlash({ tone: "warning", title: "Eski taslak güvenli base snapshot içermiyor", message: "Taslak görüntülenebilir ancak doğrudan doğrulanamaz veya yayınlanamaz. Uzak sürümü yeniden yükleyip değişiklikleri yeniden uygula." });
    }
  }
  function reloadRemoteSnapshot() {
    const remote = contentState.data;
    if (!remote?.files || !remote?.base) return;
    setDraft(clonePortfolio(remote.files));
    setBaseFiles(clonePortfolio(remote.files));
    setBase(remote.base);
    setUploads([]);
    setHistory({ past: [], future: [] });
    setSavedSignature(null);
    setDraftNeedsRebase(false);
    clearDraft();
    setFlash({ tone: "success", title: "Uzak sürüm yeniden yüklendi", message: "Çalışma kopyası güvenli remote snapshot ile sıfırlandı." });
  }
  function completeLocalLogout() {
    clearDraft().catch(() => {});
    setDraft(null);
    setUploads([]);
    setHistory({ past: [], future: [] });
    setSavedSignature(null);
    setSavedDraft(null);
    setSessionState({ status: "unauthenticated" });
  }
  async function logout() {
    setLogoutBusy(true);
    setFlash(null);
    try {
      await adminApi.logout(sessionState.data.csrfToken);
      completeLocalLogout();
    } catch (error) {
      if (error?.status === 401) {
        completeLocalLogout();
      } else {
        setFlash({ tone: "danger", title: "Çıkış başarısız", message: "Güvenli çıkış tamamlanamadı. Tekrar deneyin." });
      }
    } finally {
      setLogoutBusy(false);
    }
  }

  if (sessionState.status === "loading") return <AdminFrame><LoadingState label="Güvenli oturum doğrulanıyor" /></AdminFrame>;
  if (sessionState.status !== "authenticated") return <LoginScreen error={sessionState.error} />;
  if (contentState.status === "loading" || contentState.status === "idle") return <AdminFrame><LoadingState label="Doğrulanmış içerikler yükleniyor" /></AdminFrame>;
  if (contentState.status === "error" || !draft) return <AdminFrame><Notice tone="danger" title="İçerik yüklenemedi">{contentState.error?.message || "Worker güvenli biçimde isteği reddetti."}</Notice></AdminFrame>;

  const session = sessionState.data;
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div aria-hidden className="pointer-events-none fixed inset-0 opacity-50 [background:radial-gradient(circle_at_78%_4%,rgba(214,255,63,0.06),transparent_28%),radial-gradient(circle_at_8%_82%,rgba(214,255,63,0.035),transparent_24%)]" />
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col border-r border-line bg-canvas/95 p-5 backdrop-blur-xl transition-transform lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex shrink-0 items-center justify-between"><button type="button" onClick={() => switchScreen("dashboard")} className="text-left"><div className="font-display text-2xl font-semibold tracking-tight">Layellie<span className="text-accent">.</span></div><div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Portfolio Control</div></button><button type="button" onClick={() => setMobileNav(false)} className="rounded-lg p-2 text-faint hover:bg-surface lg:hidden" aria-label="Menüyü kapat"><X className="h-5 w-5" /></button></div>
        <nav className="mt-7 flex-1 space-y-5 overflow-y-auto pr-1" aria-label="Yönetim bölümleri">
          {NAVIGATION_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => switchScreen(id)}
                    aria-current={screen === id ? "page" : undefined}
                    className={`group flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition ${screen === id ? "border-accent/20 bg-accent/8 text-ink" : "border-transparent text-muted hover:border-line hover:bg-surface/60 hover:text-ink"}`}
                  >
                    <Icon className={`h-4 w-4 ${screen === id ? "text-accent" : "text-faint group-hover:text-accent"}`} />
                    {label}
                    {screen === id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_12px_rgba(214,255,63,0.8)]" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-4 shrink-0 rounded-2xl border border-line bg-surface/60 p-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-canvas">L</span><div className="min-w-0"><div className="truncate text-sm font-medium">@{session.user?.login || "Layellie"}</div><div className="text-[10px] text-faint">GitHub App session</div></div></div><button type="button" onClick={logout} disabled={logoutBusy} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-faint transition hover:bg-elevated hover:text-red-300 disabled:cursor-wait disabled:opacity-50"><LogOut className="h-3.5 w-3.5" />{logoutBusy ? "Çıkış yapılıyor…" : "Güvenli çıkış"}</button></div>
      </aside>

      <div className="relative lg:pl-[286px]">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-canvas/80 px-4 backdrop-blur-xl sm:px-7 lg:px-10"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileNav(true)} className="rounded-lg border border-line p-2 text-muted lg:hidden" aria-label="Menüyü aç"><Menu className="h-4 w-4" /></button><span className="text-sm text-muted">{NAVIGATION.find((item) => item.id === screen)?.label}</span>{pendingChangeCount > 0 && <button type="button" onClick={() => switchScreen("publish")} className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-100 transition hover:border-amber-300/60"><span className={`h-1.5 w-1.5 rounded-full ${hasUnsavedWork ? "bg-amber-300" : "bg-accent"}`} />{pendingChangeCount} değişiklik</button>}</div><div className="flex items-center gap-2"><Button variant="ghost" onClick={undoDraft} disabled={!canUndo} aria-label="Geri al" title="Geri al (Ctrl+Z)" className="px-2.5"><Undo2 className="h-4 w-4" /></Button><Button variant="ghost" onClick={redoDraft} disabled={!canRedo} aria-label="İleri al" title="İleri al (Ctrl+Y)" className="px-2.5"><Redo2 className="h-4 w-4" /></Button><Button onClick={saveLocalDraft} title="Kısayol: Ctrl+S" className="hidden sm:inline-flex"><Save className="h-4 w-4" />Yerel taslağı koru<kbd className="ml-1 hidden rounded border border-line bg-canvas/60 px-1.5 py-0.5 font-mono text-[10px] text-faint xl:inline-block">Ctrl+S</kbd></Button><Button variant="primary" onClick={() => switchScreen("publish")}><Send className="h-4 w-4" /><span className="hidden sm:inline">Yayın merkezi</span></Button></div></header>
        <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
          {savedDraft && <div className="mb-6"><Notice tone="warning" title="Bu tarayıcıda yayınlanmamış taslak bulundu"><span>{new Date(savedDraft.savedAt).toLocaleString("tr-TR")} tarihinde kaydedildi. </span><button type="button" className="font-medium text-amber-100 underline" onClick={restoreSavedDraft}>Taslağı geri yükle</button><span> · </span><button type="button" className="underline" onClick={() => { clearDraft(); setSavedDraft(null); }}>Sil</button></Notice></div>}
          {flash && <div className="mb-6"><Notice tone={flash.tone} title={flash.title}>{flash.message}</Notice></div>}
          {screen === "dashboard" && <Dashboard files={draft} baseFiles={baseFiles} base={base} onNavigate={switchScreen} onRestoreBackup={(backup, filename) => { commitDraftChange(clonePortfolio(backup.files)); setUploads([]); setFlash({ tone: "success", title: "Yedek çalışma kopyasına yüklendi", message: `${filename} şema doğrulamasından geçip yerel taslağa uygulandı. Yayınlamak için Yayın Merkezi'nde farkları incele.` }); }} />}
          {screen === "analytics" && <AnalyticsScreen files={draft} onNavigate={switchScreen} />}
          {screen === "site" && <SectionShell eyebrow="Genel site ayarları" title="Hero, kimlik ve iletişim" description="Müsaitlik durumu, rol/unvan, iletişim metinleri ve sosyal bağlantılar buradan TR/EN düzenlenir; değişiklikler JSON-LD ve llms.txt çıktısına otomatik yansır."><SiteSettingsEditor site={draft.site} onChange={(site) => updateFiles("site", site)} /></SectionShell>}
          {screen === "faq" && <SectionShell eyebrow="Sık sorulan sorular" title="SSS (FAQ) yönetimi" description="Sitedeki #sss bölümü, Google FAQPage yapısal verisi ve llms.txt için soru-cevap maddelerini TR/EN yönet."><FaqEditor site={draft.site} onChange={(site) => updateFiles("site", site)} /></SectionShell>}
          {screen === "discord" && <SectionShell eyebrow="Hero profil kartı" title="Discord canlı durum kartı" description="PP ve Banner görselleri yüklenirken tarayıcı içinde otomatik WebP ve doğru orana (1:1 / 3:1) optimize edilir."><DiscordPresencePanel site={draft.site} pendingUploads={uploads} publicSiteOrigin={session.publicSiteOrigin} onChangeSite={(site) => updateFiles("site", site)} onUpload={addUpload} onNavigate={switchScreen} /></SectionShell>}
          {screen === "about" && <SectionShell eyebrow="Genel site içeriği" title="Hakkımda bölümünü düzenle" description="Public sitedeki Hakkımda/About bölümünün canonical içeriği. Türkçe ve İngilizce ayrı düzenlenir; değişiklikler Yayın Merkezi üzerinden yayınlanır."><AboutEditor site={draft.site} onChange={(site) => updateFiles("site", site)} /></SectionShell>}
          {screen === "projects" && <ProjectsScreen projects={draft.projects} visuals={draft.visuals} pendingUploads={uploads} publicSiteOrigin={session.publicSiteOrigin} onChange={(projects) => updateFiles("projects", projects)} onUpload={addUpload} />}
          {screen === "certificates" && <CertificatesScreen certificates={draft.certificates} skills={draft.skills} onChange={(certificates) => updateFiles("certificates", certificates)} onUpload={addUpload} />}
          {screen === "skills" && <SectionShell eyebrow="Yetenek sistemi" title="Kartları ve odak alanlarını düzenle" description="Public Yetenekler bölümündeki kart hiyerarşisi önizlemede aynen kullanılır."><SkillsEditor skills={draft.skills} onChange={(skills) => updateFiles("skills", skills)} /></SectionShell>}
          {screen === "visuals" && <SectionShell eyebrow="Modüler uygulama mock-up’ı" title="Kod yazmadan proje görseli oluştur" description="Yalnız allowlist modüller render edilir; serbest HTML, CSS veya JavaScript çalıştırılmaz."><VisualBuilder visuals={draft.visuals} projects={draft.projects} onChange={(visuals) => updateFiles("visuals", visuals)} /></SectionShell>}
          {screen === "publish" && <PublishScreen draft={draft} baseFiles={baseFiles} base={base} uploads={synchronizeUploads(draft, uploads)} csrf={session.csrfToken} baseSnapshotMissing={draftNeedsRebase || !base || !baseFiles} onReloadRemote={reloadRemoteSnapshot} onConflictResolved={({ files, remoteBase, keepUploads }) => { setDraft(clonePortfolio(files)); setBaseFiles(clonePortfolio(remoteBase.files)); setBase(remoteBase.base); setDraftNeedsRebase(false); if (!keepUploads) setUploads([]); setFlash({ tone: "success", title: "Çakışma çalışma kopyasına uygulandı", message: keepUploads ? "Alan seçimleri birleştirildi; yeniden doğrulama gerekli." : "Yerel değişiklikler uzak sürümle değiştirildi." }); }} onPublished={(result) => { setBase(result.base); setDraft(clonePortfolio(result.files)); setBaseFiles(clonePortfolio(result.files)); setUploads([]); setHistory({ past: [], future: [] }); setSavedSignature(null); setDraftNeedsRebase(false); setSavedDraft(null); clearDraft(); setFlash({ tone: "success", title: "GitHub commit’i oluşturuldu", message: result.commit?.url || result.commit?.sha }); }} />}
        </main>
      </div>
    </div>
  );
}

function AdminFrame({ children }) {
  return <div className="min-h-screen bg-canvas p-5 text-ink"><div className="mx-auto mt-[12vh] max-w-xl rounded-3xl border border-line bg-surface/70 p-7">{children}</div></div>;
}

function LoginScreen({ error }) {
  const errorTitle = error?.code === "CONFIGURATION_ERROR"
    ? "Admin henüz yapılandırılmadı"
    : error?.code === "API_UNREACHABLE"
      ? "Admin API’ye bağlanılamadı"
      : "Güvenli oturum gerekli";
  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas p-5 text-ink"><div aria-hidden className="absolute inset-0 [background:radial-gradient(circle_at_50%_18%,rgba(214,255,63,0.09),transparent_34%)]" /><AdminReveal className="relative w-full max-w-lg"><Panel className="overflow-hidden p-7 sm:p-9"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/20 bg-accent/8 text-accent"><ShieldCheck className="h-6 w-6" /></div><div className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">Layellie · Secure Admin</div><h1 className="mt-3 font-display text-4xl font-semibold leading-[0.95] sm:text-5xl">Portföyünün<br />kontrol merkezi.</h1><p className="mt-5 max-w-md text-sm leading-relaxed text-muted">Yalnız yetkili <strong className="font-medium text-ink">Layellie</strong> GitHub hesabı erişebilir. Token ve secret değerleri tarayıcıya gönderilmez.</p>{error && <div className="mt-6"><Notice tone={error.code === "CONFIGURATION_ERROR" ? "warning" : "danger"} title={errorTitle}>{error.message}</Notice></div>}<a href="/auth/github" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-5 text-sm font-semibold text-canvas transition hover:bg-[#e1ff71] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"><Github className="h-4 w-4" />GitHub App ile giriş yap</a><div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-faint"><ShieldCheck className="h-3.5 w-3.5" />Same-origin · HttpOnly session · PKCE</div></Panel></AdminReveal></div>;
}

function SectionShell({ eyebrow, title, description, children }) {
  return <AdminReveal><div className="mb-8"><div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">{eyebrow}</div><h1 className="mt-3 font-display text-[clamp(2.2rem,5vw,4.2rem)] font-semibold leading-[0.92] tracking-tight">{title}</h1><p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{description}</p></div><Panel className="p-4 sm:p-6 lg:p-7">{children}</Panel></AdminReveal>;
}

function safeGithubActionsUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function formatDeployTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeDeployment(deployment) {
  const status = deployment?.status;
  const conclusion = deployment?.conclusion;
  if (status === "completed" && conclusion === "success") {
    return {
      label: "Yayında",
      detail: "Son GitHub Pages dağıtımı başarıyla tamamlandı.",
      pillClass: "border-accent/30 bg-accent/10 text-accent",
      dotClass: "bg-accent shadow-[0_0_10px_rgba(214,255,63,0.75)]",
    };
  }
  if (status === "completed" && (conclusion === "failure" || conclusion === "timed_out" || conclusion === "action_required")) {
    return {
      label: "Hata",
      detail: "Son GitHub Pages dağıtımı başarısız oldu.",
      pillClass: "border-red-400/35 bg-red-500/10 text-red-200",
      dotClass: "bg-red-400",
    };
  }
  if (status === "completed" && (conclusion === "cancelled" || conclusion === "skipped")) {
    return {
      label: "İptal edildi",
      detail: "Son dağıtım tamamlanmadan durduruldu.",
      pillClass: "border-amber-400/35 bg-amber-400/10 text-amber-100",
      dotClass: "bg-amber-300",
    };
  }
  if (status === "in_progress") {
    return {
      label: "Dağıtılıyor",
      detail: "GitHub Pages build ve deploy akışı şu an çalışıyor.",
      pillClass: "border-amber-400/35 bg-amber-400/10 text-amber-100",
      dotClass: "bg-amber-300 animate-pulse motion-reduce:animate-none",
    };
  }
  if (status === "queued" || status === "waiting" || status === "requested" || status === "pending") {
    return {
      label: "Sırada",
      detail: "GitHub Pages dağıtımı sırada bekliyor.",
      pillClass: "border-amber-400/35 bg-amber-400/10 text-amber-100",
      dotClass: "bg-amber-300 animate-pulse motion-reduce:animate-none",
    };
  }
  if (status === "not_found") {
    return {
      label: "Kayıt yok",
      detail: "main dalında henüz Deploy to GitHub Pages çalışması bulunamadı.",
      pillClass: "border-line bg-canvas/60 text-muted",
      dotClass: "bg-faint",
    };
  }
  return {
    label: "Bilinmiyor",
    detail: "Dağıtım durumu henüz alınmadı.",
    pillClass: "border-line bg-canvas/60 text-muted",
    dotClass: "bg-faint",
  };
}

function Dashboard({ files, baseFiles, base, onNavigate, onRestoreBackup }) {
  const [deploy, setDeploy] = useState({ status: "loading", data: null, error: null });
  const [commits, setCommits] = useState({ status: "loading", items: [], error: null });
  const loadDeployment = async () => {
    setDeploy((current) => ({ ...current, status: "loading", error: null }));
    try {
      const data = await adminApi.deployment();
      if (!data || typeof data !== "object") {
        setDeploy({ status: "error", data: null, error: "Deploy durumu şu anda alınamadı." });
        return;
      }
      setDeploy({ status: "ready", data, error: null, updatedAt: new Date() });
    } catch (error) {
      setDeploy((current) => ({
        status: "error",
        data: current.data,
        error: error?.status === 429 ? "Çok sık yenilendi; biraz sonra tekrar dene." : "Deploy durumu şu anda alınamadı.",
        updatedAt: current.updatedAt,
      }));
    }
  };
  const loadCommits = async () => {
    if (typeof adminApi.commits !== "function") {
      setCommits({ status: "error", items: [], error: "Commit geçmişi alınamadı." });
      return;
    }
    setCommits((current) => ({ ...current, status: "loading", error: null }));
    try {
      const data = await adminApi.commits();
      if (!data || !Array.isArray(data.commits)) {
        setCommits({ status: "error", items: [], error: "Commit geçmişi şu anda alınamadı." });
        return;
      }
      setCommits({ status: "ready", items: data.commits, error: null, updatedAt: new Date() });
    } catch (error) {
      setCommits((current) => ({
        status: "error",
        items: current.items,
        error: error?.status === 429 ? "Çok sık yenilendi; biraz sonra tekrar dene." : "Commit geçmişi şu anda alınamadı.",
        updatedAt: current.updatedAt,
      }));
    }
  };
  useEffect(() => {
    void loadDeployment();
    void loadCommits();
  }, []);
  const stats = [
    { label: "Yayındaki projeler", value: files.projects.items.filter((item) => item.publicationStatus === "published").length, icon: ClipboardList, to: "projects" },
    { label: "Sertifikalar", value: files.certificates.items.length, icon: Award, to: "certificates" },
    { label: "Yetenek kartları", value: files.skills.skillCards.length, icon: Boxes, to: "skills" },
    { label: "Görsel presetleri", value: files.visuals.presets.length, icon: Sparkles, to: "visuals" },
  ];
  return (
    <AdminReveal>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">Layellie yönetim alanı</div>
          <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,4.5rem)] font-semibold leading-[0.88] tracking-tight">İçerik.<br />Görsel. Yayın.</h1>
        </div>
        <div className="rounded-2xl border border-line bg-surface/60 px-4 py-2 font-mono text-[10px] text-faint">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          main · {base?.commitSha?.slice(0, 7) || "yerel"}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, to }, index) => (
          <button key={label} type="button" onClick={() => onNavigate(to)} className="group rounded-3xl border border-line bg-surface/55 p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-accent/30 hover:bg-surface">
            <div className="flex items-start justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line bg-canvas/70 text-accent"><Icon className="h-4 w-4" /></span>
              <span className="font-mono text-[10px] text-faint">0{index + 1}</span>
            </div>
            <div className="mt-4 font-display text-4xl font-semibold tracking-tight">{value}</div>
            <div className="mt-1 text-xs text-muted">{label}</div>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <DeployStatusPanel deploy={deploy} baseCommit={base?.commitSha} onRefresh={() => void loadDeployment()} />
        <ContentHealthPanel files={files} baseFiles={baseFiles} base={base} onNavigate={onNavigate} onRestoreBackup={onRestoreBackup} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        <ReleaseDownloadsPanel projects={files.projects} githubUser={files.site?.shared?.identity?.githubUser || "Layellie"} />
        <RecentCommitsPanel commits={commits} onRefresh={() => void loadCommits()} />
      </div>
    </AdminReveal>
  );
}

function AnalyticsScreen({ files, onNavigate }) {
  const [analytics, setAnalytics] = useState({ status: "loading", data: null });
  const [range, setRange] = useState("7d");
  const loadAnalytics = async (nextRange = range) => {
    setAnalytics((current) => ({ ...current, status: "loading" }));
    try { setAnalytics({ status: "ready", data: await adminApi.analytics(nextRange), updatedAt: new Date() }); } catch { setAnalytics({ status: "error", data: null }); }
  };
  useEffect(() => {
    void loadAnalytics();
  }, []);
  return (
    <SectionShell
      eyebrow="Gizlilik dostu ölçüm"
      title="Ziyaret analitiği & trafik"
      description="Çerezsiz, günlük yenilenen anonim sayaçlar. Kişisel veri, IP veya ham yönlendirici URL'si kaydedilmez."
    >
      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <AnalyticsPanel analytics={analytics} range={range} onRange={(value) => { setRange(value); void loadAnalytics(value); }} onRefresh={() => void loadAnalytics()} />
        <div className="space-y-5">
          <ReleaseDownloadsPanel projects={files.projects} githubUser={files.site?.shared?.identity?.githubUser || "Layellie"} />
          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Proje görünümü</h2>
              <Button variant="ghost" onClick={() => onNavigate("projects")}>Tümünü düzenle <ExternalLink className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="mt-4 space-y-2">
              {files.projects.items.map((project, index) => (
                <button key={project.id} type="button" onClick={() => onNavigate("projects")} className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-canvas/40 p-3 text-left transition hover:border-accent/25">
                  <span className="font-mono text-[10px] text-accent">0{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{project.tr.name}</div>
                    <div className="mt-1 truncate text-xs text-faint">{project.tr.type}</div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] ${project.publicationStatus === "published" ? "border-accent/20 text-accent" : "border-line text-faint"}`}>{project.publicationStatus}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </SectionShell>
  );
}

function resolveProfilePreviewSrc(path, pendingFileUrl, publicSiteOrigin) {
  if (pendingFileUrl) return pendingFileUrl;
  if (!path || /\/pending\.[a-z0-9]+$/i.test(path)) return "";
  if (publicSiteOrigin && path.startsWith("/")) {
    return `${publicSiteOrigin.replace(/\/$/, "")}${path}`;
  }
  return path;
}

function DiscordPresencePanel({ site, pendingUploads = [], publicSiteOrigin, onChangeSite, onUpload, onNavigate }) {
  const [uploadError, setUploadError] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [previewUrls, setPreviewUrls] = useState({ avatar: "", banner: "" });
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const current = {
    ...DEFAULT_DISCORD_PRESENCE,
    ...(site?.shared?.discordPresence || {}),
  };
  const pendingAvatarFile = pendingUploads.find((entry) => entry.kind === "profile" && entry.recordId === "avatar")?.file || null;
  const pendingBannerFile = pendingUploads.find((entry) => entry.kind === "profile" && entry.recordId === "banner")?.file || null;

  useEffect(() => {
    const avatarUrl = pendingAvatarFile ? URL.createObjectURL(pendingAvatarFile) : "";
    const bannerUrl = pendingBannerFile ? URL.createObjectURL(pendingBannerFile) : "";
    setPreviewUrls({ avatar: avatarUrl, banner: bannerUrl });
    return () => {
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
      if (bannerUrl) URL.revokeObjectURL(bannerUrl);
    };
  }, [pendingAvatarFile, pendingBannerFile]);

  const avatarSrc = resolveProfilePreviewSrc(current.avatarPath, previewUrls.avatar, publicSiteOrigin);
  const bannerSrc = resolveProfilePreviewSrc(current.bannerPath, previewUrls.banner, publicSiteOrigin);

  const trimmedId = String(current.userId || "").trim();
  const idValid = DISCORD_USER_ID_REGEX.test(trimmedId);
  const idError =
    current.enabled && !idValid
      ? "Canlı durum açıkken 17-20 haneli geçerli bir Discord User ID girilmelidir."
      : trimmedId && !idValid
        ? "Discord User ID yalnızca 17-20 haneli rakamlardan oluşmalıdır."
        : undefined;

  const updatePresence = (patch) => {
    if (typeof onChangeSite !== "function" || !site) return;
    onChangeSite({
      ...site,
      shared: {
        ...site.shared,
        discordPresence: {
          ...current,
          ...patch,
        },
      },
    });
  };

  async function handleProfileImage(slot, file) {
    if (!file) return;
    try {
      await validateFileSignature(file, "profile");
      const optimized = await optimizeImageUpload(file, slot === "avatar" ? "profile-avatar" : "profile-banner");
      const finalFile = optimized.file;
      if (optimized.optimized) {
        await validateFileSignature(finalFile, "profile");
        setUploadNote(
          `${slot === "avatar" ? "PP" : "Banner"} WebP'ye optimize edildi (${optimized.width}×${optimized.height} · ${(optimized.originalBytes / 1024).toFixed(1)} KiB → ${(optimized.finalBytes / 1024).toFixed(1)} KiB)`,
        );
      } else {
        setUploadNote("");
      }
      const meta = mediaTypeForMetadata("profile", finalFile.name, finalFile.type);
      if (!meta) throw new Error("Desteklenmeyen görsel formatı (PNG, JPG, WebP veya GIF seç).");
      setUploadError("");
      const pendingPath = `/media/profile/${slot}/pending.${meta.outputExtension}`;
      updatePresence(slot === "avatar" ? { avatarPath: pendingPath } : { bannerPath: pendingPath });
      onUpload?.({ kind: "profile", recordId: slot, file: finalFile });
    } catch (error) {
      setUploadNote("");
      setUploadError(error?.message || "Görsel doğrulanamadı.");
    }
  }

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Radio className="h-4 w-4 text-accent" />
          <h2 className="font-display text-xl font-semibold">Discord profil kartı (Lanyard)</h2>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${
            current.enabled && idValid
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-line bg-canvas/60 text-faint"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${current.enabled && idValid ? "bg-accent" : "bg-faint"}`} />
          {current.enabled ? "Aktif" : "Kapalı"}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted">
        Hero’da <strong className="font-medium text-ink">Samet Kaşmer</strong> başlığının sağında kendi PP ve Banner’ınla Discord tarzı canlı kart gösterir. Discord’da çevrimiçi, boşta veya meşgul ol fark etmez; sitede her zaman <strong className="font-medium text-emerald-300">Çevrimiçi</strong> görünür.
      </p>

      {/* Canlı profil kartı önizlemesi */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-[#1f1f24] bg-[#050507]">
        <div className="aspect-[3/1] w-full overflow-hidden bg-[radial-gradient(circle_at_82%_20%,rgba(214,255,63,0.18),transparent_58%),linear-gradient(135deg,#0f0f14_0%,#050507_100%)]">
          {bannerSrc && <img src={bannerSrc} alt="Banner önizleme" className="h-full w-full object-cover" />}
        </div>
        <div className="px-4 pb-3.5">
          <div className="-mt-8">
            <div className="relative h-14 w-14 shrink-0 rounded-full border-4 border-[#050507] bg-[#0d0d11]">
              {avatarSrc ? (
                <img src={avatarSrc} alt="PP önizleme" className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-lg font-semibold text-accent">L</span>
              )}
              <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#050507] ${current.enabled ? "bg-emerald-400" : "bg-[#52525b]"}`} />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="truncate font-display text-base font-semibold leading-tight text-ink">{site?.shared?.identity?.name || "Samet Kaşmer"}</div>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${current.enabled ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-[#1f1f24] bg-[#0a0a0d] text-faint"}`}>
              {current.enabled ? "Çevrimiçi" : "Kart kapalı"}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2 font-mono text-[11px] text-faint">
            <span>@{(site?.shared?.identity?.handle || "layellie").toLowerCase()}</span>
            <span className="text-muted">Bursa · UTC+3</span>
          </div>
          {site?.tr?.hero?.role && (
            <p className="mt-1.5 truncate text-xs text-muted">{site.tr.hero.role}</p>
          )}
          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-[#1f1f24] bg-[#0a0a0d] px-3 py-2 font-mono text-[11px] text-ink">
            <span className="tracking-[0.14em]">C 0 D 3</span>
            <span className="text-[10px] text-faint">
              {current.professionalFilter ? "Sadece IDE" : "IDE · Spotify · Oyun"}
            </span>
          </div>
        </div>
      </div>

      {/* PP & Banner yükleme */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-canvas/40 px-3 py-2.5">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-label="Profil fotoğrafı seç"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void handleProfileImage("avatar", file);
            }}
          />
          <div className="min-w-0">
            <div className="text-xs font-medium text-ink">Profil Fotoğrafı (PP)</div>
            <div className="truncate text-[10px] text-faint">{current.avatarPath ? "Yüklü · 1:1 önerilir (112×112 WebP)" : "Varsayılan L monogram"}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" className="min-h-8 px-2.5 text-xs" onClick={() => avatarInputRef.current?.click()}>
              <ImageUp className="h-3.5 w-3.5" />
              Seç
            </Button>
            {current.avatarPath && (
              <Button variant="ghost" aria-label="Profil fotoğrafını kaldır" className="min-h-8 px-2 text-xs text-red-300" onClick={() => updatePresence({ avatarPath: "" })}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-canvas/40 px-3 py-2.5">
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-label="Banner görseli seç"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void handleProfileImage("banner", file);
            }}
          />
          <div className="min-w-0">
            <div className="text-xs font-medium text-ink">Banner Görseli</div>
            <div className="truncate text-[10px] text-faint">{current.bannerPath ? "Yüklü · 3:1 önerilir (648×216 WebP)" : "Varsayılan koyu-lime geçiş"}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" className="min-h-8 px-2.5 text-xs" onClick={() => bannerInputRef.current?.click()}>
              <ImageUp className="h-3.5 w-3.5" />
              Seç
            </Button>
            {current.bannerPath && (
              <Button variant="ghost" aria-label="Banner görselini kaldır" className="min-h-8 px-2 text-xs text-red-300" onClick={() => updatePresence({ bannerPath: "" })}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {uploadNote && <div className="mt-2 font-mono text-[11px] text-accent">✓ {uploadNote}</div>}
      {uploadError && <div className="mt-2 text-xs text-red-300">{uploadError}</div>}

      <div className="mt-3 space-y-2.5">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-canvas/40 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-ink">Canlı durum rozeti</div>
            <div className="mt-0.5 text-xs text-faint">Kapalıyken kart gizlenir, dış istek atılmaz ve DOM’a eklenmez.</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={current.enabled}
            aria-label="Discord canlı durum rozeti"
            onClick={() => updatePresence({ enabled: !current.enabled })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
              current.enabled ? "border-accent bg-accent" : "border-line bg-elevated"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full transition-transform ${
                current.enabled ? "translate-x-5.5 bg-canvas" : "translate-x-1 bg-muted"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-canvas/40 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-ink">Profesyonellik filtresi</div>
            <div className="mt-0.5 text-xs text-faint">
              Açıkken oyunlar ve Spotify gizlenir; yalnızca IDE (VS Code, Visual Studio, Rider vb.) gösterilir.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={current.professionalFilter}
            aria-label="Profesyonellik filtresi"
            onClick={() => updatePresence({ professionalFilter: !current.professionalFilter })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
              current.professionalFilter ? "border-accent bg-accent" : "border-line bg-elevated"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full transition-transform ${
                current.professionalFilter ? "translate-x-5.5 bg-canvas" : "translate-x-1 bg-muted"
              }`}
            />
          </button>
        </div>

        <TextField
          label="Discord User ID"
          hint="17-20 haneli sayı · Geliştirici Modu > ID Kopyala"
          value={current.userId}
          onChange={(event) => updatePresence({ userId: event.target.value })}
          placeholder="Örn. 123456789012345678"
          inputMode="numeric"
          maxLength={20}
          error={idError}
        />

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-[11px] text-faint">
          <button
            type="button"
            onClick={() => onNavigate("publish")}
            className="text-accent underline-offset-4 hover:underline"
          >
            Değişikliği yayınla →
          </button>
        </div>
      </div>
    </Panel>
  );
}

function RecentCommitsPanel({ commits, onRefresh }) {
  const isLoading = commits.status === "loading";
  const hasItems = commits.items.length > 0;
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <History className="h-4 w-4 text-accent" />
          <h2 className="font-display text-xl font-semibold">Son yayın geçmişi</h2>
          <span className="rounded-full border border-line bg-canvas/60 px-2.5 py-0.5 font-mono text-[10px] text-faint">
            main · son 5 commit
          </span>
        </div>
        <Button variant="ghost" aria-label="Commit geçmişini yenile" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin motion-reduce:animate-none" : ""}`} />
          Yenile
        </Button>
      </div>

      {hasItems ? (
        <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-canvas/40">
          {commits.items.map((item) => {
            const url = safeGithubActionsUrl(item.url);
            const dateLabel = formatDeployTimestamp(item.date);
            return (
              <div key={item.sha} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{item.message}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[11px] text-faint">
                    <span className="inline-flex items-center gap-1 text-accent/90">
                      <GitCommitHorizontal className="h-3.5 w-3.5" />
                      {item.shortSha || item.sha?.slice(0, 7)}
                    </span>
                    {item.author && (
                      <>
                        <span>·</span>
                        <span>{item.author}</span>
                      </>
                    )}
                    {dateLabel && (
                      <>
                        <span>·</span>
                        <span>{dateLabel}</span>
                      </>
                    )}
                  </div>
                </div>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[11px] text-muted transition hover:border-accent/40 hover:text-ink"
                  >
                    GitHub
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : isLoading ? (
        <div className="mt-4 text-xs text-muted">Son commit geçmişi alınıyor…</div>
      ) : (
        <div className="mt-4 text-xs text-amber-100">{commits.error || "Commit geçmişi şu anda alınamadı."}</div>
      )}
      {hasItems && commits.error && <div className="mt-2 text-xs text-amber-100">{commits.error}</div>}
    </Panel>
  );
}

function ContentHealthPanel({ files, baseFiles, base, onNavigate, onRestoreBackup }) {
  const [exportedFile, setExportedFile] = useState(null);
  const [importError, setImportError] = useState(null);
  const [pendingBackup, setPendingBackup] = useState(null);
  const fileInputRef = useRef(null);
  const report = useMemo(() => buildContentHealthReport(files), [files]);

  const badge =
    report.status === "error"
      ? { label: "Hata var", pill: "border-red-400/35 bg-red-500/10 text-red-200", dot: "bg-red-400" }
      : report.status === "attention"
        ? { label: "Dikkat", pill: "border-amber-400/35 bg-amber-400/10 text-amber-100", dot: "bg-amber-300" }
        : { label: "Sağlıklı", pill: "border-accent/30 bg-accent/10 text-accent", dot: "bg-accent shadow-[0_0_10px_rgba(214,255,63,0.75)]" };

  function downloadBackup() {
    const backup = createPortfolioBackup(files, base);
    const blob = new Blob([backup.json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = backup.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setImportError(null);
    setExportedFile(backup.filename);
  }

  async function handleBackupSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportError(null);
    setExportedFile(null);
    if (file.size > MAX_BACKUP_BYTES) {
      setImportError("Yedek dosyası 2 MB sınırını aşıyor.");
      return;
    }
    try {
      const text = await file.text();
      const backup = parsePortfolioBackup(text);
      const summary = createDiffSummary(baseFiles || files, backup.files);
      const changedCount = Object.values(summary).reduce(
        (total, group) => total + group.added.length + group.changed.length + group.removed.length,
        0,
      );
      setPendingBackup({ backup, filename: file.name, changedCount });
    } catch (error) {
      setImportError(error?.message || "Yedek dosyası okunamadı.");
    }
  }

  const metrics = [
    { label: "Hata", value: report.counts.errors, warn: report.counts.errors > 0, danger: true, to: "publish" },
    { label: "Çeviri uyarısı", value: report.counts.warnings, warn: report.counts.warnings > 0, to: "publish" },
    { label: "Taslak proje", value: report.counts.drafts, warn: report.counts.drafts > 0, to: "projects" },
    { label: "Bekleyen medya", value: report.counts.pendingMedia, warn: report.counts.pendingMedia > 0, to: "publish" },
  ];

  const backupExportedLabel = pendingBackup?.backup.exportedAt
    ? new Date(pendingBackup.backup.exportedAt).toLocaleString("tr-TR")
    : null;

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <HeartPulse className="h-4 w-4 text-accent" />
          <h2 className="font-display text-xl font-semibold">İçerik sağlığı & yedek</h2>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${badge.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            aria-label="JSON yedek dosyası seç"
            className="hidden"
            onChange={(event) => void handleBackupSelected(event)}
          />
          <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Yedekten yükle
          </Button>
          <Button variant="ghost" onClick={downloadBackup}>
            <Download className="h-4 w-4" />
            JSON yedek indir
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map((metric) => (
          <button
            key={metric.label}
            type="button"
            onClick={() => onNavigate(metric.to)}
            className="rounded-xl border border-line bg-canvas/45 px-3 py-2 text-left transition hover:border-accent/35"
          >
            <div className={`font-display text-xl font-semibold ${metric.warn ? (metric.danger ? "text-red-300" : "text-amber-200") : "text-ink"}`}>
              {metric.value}
            </div>
            <div className="mt-0.5 text-[10px] text-muted">{metric.label}</div>
          </button>
        ))}
      </div>

      {importError ? (
        <div className="mt-3 text-xs text-red-300">{importError}</div>
      ) : exportedFile ? (
        <div className="mt-3 truncate font-mono text-[11px] text-accent">
          ✓ Yedek indirildi: {exportedFile}
        </div>
      ) : (
        <div className="mt-3 text-[11px] text-faint">
          {report.blockingErrors.length > 0
            ? `Öncelikli kontrol: ${report.blockingErrors.slice(0, 2).join(" · ")}`
            : report.translationWarnings.length > 0
              ? `Uyarı: ${report.translationWarnings.slice(0, 2).join(" · ")}`
              : "Tüm yayınlanan içerik, URL ve çeviri alanları temiz."}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingBackup)}
        title="Yedekten çalışma kopyasına yükle"
        description={
          pendingBackup
            ? `${pendingBackup.filename}${backupExportedLabel ? ` (${backupExportedLabel})` : ""} doğrulandı; mevcut uzak sürümle karşılaştırıldığında ${pendingBackup.changedCount} değişiklik içeriyor. Mevcut yerel taslak bu yedekle değiştirilecek; işlem otomatik yayınlanmaz, Yayın Merkezi'nde farkları inceleyip onaylayabilirsin.`
            : ""
        }
        confirmLabel="Taslağa yükle"
        onClose={() => setPendingBackup(null)}
        onConfirm={() => {
          if (!pendingBackup) return;
          onRestoreBackup?.(pendingBackup.backup, pendingBackup.filename);
          setPendingBackup(null);
        }}
      />
    </Panel>
  );
}

function DeployStatusPanel({ deploy, baseCommit, onRefresh }) {
  const data = deploy.data;
  const info = describeDeployment(data);
  const actionsUrl = safeGithubActionsUrl(data?.url);
  const shortSha = (data?.commit || baseCommit || "").slice(0, 7);
  const timestamp = formatDeployTimestamp(data?.updatedAt || data?.createdAt);
  const isLoading = deploy.status === "loading";
  const showData = Boolean(data);
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <Rocket className="h-4 w-4 text-accent" />
            <h2 className="font-display text-xl font-semibold">Canlı deploy durumu</h2>
            {showData && (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${info.pillClass}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${info.dotClass}`} />
                {info.label}
              </span>
            )}
            {!showData && isLoading && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas/60 px-2.5 py-0.5 text-[11px] text-muted">
                Kontrol ediliyor…
              </span>
            )}
          </div>
          {showData ? (
            <div className="mt-2 space-y-1">
              <div className="truncate text-sm text-ink">{data.commitMessage || info.detail}</div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-faint">
                <span>{data.name || "Deploy to GitHub Pages"}</span>
                {shortSha && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <GitCommitHorizontal className="h-3.5 w-3.5 text-accent/80" />
                      {shortSha}
                    </span>
                  </>
                )}
                {timestamp && (
                  <>
                    <span>·</span>
                    <span>{timestamp}</span>
                  </>
                )}
                {deploy.updatedAt && (
                  <>
                    <span>·</span>
                    <span>Kontrol: {deploy.updatedAt.toLocaleTimeString("tr-TR")}</span>
                  </>
                )}
              </div>
              {deploy.error && <div className="pt-1 text-xs text-amber-100">{deploy.error}</div>}
            </div>
          ) : isLoading ? (
            <div className="mt-2 text-xs text-muted">GitHub Actions dağıtım durumu alınıyor…</div>
          ) : (
            <div className="mt-2 text-xs text-amber-100">{deploy.error || "Deploy durumu şu anda alınamadı."}</div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actionsUrl && (
            <a
              href={actionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line bg-elevated px-3.5 text-xs font-medium text-ink transition hover:border-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              GitHub Actions
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <Button variant="ghost" aria-label="Deploy durumunu yenile" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin motion-reduce:animate-none" : ""}`} />
            Yenile
          </Button>
        </div>
      </div>
    </Panel>
  );
}

const SOURCE_LABELS = [
  { key: "direct", label: "Direkt" },
  { key: "google", label: "Google" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
  { key: "social", label: "Sosyal" },
  { key: "other", label: "Diğer" },
];

function AnalyticsPanel({ analytics, range, onRange, onRefresh }) {
  const data = analytics.data;
  const maximum = Math.max(1, ...(data?.days || []).map((day) => day.uniqueVisitors));
  const periodLabel = data?.range === "30d" ? "Son 30 gün" : "Son 7 gün";
  let trendBadge = null;
  if (data?.range === "7d" && typeof data.previousTotal === "number") {
    if (typeof data.changePercent === "number") {
      const prefix = data.changePercent > 0 ? "+" : "";
      const tone = data.changePercent > 0
        ? "border-accent/30 bg-accent/10 text-accent"
        : data.changePercent < 0
          ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
          : "border-line bg-canvas/60 text-faint";
      trendBadge = { label: `${prefix}%${data.changePercent}`, tone, title: `Önceki 7 gün: ${data.previousTotal}` };
    } else if (data.total > 0) {
      trendBadge = { label: "Yeni", tone: "border-accent/30 bg-accent/10 text-accent", title: "Önceki 7 gün: 0" };
    }
  }
  const sourceEntries = data?.sources
    ? SOURCE_LABELS.map((item) => ({ ...item, count: Number(data.sources[item.key] || 0) }))
    : [];
  const sourceMax = Math.max(1, ...sourceEntries.map((item) => item.count));
  const langTr = Number(data?.languages?.tr || 0);
  const langEn = Number(data?.languages?.en || 0);
  const langTotal = Math.max(1, langTr + langEn);
  function exportCsv() {
    if (!data) return;
    const exported = createAnalyticsCsv(data);
    const blob = new Blob([exported.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exported.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-semibold">Ziyaret analitiği</h2>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Ziyaretler günlük ve anonim olarak ölçülür. Aynı tarayıcı aynı gün yalnız bir kez sayılır; farklı günlerdeki kayıtlar birbirine bağlanmaz.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="ghost" aria-label="Analitiği CSV olarak indir" title="CSV indir" disabled={analytics.status !== "ready"} onClick={exportCsv}><Download className="h-4 w-4" /></Button>
          <Button variant="ghost" aria-label="Analitiği yenile" onClick={onRefresh}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant={range === "7d" ? "primary" : "ghost"} onClick={() => onRange("7d")}>7 gün</Button>
        <Button variant={range === "30d" ? "primary" : "ghost"} onClick={() => onRange("30d")}>30 gün</Button>
      </div>
      {analytics.status === "loading" && <div className="mt-4 text-sm text-muted">Analitik yükleniyor…</div>}
      {analytics.status === "error" && <div className="mt-4 text-sm text-amber-100">Analitik şu anda alınamadı.</div>}
      {analytics.status === "ready" && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <AnalyticsStat label="Bugünkü tekil" value={data.today.uniqueVisitors} icon={BarChart3} />
            <AnalyticsStat label="Masaüstü" value={data.today.desktop} icon={Monitor} />
            <AnalyticsStat label="Mobil / tablet" value={data.today.mobileTablet} icon={Smartphone} />
            <AnalyticsStat label={periodLabel} value={data.total} icon={CheckCircle2} badge={trendBadge} />
          </div>
          <div className="mt-4 flex h-16 items-end gap-1" role="img" aria-label={`${data.range} için ziyaretçi trendi, toplam ${data.total}`}>
            {data.days.map((day) => (
              <div key={day.day} className="min-w-1 flex-1 rounded-t bg-accent/70 transition motion-reduce:transition-none" style={{ height: `${Math.max(6, (day.uniqueVisitors / maximum) * 100)}%` }} title={`${day.day}: ${day.uniqueVisitors}`} />
            ))}
          </div>

          {sourceEntries.length > 0 && (
            <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <div>
                <div className="mb-2.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-faint">
                  <Globe className="h-3.5 w-3.5 text-accent" />
                  Trafik kaynakları ({periodLabel})
                </div>
                <div className="space-y-2">
                  {sourceEntries.map((item) => (
                    <div key={item.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted">{item.label}</span>
                        <span className="font-mono tabular-nums text-ink">{item.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-canvas/80">
                        <div className="h-full rounded-full bg-accent/75" style={{ width: `${item.count > 0 ? Math.max(6, (item.count / sourceMax) * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2.5 font-mono text-[10px] uppercase tracking-wider text-faint">
                  Dil dağılımı ({periodLabel})
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: "Türkçe (TR)", count: langTr },
                    { label: "English (EN)", count: langEn },
                  ].map((item) => {
                    const pct = langTr + langEn > 0 ? Math.round((item.count / langTotal) * 100) : 0;
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted">{item.label}</span>
                          <span className="font-mono tabular-nums text-ink">{item.count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-canvas/80">
                          <div className="h-full rounded-full bg-accent/75" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 text-[10px] text-faint">Son güncelleme: {analytics.updatedAt?.toLocaleTimeString("tr-TR")}</div>
        </>
      )}
    </Panel>
  );
}

function AnalyticsStat({ label, value, icon: Icon, badge }) { return <div className="rounded-xl border border-line bg-canvas/40 p-2.5"><div className="flex items-center justify-between gap-2"><Icon className="h-3.5 w-3.5 text-accent" />{badge && <span title={badge.title} className={`rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-medium ${badge.tone}`}>{badge.label}</span>}</div><div className="mt-2 font-display text-2xl">{value}</div><div className="mt-1 text-[10px] text-muted">{label}</div></div>; }

function ProjectsScreen({ projects, visuals, pendingUploads, publicSiteOrigin, onChange, onUpload }) {
  const [selectedId, setSelectedId] = useState(projects.items[0]?.id);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const selected = projects.items.find((item) => item.id === selectedId) || projects.items[0];
  const replaceItems = (items) => onChange({ ...projects, items });
  const selectedPresetId = selected?.shared.visual.mode === "builder" ? selected.shared.visual.visualId : null;
  const add = () => { const item = createProject(projects.items, visuals.presets, selectedPresetId); replaceItems([...projects.items, item]); setSelectedId(item.id); };
  const duplicate = () => { const next = duplicateProject(projects.items, selected.id, visuals.presets, selectedPresetId); replaceItems(next); setSelectedId(next[projects.items.findIndex((item) => item.id === selected.id) + 1].id); };
  return <SectionShell eyebrow="Proje yönetimi" title="Projelerini kod yazmadan yönet" description="Ortak alanlar tek yerde, Türkçe ve İngilizce içerikler aynı kayıt içinde tutulur."><div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]"><div><div className="flex gap-2"><Button variant="primary" className="flex-1" onClick={add}><Plus className="h-4 w-4" />Yeni proje</Button><Button disabled={!selected} onClick={duplicate} aria-label="Projeyi kopyala"><Copy className="h-4 w-4" /></Button></div><div className="mt-4"><SortableList items={projects.items} selectedId={selected?.id} onMove={(from, to) => replaceItems(moveItem(projects.items, from, to))} renderItem={(item) => <button type="button" onClick={() => setSelectedId(item.id)} className="flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left"><Eye className="h-4 w-4 shrink-0 text-accent" /><span className="min-w-0 flex-1"><span className="block truncate text-sm">{item.tr.name}</span><span className="mt-0.5 block text-[10px] text-faint">{item.publicationStatus}</span></span></button>} /></div></div>{selected && <div className="min-w-0"><div className="mb-5 flex justify-end"><Button variant="danger" onClick={() => setDeleteTarget(selected.id)}><Trash2 className="h-4 w-4" />Projeyi sil</Button></div><ProjectEditor project={selected} presets={visuals.presets} pendingUpload={pendingUploads.find((upload) => upload.kind === "screenshot" && upload.recordId === selected.id)} publicSiteOrigin={publicSiteOrigin} onUpload={onUpload} onChange={(next) => replaceItems(projects.items.map((item) => item.id === selected.id ? next : item))} /></div>}</div><ConfirmDialog open={Boolean(deleteTarget)} title="Projeyi sil" description="Proje ve ona ait içerik taslaktan kaldırılacak. Medya dosyası ayrıca açıkça seçilmedikçe depodan silinmez." confirmLabel="Projeyi sil" danger onClose={() => setDeleteTarget(null)} onConfirm={() => { const next = projects.items.filter((item) => item.id !== deleteTarget); replaceItems(next); setSelectedId(next[0]?.id); setDeleteTarget(null); }} /></SectionShell>;
}

function CertificatesScreen({ certificates, skills, onChange, onUpload }) {
  const [selectedId, setSelectedId] = useState(certificates.items[0]?.id);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const selected = certificates.items.find((item) => item.id === selectedId) || certificates.items[0];
  const options = useMemo(() => certificateSkillOptions(skills), [skills]);
  const replaceItems = (items) => onChange({ ...certificates, items });
  const add = () => { const item = createCertificate(certificates.items, options[0]?.id || null); replaceItems([...certificates.items, item]); setSelectedId(item.id); };
  return <SectionShell eyebrow="Sertifika yönetimi" title="Belgeleri ve ilişkileri düzenle" description="Mevcut PDF yolları korunur; yeni dosyalar tür, boyut ve imza doğrulamasından geçer."><div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]"><div><Button variant="primary" className="w-full" onClick={add}><Plus className="h-4 w-4" />Yeni sertifika</Button><div className="mt-4"><SortableList items={certificates.items} selectedId={selected?.id} onMove={(from, to) => replaceItems(moveItem(certificates.items, from, to))} renderItem={(item) => <button type="button" onClick={() => setSelectedId(item.id)} className="flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left"><Award className="h-4 w-4 shrink-0 text-accent" /><span className="min-w-0 flex-1 truncate text-sm">{item.tr.title}</span></button>} /></div></div>{selected && <div><div className="mb-5 flex justify-end"><Button variant="danger" onClick={() => setDeleteTarget(selected.id)}><Trash2 className="h-4 w-4" />Sertifikayı sil</Button></div><CertificateEditor certificate={selected} skillOptions={options} onUpload={onUpload} onChange={(next) => replaceItems(certificates.items.map((item) => item.id === selected.id ? next : item))} /></div>}</div><ConfirmDialog open={Boolean(deleteTarget)} title="Sertifikayı sil" description="Kayıt taslaktan kaldırılacak. Mevcut PDF dosyası otomatik silinmez." confirmLabel="Sertifikayı sil" danger onClose={() => setDeleteTarget(null)} onConfirm={() => { const next = certificates.items.filter((item) => item.id !== deleteTarget); replaceItems(next); setSelectedId(next[0]?.id); setDeleteTarget(null); }} /></SectionShell>;
}

function PublishScreen({ draft, baseFiles, base, uploads, csrf, baseSnapshotMissing, onReloadRemote, onPublished, onConflictResolved }) {
  const [validation, setValidation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [deployment, setDeployment] = useState(null);
  const [conflict, setConflict] = useState(null);
  const summary = useMemo(() => createDiffSummary(baseFiles || bundledFiles, draft), [baseFiles, draft]);
  const { warnings, errors: blockingErrors } = publicationIssues(draft);
  async function validate() {
    if (baseSnapshotMissing) return;
    setBusy(true); setError(null); setValidation(null);
    try {
      const local = validatePortfolio(draft);
      const remote = await adminApi.validate({ files: local.files, base, media: uploads }, csrf);
      setValidation(remote);
    } catch (nextError) { setError(nextError); } finally { setBusy(false); }
  }
  async function publish() {
    if (baseSnapshotMissing) return;
    setConfirm(false); setBusy(true); setError(null);
    try {
      const result = await adminApi.publish({ files: draft, base, media: uploads }, csrf);
      onPublished(result); setValidation(null);
      if (result.commit?.sha) setDeployment({ commit: result.commit.sha, status: "unknown" });
    } catch (nextError) { setError(nextError); } finally { setBusy(false); }
  }
  async function loadConflict() {
    setBusy(true);
    try {
      const remoteBase = await adminApi.content();
      const merge = mergePortfolioFiles(baseFiles, draft, remoteBase.files);
      setConflict({ remoteBase, merge, selections: {} });
    } catch (nextError) { setError(nextError); } finally { setBusy(false); }
  }
  function applyConflict(useRemoteOnly = false) {
    if (useRemoteOnly) {
      onConflictResolved({ files: conflict.remoteBase.files, remoteBase: conflict.remoteBase, keepUploads: false });
      setConflict(null); setError(null); setValidation(null); return;
    }
    const resolved = mergePortfolioFiles(baseFiles, draft, conflict.remoteBase.files, conflict.selections);
    if (resolved.conflicts.length) return;
    onConflictResolved({ files: resolved.files, remoteBase: conflict.remoteBase, keepUploads: true });
    setConflict(null); setError(null); setValidation(null);
  }
  async function refreshDeployment() {
    if (!deployment?.commit) return;
    setBusy(true);
    try { setDeployment(await adminApi.deployment(deployment.commit)); } catch (nextError) { setError(nextError); } finally { setBusy(false); }
  }
  return <SectionShell eyebrow="Yayın merkezi" title="Doğrula, karşılaştır, yayınla" description="Worker güncel blob SHA değerlerini tekrar kontrol eder ve bütün değişiklikleri tek atomik commit olarak gönderir."><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-5">{baseSnapshotMissing && <Notice tone="warning" title="Güvenli base snapshot eksik">Bu eski taslak doğrudan yayınlanamaz. <button type="button" onClick={onReloadRemote} className="font-medium underline">Uzak sürümü yeniden yükle</button> ve değişiklikleri yeniden uygula.</Notice>}{blockingErrors.length > 0 && <Notice tone="danger" title={`${blockingErrors.length} yayın engelleyici alan`}>{blockingErrors.slice(0, 8).join(" · ")}{blockingErrors.length > 8 ? "…" : ""}</Notice>}{warnings.length > 0 && <Notice tone="warning" title={`${warnings.length} eksik çeviri/alan uyarısı`}>{warnings.slice(0, 8).join(" · ")}{warnings.length > 8 ? "…" : ""}</Notice>}{error && <Notice tone={error.status === 409 ? "warning" : "danger"} title={error.status === 409 ? "Uzak içerik değişmiş" : "İşlem tamamlanamadı"}>{error.message}{error.status === 409 && <span> Yerel taslak korunuyor. <button type="button" onClick={loadConflict} className="font-medium underline">Yeniden yükleme/birleştirme seçeneklerini aç</button>.</span>}</Notice>}{conflict && <ConflictPanel conflict={conflict} onSelection={(key, value) => setConflict((current) => ({ ...current, selections: { ...current.selections, [key]: value } }))} onApply={() => applyConflict(false)} onReload={() => applyConflict(true)} />}{validation && <Notice tone="success" title="Worker doğrulaması başarılı">Şema, URL, dosya manifesti ve yayın sınırları geçerli.</Notice>}<DiffGroup title="Hakkımda / site metni" data={summary.site} /><DiffGroup title="Projeler" data={summary.projects} /><DiffGroup title="Sertifikalar" data={summary.certificates} /><DiffGroup title="Yetenekler" data={summary.skills} /><DiffGroup title="Görsel presetleri" data={summary.visuals} />{uploads.length > 0 && <Panel className="p-5"><h3 className="font-display text-xl">Eklenecek medya</h3><div className="mt-3 space-y-2">{uploads.map((entry) => <div key={`${entry.kind}-${entry.recordId}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas/50 px-3 py-2 text-xs"><span className="truncate">{entry.file.name}</span><span className="shrink-0 text-faint">{(entry.file.size / 1024).toFixed(1)} KiB</span></div>)}</div></Panel>}</div><aside className="space-y-4"><Panel className="p-5"><div className="flex items-center gap-3"><FileCheck2 className="h-5 w-5 text-accent" /><h3 className="font-display text-xl">Yayın kontrolü</h3></div><div className="mt-5 space-y-3 text-xs text-muted"><div className="flex justify-between"><span>Base commit</span><code className="text-faint">{base?.commitSha?.slice(0, 9) || "yok"}</code></div><div className="flex justify-between"><span>Değişiklik</span><span>{hasDiff(summary) ? "Var" : "Yok"}</span></div><div className="flex justify-between"><span>Medya</span><span>{uploads.length}</span></div><div className="flex justify-between"><span>Commit</span><code className="text-faint">content: update portfolio…</code></div></div><Button className="mt-6 w-full" onClick={validate} disabled={busy || baseSnapshotMissing || blockingErrors.length > 0 || !hasDiff(summary)}><FileCheck2 className="h-4 w-4" />{busy ? "Doğrulanıyor…" : "Değişiklikleri doğrula"}</Button><Button variant="primary" className="mt-3 w-full" onClick={() => setConfirm(true)} disabled={busy || baseSnapshotMissing || blockingErrors.length > 0 || !validation || !hasDiff(summary)}><Send className="h-4 w-4" />GitHub’a gönder ve yayınla</Button></Panel><Panel className="p-5"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-accent" /><h3 className="font-display text-xl">Yayın güvenliği</h3></div><div className="mt-4 space-y-3">{["Worker tarafı yetkilendirme", "SHA çakışma koruması", "Tek atomik Git commit", "Durable Object publish kilidi"].map((item) => <div key={item} className="flex items-center gap-3 text-sm text-muted"><CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />{item}</div>)}</div></Panel>{deployment && (() => { const info = describeDeployment(deployment); const url = safeGithubActionsUrl(deployment.url); return <Panel className="p-5"><div className="flex items-center justify-between gap-2"><div className="text-xs text-faint">GitHub Pages deployment</div><span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${info.pillClass}`}><span className={`h-1.5 w-1.5 rounded-full ${info.dotClass}`} />{info.label}</span></div><div className="mt-2 font-display text-2xl">{info.label}</div><div className="mt-1 text-xs text-muted">{info.detail}</div>{url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent hover:underline">GitHub Actions kaydını aç <ExternalLink className="h-3 w-3" /></a>}<Button className="mt-4 w-full" onClick={refreshDeployment} disabled={busy}>Durumu yenile</Button></Panel>; })()}<Notice tone="info" title="Ücretsiz kota koruması">Durum otomatik poll edilmez. Publish limiti ve tek yayın kilidi güçlü tutarlı Durable Object üzerindedir.</Notice></aside></div><ConfirmDialog open={confirm} title="GitHub’a yayınla" description="Doğrulanmış JSON ve medya değişiklikleri main dalına “content: update portfolio from admin panel” mesajıyla tek commit olarak gönderilecek. Bu işlem GitHub Pages workflow’unu tetikler." confirmLabel="Commit oluştur" onClose={() => setConfirm(false)} onConfirm={publish} /></SectionShell>;
}

function ConflictPanel({ conflict, onSelection, onApply, onReload }) {
  const allSelected = conflict.merge.conflicts.every((item) => conflict.selections[item.key]);
  return <Panel className="border-amber-400/25 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-display text-2xl">Üç yönlü birleştirme</h3><p className="mt-2 text-xs leading-relaxed text-muted">Bağımsız alanlar otomatik birleştirildi. Aynı alan iki tarafta değiştiyse hangi değerin kalacağını seç.</p></div><Button variant="danger" onClick={onReload}>Yereli bırak, uzağı yükle</Button></div>{conflict.merge.conflicts.length ? <div className="mt-5 space-y-3">{conflict.merge.conflicts.map((item) => <div key={item.key} className="rounded-2xl border border-line bg-canvas/50 p-4"><div className="mb-3 break-all font-mono text-[10px] text-amber-200">{item.path || "root"}</div><div className="grid gap-3 sm:grid-cols-2"><ConflictChoice label="Yerel" value={item.local} checked={conflict.selections[item.key] === "local"} onChange={() => onSelection(item.key, "local")} /><ConflictChoice label="Uzak" value={item.remote} checked={conflict.selections[item.key] === "remote"} onChange={() => onSelection(item.key, "remote")} /></div></div>)}</div> : <Notice tone="success" title="Alan çakışması yok">Bağımsız değişiklikler güvenli biçimde birleştirilmeye hazır.</Notice>}<Button variant="primary" className="mt-5" disabled={!allSelected} onClick={onApply}>Birleştirmeyi çalışma kopyasına uygula</Button></Panel>;
}

function ConflictChoice({ label, value, checked, onChange }) {
  const text = value === undefined ? "(silinmiş)" : typeof value === "string" ? value : JSON.stringify(value);
  return <label className={`cursor-pointer rounded-xl border p-3 transition ${checked ? "border-accent/50 bg-accent/5" : "border-line"}`}><span className="flex items-center gap-2 text-xs font-medium"><input type="radio" checked={checked} onChange={onChange} className="accent-[#d6ff3f]" />{label}</span><span className="mt-2 block max-h-20 overflow-auto break-words font-mono text-[10px] text-faint">{text}</span></label>;
}

function DiffGroup({ title, data }) {
  const total = data.added.length + data.changed.length + data.removed.length;
  return <Panel className="p-5"><div className="flex items-center justify-between"><h3 className="font-display text-xl">{title}</h3><span className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] text-faint">{total} değişiklik</span></div>{total ? <div className="mt-4 grid gap-3 sm:grid-cols-3">{[["Eklenecek", data.added, "text-accent"], ["Değişecek", data.changed, "text-amber-200"], ["Silinecek", data.removed, "text-red-300"]].map(([label, items, color]) => <div key={label} className="rounded-xl border border-line bg-canvas/45 p-3"><div className={`text-[10px] uppercase tracking-wider ${color}`}>{label}</div><div className="mt-2 space-y-1">{items.length ? items.map((item) => <div key={item} className="truncate font-mono text-[10px] text-muted">{item}</div>) : <div className="text-[10px] text-faint">—</div>}</div></div>)}</div> : <div className="mt-3 text-xs text-faint">Bu koleksiyonda değişiklik yok.</div>}</Panel>;
}
