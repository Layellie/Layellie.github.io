import { useEffect, useRef, useState } from "react";
import { Copy, Monitor, Plus, Redo2, Smartphone, Trash2, Undo2 } from "lucide-react";
import MockupRenderer from "../../components/project-visuals/MockupRenderer.jsx";
import { MODULE_CATALOG, normalizeListRowTone } from "../../components/project-visuals/moduleRegistry.jsx";
import { validateVisualModulePayload, visualModuleIssuePath } from "../../content/visualModuleSchemas.js";
import { uniqueId, moveItem } from "../data/model.js";
import { createModule, duplicateModule } from "../visuals/moduleDefaults.js";
import { moduleFieldType, parseNumberArrayInput } from "../visuals/fieldMetadata.js";
import IconPicker from "../components/IconPicker.jsx";
import { Button, LocaleTabs, Notice, SelectField, SortableList, TagsField, TextArea, TextField } from "../components/AdminUi.jsx";

export default function VisualBuilder({ visuals, projects = { items: [] }, onChange }) {
  const [selectedPresetId, setSelectedPresetId] = useState(visuals.presets[0]?.id);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [lang, setLang] = useState("tr");
  const [previewMode, setPreviewMode] = useState("desktop");
  const [deleteNotice, setDeleteNotice] = useState(null);
  const past = useRef([]);
  const future = useRef([]);
  const preset = visuals.presets.find((item) => item.id === selectedPresetId) || visuals.presets[0];
  const selectedModule = preset?.modules.find((item) => item.id === selectedModuleId);

  const commit = (next) => {
    past.current = [...past.current.slice(-49), structuredClone(visuals)];
    future.current = [];
    onChange(next);
  };
  const undo = () => {
    const previous = past.current.pop();
    if (!previous) return;
    future.current.push(structuredClone(visuals));
    onChange(previous);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(structuredClone(visuals));
    onChange(next);
  };
  const replacePreset = (nextPreset) => commit({ ...visuals, presets: visuals.presets.map((item) => item.id === preset.id ? nextPreset : item) });
  const replaceModules = (modules) => replacePreset({ ...preset, modules });
  const replaceModule = (module) => replaceModules(preset.modules.map((item) => item.id === module.id ? module : item));
  const addPreset = () => {
    const source = preset || visuals.presets[0];
    if (!source) return;
    const copy = structuredClone(source);
    copy.id = uniqueId(visuals.presets, `${source.id}-copy`);
    copy.name = `${source.name} Copy`;
    commit({ ...visuals, presets: [...visuals.presets, copy] });
    setSelectedPresetId(copy.id); setSelectedModuleId(null);
  };
  const removePreset = (allowDraftReferences = false) => {
    if (visuals.presets.length <= 1) return;
    const references = projects.items.filter((project) => project.shared.visual.mode === "builder" && project.shared.visual.visualId === preset.id);
    const published = references.filter((project) => project.publicationStatus === "published");
    if (published.length > 0) {
      setDeleteNotice({ tone: "danger", title: "Preset yayındaki projeler tarafından kullanılıyor", projects: references, allowDraftReferences: false });
      return;
    }
    if (!allowDraftReferences && references.length > 0) {
      setDeleteNotice({ tone: "warning", title: "Preset taslak projeler tarafından kullanılıyor", projects: references, allowDraftReferences: true });
      return;
    }
    const next = visuals.presets.filter((item) => item.id !== preset.id);
    commit({ ...visuals, presets: next }); setSelectedPresetId(next[0].id); setSelectedModuleId(null); setDeleteNotice(null);
  };

  if (!preset) return <div className="rounded-3xl border border-dashed border-line p-12 text-center text-muted">Önce bir başlangıç preset’i oluşturulmalı.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2"><Button variant="primary" onClick={addPreset}><Copy className="h-4 w-4" />Preset kopyala</Button><Button variant="danger" disabled={visuals.presets.length <= 1} onClick={() => removePreset()}><Trash2 className="h-4 w-4" />Preset sil</Button></div>
        <div className="flex gap-2"><Button onClick={undo} disabled={!past.current.length} aria-label="Geri al"><Undo2 className="h-4 w-4" /></Button><Button onClick={redo} disabled={!future.current.length} aria-label="Yinele"><Redo2 className="h-4 w-4" /></Button></div>
      </div>
      {deleteNotice && <Notice tone={deleteNotice.tone} title={deleteNotice.title}><span>{deleteNotice.projects.map((project) => `${project.tr.name} (${project.id}, ${project.publicationStatus === "published" ? "yayında" : "taslak"})`).join(", ")}. Önce bu projeleri başka bir presete taşı veya görsel modunu değiştir.</span>{deleteNotice.allowDraftReferences && <button type="button" className="ml-2 font-medium underline" onClick={() => removePreset(true)}>Taslak referanslarına rağmen sil</button>}</Notice>}
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        <aside className="space-y-4">
          <SelectField label="Preset" value={preset.id} onChange={(event) => { setSelectedPresetId(event.target.value); setSelectedModuleId(null); }}>{visuals.presets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
          <TextField label="Preset adı" value={preset.name} onChange={(event) => replacePreset({ ...preset, name: event.target.value })} />
          <SelectField label="Vurgu rengi" value={preset.shared.accent} onChange={(event) => replacePreset({ ...preset, shared: { ...preset.shared, accent: event.target.value } })}><option value="lime">Lime</option><option value="cyan">Cyan</option><option value="blue">Blue</option><option value="violet">Violet</option><option value="amber">Amber</option><option value="rose">Rose</option></SelectField>
          <IconPicker label="Pencere ikonu" value={preset.shared.window.icon} onChange={(icon) => replacePreset({ ...preset, shared: { ...preset.shared, window: { ...preset.shared.window, icon } } })} />
          <TextField label="Pencere başlığı" value={preset.shared.window.title} onChange={(event) => replacePreset({ ...preset, shared: { ...preset.shared, window: { ...preset.shared.window, title: event.target.value } } })} />
          <LocaleTabs value={lang} onChange={setLang} />
          <TextField label="Alt durum metni" value={preset[lang].footerText} onChange={(event) => replacePreset({ ...preset, [lang]: { ...preset[lang], footerText: event.target.value } })} />
          <TextField label="Alt rozet" value={preset[lang].footerBadge} onChange={(event) => replacePreset({ ...preset, [lang]: { ...preset[lang], footerBadge: event.target.value } })} />
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="text-xs font-medium uppercase tracking-[0.18em] text-faint">Canlı önizleme</div><div className="inline-flex rounded-xl border border-line bg-canvas/60 p-1"><button type="button" onClick={() => setPreviewMode("desktop")} className={`rounded-lg p-2 ${previewMode === "desktop" ? "bg-accent text-canvas" : "text-faint"}`} aria-label="Masaüstü önizleme"><Monitor className="h-4 w-4" /></button><button type="button" onClick={() => setPreviewMode("mobile")} className={`rounded-lg p-2 ${previewMode === "mobile" ? "bg-accent text-canvas" : "text-faint"}`} aria-label="Mobil önizleme"><Smartphone className="h-4 w-4" /></button></div></div>
          <div className="overflow-x-auto rounded-3xl border border-line bg-canvas/50 p-4 sm:p-6"><div className={`mx-auto transition-[max-width] duration-300 ${previewMode === "mobile" ? "max-w-[390px]" : "max-w-3xl"}`}><MockupRenderer preset={preset} lang={lang} viewportMode={previewMode} /></div></div>
          <div className="flex flex-wrap gap-2"><SelectField label="Modül ekle" className="min-w-52 flex-1" defaultValue="" onChange={(event) => { if (!event.target.value) return; const module = createModule(event.target.value, preset.modules); replaceModules([...preset.modules, module]); setSelectedModuleId(module.id); event.target.value = ""; }}><option value="">Modül türü seç…</option>{MODULE_CATALOG.map((type) => <option key={type} value={type}>{type}</option>)}</SelectField></div>
          <SortableList items={preset.modules} selectedId={selectedModule?.id} onMove={(from, to) => replaceModules(moveItem(preset.modules, from, to))} renderItem={(module) => <button type="button" onClick={() => setSelectedModuleId(module.id)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"><span className="truncate text-sm">{module.type}</span><span className="font-mono text-[10px] text-faint">{module.id}</span></button>} />
        </main>

        <aside className="min-w-0 rounded-3xl border border-line bg-canvas/40 p-5 xl:col-span-2 2xl:col-span-1">
          {selectedModule ? <ModuleInspector module={selectedModule} lang={lang} onChange={replaceModule} onDuplicate={() => { const next = duplicateModule(preset.modules, selectedModule.id); replaceModules(next); setSelectedModuleId(next[preset.modules.findIndex((item) => item.id === selectedModule.id) + 1].id); }} onDelete={() => { replaceModules(preset.modules.filter((item) => item.id !== selectedModule.id)); setSelectedModuleId(null); }} /> : <div className="py-12 text-center text-sm text-faint">Özelliklerini düzenlemek için bir modül seç.</div>}
        </aside>
      </div>
    </div>
  );
}

function ModuleInspector({ module, lang, onChange, onDuplicate, onDelete }) {
  const placement = module.shared.placement;
  const validation = validateVisualModulePayload(module, lang);
  const issues = validation.success ? [] : validation.issues.map((issue) => ({ path: visualModuleIssuePath(module, lang, issue), message: issue.message }));
  const errorFor = (...path) => issues.find((issue) => issue.path.join(".") === path.join(".") || issue.path.join(".").startsWith(`${path.join(".")}.`))?.message;
  const updatePlacement = (key, value) => onChange({ ...module, shared: { ...module.shared, placement: { ...placement, [key]: value } } });
  const updateBucket = (bucket, key, value) => onChange({ ...module, [bucket]: { ...module[bucket], [key]: value } });
  return <div className="space-y-5"><div className="flex items-center justify-between gap-3"><div><div className="font-display text-xl font-semibold">{module.type}</div><div className="font-mono text-[10px] text-faint">{module.id}</div></div><div className="flex gap-1"><Button onClick={onDuplicate} aria-label="Modülü kopyala"><Copy className="h-4 w-4" /></Button><Button variant="danger" onClick={onDelete} aria-label="Modülü sil"><Trash2 className="h-4 w-4" /></Button></div></div>{issues.length > 0 && <Notice tone="danger" title={`${module.type} modülü geçersiz`}>{issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(" · ")}</Notice>}<div className="grid grid-cols-2 gap-3"><SelectField label="Mobil kolon" error={errorFor("shared", "placement", "mobileColSpan")} value={placement.mobileColSpan} onChange={(event) => updatePlacement("mobileColSpan", Number(event.target.value))}>{[1,2,3,4,5,6,7,8,9,10,11,12].map((value) => <option key={value}>{value}</option>)}</SelectField><SelectField label="Masaüstü kolon" error={errorFor("shared", "placement", "desktopColSpan")} value={placement.desktopColSpan} onChange={(event) => updatePlacement("desktopColSpan", Number(event.target.value))}>{[1,2,3,4,5,6,7,8,9,10,11,12].map((value) => <option key={value}>{value}</option>)}</SelectField><SelectField label="Satır" error={errorFor("shared", "placement", "rowSpan")} value={placement.rowSpan} onChange={(event) => updatePlacement("rowSpan", Number(event.target.value))}>{[1,2,3].map((value) => <option key={value}>{value}</option>)}</SelectField><SelectField label="Yükseklik" error={errorFor("shared", "placement", "height")} value={placement.height} onChange={(event) => updatePlacement("height", event.target.value)}><option value="compact">Kompakt</option><option value="normal">Normal</option><option value="tall">Uzun</option></SelectField></div><div className="border-t border-line pt-5"><div className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-faint">Ortak değerler</div><ControlledFields moduleType={module.type} bucket="shared" values={module.shared} errors={Object.fromEntries(Object.keys(module.shared).map((key) => [key, errorFor("shared", key)]))} omit={["placement"]} onChange={(key, value) => updateBucket("shared", key, value)} /></div><div className="border-t border-line pt-5"><div className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-faint">{lang.toUpperCase()} metinleri</div><ControlledFields moduleType={module.type} bucket="locale" values={module[lang]} errors={Object.fromEntries(Object.keys(module[lang]).map((key) => [key, errorFor(lang, key)]))} onChange={(key, value) => updateBucket(lang, key, value)} /></div></div>;
}

export function ControlledFields({ moduleType, bucket, values, errors = {}, onChange, omit = [] }) {
  return <div className="space-y-4">{Object.entries(values).filter(([key]) => !omit.includes(key)).map(([key, value]) => {
    const fieldType = moduleFieldType(moduleType, bucket, key, value);
    if (key === "icon") return <IconPicker key={key} label="İkon" value={value} onChange={(next) => onChange(key, next)} />;
    if (typeof value === "boolean") return <label key={key} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm text-muted"><input type="checkbox" checked={value} onChange={(event) => onChange(key, event.target.checked)} className="accent-[#d6ff3f]" />{humanize(key)}</label>;
    if (typeof value === "number") return <TextField key={key} label={humanize(key)} error={errors[key]} type="number" value={value} min={key === "progress" || key === "value" ? 0 : undefined} max={key === "progress" ? 100 : undefined} onChange={(event) => onChange(key, Number(event.target.value))} />;
    if (fieldType === "number-array") return <NumberArrayField key={key} label={humanize(key)} schemaError={errors[key]} value={value} onChange={(next) => onChange(key, next)} />;
    if (fieldType === "string-array") return <TagsField key={key} label={humanize(key)} error={errors[key]} value={value} onChange={(next) => onChange(key, next)} />;
    if (fieldType === "string-matrix") return <StringMatrixField key={key} label={humanize(key)} error={errors[key]} value={value} onChange={(next) => onChange(key, next)} />;
    if (key === "tone") return <SelectField key={key} label="Görünüm" value={normalizeListRowTone(value)} onChange={(event) => onChange(key, event.target.value)}><option value="text">Varsayılan</option><option value="code">Kod</option><option value="image">Görsel</option></SelectField>;
    return <TextField key={key} label={humanize(key)} error={errors[key]} value={value ?? ""} onChange={(event) => onChange(key, event.target.value)} />;
  })}</div>;
}

function NumberArrayField({ label, value, onChange, schemaError }) {
  const [input, setInput] = useState(value.join(", "));
  const [error, setError] = useState("");
  useEffect(() => {
    const parsed = parseNumberArrayInput(input);
    if (!parsed.success || !sameNumericArray(parsed.value, value)) {
      setInput(value.join(", "));
      setError("");
    }
  }, [value]);
  return <TextField label={label} hint="Virgülle ayır" value={input} error={error || schemaError} onChange={(event) => {
    const nextInput = event.target.value;
    setInput(nextInput);
    const parsed = parseNumberArrayInput(nextInput);
    if (!parsed.success) {
      setError(parsed.error);
      return;
    }
    setError("");
    onChange(parsed.value);
  }} onBlur={() => {
    const parsed = parseNumberArrayInput(input);
    if (!parsed.success) {
      setError(parsed.error);
      return;
    }
    setError("");
    setInput(parsed.value.join(", "));
    onChange(parsed.value);
  }} />;
}

function StringMatrixField({ label, value, onChange, error }) {
  const [input, setInput] = useState(() => formatStringMatrix(value));
  useEffect(() => {
    if (!sameStringMatrix(parseStringMatrix(input), value)) setInput(formatStringMatrix(value));
  }, [value]);
  return <TextArea label={label} hint="Her satır bir tablo satırı; hücreleri virgülle ayır" error={error} value={input} onChange={(event) => {
    const nextInput = event.target.value;
    setInput(nextInput);
    onChange(parseStringMatrix(nextInput));
  }} onBlur={() => {
    const normalized = parseStringMatrix(input);
    setInput(formatStringMatrix(normalized));
    onChange(normalized);
  }} />;
}

function parseStringMatrix(value) {
  return value.split(/\r?\n/)
    .map((row) => row.split(",").map((cell) => cell.trim()).filter(Boolean))
    .filter((row) => row.length > 0);
}

function formatStringMatrix(value) {
  return value.map((row) => row.join(", ")).join("\n");
}

function sameStringMatrix(left, right) {
  return left.length === right.length && left.every((row, rowIndex) => (
    row.length === right[rowIndex]?.length && row.every((cell, cellIndex) => cell === right[rowIndex][cellIndex])
  ));
}

function sameNumericArray(left, right) {
  return left.length === right.length && left.every((item, index) => Object.is(item, right[index]));
}

function humanize(value) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
