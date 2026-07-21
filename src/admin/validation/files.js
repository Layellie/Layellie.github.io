import { parseGithubRepositoryUrl } from "../../content/githubUrls.js";
import { detectMediaSignature, MAX_MEDIA_FILE_BYTES, MEDIA_FILE_TYPES, mediaTypeForMetadata } from "../../content/mediaTypes.js";

export function getFileRule(kind) {
  const rules = MEDIA_FILE_TYPES.filter((rule) => rule.kind === kind);
  if (!rules.length) throw new Error("Bilinmeyen dosya türü.");
  return {
    extensions: [...new Set(rules.flatMap((rule) => rule.extensions))],
    mime: [...new Set(rules.map((rule) => rule.mime))],
    maxBytes: MAX_MEDIA_FILE_BYTES,
  };
}

export function validateFileMetadata(file, kind) {
  const rule = getFileRule(kind);
  if (file.size <= 0 || file.size > rule.maxBytes) throw new Error("Dosya 5 MiB sınırını aşamaz ve boş olamaz.");
  if (!mediaTypeForMetadata(kind, file.name, file.type)) throw new Error(`Dosya uzantısı ve MIME türü aynı desteklenen türü göstermeli (${rule.extensions.join(", ")}).`);
  return true;
}

export async function validateFileSignature(file, kind) {
  validateFileMetadata(file, kind);
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const mediaType = mediaTypeForMetadata(kind, file.name, file.type);
  if (detectMediaSignature(bytes) !== mediaType.signature) throw new Error("Dosya içeriği, uzantı ve MIME türüyle eşleşmiyor.");
  return true;
}

export function validateManagedUrl(value, kind = "github") {
  if (kind === "github") {
    const repository = parseGithubRepositoryUrl(value);
    if (!repository) throw new Error("GitHub bağlantısı tam olarak https://github.com/sahip/depo biçiminde olmalı.");
    return repository.url;
  }
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Yalnız HTTPS bağlantıları kabul edilir.");
  return url.toString();
}
