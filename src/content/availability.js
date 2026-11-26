export const AVAILABILITY_TONES = ["available", "working", "limited", "hidden"];

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

export function resolveAvailabilityTone(value) {
  return AVAILABILITY_TONES.includes(value) ? value : "available";
}

export function resolveAvailabilityMeta(value) {
  return AVAILABILITY_META[resolveAvailabilityTone(value)];
}
