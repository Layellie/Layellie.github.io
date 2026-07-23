import { z } from "zod";
import { SAFE_ICON_IDS } from "./iconIds.js";
import { validateVisualModulePayload, visualModuleIssuePath } from "./visualModuleSchemas.js";
import { parseGithubRepositoryUrl } from "./githubUrls.js";

export const ICON_IDS = SAFE_ICON_IDS;

export const iconIdSchema = z.enum(ICON_IDS);
export const idSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "ID must be a lowercase slug");

const text = (max = 240) => z.string().trim().min(1).max(max);
const preservedText = (max = 240) => z.string().max(max).refine((value) => value.trim().length > 0, "Text must not be blank");
const optionalText = (max = 240) => z.string().trim().max(max).default("");
const textList = (maxItems, maxLength = 240) => z.array(text(maxLength)).max(maxItems);

export const safeGithubUrlSchema = z.string().url().superRefine((value, context) => {
  if (!parseGithubRepositoryUrl(value)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "A canonical HTTPS GitHub repository URL is required" });
  }
});

const mediaSegment = "[a-zA-Z0-9_-]+";

export const certificateMediaPathSchema = z.string().regex(
  new RegExp(`^/(?:sertifikalar/${mediaSegment}\\.pdf|media/certificates/${mediaSegment}/${mediaSegment}\\.pdf)$`),
  "Certificate path must reference a managed PDF",
);

export const projectScreenshotPathSchema = z.string().regex(
  new RegExp(`^/media/projects/${mediaSegment}/${mediaSegment}\\.(?:png|jpg|jpeg|webp)$`),
  "Project screenshot path must reference a managed PNG, JPG or WebP image",
);

const customVisualSchema = z.object({
  mode: z.literal("custom"),
  componentId: z.enum(["legacy-clipboard", "legacy-standby", "legacy-eyehealth"]),
});

const builderVisualSchema = z.object({
  mode: z.literal("builder"),
  visualId: idSchema,
  fallbackComponentId: z
    .enum(["legacy-clipboard", "legacy-standby", "legacy-eyehealth"])
    .optional(),
});

const screenshotVisualSchema = z.object({
  mode: z.literal("screenshot"),
  path: projectScreenshotPathSchema,
  objectFit: z.enum(["contain", "cover"]),
  alt: z.object({ tr: text(180), en: text(180) }),
});

export const projectVisualReferenceSchema = z.discriminatedUnion("mode", [
  customVisualSchema,
  builderVisualSchema,
  screenshotVisualSchema,
]);

const projectLocaleSchema = z.object({
  name: z.string().trim().max(80),
  type: z.string().trim().max(120),
  description: z.string().trim().max(1_200),
  features: textList(12, 240),
  status: textList(8, 80),
});

const projectRecordSchema = z.object({
  id: idSchema,
  publicationStatus: z.enum(["draft", "published"]),
  shared: z.object({
    github: safeGithubUrlSchema,
    year: z.string().regex(/^\d{4}$/),
    license: text(40),
    stack: textList(16, 60),
    visual: projectVisualReferenceSchema,
  }),
  tr: projectLocaleSchema,
  en: projectLocaleSchema,
}).superRefine((project, context) => {
  if (project.publicationStatus !== "published") return;
  for (const locale of ["tr", "en"]) {
    for (const key of ["name", "type", "description"]) {
      if (!project[locale][key].trim()) context.addIssue({ code: z.ZodIssueCode.custom, path: [locale, key], message: "Published projects require complete translations" });
    }
    for (const key of ["features", "status"]) {
      if (project[locale][key].length === 0) context.addIssue({ code: z.ZodIssueCode.custom, path: [locale, key], message: "Published projects require at least one item" });
    }
  }
});

export const projectsFileSchema = z.object({
  schemaVersion: z.literal(1),
  items: z
    .array(projectRecordSchema)
    .max(50)
    .superRefine(uniqueIds),
});

const certificateLocaleSchema = z.object({
  title: text(160),
  issuer: text(120),
  skillLabel: text(100),
});

export const certificatesFileSchema = z.object({
  schemaVersion: z.literal(1),
  items: z
    .array(
      z.object({
        id: idSchema,
        shared: z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          code: text(120),
          icon: iconIdSchema,
          file: certificateMediaPathSchema,
          relatedSkillId: idSchema.nullable(),
        }),
        tr: certificateLocaleSchema,
        en: certificateLocaleSchema,
      }),
    )
    .max(100)
    .superRefine(uniqueIds),
});

const focusLocaleSchema = z.object({
  title: text(100),
  description: text(600),
  tags: textList(12, 60),
});

const skillLocaleSchema = z.object({
  name: text(80),
  description: optionalText(240),
  tags: textList(12, 60),
});

export const skillsFileSchema = z.object({
  schemaVersion: z.literal(1),
  focusAreas: z
    .array(
      z.object({
        id: idSchema,
        shared: z.object({ icon: iconIdSchema }),
        tr: focusLocaleSchema,
        en: focusLocaleSchema,
      }),
    )
    .max(24)
    .superRefine(uniqueIds),
  skillCards: z
    .array(
      z.object({
        id: idSchema,
        shared: z.object({
          icon: iconIdSchema,
          certified: z.boolean(),
          width: z.enum(["normal", "wide"]),
        }),
        tr: skillLocaleSchema,
        en: skillLocaleSchema,
      }),
    )
    .max(80)
    .superRefine(uniqueIds),
  additionalGroups: z
    .array(
      z.object({
        id: idSchema,
        shared: z.object({ icon: iconIdSchema }),
        tr: z.object({ title: text(100) }),
        en: z.object({ title: text(100) }),
        items: z
          .array(
            z.object({
              id: idSchema,
              shared: z.object({ certified: z.boolean() }),
              tr: z.object({ name: text(100) }),
              en: z.object({ name: text(100) }),
            }),
          )
          .max(80)
          .superRefine(uniqueIds),
      }),
    )
    .max(24)
    .superRefine(uniqueIds),
}).superRefine((skills, context) => {
  const seen = new Map();
  const entries = [
    ...skills.focusAreas.map((item, index) => ({ item, path: ["focusAreas", index, "id"] })),
    ...skills.skillCards.map((item, index) => ({ item, path: ["skillCards", index, "id"] })),
    ...skills.additionalGroups.flatMap((group, groupIndex) => group.items.map((item, itemIndex) => ({ item, path: ["additionalGroups", groupIndex, "items", itemIndex, "id"] }))),
  ];
  for (const { item, path } of entries) {
    if (seen.has(item.id)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path, message: `Skill ID must be globally unique; first used at ${seen.get(item.id)}` });
    } else {
      seen.set(item.id, path.join("."));
    }
  }
});

const identitySchema = z.object({
  name: text(100),
  handle: text(80),
  githubUser: text(80),
  email: z.string().email().max(254),
  github: z.string().url(),
  linkedin: z.string().url(),
  statsFallback: z.object({
    repos: z.number().int().nonnegative(),
    stars: z.number().int().nonnegative(),
    followers: z.number().int().nonnegative(),
  }),
});

const jsonValueSchema = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

const sectionHeadingSchema = {
  index: text(12),
  title: text(120),
  kicker: text(240),
};

const navigationSchema = z.object({
  about: text(80),
  skills: text(80),
  certificates: text(80),
  projects: text(80),
  contact: text(80),
  login: text(80),
  mail: text(80),
});

const heroSchema = z.object({
  available: text(160),
  location: text(160),
  role: text(160),
  tagline: text(500),
  ctaProjects: text(120),
  ctaContact: text(120),
});

const aboutSchema = z.object({
  ...sectionHeadingSchema,
  statement: z.array(preservedText(500)).min(3).max(6),
  paragraphs: z.array(text(2400)).min(1).max(12),
  facts: z.array(z.object({ label: text(120), value: text(240) })).min(1).max(20),
});

const skillsSectionSchema = z.object({
  ...sectionHeadingSchema,
  moreLabel: text(160),
});

const certificatesSectionSchema = z.object({
  ...sectionHeadingSchema,
  verified: text(120),
  validates: text(160),
  view: text(120),
  prev: text(120),
  next: text(120),
});

const projectsSectionSchema = z.object({
  ...sectionHeadingSchema,
  view: text(160),
  statusLabel: text(160),
  stats: z.object({ repos: text(80), stars: text(80), followers: text(80) }),
  contributions: text(160),
  more: z.object({
    title: text(160),
    subtitle: text(300),
    noDesc: text(160),
    viewAll: text(200),
  }),
});

const contactSchema = z.object({
  index: text(12),
  label: text(120),
  big: z.array(text(240)).length(2),
  blurb: text(800),
});

const terminalSchema = z.object({
  ...sectionHeadingSchema,
  user: text(80),
  host: text(80),
  welcome: text(500),
  hint: text(240),
  helpTitle: text(160),
  notFound: text(240),
  tryHelp: text(240),
  labels: z.object({ langs: text(120), focus: text(120), certCount: text(120), sudo: text(240) }),
  cmds: z.object({
    help: text(80),
    whoami: text(80),
    about: text(80),
    skills: text(80),
    projects: text(80),
    certs: text(80),
    contact: text(80),
    social: text(80),
    date: text(80),
    clear: text(80),
  }),
});

const commandPaletteSchema = z.object({
  placeholder: text(200),
  empty: text(200),
  goto: text(80),
  lang: text(80),
  copyEmail: text(120),
  open: text(80),
  toTop: text(120),
});

const mockSchema = z.object({
  search: text(200),
  ocrCaption: text(200),
  ocrEngine: text(160),
  reverse: text(160),
  admin: text(120),
  timerRes: text(160),
  locked: text(120),
  standbyMem: text(160),
  cleared: text(120),
  gameMode: text(120),
  on: text(80),
  affinity: text(160),
  eyeNext: text(160),
  eyeWork: text(160),
  eyeBreak: text(160),
  eyeFullscreen: text(160),
  eyePostpone: text(160),
  eyeRunning: text(160),
  eyeRule: text(300),
  eyeNative: text(200),
});

const siteLocaleSchema = z
  .object({
    nav: navigationSchema,
    hero: heroSchema,
    marquee: z.array(text(120)).min(1).max(50),
    about: aboutSchema,
    skills: skillsSectionSchema,
    certificates: certificatesSectionSchema,
    projects: projectsSectionSchema,
    contact: contactSchema,
    terminal: terminalSchema,
    footer: z.object({ backToTop: text(120) }),
    cmd: commandPaletteSchema,
    mock: mockSchema,
  })
  .strict();

export const siteFileSchema = z.object({
  schemaVersion: z.literal(1),
  shared: z.object({ identity: identitySchema }),
  tr: siteLocaleSchema,
  en: siteLocaleSchema,
});

export const visualModuleEnvelopeSchema = z
  .object({
    id: idSchema,
    type: z.string().min(1).max(60).regex(/^[a-z][a-zA-Z0-9]*$/),
    shared: z.preprocess(normalizeLegacyToneBucket, z.record(z.string(), jsonValueSchema)),
    tr: z.record(z.string(), jsonValueSchema),
    en: z.record(z.string(), jsonValueSchema),
  })
  .strict()
  .superRefine((module, context) => {
    const seen = new Set();
    for (const locale of ["tr", "en"]) {
      const result = validateVisualModulePayload(module, locale);
      if (!result.known || result.success) continue;
      for (const issue of result.issues) {
        const path = visualModuleIssuePath(module, locale, issue);
        const key = path.join(".");
        if (seen.has(key)) continue;
        seen.add(key);
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: `${module.type} modülünün ${key} alanı geçersiz: ${issue.message}`,
        });
      }
    }
  });

const visualLocaleSchema = z
  .object({
    windowTrailing: z.string().max(120).optional(),
    footerText: z.string().max(180),
    footerBadge: z.string().max(80),
  })
  .strict();

export const visualPresetSchema = z
  .object({
    id: idSchema,
    name: text(100),
    shared: z
      .object({
        accent: z.enum(["lime", "cyan", "blue", "violet", "amber", "rose"]),
        glow: z.boolean().optional(),
        window: z
          .object({
            title: text(100),
            icon: iconIdSchema,
            controls: z.enum(["neutral", "traffic"]),
            trailing: z.string().max(120).optional(),
            trailingIcon: iconIdSchema.optional(),
          })
          .strict(),
        footer: z
          .object({ icon: iconIdSchema, badge: z.string().max(80) })
          .strict(),
      })
      .strict(),
    tr: visualLocaleSchema,
    en: visualLocaleSchema,
    modules: z.array(visualModuleEnvelopeSchema).max(40).superRefine(uniqueIds),
  })
  .strict();

export const visualsFileSchema = z.object({
  schemaVersion: z.literal(1),
  presets: z
    .array(visualPresetSchema)
    .max(50)
    .superRefine(uniqueIds),
});

export const portfolioFilesSchema = z.object({
  site: siteFileSchema,
  projects: projectsFileSchema,
  certificates: certificatesFileSchema,
  skills: skillsFileSchema,
  visuals: visualsFileSchema,
});

export function parsePortfolioFiles(files) {
  const parsed = portfolioFilesSchema.parse(normalizeLegacyListRowTones(files));
  const skillIds = new Set([
    ...parsed.skills.skillCards.map((item) => item.id),
    ...parsed.skills.additionalGroups.flatMap((group) => group.items.map((item) => item.id)),
  ]);
  parsed.certificates.items.forEach((certificate, index) => {
    if (certificate.shared.relatedSkillId && !skillIds.has(certificate.shared.relatedSkillId)) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ["certificates", "items", index, "shared", "relatedSkillId"],
          message: "Certificate references an unknown skill",
        },
      ]);
    }
  });
  const visualPresetIds = new Set(parsed.visuals.presets.map((preset) => preset.id));
  parsed.projects.items.forEach((project, index) => {
    const visual = project.shared.visual;
    if (project.publicationStatus !== "published" || visual.mode !== "builder" || visualPresetIds.has(visual.visualId)) return;
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ["projects", "items", index, "shared", "visual", "visualId"],
        message: `Published project "${project.tr.name}" (${project.id}) references missing visual preset "${visual.visualId}"`,
      },
    ]);
  });
  return parsed;
}

export function normalizeLegacyListRowTones(files) {
  const presets = files?.visuals?.presets;
  if (!Array.isArray(presets) || !presets.some((preset) => preset.modules?.some((module) => module.type === "listRow" && module.shared?.tone === "default"))) {
    return files;
  }
  const normalized = structuredClone(files);
  for (const preset of normalized.visuals.presets) {
    for (const module of preset.modules || []) {
      if (module.type === "listRow" && module.shared?.tone === "default") module.shared.tone = "text";
    }
  }
  return normalized;
}

function normalizeLegacyToneBucket(value) {
  return value && typeof value === "object" && !Array.isArray(value) && value.tone === "default"
    ? { ...value, tone: "text" }
    : value;
}

function uniqueIds(items, context) {
  const seen = new Set();
  items.forEach((item, index) => {
    if (seen.has(item.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "id"],
        message: `Duplicate id: ${item.id}`,
      });
    }
    seen.add(item.id);
  });
}
