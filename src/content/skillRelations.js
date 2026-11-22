function normalizeToken(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompact(value) {
  return normalizeToken(value).replace(/[^a-z0-9+#]+/g, "");
}

function splitKeywords(value) {
  return String(value || "")
    .split(/[·,/|()]+/)
    .map((part) => normalizeToken(part))
    .filter((part) => part.length >= 2);
}

const SKILL_ALIASES = {
  csharp: ["c#", "wpf", ".net", "mvvm"],
  cplusplus: ["c++", "c++20", "winrt", "qt", "native"],
  sql: ["sql", "veritabani", "database", "databases", "mysql", "ms sql"],
  "extra-ms-sql-server": ["sql", "ms sql", "veritabani", "database"],
  "extra-mysql": ["sql", "mysql", "veritabani", "database"],
  "new-skill": ["siber guvenlik", "cybersecurity", "cyber security"],
  "new-skill-2": ["siber guvenlik", "cybersecurity", "cyber security"],
  "new-skill-4": ["git", "github", "github actions", "ci/cd"],
  "new-skill-3": ["claude", "anthropic claude"],
  "anthropic-claude": ["claude", "anthropic claude"],
  "generative-ai": ["uretken yapay zeka", "generative ai"],
  "ai-algorithms": ["yapay zeka", "algoritma", "ai & algorithms"],
  oop: ["oop", "nesne yonelimli", "object-oriented"],
  "focus-sistem-optimizasyonu": ["ram", "standby", "timer", "0.5 ms", "0.5ms", "game mode", "oyun modu"],
  "focus-donanim-seviyesi-gelistirme": ["win32", "p/invoke", "c++", "winrt", "kernel", "ntsettimerresolution"],
};

function matchesTerm(haystackTokens, haystackRaw, term) {
  const normalized = normalizeToken(term);
  if (!normalized || normalized.length < 2) return false;

  // C# and C++ require strict token matching so they never cross-match each other or CSS.
  if (normalized === "c#" || normalized.startsWith("c# ")) {
    return haystackTokens.some((tok) => tok === "c#" || tok.startsWith("c# "));
  }
  if (normalized === "c++" || normalized.startsWith("c++")) {
    return haystackTokens.some((tok) => tok === "c++" || tok.startsWith("c++"));
  }
  if (normalized === "git" || normalized === "github") {
    return haystackTokens.some(
      (tok) => tok === "ci/cd" || tok.includes("github actions") || tok === "git" || tok === "github"
    );
  }

  const compactTerm = normalizeCompact(normalized);
  if (!compactTerm) return false;

  if (haystackTokens.some((tok) => tok === normalized || normalizeCompact(tok) === compactTerm)) {
    return true;
  }

  if (normalized.length >= 4) {
    return haystackRaw.includes(normalized) || normalizeCompact(haystackRaw).includes(compactTerm);
  }

  return haystackTokens.some((tok) => tok.split(/\s+/).includes(normalized));
}

function collectSkillSearchTerms(skill) {
  const terms = new Set();
  if (skill.name) terms.add(skill.name);
  if (skill.title) terms.add(skill.title);
  if (skill.note) splitKeywords(skill.note).forEach((k) => terms.add(k));
  if (Array.isArray(skill.tags)) skill.tags.forEach((tag) => terms.add(tag));
  if (skill.id && SKILL_ALIASES[skill.id]) {
    SKILL_ALIASES[skill.id].forEach((alias) => terms.add(alias));
  }
  return [...terms].filter(Boolean);
}

function displayDate(isoDate) {
  if (!isoDate || !isoDate.includes("-")) return isoDate || "";
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

export function findSkillByName(files, name, lang = "tr") {
  const target = normalizeToken(name);
  const focus = files.skills.focusAreas.find(
    (item) => normalizeToken(item[lang]?.title) === target || normalizeToken(item.tr?.title) === target || normalizeToken(item.en?.title) === target
  );
  if (focus) {
    return {
      id: focus.id,
      kind: "focus",
      name: focus[lang]?.title || focus.tr.title,
      note: focus[lang]?.description || "",
      tags: focus[lang]?.tags || [],
    };
  }
  const card = files.skills.skillCards.find(
    (item) => normalizeToken(item[lang]?.name) === target || normalizeToken(item.tr?.name) === target || normalizeToken(item.en?.name) === target
  );
  if (card) {
    return {
      id: card.id,
      kind: "card",
      name: card[lang]?.name || card.tr.name,
      note: card[lang]?.description || "",
      tags: card[lang]?.tags || [],
    };
  }
  for (const group of files.skills.additionalGroups) {
    const extra = group.items.find(
      (item) => normalizeToken(item[lang]?.name) === target || normalizeToken(item.tr?.name) === target || normalizeToken(item.en?.name) === target
    );
    if (extra) {
      return {
        id: extra.id,
        kind: "extra",
        name: extra[lang]?.name || extra.tr.name,
        note: group[lang]?.title || "",
        tags: [],
      };
    }
  }
  return { id: null, kind: "custom", name, note: "", tags: [] };
}

export function findSkillRelations(skillInput, files, lang = "tr") {
  const skill = typeof skillInput === "string" ? findSkillByName(files, skillInput, lang) : skillInput;
  if (!skill || !files) return { skill: null, projects: [], certificates: [] };

  const terms = collectSkillSearchTerms(skill);
  const nameCompact = normalizeCompact(skill.name);

  const certificates = files.certificates.items
    .filter((cert) => {
      if (skill.id && cert.shared.relatedSkillId && cert.shared.relatedSkillId === skill.id) {
        return true;
      }
      if (skill.id === "extra-ms-sql-server" || skill.id === "extra-mysql") {
        if (cert.shared.relatedSkillId === "sql") return true;
      }
      if (skill.id === "new-skill-3" && cert.shared.relatedSkillId === "anthropic-claude") {
        return true;
      }
      const labels = [cert.tr?.skillLabel, cert.en?.skillLabel, cert.tr?.title, cert.en?.title].filter(Boolean);
      const labelTokens = labels.flatMap((label) => [normalizeToken(label), ...splitKeywords(label)]);
      const labelCompactSet = new Set(labels.map((label) => normalizeCompact(label)));

      if (nameCompact && nameCompact.length >= 3 && labelCompactSet.has(nameCompact)) {
        return true;
      }
      return terms.some((term) => {
        const compact = normalizeCompact(term);
        if (compact.length < 3) return labelTokens.includes(normalizeToken(term));
        return labelCompactSet.has(compact) || labelTokens.some((tok) => tok === normalizeToken(term));
      });
    })
    .map((cert) => ({
      id: cert.id,
      code: cert.shared.code,
      title: cert[lang]?.title || cert.tr.title,
      issuer: cert[lang]?.issuer || cert.tr.issuer,
      date: displayDate(cert.shared.date),
      skillLabel: cert[lang]?.skillLabel || cert.tr.skillLabel,
      file: cert.shared.file,
    }));

  const projects = files.projects.items
    .filter((project) => project.publicationStatus === "published")
    .filter((project) => {
      const stackTokens = project.shared.stack.map((item) => normalizeToken(item));
      const statusTokens = [
        ...(project.tr?.status || []),
        ...(project.en?.status || []),
      ].map((item) => normalizeToken(item));
      const haystackTokens = [...stackTokens, ...statusTokens];
      const textFields =
        skill.kind === "focus"
          ? [
              ...project.shared.stack,
              project.tr?.description || "",
              project.en?.description || "",
              ...(project.tr?.features || []),
              ...(project.en?.features || []),
            ]
          : [...project.shared.stack, ...(project.tr?.status || []), ...(project.en?.status || [])];
      const haystackRaw = normalizeToken(textFields.join(" "));
      return terms.some((term) => matchesTerm(haystackTokens, haystackRaw, term));
    })
    .map((project) => ({
      id: project.id,
      name: project[lang]?.name || project.tr.name,
      type: project[lang]?.type || project.tr.type,
      status: project[lang]?.status?.[0] || project.shared.year,
      stack: project.shared.stack,
      github: project.shared.github,
    }));

  return { skill, projects, certificates };
}

export function buildSkillRelationIndex(files) {
  const index = { tr: {}, en: {} };
  for (const lang of ["tr", "en"]) {
    const names = [
      ...files.skills.focusAreas.map((item) => item[lang]?.title).filter(Boolean),
      ...files.skills.skillCards.map((item) => item[lang]?.name).filter(Boolean),
      ...files.skills.additionalGroups.flatMap((group) =>
        group.items.map((item) => item[lang]?.name).filter(Boolean)
      ),
    ];
    for (const name of names) {
      const rel = findSkillRelations(name, files, lang);
      if (rel.projects.length > 0 || rel.certificates.length > 0) {
        index[lang][name] = rel;
      }
    }
  }
  return index;
}
