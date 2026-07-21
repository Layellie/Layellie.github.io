const ARRAY_FIELD_TYPES = Object.freeze({
  "codeLines.locale.lines": "string-array",
  "table.locale.headers": "string-array",
  "table.locale.rows": "string-matrix",
  "techTags.locale.tags": "string-array",
  "tabs.locale.items": "string-array",
  "lineChart.shared.values": "number-array",
  "barChart.shared.values": "number-array",
});

export function moduleFieldType(moduleType, bucket, property, value) {
  const normalizedBucket = bucket === "shared" ? "shared" : "locale";
  const declared = ARRAY_FIELD_TYPES[`${moduleType}.${normalizedBucket}.${property}`];
  if (declared) return declared;
  if (Array.isArray(value)) return "unsupported-array";
  return typeof value;
}

export function parseNumberArrayInput(input) {
  const tokens = input.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) return { success: true, value: [] };
  const value = tokens.map(Number);
  if (!value.every(Number.isFinite)) {
    return { success: false, error: "Bütün değerler geçerli bir sayı olmalı." };
  }
  return { success: true, value };
}
