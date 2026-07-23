import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { STATEMENT_TONES } from "../../content/schemas.js";
import { Button, LocaleTabs, SortableList, TextArea, TextField } from "../components/AdminUi.jsx";

// About statement highlight tones → editor + preview colour classes. Kept in
// sync with the public STATEMENT_TONE_CLASS map so what you pick here is exactly
// what the site renders.
const TONE_META = {
  normal: { label: "Normal", className: "", dot: "bg-ink" },
  muted: { label: "Gri", className: "text-muted", dot: "bg-muted" },
  accent: { label: "Lime", className: "text-accent", dot: "bg-accent" },
};

// Globally-unique, stable row keys so paragraphs/facts/segments keep their
// identity across edits, drag-to-reorder and draft restore without leaking a
// synthetic id into the published JSON.
function nextKey() {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `about-row-${random}`;
}

function KeyedList({ items, min = 1, onChange, createItem, addLabel, emptyHint, renderRow }) {
  const [keys, setKeys] = useState(() => items.map(nextKey));
  // Only reconcile key count when the list length changes externally (draft
  // restore, locale switch). In-place edits keep the same length, so keys stay
  // stable and controlled inputs never lose focus.
  useEffect(() => {
    setKeys((current) => {
      if (current.length === items.length) return current;
      if (current.length < items.length) {
        return [...current, ...Array.from({ length: items.length - current.length }, nextKey)];
      }
      return current.slice(0, items.length);
    });
  }, [items.length]);

  const move = (from, to) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const nextItems = [...items];
    const [movedItem] = nextItems.splice(from, 1);
    nextItems.splice(to, 0, movedItem);
    setKeys((current) => {
      const nextKeys = [...current];
      const [movedKey] = nextKeys.splice(from, 1);
      nextKeys.splice(to, 0, movedKey);
      return nextKeys;
    });
    onChange(nextItems);
  };
  const add = () => {
    setKeys((current) => [...current, nextKey()]);
    onChange([...items, createItem()]);
  };
  const removeAt = (index) => {
    if (items.length <= min) return;
    setKeys((current) => current.filter((_, position) => position !== index));
    onChange(items.filter((_, position) => position !== index));
  };
  const updateAt = (index, value) => onChange(items.map((item, position) => (position === index ? value : item)));

  const rows = items.map((item, index) => ({ id: keys[index] || `about-fallback-${index}`, item, index }));
  const canRemove = items.length > min;
  return (
    <div className="space-y-3">
      {rows.length ? (
        <SortableList
          items={rows}
          onMove={move}
          renderItem={(row) => (
            <div className="p-3">{renderRow(row.item, row.index, { updateAt, removeAt, canRemove })}</div>
          )}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-line p-6 text-center text-xs text-faint">{emptyHint}</div>
      )}
      <Button variant="primary" onClick={add}><Plus className="h-4 w-4" />{addLabel}</Button>
    </div>
  );
}

function ToneSelect({ value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-canvas/60 p-1" role="group" aria-label="Vurgu rengi">
      {STATEMENT_TONES.map((tone) => {
        const meta = TONE_META[tone];
        const active = value === tone;
        return (
          <button
            key={tone}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tone)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${active ? "bg-accent text-canvas" : "text-muted hover:text-ink"}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full border border-line ${meta.dot}`} />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AboutEditor({ site, onChange }) {
  const [lang, setLang] = useState("tr");
  const about = site[lang].about;
  const updateAbout = (patch) => onChange({ ...site, [lang]: { ...site[lang], about: { ...about, ...patch } } });

  const requiredError = (value) => (typeof value === "string" && !value.trim() ? "Bu alan boş bırakılamaz." : undefined);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LocaleTabs value={lang} onChange={setLang} />
        <span className="font-mono text-xs text-faint">site · {lang} · hakkımda</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="Bölüm no" value={about.index} onChange={(event) => updateAbout({ index: event.target.value })} maxLength={12} error={requiredError(about.index)} />
        <TextField label="Başlık" value={about.title} onChange={(event) => updateAbout({ title: event.target.value })} maxLength={120} error={requiredError(about.title)} />
        <TextField label="Alt başlık (kicker)" value={about.kicker} onChange={(event) => updateAbout({ kicker: event.target.value })} maxLength={240} error={requiredError(about.kicker)} />
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="font-display text-xl">Büyük cümle (statement)</h3>
          <p className="mt-1 text-xs text-muted">Cümleyi parçalara böl ve her parçaya bir renk seç. İleride bir kelimeyi ayrı parça yapıp rengini değiştirebilirsin. Boşluklar korunur, o yüzden parça sonlarındaki boşlukları silme.</p>
        </div>
        <KeyedList
          items={about.statement}
          onChange={(statement) => updateAbout({ statement })}
          createItem={() => ({ text: "Yeni parça", tone: "normal" })}
          addLabel="Parça ekle"
          emptyHint="En az bir parça gerekli."
          renderRow={(segment, index, { updateAt, removeAt, canRemove }) => (
            <div className="space-y-3">
              <TextArea
                label={`Parça ${index + 1}`}
                value={segment.text}
                onChange={(event) => updateAt(index, { ...segment, text: event.target.value })}
                maxLength={500}
                error={segment.text.trim() ? undefined : "Parça metni boş olamaz."}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <ToneSelect value={segment.tone} onChange={(tone) => updateAt(index, { ...segment, tone })} />
                <Button variant="danger" onClick={() => removeAt(index)} disabled={!canRemove} aria-label={`Parça ${index + 1} sil`}><Trash2 className="h-4 w-4" />Sil</Button>
              </div>
            </div>
          )}
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-xl">Paragraflar</h3>
        <KeyedList
          items={about.paragraphs}
          onChange={(paragraphs) => updateAbout({ paragraphs })}
          createItem={() => "Yeni paragraf"}
          addLabel="Paragraf ekle"
          emptyHint="En az bir paragraf gerekli."
          renderRow={(paragraph, index, { updateAt, removeAt, canRemove }) => (
            <div className="space-y-3">
              <TextArea
                label={`Paragraf ${index + 1}`}
                value={paragraph}
                onChange={(event) => updateAt(index, event.target.value)}
                maxLength={2400}
                error={paragraph.trim() ? undefined : "Paragraf boş olamaz."}
              />
              <div className="flex justify-end">
                <Button variant="danger" onClick={() => removeAt(index)} disabled={!canRemove} aria-label={`Paragraf ${index + 1} sil`}><Trash2 className="h-4 w-4" />Sil</Button>
              </div>
            </div>
          )}
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-xl">Bilgi kutuları (facts)</h3>
        <KeyedList
          items={about.facts}
          onChange={(facts) => updateAbout({ facts })}
          createItem={() => ({ label: "Yeni etiket", value: "Değer" })}
          addLabel="Bilgi kutusu ekle"
          emptyHint="En az bir bilgi kutusu gerekli."
          renderRow={(fact, index, { updateAt, removeAt, canRemove }) => (
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
              <TextField label="Etiket" value={fact.label} onChange={(event) => updateAt(index, { ...fact, label: event.target.value })} maxLength={120} error={requiredError(fact.label)} />
              <TextField label="Değer" value={fact.value} onChange={(event) => updateAt(index, { ...fact, value: event.target.value })} maxLength={240} error={requiredError(fact.value)} />
              <div className="sm:pt-7"><Button variant="danger" onClick={() => removeAt(index)} disabled={!canRemove} aria-label={`Bilgi kutusu ${index + 1} sil`}><Trash2 className="h-4 w-4" />Sil</Button></div>
            </div>
          )}
        />
      </section>

      <AboutPreview about={about} lang={lang} />
    </div>
  );
}

function AboutPreview({ about, lang }) {
  return (
    <section aria-label="Hakkımda önizlemesi" data-about-preview="" className="rounded-3xl border border-line bg-canvas/45 p-6">
      <div className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-faint">Canlı önizleme · {lang.toUpperCase()}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{about.index} · {about.title}</div>
      <p className="mt-4 font-display text-2xl leading-[1.15] tracking-tight">
        {about.statement.map((segment, index) => (
          <span key={index} className={TONE_META[segment.tone]?.className || ""}>{segment.text}</span>
        ))}
      </p>
      <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted">
        {about.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
        {about.facts.map((fact, index) => (
          <div key={index} className="bg-surface p-4">
            <div className="text-[10px] uppercase tracking-wider text-faint">{fact.label}</div>
            <div className="mt-1 font-display text-base leading-snug">{fact.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
