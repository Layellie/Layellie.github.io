import { useState } from "react";
import { Briefcase, Globe, Mail, MapPin, UserRound } from "lucide-react";
import { AVAILABILITY_META, AVAILABILITY_TONES, resolveAvailabilityMeta, resolveAvailabilityTone } from "../../content/availability.js";
import { Button, LocaleTabs, TextArea, TextField } from "../components/AdminUi.jsx";

const AVAILABILITY_PRESETS = {
  tr: [
    { text: "Yeni projelere açığım", tone: "available" },
    { text: "Tam zamanlı fırsatlara açığım", tone: "available" },
    { text: "Tam zamanlı çalışıyorum", tone: "working" },
    { text: "Aktif görevde çalışıyorum", tone: "working" },
    { text: "Sınırlı freelance projelere açığım", tone: "limited" },
  ],
  en: [
    { text: "Open to new projects", tone: "available" },
    { text: "Open to full-time roles", tone: "available" },
    { text: "Working full-time", tone: "working" },
    { text: "Currently employed full-time", tone: "working" },
    { text: "Limited availability for freelance", tone: "limited" },
  ],
};

export default function SiteSettingsEditor({ site, onChange }) {
  const [lang, setLang] = useState("tr");
  const [quickCompany, setQuickCompany] = useState("");
  const [quickRole, setQuickRole] = useState("");

  const identity = site.shared.identity;
  const availabilityTone = resolveAvailabilityTone(site.shared.availabilityTone);
  const availabilityMeta = resolveAvailabilityMeta(availabilityTone);
  const locale = site[lang];
  const hero = locale.hero;
  const contact = locale.contact;

  const updateShared = (patch) =>
    onChange({
      ...site,
      shared: { ...site.shared, ...patch },
    });

  const updateIdentity = (patch) =>
    onChange({
      ...site,
      shared: { ...site.shared, identity: { ...identity, ...patch } },
    });

  const updateHero = (patch) =>
    onChange({
      ...site,
      [lang]: { ...locale, hero: { ...hero, ...patch } },
    });

  const updateContact = (patch) =>
    onChange({
      ...site,
      [lang]: { ...locale, contact: { ...contact, ...patch } },
    });

  const updateContactLine = (index, value) => {
    const nextBig = [contact.big?.[0] || "", contact.big?.[1] || ""];
    nextBig[index] = value;
    updateContact({ big: nextBig });
  };

  const applyPreset = (preset) => {
    onChange({
      ...site,
      shared: { ...site.shared, availabilityTone: preset.tone },
      [lang]: { ...locale, hero: { ...hero, available: preset.text } },
    });
  };

  const applyCompanyStatus = () => {
    const company = quickCompany.trim();
    const role = quickRole.trim();
    if (!company) return;
    const trText = role
      ? `${company} · ${role}`
      : `${company} bünyesinde çalışıyorum`;
    const enText = role
      ? `${role} at ${company}`
      : `Working at ${company}`;
    onChange({
      ...site,
      shared: { ...site.shared, availabilityTone: "working" },
      tr: { ...site.tr, hero: { ...site.tr.hero, available: trText } },
      en: { ...site.en, hero: { ...site.en.hero, available: enText } },
    });
  };

  const requiredError = (value) => (typeof value === "string" && !value.trim() ? "Bu alan boş bırakılamaz." : undefined);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LocaleTabs value={lang} onChange={setLang} />
        <span className="font-mono text-xs text-faint">site · {lang} · hero &amp; iletişim</span>
      </div>

      {/* Çalışma & Müsaitlik Durumu */}
      <section className="space-y-4 rounded-2xl border border-line bg-canvas/35 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-xl">Çalışma &amp; Müsaitlik Durumu</h3>
            <p className="mt-1 text-xs text-muted">
              Hero üstündeki durum noktasının rengini, görünürlüğünü ve yazısını buradan yönet. İşe girdiğinde tek tıkla “Çalışıyor” moduna alabilir veya tamamen gizleyebilirsin.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 font-mono text-[10px] text-muted">
            <span className={`h-2 w-2 rounded-full ${availabilityMeta.dotClass}`} />
            {availabilityMeta.shortLabel}
          </span>
        </div>

        {/* Durum modu seçici (TR & EN ortak) */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted">Durum rozeti modu (TR &amp; EN ortak)</div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Durum rozeti modu">
            {AVAILABILITY_TONES.map((tone) => {
              const meta = AVAILABILITY_META[tone];
              const active = availabilityTone === tone;
              return (
                <button
                  key={tone}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateShared({ availabilityTone: tone })}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    active
                      ? "border-accent/50 bg-accent/12 text-ink"
                      : "border-line bg-canvas/60 text-muted hover:border-accent/25 hover:text-ink"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
                  {meta.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-faint">{availabilityMeta.description}</p>
        </div>

        {/* İşe giriş hızlı doldurucu */}
        <div className="rounded-xl border border-line bg-surface/50 p-3.5">
          <div className="flex items-center gap-2 text-xs font-medium text-ink">
            <Briefcase className="h-3.5 w-3.5 text-sky-400" />
            İşe giriş hızlı ayarla (TR &amp; EN birlikte doldurur)
          </div>
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <TextField
              label="Şirket adı"
              placeholder="Örn. ABC Yazılım"
              value={quickCompany}
              onChange={(event) => setQuickCompany(event.target.value)}
              maxLength={80}
            />
            <TextField
              label="Pozisyon (opsiyonel)"
              placeholder="Örn. Full-Stack Developer"
              value={quickRole}
              onChange={(event) => setQuickRole(event.target.value)}
              maxLength={80}
            />
            <Button
              type="button"
              variant="primary"
              disabled={!quickCompany.trim()}
              onClick={applyCompanyStatus}
            >
              Uygula
            </Button>
          </div>
        </div>

        {/* Serbest metin + hazır şablonlar */}
        <div className="space-y-2">
          <TextField
            label={`Müsaitlik durumu yazısı (${lang.toUpperCase()})`}
            value={hero.available}
            onChange={(event) => updateHero({ available: event.target.value })}
            maxLength={160}
            error={requiredError(hero.available)}
          />
          {availabilityTone === "hidden" && (
            <p className="text-[11px] text-amber-200/90">
              Mod “Gizle” seçili olduğu için bu yazı sitede gösterilmez; tekrar görünür yapmak için yukarıdan bir renk modu seçebilirsin.
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {AVAILABILITY_PRESETS[lang].map((preset) => {
              const meta = AVAILABILITY_META[preset.tone];
              return (
                <button
                  key={preset.text}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
                    hero.available === preset.text && availabilityTone === preset.tone
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-line bg-canvas/50 text-faint hover:border-accent/25 hover:text-ink"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                  {preset.text}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Hero metinleri */}
      <section className="space-y-4">
        <div>
          <h3 className="font-display text-xl">Hero üst bölümü ({lang.toUpperCase()})</h3>
          <p className="mt-1 text-xs text-muted">
            Site açılışındaki konum, unvan, alt açıklama ve ana aksiyon butonları.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Konum"
            value={hero.location}
            onChange={(event) => updateHero({ location: event.target.value })}
            maxLength={160}
            error={requiredError(hero.location)}
          />
          <TextField
            label="Rol / Unvan"
            value={hero.role}
            onChange={(event) => updateHero({ role: event.target.value })}
            maxLength={160}
            error={requiredError(hero.role)}
          />
          <TextArea
            label="Hero alt açıklaması (tagline)"
            className="md:col-span-2"
            value={hero.tagline}
            onChange={(event) => updateHero({ tagline: event.target.value })}
            maxLength={500}
            error={requiredError(hero.tagline)}
          />
          <TextField
            label="Birincil buton (Projeler)"
            value={hero.ctaProjects}
            onChange={(event) => updateHero({ ctaProjects: event.target.value })}
            maxLength={120}
            error={requiredError(hero.ctaProjects)}
          />
          <TextField
            label="İkincil buton (İletişim)"
            value={hero.ctaContact}
            onChange={(event) => updateHero({ ctaContact: event.target.value })}
            maxLength={120}
            error={requiredError(hero.ctaContact)}
          />
        </div>
      </section>

      {/* İletişim metinleri */}
      <section className="space-y-4 border-t border-line pt-6">
        <div>
          <h3 className="font-display text-xl">İletişim bölümü metinleri ({lang.toUpperCase()})</h3>
          <p className="mt-1 text-xs text-muted">Sayfa sonundaki büyük çağrı başlığı ve kısa davet metni.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField
            label="Bölüm etiketi"
            value={contact.label}
            onChange={(event) => updateContact({ label: event.target.value })}
            maxLength={120}
            error={requiredError(contact.label)}
          />
          <TextField
            label="Büyük başlık · Satır 1"
            value={contact.big?.[0] || ""}
            onChange={(event) => updateContactLine(0, event.target.value)}
            maxLength={240}
            error={requiredError(contact.big?.[0] || "")}
          />
          <TextField
            label="Büyük başlık · Satır 2"
            value={contact.big?.[1] || ""}
            onChange={(event) => updateContactLine(1, event.target.value)}
            maxLength={240}
            error={requiredError(contact.big?.[1] || "")}
          />
          <TextArea
            label="İletişim açıklaması"
            className="md:col-span-3"
            value={contact.blurb}
            onChange={(event) => updateContact({ blurb: event.target.value })}
            maxLength={800}
            error={requiredError(contact.blurb)}
          />
        </div>
      </section>

      {/* Kimlik & bağlantılar (ortak) */}
      <section className="space-y-4 border-t border-line pt-6">
        <div>
          <h3 className="font-display text-xl">Kimlik &amp; Sosyal Bağlantılar (Ortak)</h3>
          <p className="mt-1 text-xs text-muted">
            Her iki dilde ortak kullanılır; e-posta, GitHub ve LinkedIn adresleri JSON-LD ve iletişim butonlarına otomatik yansır.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Ad Soyad"
            value={identity.name}
            onChange={(event) => updateIdentity({ name: event.target.value })}
            maxLength={100}
            error={requiredError(identity.name)}
          />
          <TextField
            label="Kullanıcı adı (handle)"
            value={identity.handle}
            onChange={(event) => updateIdentity({ handle: event.target.value })}
            maxLength={80}
            error={requiredError(identity.handle)}
          />
          <TextField
            label="E-posta"
            value={identity.email}
            onChange={(event) => updateIdentity({ email: event.target.value })}
            inputMode="email"
            maxLength={254}
            error={requiredError(identity.email)}
          />
          <TextField
            label="GitHub kullanıcı adı"
            value={identity.githubUser}
            onChange={(event) => updateIdentity({ githubUser: event.target.value })}
            maxLength={80}
            error={requiredError(identity.githubUser)}
          />
          <TextField
            label="GitHub profil URL"
            value={identity.github}
            onChange={(event) => updateIdentity({ github: event.target.value })}
            inputMode="url"
            error={requiredError(identity.github)}
          />
          <TextField
            label="LinkedIn profil URL"
            value={identity.linkedin}
            onChange={(event) => updateIdentity({ linkedin: event.target.value })}
            inputMode="url"
            error={requiredError(identity.linkedin)}
          />
        </div>
      </section>

      {/* Canlı Hero + İletişim önizlemesi */}
      <section aria-label="Hero önizlemesi" className="rounded-3xl border border-line bg-canvas/45 p-6">
        <div className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-faint">
          Canlı önizleme · {lang.toUpperCase()}
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted">
          {availabilityMeta.visible && (
            <>
              <span className="relative flex h-2.5 w-2.5">
                {availabilityMeta.ping && (
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${availabilityMeta.pingClass}`} />
                )}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${availabilityMeta.dotClass}`} />
              </span>
              <span>{hero.available}</span>
              <span className="text-faint">/</span>
            </>
          )}
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-accent" />
            {hero.location}
          </span>
        </div>
        <div className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink">
          {identity.name}
          <span className="text-accent">.</span>
        </div>
        <div className="mt-2 font-display text-base text-ink/90">{hero.role}</div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{hero.tagline}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <span className="rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-canvas">{hero.ctaProjects}</span>
          <span className="rounded-full border border-line px-4 py-1.5 text-xs text-ink">{hero.ctaContact}</span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-line pt-4 text-xs text-faint">
          <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-accent" />{identity.email}</span>
          <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-accent" />@{identity.handle}</span>
          <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-accent" />{contact.big?.[0]} {contact.big?.[1]}</span>
        </div>
      </section>
    </div>
  );
}
