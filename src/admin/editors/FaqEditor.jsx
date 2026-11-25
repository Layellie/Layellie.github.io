import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { resolveFaqContent } from "../../content/faq.js";
import { Button, LocaleTabs, Notice, SortableList, TextArea, TextField } from "../components/AdminUi.jsx";

function nextKey() {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `faq-row-${random}`;
}

export default function FaqEditor({ site, onChange }) {
  const [lang, setLang] = useState("tr");
  const faq = resolveFaqContent(site[lang], lang);
  const items = faq.items || [];
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

  const updateFaq = (patch) =>
    onChange({
      ...site,
      [lang]: {
        ...site[lang],
        faq: { ...faq, ...patch },
      },
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
    updateFaq({ items: nextItems });
  };

  const add = () => {
    if (items.length >= 12) return;
    setKeys((current) => [...current, nextKey()]);
    updateFaq({
      items: [
        ...items,
        {
          q: lang === "tr" ? "Yeni soru?" : "New question?",
          a: lang === "tr" ? "Kısa ve net yanıt." : "Short and clear answer.",
        },
      ],
    });
  };

  const removeAt = (index) => {
    setKeys((current) => current.filter((_, i) => i !== index));
    updateFaq({ items: items.filter((_, i) => i !== index) });
  };

  const updateAt = (index, patch) => {
    updateFaq({
      items: items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  };

  const requiredError = (value) => (typeof value === "string" && !value.trim() ? "Bu alan boş bırakılamaz." : undefined);
  const rows = items.map((item, index) => ({ id: keys[index] || `faq-fallback-${index}`, item, index }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LocaleTabs value={lang} onChange={setLang} />
        <span className="font-mono text-xs text-faint">site · {lang} · {items.length}/12 soru</span>
      </div>

      <Notice tone="info" title="SEO & AI otomatik senkron">
        Burada yaptığın değişiklikler yayınlandığında sitedeki <code>#sss</code> bölümü, Google <code>FAQPage</code> JSON-LD yapısal verisi ve <code>llms.txt</code> otomatik olarak güncellenir.
      </Notice>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Bölüm başlığı"
          value={faq.heading}
          onChange={(event) => updateFaq({ heading: event.target.value })}
          maxLength={160}
          error={requiredError(faq.heading)}
        />
        <TextField
          label="Alt etiket (kicker)"
          value={faq.kicker}
          onChange={(event) => updateFaq({ kicker: event.target.value })}
          maxLength={120}
          error={requiredError(faq.kicker)}
        />
      </div>

      <div className="space-y-3">
        {rows.length > 0 ? (
          <SortableList
            items={rows}
            onMove={move}
            renderItem={(row) => (
              <div className="space-y-3 p-3.5">
                <TextField
                  label={`Soru ${row.index + 1}`}
                  value={row.item.q}
                  onChange={(event) => updateAt(row.index, { q: event.target.value })}
                  maxLength={240}
                  error={requiredError(row.item.q)}
                />
                <TextArea
                  label={`Yanıt ${row.index + 1}`}
                  value={row.item.a}
                  onChange={(event) => updateAt(row.index, { a: event.target.value })}
                  maxLength={1200}
                  error={requiredError(row.item.a)}
                />
                <div className="flex justify-end">
                  <Button
                    variant="danger"
                    onClick={() => removeAt(row.index)}
                    aria-label={`Soru ${row.index + 1} sil`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Sil
                  </Button>
                </div>
              </div>
            )}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-6 text-center text-xs text-faint">
            Henüz soru yok. Yeni soru ekleyebilir veya boş bırakarak bölümü siteden gizleyebilirsin.
          </div>
        )}
        <Button variant="primary" onClick={add} disabled={items.length >= 12}>
          <Plus className="h-4 w-4" />
          Soru ekle
        </Button>
      </div>

      {/* Canlı SSS önizlemesi */}
      {items.length > 0 && (
        <section aria-label="SSS önizlemesi" className="rounded-3xl border border-line bg-canvas/45 p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3 className="font-display text-xl font-semibold">{faq.heading}</h3>
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">{faq.kicker}</span>
          </div>
          <div className="divide-y divide-line border-t border-line">
            {items.map((item, idx) => (
              <details key={idx} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-ink">{item.q}</summary>
                <p className="mt-2 text-xs leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
