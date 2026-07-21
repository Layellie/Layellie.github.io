import { z } from "zod";

const placementSchema = z
  .object({
    mobileColSpan: z.number().int().min(1).max(12),
    desktopColSpan: z.number().int().min(1).max(12),
    rowSpan: z.number().int().min(1).max(3),
    height: z.enum(["compact", "normal", "tall"]),
  })
  .strict();

const icon = z.string().min(1).max(60).optional();
const label = (max = 180) => z.string().max(max);
const textList = (max = 24) => z.array(z.string().max(180)).max(max);
const base = { placement: placementSchema };

export const LIST_ROW_TONES = Object.freeze(["text", "code", "image"]);
export const normalizeListRowTone = (value) => value === "default" ? "text" : value;

export const MODULE_SCHEMAS = Object.freeze({
  searchBar: z.object({ ...base, icon, placeholder: label() }).strict(),
  listRow: z
    .object({
      ...base,
      index: label(12),
      icon,
      shortcut: label(32),
      badge: label(24).optional(),
      tone: z.preprocess(normalizeListRowTone, z.enum(LIST_ROW_TONES)),
      text: label(240),
      caption: label(160),
    })
    .strict(),
  metric: z.object({ ...base, value: label(40), unit: label(20), icon, label: label(120), status: label(80) }).strict(),
  statCard: z
    .object({ ...base, icon, value: label(48), progress: z.number().min(0).max(100).optional(), label: label(120), caption: label(160) })
    .strict(),
  circularProgress: z
    .object({ ...base, icon, value: label(48), progress: z.number().min(0).max(100), label: label(120), caption: label(160) })
    .strict(),
  progressBar: z.object({ ...base, value: z.number().min(0).max(100), label: label(120), caption: label(120) }).strict(),
  toggle: z
    .object({ ...base, icon, enabled: z.boolean(), label: label(120), valueLabel: label(80), caption: label(160) })
    .strict(),
  statusBadge: z.object({ ...base, label: label(100), caption: label(180) }).strict(),
  infoBox: z.object({ ...base, icon, title: label(120), text: label(400) }).strict(),
  codeLines: z.object({ ...base, icon, title: label(120), lines: textList(12) }).strict(),
  table: z.object({ ...base, title: label(120), headers: textList(6), rows: z.array(textList(6)).max(12) }).strict(),
  lineChart: z.object({ ...base, title: label(120), values: z.array(z.number().finite()).min(2).max(24) }).strict(),
  barChart: z.object({ ...base, title: label(120), values: z.array(z.number().finite()).min(1).max(16) }).strict(),
  iconText: z.object({ ...base, icon, title: label(120), text: label(300) }).strict(),
  badge: z.object({ ...base, icon, label: label(100) }).strict(),
  techTags: z.object({ ...base, title: label(120), tags: textList(16) }).strict(),
  button: z.object({ ...base, icon, label: label(100) }).strict(),
  tabs: z.object({ ...base, items: textList(8), activeIndex: z.number().int().min(0).max(7) }).strict(),
  notification: z.object({ ...base, icon, title: label(120), text: label(300) }).strict(),
});

export const KNOWN_VISUAL_MODULE_TYPES = Object.freeze(Object.keys(MODULE_SCHEMAS));

export function validateVisualModulePayload(module, locale) {
  const schema = MODULE_SCHEMAS[module?.type];
  if (!schema) return { known: false, success: true, data: null, issues: [] };
  const result = schema.safeParse({ ...module.shared, ...module[locale] });
  return result.success
    ? { known: true, success: true, data: result.data, issues: [] }
    : { known: true, success: false, data: null, issues: result.error.issues };
}

export function visualModuleIssuePath(module, locale, issue) {
  const field = String(issue.path[0] ?? "payload");
  const bucket = field === "placement" || Object.prototype.hasOwnProperty.call(module.shared, field) ? "shared" : locale;
  return [bucket, ...issue.path];
}
