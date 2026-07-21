export const MAX_MEDIA_FILE_BYTES = 5 * 1024 * 1024;

export const MEDIA_FILE_TYPES = Object.freeze([
  Object.freeze({ kind: "certificate", extensions: Object.freeze(["pdf"]), mime: "application/pdf", signature: "pdf", outputExtension: "pdf" }),
  Object.freeze({ kind: "screenshot", extensions: Object.freeze(["png"]), mime: "image/png", signature: "png", outputExtension: "png" }),
  Object.freeze({ kind: "screenshot", extensions: Object.freeze(["jpg", "jpeg"]), mime: "image/jpeg", signature: "jpeg", outputExtension: "jpg" }),
  Object.freeze({ kind: "screenshot", extensions: Object.freeze(["webp"]), mime: "image/webp", signature: "webp", outputExtension: "webp" }),
]);

export function normalizeMediaMime(value) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("en-US") : "";
}

export function mediaFileExtension(name) {
  if (typeof name !== "string" || /[\\/]/.test(name)) return "";
  return name.split(".").pop()?.toLocaleLowerCase("en-US") || "";
}

export function mediaTypeForMetadata(kind, name, mime) {
  const extension = mediaFileExtension(name);
  const normalizedMime = normalizeMediaMime(mime);
  return MEDIA_FILE_TYPES.find((rule) => rule.kind === kind && rule.mime === normalizedMime && rule.extensions.includes(extension)) || null;
}

export function detectMediaSignature(bytes) {
  if (!bytes || typeof bytes.length !== "number") return null;
  if (String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") return "pdf";
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  return null;
}
