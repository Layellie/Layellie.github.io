import { useEffect, useState } from "react";
import { ImageUp } from "lucide-react";
import { validateFileSignature } from "../validation/files.js";
import { mediaTypeForMetadata } from "../../content/mediaTypes.js";
import { LocaleTabs, Notice, SelectField, TagsField, TextArea, TextField } from "../components/AdminUi.jsx";
import ProjectPreview from "../components/ProjectPreview.jsx";

export default function ProjectEditor({ project, presets, pendingUpload, publicSiteOrigin, onChange, onUpload }) {
  const [lang, setLang] = useState("tr");
  const [uploadError, setUploadError] = useState("");
  const [localUpload, setLocalUpload] = useState(null);
  const [preview, setPreview] = useState({ projectId: "", file: null, url: "" });
  const locale = project[lang];
  const updateShared = (key, value) => onChange({ ...project, shared: { ...project.shared, [key]: value } });
  const updateLocale = (key, value) => onChange({ ...project, [lang]: { ...locale, [key]: value } });
  const updateVisual = (value) => updateShared("visual", value);
  const pendingFile = localUpload?.recordId === project.id
    ? localUpload.file
    : pendingUpload?.recordId === project.id ? pendingUpload.file : null;
  const previewUrl = preview.projectId === project.id && preview.file === pendingFile ? preview.url : "";
  useEffect(() => {
    setLocalUpload(null);
    setUploadError("");
  }, [project.id]);
  useEffect(() => {
    if (project.shared.visual.mode !== "screenshot" || !pendingFile) {
      setPreview({ projectId: project.id, file: null, url: "" });
      return undefined;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreview({ projectId: project.id, file: pendingFile, url });
    return () => URL.revokeObjectURL(url);
  }, [project.id, project.shared.visual.mode, pendingFile]);

  async function handleScreenshot(file) {
    if (!file) return;
    try {
      await validateFileSignature(file, "screenshot");
      setUploadError("");
      setLocalUpload({ recordId: project.id, file });
      updateVisual(pendingScreenshotVisual(project, file));
      onUpload({ kind: "screenshot", recordId: project.id, file });
    } catch (error) {
      setUploadError(error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><LocaleTabs value={lang} onChange={setLang} /><span className="font-mono text-xs text-faint">id: {project.id}</span></div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Proje adı" value={locale.name} onChange={(event) => updateLocale("name", event.target.value)} maxLength={80} />
        <TextField label="Proje türü" value={locale.type} onChange={(event) => updateLocale("type", event.target.value)} maxLength={120} />
        <TextField label="Yıl" value={project.shared.year} onChange={(event) => updateShared("year", event.target.value)} inputMode="numeric" maxLength={4} />
        <TextField label="Lisans" value={project.shared.license} onChange={(event) => updateShared("license", event.target.value)} maxLength={40} />
        <TextField label="GitHub bağlantısı" className="md:col-span-2" value={project.shared.github} onChange={(event) => updateShared("github", event.target.value)} inputMode="url" />
        <TextArea label="Açıklama" className="md:col-span-2" value={locale.description} onChange={(event) => updateLocale("description", event.target.value)} maxLength={1200} />
        <TagsField label="Özellikler" value={locale.features} onChange={(value) => updateLocale("features", value)} hint="Virgülle ayır · en fazla 12" />
        <TagsField label="Durum etiketleri" value={locale.status} onChange={(value) => updateLocale("status", value)} hint="Virgülle ayır · en fazla 8" />
        <TagsField label="Teknolojiler" className="md:col-span-2" value={project.shared.stack} onChange={(value) => updateShared("stack", value)} />
        <SelectField label="Yayın durumu" value={project.publicationStatus} onChange={(event) => onChange({ ...project, publicationStatus: event.target.value })}>
          <option value="draft">Taslak</option><option value="published">Yayında</option>
        </SelectField>
        <SelectField label="Görsel modu" value={project.shared.visual.mode} onChange={(event) => {
          const mode = event.target.value;
          const retainedFile = localUpload?.recordId === project.id
            ? localUpload.file
            : pendingUpload?.recordId === project.id ? pendingUpload.file : null;
          if (mode !== "screenshot" && retainedFile && localUpload?.file !== retainedFile) {
            setLocalUpload({ recordId: project.id, file: retainedFile });
          }
          if (mode === "builder" && presets[0]) updateVisual({ mode, visualId: presets[0].id, fallbackComponentId: "legacy-clipboard" });
          if (mode === "builder" && !presets[0]) updateVisual({ mode: "custom", componentId: "legacy-clipboard" });
          if (mode === "custom") updateVisual({ mode, componentId: "legacy-clipboard" });
          if (mode === "screenshot") {
            updateVisual(retainedFile ? pendingScreenshotVisual(project, retainedFile) : pendingScreenshotVisual(project));
            if (retainedFile) onUpload({ kind: "screenshot", recordId: project.id, file: retainedFile });
          }
        }}>
          <option value="builder" disabled={presets.length === 0}>Modüler builder</option><option value="screenshot">Ekran görüntüsü</option><option value="custom">React fallback</option>
        </SelectField>
      </div>

      {project.shared.visual.mode === "builder" && <div className="grid gap-4 md:grid-cols-2"><SelectField label="Builder preset" value={project.shared.visual.visualId} onChange={(event) => updateVisual({ ...project.shared.visual, visualId: event.target.value })}>{presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</SelectField><SelectField label="Güvenli fallback" value={project.shared.visual.fallbackComponentId || ""} onChange={(event) => updateVisual({ ...project.shared.visual, fallbackComponentId: event.target.value || undefined })}><option value="">Yok</option><option value="legacy-clipboard">ClipboardMock</option><option value="legacy-standby">TimerMock</option><option value="legacy-eyehealth">EyeHealthMock</option></SelectField></div>}
      {project.shared.visual.mode === "custom" && <SelectField label="Geliştirici bileşeni" value={project.shared.visual.componentId} onChange={(event) => updateVisual({ mode: "custom", componentId: event.target.value })}><option value="legacy-clipboard">ClipboardMock</option><option value="legacy-standby">TimerMock</option><option value="legacy-eyehealth">EyeHealthMock</option></SelectField>}
      {presets.length === 0 && <Notice tone="warning" title="Builder preset’i bulunmuyor">Modüler görsel kullanmak için önce Görsel oluşturucu bölümünde bir preset oluştur.</Notice>}
      {project.shared.visual.mode === "screenshot" && <div className="grid gap-4 md:grid-cols-2"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-canvas/50 p-5 text-sm text-muted transition hover:border-accent/40 hover:text-ink"><ImageUp className="h-4 w-4 text-accent" />PNG, JPG veya WebP seç<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => handleScreenshot(event.target.files?.[0])} /></label><SelectField label="Object fit" value={project.shared.visual.objectFit} onChange={(event) => updateVisual({ ...project.shared.visual, objectFit: event.target.value })}><option value="contain">Contain</option><option value="cover">Cover</option></SelectField><TextField label="Türkçe alt metin" value={project.shared.visual.alt.tr} onChange={(event) => updateVisual({ ...project.shared.visual, alt: { ...project.shared.visual.alt, tr: event.target.value } })} /><TextField label="English alt text" value={project.shared.visual.alt.en} onChange={(event) => updateVisual({ ...project.shared.visual, alt: { ...project.shared.visual.alt, en: event.target.value } })} /></div>}
      {uploadError && <Notice tone="danger" title="Dosya kabul edilmedi">{uploadError}</Notice>}
      <div><div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-faint">Gerçek kart önizlemesi · {lang.toUpperCase()}</div><ProjectPreview project={project} presets={presets} lang={lang} screenshotPreviewUrl={previewUrl} publicSiteOrigin={publicSiteOrigin} /></div>
    </div>
  );
}

function pendingScreenshotVisual(project, file) {
  const extension = file ? mediaTypeForMetadata("screenshot", file.name, file.type)?.outputExtension || "png" : "png";
  return {
    mode: "screenshot",
    path: `/media/projects/${project.id}/pending.${extension}`,
    objectFit: "contain",
    alt: { tr: project.tr.name, en: project.en.name },
  };
}
