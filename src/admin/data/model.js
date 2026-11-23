import { parsePortfolioFiles } from "../../content/schemas.js";

export function clonePortfolio(files) {
  return structuredClone(files);
}

export function slugify(value) {
  const slug = value
    .toLocaleLowerCase("en-US")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "new-item";
}

export function uniqueId(items, preferred) {
  const base = slugify(preferred);
  const ids = new Set(items.map((item) => item.id));
  if (!ids.has(base)) return base;
  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!ids.has(candidate)) return candidate;
  }
  throw new Error("Benzersiz kayıt kimliği üretilemedi.");
}

export function skillIdScope(skills) {
  return [
    ...(skills.focusAreas || []),
    ...(skills.skillCards || []),
    ...(skills.additionalGroups || []).flatMap((group) => group.items || []),
  ];
}

export function createGroupSkillItem(existingSkillItems) {
  return {
    id: uniqueId(existingSkillItems, "new-skill"),
    shared: { certified: false },
    tr: { name: "Yeni Yetenek" },
    en: { name: "New Skill" },
  };
}

export function certificateSkillOptions(skills) {
  return [
    ...skills.skillCards.map((item) => ({ id: item.id, label: item.tr.name })),
    ...skills.additionalGroups.flatMap((group) => group.items.map((item) => ({ id: item.id, label: item.tr.name }))),
  ];
}

export function moveItem(items, fromIndex, toIndex) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function duplicateProject(items, id, presets = [], selectedPresetId = null) {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return items;
  const source = structuredClone(items[index]);
  source.id = uniqueId(items, `${source.id}-copy`);
  source.publicationStatus = "draft";
  source.tr.name = `${source.tr.name} (Kopya)`;
  source.en.name = `${source.en.name} (Copy)`;
  if (source.shared.visual.mode === "screenshot" && isPendingMediaPath(source.shared.visual.path)) {
    source.shared.visual = initialProjectVisual(presets, selectedPresetId);
  }
  return [...items.slice(0, index + 1), source, ...items.slice(index + 1)];
}

export function duplicateById(items, id, labelKeys = [], idScope = items) {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return items;
  const source = structuredClone(items[index]);
  source.id = uniqueId(idScope, `${source.id}-copy`);
  for (const locale of ["tr", "en"]) {
    for (const key of labelKeys) {
      if (typeof source[locale]?.[key] === "string") {
        source[locale][key] += locale === "tr" ? " (Kopya)" : " (Copy)";
      }
    }
  }
  return [...items.slice(0, index + 1), source, ...items.slice(index + 1)];
}

export function createProject(items, presets = [], selectedPresetId = null) {
  const id = uniqueId(items, "new-project");
  return {
    id,
    publicationStatus: "draft",
    shared: {
      github: `https://github.com/Layellie/${id}`,
      year: String(new Date().getFullYear()),
      license: "MIT",
      stack: [],
      visual: initialProjectVisual(presets, selectedPresetId),
    },
    tr: { name: "Yeni Proje", type: "Açık Kaynak · Proje", description: "Proje açıklaması", features: [], status: [] },
    en: { name: "New Project", type: "Open Source · Project", description: "Project description", features: [], status: [] },
  };
}

function initialProjectVisual(presets, selectedPresetId) {
  const selected = presets.find((preset) => preset.id === selectedPresetId) || presets[0];
  return selected
    ? { mode: "builder", visualId: selected.id, fallbackComponentId: "legacy-clipboard" }
    : { mode: "custom", componentId: "legacy-clipboard" };
}

export function createCertificate(items, skillId = null) {
  const id = uniqueId(items, "new-certificate");
  const date = formatLocalDate(new Date());
  return {
    id,
    shared: {
      date,
      code: "PENDING",
      icon: "Award",
      file: `/media/certificates/${id}/pending.pdf`,
      relatedSkillId: skillId,
    },
    tr: { title: "Yeni Sertifika", issuer: "Kurum", skillLabel: "Yetenek" },
    en: { title: "New Certificate", issuer: "Issuer", skillLabel: "Skill" },
  };
}

export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (![year, month, day].every(Number.isInteger)) throw new Error("Geçerli bir yerel tarih gerekli.");
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function createSkillCard(items) {
  const id = uniqueId(items, "new-skill");
  return {
    id,
    shared: { icon: "Code2", certified: false, width: "normal" },
    tr: { name: "Yeni Yetenek", description: "", tags: [] },
    en: { name: "New Skill", description: "", tags: [] },
  };
}

export function createFocusArea(items) {
  const id = uniqueId(items, "new-focus");
  return {
    id,
    shared: { icon: "Sparkles" },
    tr: { title: "Yeni Odak", description: "Odak alanı açıklaması", tags: [] },
    en: { title: "New Focus", description: "Focus area description", tags: [] },
  };
}

export function createAdditionalGroup(items) {
  const id = uniqueId(items, "new-group");
  return {
    id,
    shared: { icon: "Boxes" },
    tr: { title: "Yeni Grup" },
    en: { title: "New Group" },
    items: [],
  };
}

export function translationWarnings(files) {
  const warnings = [];
  const check = (path, record, keys) => {
    for (const locale of ["tr", "en"]) {
      for (const key of keys) {
        const value = record[locale]?.[key];
        if (typeof value === "string" && !value.trim()) warnings.push(`${path}.${locale}.${key}`);
        if (Array.isArray(value) && value.length === 0) warnings.push(`${path}.${locale}.${key}`);
      }
    }
  };

  files.projects.items.forEach((item) => check(`projects.${item.id}`, item, ["name", "type", "description", "features", "status"]));
  files.certificates.items.forEach((item) => check(`certificates.${item.id}`, item, ["title", "issuer", "skillLabel"]));
  files.skills.focusAreas.forEach((item) => check(`skills.focusAreas.${item.id}`, item, ["title", "description", "tags"]));
  files.skills.skillCards.forEach((item) => check(`skills.skillCards.${item.id}`, item, ["name"]));
  files.skills.additionalGroups.forEach((group) => {
    check(`skills.additionalGroups.${group.id}`, group, ["title"]);
    group.items.forEach((item) => check(`skills.additionalGroups.${group.id}.${item.id}`, item, ["name"]));
  });
  files.visuals.presets.forEach((item) => check(`visuals.${item.id}`, item, ["footerText", "footerBadge"]));
  return warnings;
}

export function publicationIssues(files) {
  const warnings = translationWarnings(files);
  const errors = [];
  const visualPresetIds = new Set(files.visuals.presets.map((preset) => preset.id));
  for (const project of files.projects.items) {
    const visual = project.shared.visual;
    if (visual.mode === "builder" && !visualPresetIds.has(visual.visualId)) {
      const issue = `projects.${project.id}.shared.visual.visualId: "${visual.visualId}" preset'i bulunamadı`;
      if (project.publicationStatus === "published") errors.push(issue);
      else warnings.push(`${issue} (taslak)`);
    }
    if (project.publicationStatus !== "published") continue;
    for (const locale of ["tr", "en"]) {
      for (const key of ["name", "type", "description"]) {
        if (!project[locale]?.[key]?.trim()) errors.push(`projects.${project.id}.${locale}.${key}`);
      }
      for (const key of ["features", "status"]) {
        if (!project[locale]?.[key]?.length) errors.push(`projects.${project.id}.${locale}.${key}`);
      }
    }
  }
  const blocking = new Set(errors);
  return { warnings: warnings.filter((warning) => !blocking.has(warning)), errors };
}

export function validatePortfolio(files) {
  const { warnings, errors } = publicationIssues(files);
  const parsed = parsePortfolioFiles(files);
  return { files: parsed, warnings, errors };
}

export function isPendingMediaPath(path) {
  return typeof path === "string" && /\/pending(?:\.[a-z0-9]+)?$/i.test(path);
}

export function synchronizeUploads(files, uploads = []) {
  if (!files || !Array.isArray(uploads)) return [];
  const active = new Set();
  for (const certificate of files.certificates?.items || []) {
    if (
      isPendingMediaPath(certificate.shared.file) &&
      certificate.shared.file === `/media/certificates/${certificate.id}/pending.pdf`
    ) {
      active.add(`certificate:${certificate.id}`);
    }
  }
  for (const project of files.projects?.items || []) {
    const visual = project.shared.visual;
    if (
      visual.mode === "screenshot" &&
      isPendingMediaPath(visual.path) &&
      visual.path.startsWith(`/media/projects/${project.id}/pending.`)
    ) {
      active.add(`screenshot:${project.id}`);
    }
  }
  const latest = new Map();
  for (const upload of uploads) latest.set(`${upload.kind}:${upload.recordId}`, upload);
  return [...latest.entries()].filter(([key]) => active.has(key)).map(([, upload]) => upload);
}

function ids(items) {
  return new Map(items.map((item) => [item.id, JSON.stringify(item)]));
}

function collectionDiff(before, after) {
  const oldItems = ids(before);
  const newItems = ids(after);
  const oldIndexes = new Map(before.map((item, index) => [item.id, index]));
  const newIndexes = new Map(after.map((item, index) => [item.id, index]));
  return {
    added: [...newItems.keys()].filter((id) => !oldItems.has(id)),
    changed: [...newItems.keys()].filter((id) => oldItems.has(id) && (
      oldItems.get(id) !== newItems.get(id) || oldIndexes.get(id) !== newIndexes.get(id)
    )),
    removed: [...oldItems.keys()].filter((id) => !newItems.has(id)),
  };
}

function normalizedDiscordPresence(site) {
  const dp = site?.shared?.discordPresence;
  return {
    enabled: Boolean(dp?.enabled),
    userId: typeof dp?.userId === "string" ? dp.userId.trim() : "",
    professionalFilter: dp?.professionalFilter !== false,
  };
}

function siteTextDiff(before, after) {
  const changed = [];
  if (JSON.stringify(normalizedDiscordPresence(before)) !== JSON.stringify(normalizedDiscordPresence(after))) {
    changed.push("shared.discordPresence");
  }
  for (const locale of ["tr", "en"]) {
    if (JSON.stringify(before?.[locale]?.about) !== JSON.stringify(after?.[locale]?.about)) {
      changed.push(`${locale}.about`);
    }
  }
  return { added: [], changed, removed: [] };
}

export function createDiffSummary(base, draft) {
  return {
    site: siteTextDiff(base.site, draft.site),
    projects: collectionDiff(base.projects.items, draft.projects.items),
    certificates: collectionDiff(base.certificates.items, draft.certificates.items),
    skills: collectionDiff(
      [...base.skills.focusAreas, ...base.skills.skillCards, ...base.skills.additionalGroups],
      [...draft.skills.focusAreas, ...draft.skills.skillCards, ...draft.skills.additionalGroups],
    ),
    visuals: collectionDiff(base.visuals.presets, draft.visuals.presets),
  };
}

export function hasDiff(summary) {
  return Object.values(summary).some((group) => group.added.length || group.changed.length || group.removed.length);
}

function isSafeHttpsUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function buildContentHealthReport(files) {
  const { warnings, errors } = publicationIssues(files);
  const invalidUrls = [];
  const identity = files.site?.shared?.identity;
  if (identity) {
    if (!isSafeHttpsUrl(identity.github)) invalidUrls.push("site.identity.github");
    if (!isSafeHttpsUrl(identity.linkedin)) invalidUrls.push("site.identity.linkedin");
  }
  const draftProjects = [];
  const pendingMedia = [];

  for (const project of files.projects?.items || []) {
    if (project.publicationStatus !== "published") draftProjects.push(project.id);
    if (!isSafeHttpsUrl(project.shared?.github)) invalidUrls.push(`projects.${project.id}.github`);
    if (project.shared?.visual?.mode === "screenshot" && isPendingMediaPath(project.shared.visual.path)) {
      pendingMedia.push(`projects.${project.id}`);
    }
  }
  for (const cert of files.certificates?.items || []) {
    if (isPendingMediaPath(cert.shared?.file)) pendingMedia.push(`certificates.${cert.id}`);
  }

  const blockingCount = errors.length + invalidUrls.length;
  const status =
    blockingCount > 0
      ? "error"
      : warnings.length > 0 || pendingMedia.length > 0 || draftProjects.length > 0
        ? "attention"
        : "healthy";

  return {
    status,
    blockingErrors: [...errors, ...invalidUrls],
    translationWarnings: warnings,
    draftProjects,
    pendingMedia,
    counts: {
      errors: blockingCount,
      warnings: warnings.length,
      drafts: draftProjects.length,
      pendingMedia: pendingMedia.length,
    },
  };
}

export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

export function createPortfolioBackup(files, base, now = new Date()) {
  const payload = {
    exportedAt: now.toISOString(),
    formatVersion: 1,
    baseCommitSha: base?.commitSha || null,
    files: clonePortfolio(files),
  };
  return {
    filename: `layellie-portfolio-backup-${formatLocalDate(now)}.json`,
    json: JSON.stringify(payload, null, 2),
    payload,
  };
}

export function parsePortfolioBackup(rawText) {
  if (typeof rawText !== "string" || !rawText.trim()) {
    throw new Error("Yedek dosyası boş.");
  }
  if (new TextEncoder().encode(rawText).byteLength > MAX_BACKUP_BYTES) {
    throw new Error("Yedek dosyası 2 MB sınırını aşıyor.");
  }
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("Geçersiz JSON dosyası.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Yedek dosyası geçerli bir JSON nesnesi değil.");
  }
  if ("formatVersion" in parsed && parsed.formatVersion !== 1) {
    throw new Error("Desteklenmeyen yedek sürümü.");
  }
  if (!parsed.files || typeof parsed.files !== "object" || Array.isArray(parsed.files)) {
    throw new Error("Yedek dosyasında içerik verisi (files) bulunamadı.");
  }
  let validated;
  try {
    validated = parsePortfolioFiles(parsed.files);
  } catch {
    throw new Error("Yedek içeriği şema doğrulamasından geçemedi.");
  }
  const issues = publicationIssues(validated);
  return {
    files: clonePortfolio(validated),
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : null,
    baseCommitSha: typeof parsed.baseCommitSha === "string" ? parsed.baseCommitSha : null,
    issues,
  };
}

function escapeCsvCell(value) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function createAnalyticsCsv(data, now = new Date()) {
  const range = data?.range === "30d" ? "30d" : "7d";
  const rows = [
    ["Tarih", "Tekil Ziyaretçi", "Masaüstü", "Mobil / Tablet"],
    ...(Array.isArray(data?.days) ? data.days : []).map((day) => [
      day.day,
      Number(day.uniqueVisitors) || 0,
      Number(day.desktop) || 0,
      Number(day.mobileTablet) || 0,
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}\r\n`;
  return {
    filename: `layellie-analytics-${range}-${formatLocalDate(now)}.csv`,
    csv,
  };
}
