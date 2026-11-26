export const AVAILABILITY_TONES = ["available", "working", "limited", "custom", "hidden"];

export const AVAILABILITY_HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
export const DEFAULT_CUSTOM_AVAILABILITY_COLOR = "#a855f7";

export const AVAILABILITY_META = Object.freeze({
  available: Object.freeze({
    label: "Müsait (Lime)",
    shortLabel: "Müsait",
    description: "Yeni projelere veya iş fırsatlarına açık (yanıp sönen lime nokta).",
    dotClass: "bg-accent",
    pingClass: "bg-accent",
    ping: true,
    visible: true,
  }),
  working: Object.freeze({
    label: "Çalışıyor (Mavi)",
    shortLabel: "Çalışıyor",
    description: "Aktif bir işte/şirkette çalışıyor (sabit mavi nokta).",
    dotClass: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.65)]",
    pingClass: "",
    ping: false,
    visible: true,
  }),
  limited: Object.freeze({
    label: "Kısmi / Meşgul (Amber)",
    shortLabel: "Kısmi",
    description: "Yoğun veya yalnız seçili freelance projelere açık (amber nokta).",
    dotClass: "bg-amber-400",
    pingClass: "",
    ping: false,
    visible: true,
  }),
  custom: Object.freeze({
    label: "Özel renk",
    shortLabel: "Özel",
    description: "Kendi seçtiğin renk ile durum noktası gösterir (yanıp sönme opsiyonel).",
    dotClass: "",
    pingClass: "",
    ping: false,
    visible: true,
  }),
  hidden: Object.freeze({
    label: "Gizle",
    shortLabel: "Gizli",
    description: "Hero üstündeki durum rozetini gizler, yalnızca konum görünür.",
    dotClass: "bg-faint",
    pingClass: "",
    ping: false,
    visible: false,
  }),
});

export function normalizeAvailabilityColor(value) {
  return typeof value === "string" && AVAILABILITY_HEX_REGEX.test(value.trim())
    ? value.trim().toLowerCase()
    : DEFAULT_CUSTOM_AVAILABILITY_COLOR;
}

export function resolveAvailabilityTone(value) {
  return AVAILABILITY_TONES.includes(value) ? value : "available";
}

export function resolveAvailabilityMeta(value) {
  return AVAILABILITY_META[resolveAvailabilityTone(value)];
}

export function resolveAvailabilityConfig(input) {
  const tone = resolveAvailabilityTone(typeof input === "string" ? input : input?.availabilityTone ?? input?.tone);
  const meta = AVAILABILITY_META[tone];
  const color = normalizeAvailabilityColor(typeof input === "object" ? (input?.availabilityColor ?? input?.color) : undefined);
  const customPulse = Boolean(typeof input === "object" ? (input?.availabilityPulse ?? input?.pulse) : false);
  const isCustom = tone === "custom";
  const ping = isCustom ? customPulse : meta.ping;

  return {
    tone,
    color,
    pulse: ping,
    visible: meta.visible,
    dotClass: isCustom ? "" : meta.dotClass,
    pingClass: isCustom ? "" : meta.pingClass,
    dotStyle: isCustom ? { backgroundColor: color, boxShadow: `0 0 8px ${color}99` } : undefined,
    pingStyle: isCustom && ping ? { backgroundColor: color } : undefined,
    meta,
  };
}
