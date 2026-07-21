import { uniqueId } from "../data/model.js";

const placement = { mobileColSpan: 12, desktopColSpan: 12, rowSpan: 1, height: "normal" };

const DEFAULTS = {
  searchBar: [{ icon: "Search" }, { placeholder: "Ara..." }, { placeholder: "Search..." }],
  listRow: [{ index: "1", icon: "FileText", shortcut: "ALT+1", tone: "code" }, { text: "Liste öğesi", caption: "" }, { text: "List item", caption: "" }],
  metric: [{ value: "42", unit: "ms", icon: "Gauge" }, { label: "Metrik", status: "Aktif" }, { label: "Metric", status: "Active" }],
  statCard: [{ icon: "Database", value: "84%", progress: 84 }, { label: "İstatistik", caption: "Güncel" }, { label: "Statistic", caption: "Current" }],
  circularProgress: [{ value: "19:42", progress: 81, icon: "Gauge" }, { label: "İlerleme", caption: "Devam ediyor" }, { label: "Progress", caption: "In progress" }],
  progressBar: [{ value: 72 }, { label: "İlerleme", caption: "72 tamamlandı" }, { label: "Progress", caption: "72 complete" }],
  toggle: [{ icon: "Zap", enabled: true }, { label: "Özellik", valueLabel: "Açık", caption: "Etkin" }, { label: "Feature", valueLabel: "On", caption: "Enabled" }],
  statusBadge: [{}, { label: "Çalışıyor", caption: "Sistem normal" }, { label: "Running", caption: "System normal" }],
  infoBox: [{ icon: "Info" }, { title: "Bilgi", text: "Açıklayıcı bilgi alanı." }, { title: "Information", text: "Informational message." }],
  codeLines: [{ icon: "Terminal" }, { title: "Terminal", lines: ["npm run build", "✓ complete"] }, { title: "Terminal", lines: ["npm run build", "✓ complete"] }],
  table: [{}, { title: "Tablo", headers: ["Ad", "Değer"], rows: [["Durum", "Aktif"]] }, { title: "Table", headers: ["Name", "Value"], rows: [["Status", "Active"]] }],
  lineChart: [{ values: [12, 18, 15, 26, 31] }, { title: "Trend" }, { title: "Trend" }],
  barChart: [{ values: [28, 56, 42, 78] }, { title: "Dağılım" }, { title: "Distribution" }],
  iconText: [{ icon: "Sparkles" }, { title: "Başlık", text: "Kısa açıklama" }, { title: "Title", text: "Short description" }],
  badge: [{ icon: "BadgeCheck" }, { label: "Rozet" }, { label: "Badge" }],
  techTags: [{}, { title: "Teknolojiler", tags: ["React", "Vite"] }, { title: "Technologies", tags: ["React", "Vite"] }],
  button: [{ icon: "Link2" }, { label: "Devam et" }, { label: "Continue" }],
  tabs: [{ activeIndex: 0 }, { items: ["Genel", "Detay"] }, { items: ["General", "Details"] }],
  notification: [{ icon: "BellRing" }, { title: "Bildirim", text: "İşlem başarıyla tamamlandı." }, { title: "Notification", text: "Operation completed successfully." }],
};

export function createModule(type, existing) {
  const source = DEFAULTS[type];
  if (!source) throw new Error("Desteklenmeyen modül türü.");
  const id = uniqueId(existing, type.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`));
  return { id, type, shared: { placement: { ...placement }, ...structuredClone(source[0]) }, tr: structuredClone(source[1]), en: structuredClone(source[2]) };
}

export function duplicateModule(modules, id) {
  const index = modules.findIndex((item) => item.id === id);
  if (index < 0) return modules;
  const copy = structuredClone(modules[index]);
  copy.id = uniqueId(modules, `${copy.id}-copy`);
  return [...modules.slice(0, index + 1), copy, ...modules.slice(index + 1)];
}
