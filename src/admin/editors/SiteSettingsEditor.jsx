import { useState } from "react";
import { Globe, Mail, MapPin, UserRound } from "lucide-react";
import { LocaleTabs, TextArea, TextField } from "../components/AdminUi.jsx";

const AVAILABILITY_PRESETS = {
  tr: ["Yeni projelere açığım", "Tam zamanlı fırsatlara açığım", "Aktif projelerde çalışıyorum"],
  en: ["Open to new projects", "Open to full-time roles", "Currently working on active projects"],
};

export default function SiteSettingsEditor({ site, onChange }) {
  const [lang, setLang] = useState("tr");
  const identity = site.shared.identity;
  const locale = site[lang];
  const hero = locale.hero;
  const contact = locale.contact;

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

  const requiredError = (value) => (typeof value === "string" && !value.trim() ? "Bu alan boş bırakılamaz." : undefined);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LocaleTabs value={lang} onChange={setLang} />
        <span className="font-mono text-xs text-faint">site · {lang} · hero &amp; iletişim</span>
      </div>

      {/* Hero metinleri */}
      <section className="space-y-4">
        <div>
          <h3 className="font-display text-xl">Hero üst bölümü ({lang.toUpperCase()})</h3>
          <p className="mt-1 text-xs text-muted">
            Site açılışındaki müsaitlik rozeti, konum, unvan, alt açıklama ve ana aksiyon butonları.
          </p>
        </div>

        <div className="space-y-2">
          <TextField
            label="Müsaitlik durumu"
            value={hero.available}
            onChange={(event) => updateHero({ available: event.target.value })}
            maxLength={160}
            error={requiredError(hero.available)}
          />
          <div className="flex flex-wrap gap-1.5">
            {AVAILABILITY_PRESETS[lang].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => updateHero({ available: preset })}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                  hero.available === preset
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-line bg-canvas/50 text-faint hover:border-accent/25 hover:text-ink"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
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
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span>{hero.available}</span>
          <span className="text-faint">/</span>
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
