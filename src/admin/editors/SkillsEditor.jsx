import { useState } from "react";
import { BadgeCheck, Copy, Plus, Trash2 } from "lucide-react";
import { SafeIcon } from "../../components/project-visuals/iconRegistry.jsx";
import {
  createAdditionalGroup,
  createFocusArea,
  createGroupSkillItem,
  createSkillCard,
  duplicateById,
  moveItem,
  skillIdScope,
  uniqueId,
} from "../data/model.js";
import IconPicker from "../components/IconPicker.jsx";
import { Button, ConfirmDialog, LocaleTabs, SelectField, SortableList, TagsField, TextArea, TextField } from "../components/AdminUi.jsx";

const CATEGORIES = [
  { id: "focusAreas", label: "Odak alanları" },
  { id: "skillCards", label: "Yetenek kartları" },
  { id: "additionalGroups", label: "Ek gruplar" },
];

export default function SkillsEditor({ skills, onChange }) {
  const [category, setCategory] = useState("skillCards");
  const [lang, setLang] = useState("tr");
  const [selectedId, setSelectedId] = useState(skills.skillCards[0]?.id);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const items = skills[category];
  const globalSkillItems = skillIdScope(skills);
  const selected = items.find((item) => item.id === selectedId) || items[0];
  const selectCategory = (next) => { setCategory(next); setSelectedId(skills[next][0]?.id); };
  const replaceItems = (nextItems) => onChange({ ...skills, [category]: nextItems });
  const replaceSelected = (next) => replaceItems(items.map((item) => item.id === selected.id ? next : item));
  const add = () => {
    const item = category === "focusAreas" ? createFocusArea(globalSkillItems) : category === "skillCards" ? createSkillCard(globalSkillItems) : createAdditionalGroup(items);
    replaceItems([...items, item]); setSelectedId(item.id);
  };
  const duplicate = () => {
    if (!selected) return;
    const keys = category === "skillCards" ? ["name"] : ["title"];
    const next = duplicateById(items, selected.id, keys, category === "additionalGroups" ? items : globalSkillItems);
    const copyIndex = items.findIndex((item) => item.id === selected.id) + 1;
    if (category === "additionalGroups") {
      const idScope = [...globalSkillItems];
      next[copyIndex].items = next[copyIndex].items.map((item) => {
        const copy = { ...item, id: uniqueId(idScope, `${item.id}-copy`) };
        idScope.push(copy);
        return copy;
      });
    }
    replaceItems(next); setSelectedId(next[copyIndex].id);
  };
  const remove = () => { replaceItems(items.filter((item) => item.id !== deleteTarget)); setDeleteTarget(null); setSelectedId(items.find((item) => item.id !== deleteTarget)?.id); };

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div>
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-canvas/50 p-1">{CATEGORIES.map((item) => <button key={item.id} type="button" onClick={() => selectCategory(item.id)} className={`rounded-xl px-2 py-2 text-[11px] transition ${category === item.id ? "bg-accent text-canvas" : "text-faint hover:text-ink"}`}>{item.label}</button>)}</div>
        <div className="mt-4 flex gap-2"><Button variant="primary" className="flex-1" onClick={add}><Plus className="h-4 w-4" />Ekle</Button><Button onClick={duplicate} disabled={!selected} aria-label="Kopyala"><Copy className="h-4 w-4" /></Button></div>
        <div className="mt-4"><SortableList items={items} selectedId={selected?.id} onMove={(from, to) => replaceItems(moveItem(items, from, to))} renderItem={(item) => <button type="button" onClick={() => setSelectedId(item.id)} className="flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left"><SafeIcon name={item.shared.icon} className="h-4 w-4 shrink-0 text-accent" /><span className="min-w-0 flex-1 truncate text-sm">{item.tr.name || item.tr.title}</span></button>} /></div>
      </div>

      {selected ? <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><LocaleTabs value={lang} onChange={setLang} /><div className="flex gap-2"><Button onClick={duplicate}><Copy className="h-4 w-4" />Kopyala</Button><Button variant="danger" onClick={() => setDeleteTarget(selected.id)}><Trash2 className="h-4 w-4" />Sil</Button></div></div>
        {category === "focusAreas" && <FocusForm item={selected} lang={lang} onChange={replaceSelected} />}
        {category === "skillCards" && <SkillCardForm item={selected} lang={lang} onChange={replaceSelected} />}
        {category === "additionalGroups" && <GroupForm group={selected} lang={lang} idScope={globalSkillItems} onChange={replaceSelected} />}
      </div> : <div className="rounded-3xl border border-dashed border-line p-12 text-center text-sm text-faint">Bu koleksiyonda henüz kayıt yok.</div>}
      <ConfirmDialog open={Boolean(deleteTarget)} title="Yetenek kaydını sil" description="Bu kayıt taslaktan kaldırılacak. Yayınlamadan önce değişiklik özetini tekrar görebilirsin." confirmLabel="Kaydı sil" danger onClose={() => setDeleteTarget(null)} onConfirm={remove} />
    </div>
  );
}

function FocusForm({ item, lang, onChange }) {
  const locale = item[lang];
  const updateLocale = (key, value) => onChange({ ...item, [lang]: { ...locale, [key]: value } });
  return <><div className="grid gap-4 md:grid-cols-2"><TextField label="Başlık" value={locale.title} onChange={(event) => updateLocale("title", event.target.value)} /><IconPicker value={item.shared.icon} onChange={(icon) => onChange({ ...item, shared: { icon } })} /><TextArea className="md:col-span-2" label="Açıklama" value={locale.description} onChange={(event) => updateLocale("description", event.target.value)} /><TagsField className="md:col-span-2" label="Etiketler" value={locale.tags} onChange={(tags) => updateLocale("tags", tags)} /></div><PreviewCard item={item} lang={lang} /></>;
}

function SkillCardForm({ item, lang, onChange }) {
  const locale = item[lang];
  const updateLocale = (key, value) => onChange({ ...item, [lang]: { ...locale, [key]: value } });
  return <><div className="grid gap-4 md:grid-cols-2"><TextField label="Yetenek adı" value={locale.name} onChange={(event) => updateLocale("name", event.target.value)} /><IconPicker value={item.shared.icon} onChange={(icon) => onChange({ ...item, shared: { ...item.shared, icon } })} /><TextArea label="Açıklama" value={locale.description} onChange={(event) => updateLocale("description", event.target.value)} /><TagsField label="Etiketler" value={locale.tags} onChange={(tags) => updateLocale("tags", tags)} /><SelectField label="Kart genişliği" value={item.shared.width} onChange={(event) => onChange({ ...item, shared: { ...item.shared, width: event.target.value } })}><option value="normal">Normal</option><option value="wide">Geniş</option></SelectField><label className="flex items-center gap-3 self-end rounded-xl border border-line bg-canvas/60 px-4 py-3 text-sm text-muted"><input type="checkbox" checked={item.shared.certified} onChange={(event) => onChange({ ...item, shared: { ...item.shared, certified: event.target.checked } })} className="h-4 w-4 accent-[#d6ff3f]" />Sertifikalı</label></div><PreviewCard item={item} lang={lang} /></>;
}

function PreviewCard({ item, lang }) {
  const locale = item[lang];
  return <div className={`mt-6 rounded-3xl border border-line bg-canvas/45 p-6 transition hover:border-accent/30 ${item.shared.width === "wide" ? "md:max-w-2xl" : "md:max-w-sm"}`}><div className="flex items-start justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-elevated text-accent"><SafeIcon name={item.shared.icon} /></span>{item.shared.certified && <BadgeCheck className="h-5 w-5 text-accent" />}</div><h3 className="mt-6 font-display text-2xl font-semibold">{locale.name || locale.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{locale.description}</p>{locale.tags?.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{locale.tags.map((tag) => <span key={tag} className="rounded-full border border-line px-2 py-1 text-[10px] text-faint">{tag}</span>)}</div>}</div>;
}

function GroupForm({ group, lang, idScope, onChange }) {
  const locale = group[lang];
  const updateTitle = (title) => onChange({ ...group, [lang]: { title } });
  const replaceItems = (items) => onChange({ ...group, items });
  const addItem = () => {
    replaceItems([...group.items, createGroupSkillItem(idScope)]);
  };
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><TextField label="Grup başlığı" value={locale.title} onChange={(event) => updateTitle(event.target.value)} /><IconPicker value={group.shared.icon} onChange={(icon) => onChange({ ...group, shared: { icon } })} /></div><div className="flex items-center justify-between"><h3 className="font-display text-xl">Grup öğeleri</h3><Button variant="primary" onClick={addItem}><Plus className="h-4 w-4" />Yetenek ekle</Button></div><SortableList items={group.items} onMove={(from, to) => replaceItems(moveItem(group.items, from, to))} renderItem={(item) => <div className="grid gap-3 p-3 sm:grid-cols-[1fr_auto_auto]"><input aria-label={`${item.id} adı`} className="rounded-lg border border-line bg-elevated px-3 py-2 text-sm outline-none focus:border-accent/50" value={item[lang].name} onChange={(event) => replaceItems(group.items.map((current) => current.id === item.id ? { ...current, [lang]: { name: event.target.value } } : current))} /><label className="flex items-center gap-2 px-2 text-xs text-muted"><input type="checkbox" checked={item.shared.certified} onChange={(event) => replaceItems(group.items.map((current) => current.id === item.id ? { ...current, shared: { certified: event.target.checked } } : current))} className="accent-[#d6ff3f]" />Sertifikalı</label><Button variant="danger" onClick={() => replaceItems(group.items.filter((current) => current.id !== item.id))} aria-label={`${item.id} sil`}><Trash2 className="h-4 w-4" /></Button></div>} /></div>;
}
