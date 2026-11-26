import { useEffect, useState } from "react";
import { Briefcase, GraduationCap, Plus, Trash2 } from "lucide-react";
import { Button, LocaleTabs, SortableList, TextArea, TextField } from "../components/AdminUi.jsx";

function nextKey() {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `timeline-row-${random}`;
}

function createTemplate(kind, lang) {
  const year = String(new Date().getFullYear());
  if (kind === "job") {
    return lang === "tr"
      ? {
          period: `${year} — Devam`,
          tag: "Deneyim",
          title: "Şirket Adı · Full-Stack Developer",
          detail: "Konum / çalışma modeli. Görev ve kullandığın temel teknolojiler.",
          active: true,
        }
      : {
          period: `${year} — Present`,
          tag: "Experience",
          title: "Company Name · Full-Stack Developer",
          detail: "Location / work mode. Key responsibilities and main technologies.",
          active: true,
        };
  }
  if (kind === "internship") {
    return lang === "tr"
      ? {
          period: year,
          tag: "Deneyim · Staj",
          title: "Şirket Adı · Yazılım Stajyeri",
          detail: "Staj süresi ve odaklandığın geliştirme alanları.",
        }
      : {
          period: year,
          tag: "Experience · Internship",
          title: "Company Name · Software Intern",
          detail: "Duration and hands-on engineering focus areas.",
        };
  }
  return lang === "tr"
    ? {
        period: year,
        tag: "Eğitim / Sertifika",
        title: "Kurum · Program veya Sertifika",
        detail: "Kısa özet ve kazanımlar.",
      }
    : {
        period: year,
        tag: "Education / Certificate",
        title: "Institution · Program or Certificate",
        detail: "Short summary and key outcomes.",
      };
}

export default function TimelineEditor({ site, onChange }) {
  const [lang, setLang] = useState("tr");
  const about = site[lang].about;
  const items = Array.isArray(about.timeline) ? about.timeline : [];
  const [keys, setKeys] = useState(() => items.map(nextKey));

  useEffect(() => {
    setKeys((current) => {
      if (current.length === items.length) return current;
      if (current.length < items.length) {
        return [...current, ...Array.from({ length: items.length - current.length }, nextKey)];
      }
      return current.slice(0, items.length);
    });
  }, [items.length]);

  const updateAbout = (patch) =>
    onChange({
      ...site,
      [lang]: { ...site[lang], about: { ...about, ...patch } },
    });

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
    updateAbout({ timeline: nextItems });
  };

  const add = (kind) => {
    setKeys((current) => [...current, nextKey()]);
    updateAbout({ timeline: [...items, createTemplate(kind, lang)] });
  };

  const removeAt = (index) => {
    setKeys((current) => current.filter((_, position) => position !== index));
    updateAbout({ timeline: items.filter((_, position) => position !== index) });
  };

  const updateAt = (index, value) => {
    updateAbout({ timeline: items.map((item, position) => (position === index ? value : item)) });
  };

  const requiredError = (value) => (typeof value === "string" && !value.trim() ? "Bu alan boş bırakılamaz." : undefined);
  const rows = items.map((item, index) => ({ id: keys[index] || `timeline-fallback-${index}`, item, index }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LocaleTabs value={lang} onChange={setLang} />
        <span className="font-mono text-xs text-faint">
          site · {lang} · zaman çizelgesi ({items.length} kayıt)
        </span>
      </div>

      <TextField
        label="Zaman çizelgesi başlığı"
        value={about.timelineHeading || ""}
        onChange={(event) => updateAbout({ timelineHeading: event.target.value })}
        maxLength={160}
        error={items.length ? requiredError(about.timelineHeading || "") : undefined}
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => add("job")}>
            <Briefcase className="h-4 w-4" />
            İş deneyimi ekle
          </Button>
          <Button onClick={() => add("internship")}>
            <Plus className="h-4 w-4" />
            Staj ekle
          </Button>
          <Button onClick={() => add("education")}>
            <GraduationCap className="h-4 w-4" />
            Eğitim / Sertifika ekle
          </Button>
        </div>

        {rows.length ? (
          <SortableList
            items={rows}
            onMove={move}
            renderItem={(row) => {
              const entry = row.item;
              const index = row.index;
              return (
                <div className="space-y-3 p-3.5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      label={`Dönem ${index + 1}`}
                      value={entry.period}
                      onChange={(event) => updateAt(index, { ...entry, period: event.target.value })}
                      maxLength={80}
                      error={requiredError(entry.period)}
                    />
                    <TextField
                      label={`Kategori ${index + 1}`}
                      value={entry.tag}
                      onChange={(event) => updateAt(index, { ...entry, tag: event.target.value })}
                      maxLength={80}
                      error={requiredError(entry.tag)}
                    />
                  </div>
                  <TextField
                    label={`Başlık ${index + 1}`}
                    value={entry.title}
                    onChange={(event) => updateAt(index, { ...entry, title: event.target.value })}
                    maxLength={180}
                    error={requiredError(entry.title)}
                  />
                  <TextArea
                    label={`Açıklama ${index + 1}`}
                    value={entry.detail}
                    onChange={(event) => updateAt(index, { ...entry, detail: event.target.value })}
                    maxLength={600}
                    error={requiredError(entry.detail)}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={Boolean(entry.active)}
                        onChange={(event) => {
                          const next = { ...entry };
                          if (event.target.checked) next.active = true;
                          else delete next.active;
                          updateAt(index, next);
                        }}
                        className="h-4 w-4 rounded border-line bg-canvas accent-accent"
                      />
                      Aktif / devam eden durak (lime vurgu)
                    </label>
                    <Button
                      variant="danger"
                      onClick={() => removeAt(index)}
                      aria-label={`Zaman çizelgesi ${index + 1} sil`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Sil
                    </Button>
                  </div>
                </div>
              );
            }}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-6 text-center text-xs text-faint">
            Henüz zaman çizelgesi maddesi yok. Yukarıdan yeni bir deneyim veya eğitim durağı ekleyebilirsin.
          </div>
        )}
      </div>

      {/* Zikzak Canlı Önizleme */}
      {items.length > 0 && (
        <section
          aria-label="Zaman çizelgesi önizlemesi"
          className="rounded-3xl border border-line bg-canvas/55 p-6"
        >
          <div className="mb-5 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            {about.timelineHeading || (lang === "tr" ? "Zaman Çizelgesi" : "Timeline")} · {lang.toUpperCase()}
          </div>
          <div className="relative mx-auto max-w-3xl">
            <div aria-hidden className="absolute bottom-2 left-1/2 top-2 hidden w-px -translate-x-1/2 bg-line md:block" />
            <ol className="space-y-4">
              {items.map((item, index) => {
                const isLeft = index % 2 === 0;
                return (
                  <li
                    key={index}
                    className={`relative grid items-center gap-4 md:grid-cols-2 ${isLeft ? "" : ""}`}
                  >
                    <div className={isLeft ? "md:pr-7 md:text-right" : "md:col-start-2 md:pl-7"}>
                      <div
                        className={`rounded-2xl border p-4 text-xs transition ${
                          item.active
                            ? "border-accent/40 bg-accent/5"
                            : "border-line bg-surface/65"
                        }`}
                      >
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas/80 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                          <span>{item.period}</span>
                          <span className="text-faint">·</span>
                          <span>{item.tag}</span>
                        </div>
                        <div className="mt-2 font-display text-sm font-medium text-ink">{item.title}</div>
                        <p className="mt-1 leading-relaxed text-muted">{item.detail}</p>
                      </div>
                    </div>
                    <span
                      aria-hidden
                      className={`absolute left-1/2 top-1/2 hidden h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 md:block ${
                        item.active
                          ? "border-accent bg-accent shadow-[0_0_10px_rgba(214,255,63,0.75)]"
                          : "border-faint bg-canvas"
                      }`}
                    />
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}
