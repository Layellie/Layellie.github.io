import siteJson from "./site.json";
import projectsJson from "./projects.json";
import certificatesJson from "./certificates.json";
import skillsJson from "./skills.json";
import visualsJson from "./visuals.json";
import { parsePortfolioFiles } from "./schemas.js";

export const portfolioFiles = parsePortfolioFiles({
  site: siteJson,
  projects: projectsJson,
  certificates: certificatesJson,
  skills: skillsJson,
  visuals: visualsJson,
});

function displayDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

export function buildContentView(files, { includeVisual = true } = {}) {
  const parsed = parsePortfolioFiles(files);
  const content = {};

  for (const lang of ["tr", "en"]) {
    const language = structuredClone(parsed.site[lang]);
    language.skills.focus = parsed.skills.focusAreas.map((item) => ({
      icon: item.shared.icon,
      title: item[lang].title,
      desc: item[lang].description,
      tags: item[lang].tags,
    }));
    language.skills.languages = parsed.skills.skillCards.map((item) => ({
      name: item[lang].name,
      icon: item.shared.icon,
      note: item[lang].description,
      width: item.shared.width,
      ...(item.shared.certified ? { certified: true } : {}),
    }));
    language.skills.more = parsed.skills.additionalGroups.map((group) => ({
      group: group[lang].title,
      icon: group.shared.icon,
      items: group.items.map((item) => ({
        name: item[lang].name,
        ...(item.shared.certified ? { certified: true } : {}),
      })),
    }));
    language.certificates.items = parsed.certificates.items.map((item) => ({
      title: item[lang].title,
      issuer: item[lang].issuer,
      date: displayDate(item.shared.date),
      code: item.shared.code,
      skill: item[lang].skillLabel,
      icon: item.shared.icon,
      file: item.shared.file,
    }));
    language.projects.items = parsed.projects.items
      .filter((item) => item.publicationStatus === "published")
      .map((item) => ({
        id: item.id,
        name: item[lang].name,
        type: item[lang].type,
        year: item.shared.year,
        license: item.shared.license,
        github: item.shared.github,
        description: item[lang].description,
        features: item[lang].features,
        status: item[lang].status,
        stack: item.shared.stack,
        ...(includeVisual ? { visual: item.shared.visual } : {}),
      }));
    content[lang] = language;
  }

  return {
    identity: parsed.site.shared.identity,
    content,
  };
}

const hydrated = buildContentView(portfolioFiles);

export const IDENTITY = hydrated.identity;
export const CONTENT = hydrated.content;
