export const CERTIFICATE_CATEGORY_DEFS = Object.freeze([
  { id: "all", label: { tr: "Tümü", en: "All" } },
  { id: "software", label: { tr: "Yazılım & Sistem", en: "Software & Systems" } },
  { id: "ai", label: { tr: "Yapay Zekâ", en: "AI & LLMs" } },
  { id: "security", label: { tr: "Siber Güvenlik", en: "Cybersecurity" } },
  { id: "other", label: { tr: "Diğer", en: "Other" } },
]);

const TR_CHAR_MAP = {
  ç: "c",
  ğ: "g",
  ı: "i",
  İ: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  â: "a",
  î: "i",
  û: "u",
};

function normalizeToken(value) {
  return String(value ?? "")
    .replace(/[çğıİöşüâîû]/gi, (ch) => TR_CHAR_MAP[ch] || TR_CHAR_MAP[ch.toLowerCase()] || ch)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const SECURITY_PATTERN = /\b(siber|cyber|cybersecurity|security|guvenlik|cyberstart)\b/i;
const AI_PATTERN = /\b(yapay zeka|yapay|generative|uretken|llm|claude|anthropic|ai4future|artificial intelligence|ai)\b/i;
const SOFTWARE_PATTERN =
  /(c\+\+|c#|cplusplus|csharp|\boop\b|nesne yonelimli|object[- ]oriented|veri taban|veritaban|database|\bsql\b|\bgit\b|github|programlama|programming|react|node\.?js|laravel|php|\bwpf\b|\.net)/i;

export function classifyCertificate(cert) {
  if (!cert || typeof cert !== "object") return "other";
  const haystack = normalizeToken(
    [cert.relatedSkillId, cert.skill, cert.skillLabel, cert.title].filter(Boolean).join(" ")
  );
  if (!haystack) return "other";
  if (SECURITY_PATTERN.test(haystack)) return "security";
  if (AI_PATTERN.test(haystack)) return "ai";
  if (SOFTWARE_PATTERN.test(haystack)) return "software";
  return "other";
}

export function summarizeCertificateCategories(items = []) {
  const list = Array.isArray(items) ? items : [];
  const counts = new Map();
  for (const item of list) {
    const id = classifyCertificate(item);
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return CERTIFICATE_CATEGORY_DEFS.map((def) => ({
    ...def,
    count: def.id === "all" ? list.length : counts.get(def.id) || 0,
  })).filter((entry) => entry.id === "all" || entry.count > 0);
}

export function filterCertificates(items = [], categoryId = "all") {
  const list = Array.isArray(items) ? items : [];
  if (!categoryId || categoryId === "all") return list;
  return list.filter((item) => classifyCertificate(item) === categoryId);
}
