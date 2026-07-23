import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  Eye,
  FileCheck2,
  Github,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Plus,
  Save,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { portfolioFiles as bundledFiles } from "../content/loadContent.js";
import { adminApi } from "./api/client.js";
import { clearDraft, loadDraft, restoreDraftRecord, saveDraft } from "./draft/storage.js";
import {
  clonePortfolio,
  certificateSkillOptions,
  createCertificate,
  createDiffSummary,
  createProject,
  duplicateProject,
  hasDiff,
  moveItem,
  publicationIssues,
  synchronizeUploads,
  validatePortfolio,
} from "./data/model.js";
import { mergePortfolioFiles } from "./data/merge.js";
import CertificateEditor from "./editors/CertificateEditor.jsx";
import ProjectEditor from "./editors/ProjectEditor.jsx";
import SkillsEditor from "./editors/SkillsEditor.jsx";
import VisualBuilder from "./editors/VisualBuilder.jsx";
import {
  AdminReveal,
  Button,
  ConfirmDialog,
  LoadingState,
  Notice,
  Panel,
  SortableList,
} from "./components/AdminUi.jsx";

const NAVIGATION = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Projeler", icon: ClipboardList },
  { id: "certificates", label: "Sertifikalar", icon: Award },
  { id: "skills", label: "Yetenekler", icon: Boxes },
  { id: "visuals", label: "Görsel oluşturucu", icon: Sparkles },
  { id: "publish", label: "Doğrula & yayınla", icon: Send },
];

export default function AdminApp({ initialSession, initialContent }) {
  const [sessionState, setSessionState] = useState(initialSession ? { status: "authenticated", data: initialSession } : { status: "loading" });
  const [contentState, setContentState] = useState(initialContent ? { status: "ready", data: initialContent } : { status: "idle" });
  const [screen, setScreen] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [draft, setDraft] = useState(initialContent?.files ? clonePortfolio(initialContent.files) : null);
  const [baseFiles, setBaseFiles] = useState(initialContent?.files || null);
  const [base, setBase] = useState(initialContent?.base || null);
  const [uploads, setUploads] = useState([]);
  const [savedDraft, setSavedDraft] = useState(null);
  const [draftNeedsRebase, setDraftNeedsRebase] = useState(false);
  const [flash, setFlash] = useState(null);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    if (initialSession) return;
    adminApi.session().then((data) => setSessionState({ status: "authenticated", data })).catch((error) => setSessionState({ status: "unauthenticated", error }));
  }, [initialSession]);

  useEffect(() => {
    if (sessionState.status !== "authenticated" || initialContent) return;
    setContentState({ status: "loading" });
    adminApi.content().then((data) => {
      setContentState({ status: "ready", data });
      setBaseFiles(data.files); setDraft(clonePortfolio(data.files)); setBase(data.base);
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

  const updateFiles = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const addUpload = (entry) => setUploads((current) => [...current.filter((item) => !(item.kind === entry.kind && item.recordId === entry.recordId)), entry]);
  const switchScreen = (id) => { setScreen(id); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  async function saveLocalDraft() {
    if (!base || !baseFiles || draftNeedsRebase) {
      setFlash({ tone: "warning", title: "Taslak yeniden tabanlanmalı", message: "Bu eski taslak base snapshot içermiyor. Güvenli biçimde kaydetmek veya yayınlamak için uzak sürümü yeniden yükle." });
      return;
    }
    await saveDraft({ files: draft, base, baseFiles, uploads: synchronizeUploads(draft, uploads) });
    setFlash({ tone: "success", title: "Taslak yerel olarak korundu", message: "İçerik ve seçtiğin dosyalar bu tarayıcının IndexedDB alanına kaydedildi." });
  }
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
    setDraftNeedsRebase(false);
    clearDraft();
    setFlash({ tone: "success", title: "Uzak sürüm yeniden yüklendi", message: "Çalışma kopyası güvenli remote snapshot ile sıfırlandı." });
  }
  function completeLocalLogout() {
    clearDraft().catch(() => {});
    setDraft(null);
    setUploads([]);
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-[286px] border-r border-line bg-canvas/95 p-5 backdrop-blur-xl transition-transform lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between"><button type="button" onClick={() => switchScreen("dashboard")} className="text-left"><div className="font-display text-2xl font-semibold tracking-tight">Layellie<span className="text-accent">.</span></div><div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Portfolio Control</div></button><button type="button" onClick={() => setMobileNav(false)} className="rounded-lg p-2 text-faint hover:bg-surface lg:hidden" aria-label="Menüyü kapat"><X className="h-5 w-5" /></button></div>
        <nav className="mt-10 space-y-1" aria-label="Yönetim bölümleri">{NAVIGATION.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => switchScreen(id)} aria-current={screen === id ? "page" : undefined} className={`group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition ${screen === id ? "border-accent/20 bg-accent/8 text-ink" : "border-transparent text-muted hover:border-line hover:bg-surface/60 hover:text-ink"}`}><Icon className={`h-4 w-4 ${screen === id ? "text-accent" : "text-faint group-hover:text-accent"}`} />{label}{screen === id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_12px_rgba(214,255,63,0.8)]" />}</button>)}</nav>
        <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-line bg-surface/60 p-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-canvas">L</span><div className="min-w-0"><div className="truncate text-sm font-medium">@{session.user?.login || "Layellie"}</div><div className="text-[10px] text-faint">GitHub App session</div></div></div><button type="button" onClick={logout} disabled={logoutBusy} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-faint transition hover:bg-elevated hover:text-red-300 disabled:cursor-wait disabled:opacity-50"><LogOut className="h-3.5 w-3.5" />{logoutBusy ? "Çıkış yapılıyor…" : "Güvenli çıkış"}</button></div>
      </aside>

      <div className="relative lg:pl-[286px]">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-canvas/80 px-4 backdrop-blur-xl sm:px-7 lg:px-10"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileNav(true)} className="rounded-lg border border-line p-2 text-muted lg:hidden" aria-label="Menüyü aç"><Menu className="h-4 w-4" /></button><span className="text-sm text-muted">{NAVIGATION.find((item) => item.id === screen)?.label}</span></div><div className="flex items-center gap-2"><Button onClick={saveLocalDraft} className="hidden sm:inline-flex"><Save className="h-4 w-4" />Yerel taslağı koru</Button><Button variant="primary" onClick={() => switchScreen("publish")}><Send className="h-4 w-4" /><span className="hidden sm:inline">Yayın merkezi</span></Button></div></header>
        <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
          {savedDraft && <div className="mb-6"><Notice tone="warning" title="Bu tarayıcıda yayınlanmamış taslak bulundu"><span>{new Date(savedDraft.savedAt).toLocaleString("tr-TR")} tarihinde kaydedildi. </span><button type="button" className="font-medium text-amber-100 underline" onClick={restoreSavedDraft}>Taslağı geri yükle</button><span> · </span><button type="button" className="underline" onClick={() => { clearDraft(); setSavedDraft(null); }}>Sil</button></Notice></div>}
          {flash && <div className="mb-6"><Notice tone={flash.tone} title={flash.title}>{flash.message}</Notice></div>}
          {screen === "dashboard" && <Dashboard files={draft} base={base} onNavigate={switchScreen} />}
          {screen === "projects" && <ProjectsScreen projects={draft.projects} visuals={draft.visuals} pendingUploads={uploads} publicSiteOrigin={session.publicSiteOrigin} onChange={(projects) => updateFiles("projects", projects)} onUpload={addUpload} />}
          {screen === "certificates" && <CertificatesScreen certificates={draft.certificates} skills={draft.skills} onChange={(certificates) => updateFiles("certificates", certificates)} onUpload={addUpload} />}
          {screen === "skills" && <SectionShell eyebrow="Yetenek sistemi" title="Kartları ve odak alanlarını düzenle" description="Public Yetenekler bölümündeki kart hiyerarşisi önizlemede aynen kullanılır."><SkillsEditor skills={draft.skills} onChange={(skills) => updateFiles("skills", skills)} /></SectionShell>}
          {screen === "visuals" && <SectionShell eyebrow="Modüler uygulama mock-up’ı" title="Kod yazmadan proje görseli oluştur" description="Yalnız allowlist modüller render edilir; serbest HTML, CSS veya JavaScript çalıştırılmaz."><VisualBuilder visuals={draft.visuals} projects={draft.projects} onChange={(visuals) => updateFiles("visuals", visuals)} /></SectionShell>}
          {screen === "publish" && <PublishScreen draft={draft} baseFiles={baseFiles} base={base} uploads={synchronizeUploads(draft, uploads)} csrf={session.csrfToken} baseSnapshotMissing={draftNeedsRebase || !base || !baseFiles} onReloadRemote={reloadRemoteSnapshot} onConflictResolved={({ files, remoteBase, keepUploads }) => { setDraft(clonePortfolio(files)); setBaseFiles(clonePortfolio(remoteBase.files)); setBase(remoteBase.base); setDraftNeedsRebase(false); if (!keepUploads) setUploads([]); setFlash({ tone: "success", title: "Çakışma çalışma kopyasına uygulandı", message: keepUploads ? "Alan seçimleri birleştirildi; yeniden doğrulama gerekli." : "Yerel değişiklikler uzak sürümle değiştirildi." }); }} onPublished={(result) => { setBase(result.base); setDraft(clonePortfolio(result.files)); setBaseFiles(clonePortfolio(result.files)); setUploads([]); setDraftNeedsRebase(false); setSavedDraft(null); clearDraft(); setFlash({ tone: "success", title: "GitHub commit’i oluşturuldu", message: result.commit?.url || result.commit?.sha }); }} />}
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

function Dashboard({ files, base, onNavigate }) {
  const [analytics, setAnalytics] = useState({ status: "loading", data: null });
  const [range, setRange] = useState("7d");
  const loadAnalytics = async (nextRange = range) => {
    setAnalytics((current) => ({ ...current, status: "loading" }));
    try { setAnalytics({ status: "ready", data: await adminApi.analytics(nextRange), updatedAt: new Date() }); } catch { setAnalytics({ status: "error", data: null }); }
  };
  useEffect(() => { void loadAnalytics(); }, []);
  const stats = [
    { label: "Yayındaki projeler", value: files.projects.items.filter((item) => item.publicationStatus === "published").length, icon: ClipboardList, to: "projects" },
    { label: "Sertifikalar", value: files.certificates.items.length, icon: Award, to: "certificates" },
    { label: "Yetenek kartları", value: files.skills.skillCards.length, icon: Boxes, to: "skills" },
    { label: "Görsel presetleri", value: files.visuals.presets.length, icon: Sparkles, to: "visuals" },
  ];
  return <AdminReveal><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">Layellie yönetim alanı</div><h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,4.5rem)] font-semibold leading-[0.88] tracking-tight">İçerik.<br />Görsel. Yayın.</h1></div><div className="rounded-2xl border border-line bg-surface/60 px-4 py-2 font-mono text-[10px] text-faint"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-accent" />main · {base?.commitSha?.slice(0, 7) || "yerel"}</div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon, to }, index) => <button key={label} type="button" onClick={() => onNavigate(to)} className="group rounded-3xl border border-line bg-surface/55 p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-accent/30 hover:bg-surface"><div className="flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line bg-canvas/70 text-accent"><Icon className="h-4 w-4" /></span><span className="font-mono text-[10px] text-faint">0{index + 1}</span></div><div className="mt-4 font-display text-4xl font-semibold tracking-tight">{value}</div><div className="mt-1 text-xs text-muted">{label}</div></button>)}</div><div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_0.65fr_0.9fr]"><Panel className="p-5"><div className="flex items-center justify-between"><h2 className="font-display text-2xl font-semibold">Proje görünümü</h2><Button variant="ghost" onClick={() => onNavigate("projects")}>Tümünü düzenle <ExternalLink className="h-3.5 w-3.5" /></Button></div><div className="mt-4 space-y-2">{files.projects.items.map((project, index) => <button key={project.id} type="button" onClick={() => onNavigate("projects")} className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-canvas/40 p-3 text-left transition hover:border-accent/25"><span className="font-mono text-[10px] text-accent">0{index + 1}</span><div className="min-w-0 flex-1"><div className="truncate font-medium">{project.tr.name}</div><div className="mt-1 truncate text-xs text-faint">{project.tr.type}</div></div><span className={`rounded-full border px-2.5 py-1 text-[10px] ${project.publicationStatus === "published" ? "border-accent/20 text-accent" : "border-line text-faint"}`}>{project.publicationStatus}</span></button>)}</div></Panel><Panel className="p-5"><h2 className="font-display text-2xl font-semibold">Yayın güvenliği</h2><div className="mt-4 space-y-3">{["Worker tarafı yetkilendirme", "SHA çakışma koruması", "Tek atomik Git commit", "Durable Object publish kilidi"].map((item) => <div key={item} className="flex items-center gap-3 text-sm text-muted"><CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />{item}</div>)}</div><Button variant="primary" className="mt-5 w-full" onClick={() => onNavigate("publish")}><Send className="h-4 w-4" />Değişiklikleri incele</Button></Panel><AnalyticsPanel analytics={analytics} range={range} onRange={(value) => { setRange(value); void loadAnalytics(value); }} onRefresh={() => void loadAnalytics()} /></div></AdminReveal>;
}

function AnalyticsPanel({ analytics, range, onRange, onRefresh }) {
  const data = analytics.data;
  const maximum = Math.max(1, ...(data?.days || []).map((day) => day.uniqueVisitors));
  return <Panel className="p-5"><div className="flex items-start justify-between gap-2"><div><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-accent" /><h2 className="font-display text-2xl font-semibold">Ziyaret analitiği</h2></div><p className="mt-1 text-[11px] leading-relaxed text-muted">Aynı tarayıcı günlük bir kez sayılır; farklı tarayıcılar veya silinen site verileri ayrı sayılabilir.</p></div><Button variant="ghost" aria-label="Analitiği yenile" onClick={onRefresh}><RefreshCw className="h-4 w-4" /></Button></div><div className="mt-3 flex gap-2"><Button variant={range === "7d" ? "primary" : "ghost"} onClick={() => onRange("7d")}>7 gün</Button><Button variant={range === "30d" ? "primary" : "ghost"} onClick={() => onRange("30d")}>30 gün</Button></div>{analytics.status === "loading" && <div className="mt-4 text-sm text-muted">Analitik yükleniyor…</div>}{analytics.status === "error" && <div className="mt-4 text-sm text-amber-100">Analitik şu anda alınamadı.</div>}{analytics.status === "ready" && <><div className="mt-4 grid grid-cols-2 gap-2"><AnalyticsStat label="Bugünkü tekil" value={data.today.uniqueVisitors} icon={BarChart3} /><AnalyticsStat label="Masaüstü" value={data.today.desktop} icon={Monitor} /><AnalyticsStat label="Mobil / tablet" value={data.today.mobileTablet} icon={Smartphone} /><AnalyticsStat label="Son 7 gün" value={data.total} icon={CheckCircle2} /></div><div className="mt-4 flex h-16 items-end gap-1" role="img" aria-label={`${data.range} için ziyaretçi trendi, toplam ${data.total}`} >{data.days.map((day) => <div key={day.day} className="min-w-1 flex-1 rounded-t bg-accent/70 transition motion-reduce:transition-none" style={{ height: `${Math.max(6, (day.uniqueVisitors / maximum) * 100)}%` }} title={`${day.day}: ${day.uniqueVisitors}`} />)}</div><div className="mt-2 text-[10px] text-faint">Son güncelleme: {analytics.updatedAt?.toLocaleTimeString("tr-TR")}</div></>}</Panel>;
}

function AnalyticsStat({ label, value, icon: Icon }) { return <div className="rounded-xl border border-line bg-canvas/40 p-2.5"><Icon className="h-3.5 w-3.5 text-accent" /><div className="mt-2 font-display text-2xl">{value}</div><div className="mt-1 text-[10px] text-muted">{label}</div></div>; }

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
  return <SectionShell eyebrow="Yayın merkezi" title="Doğrula, karşılaştır, yayınla" description="Worker güncel blob SHA değerlerini tekrar kontrol eder ve bütün değişiklikleri tek atomik commit olarak gönderir."><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-5">{baseSnapshotMissing && <Notice tone="warning" title="Güvenli base snapshot eksik">Bu eski taslak doğrudan yayınlanamaz. <button type="button" onClick={onReloadRemote} className="font-medium underline">Uzak sürümü yeniden yükle</button> ve değişiklikleri yeniden uygula.</Notice>}{blockingErrors.length > 0 && <Notice tone="danger" title={`${blockingErrors.length} yayın engelleyici alan`}>{blockingErrors.slice(0, 8).join(" · ")}{blockingErrors.length > 8 ? "…" : ""}</Notice>}{warnings.length > 0 && <Notice tone="warning" title={`${warnings.length} eksik çeviri/alan uyarısı`}>{warnings.slice(0, 8).join(" · ")}{warnings.length > 8 ? "…" : ""}</Notice>}{error && <Notice tone={error.status === 409 ? "warning" : "danger"} title={error.status === 409 ? "Uzak içerik değişmiş" : "İşlem tamamlanamadı"}>{error.message}{error.status === 409 && <span> Yerel taslak korunuyor. <button type="button" onClick={loadConflict} className="font-medium underline">Yeniden yükleme/birleştirme seçeneklerini aç</button>.</span>}</Notice>}{conflict && <ConflictPanel conflict={conflict} onSelection={(key, value) => setConflict((current) => ({ ...current, selections: { ...current.selections, [key]: value } }))} onApply={() => applyConflict(false)} onReload={() => applyConflict(true)} />}{validation && <Notice tone="success" title="Worker doğrulaması başarılı">Şema, URL, dosya manifesti ve yayın sınırları geçerli.</Notice>}<DiffGroup title="Projeler" data={summary.projects} /><DiffGroup title="Sertifikalar" data={summary.certificates} /><DiffGroup title="Yetenekler" data={summary.skills} /><DiffGroup title="Görsel presetleri" data={summary.visuals} />{uploads.length > 0 && <Panel className="p-5"><h3 className="font-display text-xl">Eklenecek medya</h3><div className="mt-3 space-y-2">{uploads.map((entry) => <div key={`${entry.kind}-${entry.recordId}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas/50 px-3 py-2 text-xs"><span className="truncate">{entry.file.name}</span><span className="shrink-0 text-faint">{(entry.file.size / 1024).toFixed(1)} KiB</span></div>)}</div></Panel>}</div><aside className="space-y-4"><Panel className="p-5"><div className="flex items-center gap-3"><FileCheck2 className="h-5 w-5 text-accent" /><h3 className="font-display text-xl">Yayın kontrolü</h3></div><div className="mt-5 space-y-3 text-xs text-muted"><div className="flex justify-between"><span>Base commit</span><code className="text-faint">{base?.commitSha?.slice(0, 9) || "yok"}</code></div><div className="flex justify-between"><span>Değişiklik</span><span>{hasDiff(summary) ? "Var" : "Yok"}</span></div><div className="flex justify-between"><span>Medya</span><span>{uploads.length}</span></div><div className="flex justify-between"><span>Commit</span><code className="text-faint">content: update portfolio…</code></div></div><Button className="mt-6 w-full" onClick={validate} disabled={busy || baseSnapshotMissing || blockingErrors.length > 0 || !hasDiff(summary)}><FileCheck2 className="h-4 w-4" />{busy ? "Doğrulanıyor…" : "Değişiklikleri doğrula"}</Button><Button variant="primary" className="mt-3 w-full" onClick={() => setConfirm(true)} disabled={busy || baseSnapshotMissing || blockingErrors.length > 0 || !validation || !hasDiff(summary)}><Send className="h-4 w-4" />GitHub’a gönder ve yayınla</Button></Panel>{deployment && <Panel className="p-5"><div className="text-xs text-faint">GitHub Pages deployment</div><div className="mt-2 font-display text-2xl">{deployment.status || "Bilinmiyor"}</div><Button className="mt-4 w-full" onClick={refreshDeployment} disabled={busy}>Durumu yenile</Button></Panel>}<Notice tone="info" title="Ücretsiz kota koruması">Durum otomatik poll edilmez. Publish limiti ve tek yayın kilidi güçlü tutarlı Durable Object üzerindedir.</Notice></aside></div><ConfirmDialog open={confirm} title="GitHub’a yayınla" description="Doğrulanmış JSON ve medya değişiklikleri main dalına “content: update portfolio from admin panel” mesajıyla tek commit olarak gönderilecek. Bu işlem GitHub Pages workflow’unu tetikler." confirmLabel="Commit oluştur" onClose={() => setConfirm(false)} onConfirm={publish} /></SectionShell>;
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
