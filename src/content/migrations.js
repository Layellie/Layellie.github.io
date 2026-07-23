import { createInitialVisuals } from "./initialVisuals.js";

const CERTIFICATE_SKILL_IDS = {
  pKmhqJKXKY: "csharp",
  Yx1h8D8laD: "ai-algorithms",
  BozfxjD1Bz: "it-fundamentals",
  mKEhkMNx8r: "cplusplus",
  JoNf2NxGKO: "anthropic-claude",
  WJ1SkP7J9V: "generative-ai",
  xr4tN6bV46: "oop",
  Yx1h8DOjld: "sql",
};

const FIXED_SKILL_IDS = {
  "C#": "csharp",
  "C++": "cplusplus",
  SQL: "sql",
  "Yapay Zeka & Algoritmalar": "ai-algorithms",
  "Bilgi Teknolojileri Temelleri": "it-fundamentals",
  "Üretken Yapay Zekâ": "generative-ai",
  "Anthropic Claude": "anthropic-claude",
  "Nesne Yönelimli Programlama (OOP)": "oop",
};

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "G")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "O")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "U")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function invariant(condition, message) {
  if (!condition) throw new Error(`Legacy migration failed: ${message}`);
}

function assertSame(label, left, right) {
  invariant(
    JSON.stringify(left) === JSON.stringify(right),
    `${label} differs between Turkish and English content`,
  );
}

function toIsoDate(value) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  invariant(match, `invalid legacy date: ${value}`);
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function withoutManagedCollections(languageContent, locale) {
  const result = structuredClone(languageContent);
  result.nav.login ||= locale === "tr" ? "Giriş Yap" : "Log in";
  delete result.skills.focus;
  delete result.skills.languages;
  delete result.skills.more;
  delete result.certificates.items;
  delete result.projects.items;
  return result;
}

function skillId(name, fallbackPrefix = "skill") {
  return FIXED_SKILL_IDS[name] || `${fallbackPrefix}-${slugify(name)}`;
}

export function migrateLegacyContent({ identity, content }) {
  invariant(identity && content?.tr && content?.en, "identity/tr/en roots are required");
  const tr = content.tr;
  const en = content.en;

  assertSame("project count", tr.projects.items.length, en.projects.items.length);
  assertSame("certificate count", tr.certificates.items.length, en.certificates.items.length);
  assertSame("focus count", tr.skills.focus.length, en.skills.focus.length);
  assertSame("skill card count", tr.skills.languages.length, en.skills.languages.length);
  assertSame("additional group count", tr.skills.more.length, en.skills.more.length);

  const projects = tr.projects.items.map((project, index) => {
    const translated = en.projects.items[index];
    for (const field of ["id", "year", "license", "github", "stack"]) {
      assertSame(`project ${project.id}.${field}`, project[field], translated[field]);
    }
    return {
      id: project.id,
      publicationStatus: "published",
      shared: {
        github: project.github,
        year: project.year,
        license: project.license,
        stack: project.stack,
        visual: {
          mode: "custom",
          componentId: `legacy-${project.id}`,
        },
      },
      tr: {
        name: project.name,
        type: project.type,
        description: project.description,
        features: project.features,
        status: project.status,
      },
      en: {
        name: translated.name,
        type: translated.type,
        description: translated.description,
        features: translated.features,
        status: translated.status,
      },
    };
  });

  const focusAreas = tr.skills.focus.map((focus, index) => {
    const translated = en.skills.focus[index];
    assertSame(`focus ${index}.icon`, focus.icon, translated.icon);
    return {
      id: `focus-${slugify(focus.title)}`,
      shared: { icon: focus.icon },
      tr: { title: focus.title, description: focus.desc, tags: focus.tags },
      en: {
        title: translated.title,
        description: translated.desc,
        tags: translated.tags,
      },
    };
  });

  const skillCards = tr.skills.languages.map((skill, index) => {
    const translated = en.skills.languages[index];
    for (const field of ["name", "icon", "span", "certified"]) {
      assertSame(`skill ${skill.name}.${field}`, skill[field], translated[field]);
    }
    return {
      id: skillId(skill.name),
      shared: {
        icon: skill.icon,
        certified: Boolean(skill.certified),
        width: skill.span ? "wide" : "normal",
      },
      tr: { name: skill.name, description: skill.note, tags: [] },
      en: { name: translated.name, description: translated.note, tags: [] },
    };
  });

  const additionalGroups = tr.skills.more.map((group, groupIndex) => {
    const translatedGroup = en.skills.more[groupIndex];
    assertSame(`additional group ${groupIndex}.icon`, group.icon, translatedGroup.icon);
    assertSame(
      `additional group ${groupIndex}.item count`,
      group.items.length,
      translatedGroup.items.length,
    );
    return {
      id: `group-${slugify(group.group)}`,
      shared: { icon: group.icon },
      tr: { title: group.group },
      en: { title: translatedGroup.group },
      items: group.items.map((item, itemIndex) => {
        const translated = translatedGroup.items[itemIndex];
        assertSame(
          `additional skill ${groupIndex}.${itemIndex}.certified`,
          item.certified,
          translated.certified,
        );
        return {
          id: skillId(item.name, "extra"),
          shared: { certified: Boolean(item.certified) },
          tr: { name: item.name },
          en: { name: translated.name },
        };
      }),
    };
  });

  const certificates = tr.certificates.items.map((certificate, index) => {
    const translated = en.certificates.items[index];
    for (const field of ["issuer", "date", "code", "icon", "file"]) {
      assertSame(`certificate ${certificate.code}.${field}`, certificate[field], translated[field]);
    }
    return {
      id: `certificate-${slugify(certificate.title)}`,
      shared: {
        date: toIsoDate(certificate.date),
        code: certificate.code,
        icon: certificate.icon,
        file: certificate.file,
        relatedSkillId: CERTIFICATE_SKILL_IDS[certificate.code] || null,
      },
      tr: {
        title: certificate.title,
        issuer: certificate.issuer,
        skillLabel: certificate.skill,
      },
      en: {
        title: translated.title,
        issuer: translated.issuer,
        skillLabel: translated.skill,
      },
    };
  });

  return {
    site: {
      schemaVersion: 1,
      shared: { identity },
      tr: withoutManagedCollections(tr, "tr"),
      en: withoutManagedCollections(en, "en"),
    },
    projects: { schemaVersion: 1, items: projects },
    certificates: { schemaVersion: 1, items: certificates },
    skills: {
      schemaVersion: 1,
      focusAreas,
      skillCards,
      additionalGroups,
    },
    visuals: createInitialVisuals(content),
  };
}

export const legacyMigrationInternals = { slugify, toIsoDate };
