// Zod içermeyen saf yardımcı: public sitenin ilk JS paketine güvenle dahil edilebilir.
function tickerKey(value) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("tr-TR");
}

export function selectSkillsTicker(skills) {
  const seenIds = new Set();
  const seenLabels = new Set();
  const result = [];
  const add = (item) => {
    const label = typeof item?.name === "string" ? item.name.trim() : "";
    const id = typeof item?.id === "string" ? item.id.trim() : "";
    if (!label || label.length > 120 || (id && seenIds.has(id))) return;
    const labelKey = tickerKey(label);
    if (!labelKey || seenLabels.has(labelKey)) return;
    if (id) seenIds.add(id);
    seenLabels.add(labelKey);
    result.push({ id: id || `skill-${result.length}`, label });
  };
  for (const card of skills?.languages || []) add(card);
  for (const group of skills?.more || []) for (const item of group.items || []) add(item);
  return result;
}
