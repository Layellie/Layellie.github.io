import { useEffect, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { SafeIcon } from "../../components/project-visuals/iconRegistry.jsx";
import { validateFileSignature } from "../validation/files.js";
import IconPicker from "../components/IconPicker.jsx";
import { LocaleTabs, Notice, SelectField, TextField } from "../components/AdminUi.jsx";

export default function CertificateEditor({ certificate, skillOptions, onChange, onUpload }) {
  const [lang, setLang] = useState("tr");
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const locale = certificate[lang];
  const updateShared = (key, value) => onChange({ ...certificate, shared: { ...certificate.shared, [key]: value } });
  const updateLocale = (key, value) => onChange({ ...certificate, [lang]: { ...locale, [key]: value } });
  useEffect(() => {
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [certificate.id]);
  async function handleFile(file) {
    if (!file) return;
    try {
      await validateFileSignature(file, "certificate");
      setUploadError("");
      updateShared("file", `/media/certificates/${certificate.id}/pending.pdf`);
      onUpload({ kind: "certificate", recordId: certificate.id, file });
    } catch (error) {
      setUploadError(error.message);
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><LocaleTabs value={lang} onChange={setLang} /><span className="font-mono text-xs text-faint">id: {certificate.id}</span></div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Başlık" value={locale.title} onChange={(event) => updateLocale("title", event.target.value)} />
        <TextField label="Kurum" value={locale.issuer} onChange={(event) => updateLocale("issuer", event.target.value)} />
        <TextField label="Tarih" type="date" value={certificate.shared.date} onChange={(event) => updateShared("date", event.target.value)} />
        <TextField label="Sertifika kodu" value={certificate.shared.code} onChange={(event) => updateShared("code", event.target.value)} />
        <TextField label="Yetenek etiketi" value={locale.skillLabel} onChange={(event) => updateLocale("skillLabel", event.target.value)} />
        <SelectField label="İlişkili yetenek" value={certificate.shared.relatedSkillId || ""} onChange={(event) => updateShared("relatedSkillId", event.target.value || null)}><option value="">İlişki yok</option>{skillOptions.map((skill) => <option key={skill.id} value={skill.id}>{skill.label}</option>)}</SelectField>
        <IconPicker value={certificate.shared.icon} onChange={(value) => updateShared("icon", value)} />
        <label className="flex cursor-pointer items-center justify-center gap-2 self-end rounded-2xl border border-dashed border-line bg-canvas/50 p-3 text-sm text-muted transition hover:border-accent/40 hover:text-ink"><FileUp className="h-4 w-4 text-accent" />PDF yükle<input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} /></label>
      </div>
      {uploadError && <Notice tone="danger" title="PDF kabul edilmedi">{uploadError}</Notice>}
      <div className="rounded-3xl border border-line bg-canvas/45 p-6"><div className="flex items-start gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-elevated text-accent"><SafeIcon name={certificate.shared.icon} /></span><div className="min-w-0"><div className="font-display text-xl font-semibold">{locale.title}</div><div className="mt-1 text-sm text-muted">{locale.issuer} · {certificate.shared.date}</div><div className="mt-3 inline-flex rounded-full border border-line px-3 py-1 text-xs text-faint">{locale.skillLabel}</div></div></div><div className="mt-5 border-t border-line pt-3 font-mono text-[11px] text-faint">{certificate.shared.file}</div></div>
    </div>
  );
}
