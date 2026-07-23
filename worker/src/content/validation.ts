// The Worker deliberately reuses the exact public/admin runtime schema.
import { parsePortfolioFiles } from "../../../src/content/schemas.js";
import { detectMediaSignature, MAX_MEDIA_FILE_BYTES, MEDIA_FILE_TYPES, mediaTypeForMetadata, normalizeMediaMime } from "../../../src/content/mediaTypes.js";
import { CONTENT_PATHS, type GitChange, type RepositorySnapshot } from "../github/client";
import { randomToken } from "../security/crypto";
import { httpError } from "../security/responses";

export const PUBLICATION_LIMITS = Object.freeze({
  maxJsonBytes: 1024 * 1024,
  maxFileBytes: MAX_MEDIA_FILE_BYTES,
  maxMediaBytes: 8 * 1024 * 1024,
  maxPayloadBytes: 6 * 1024 * 1024,
  maxRequestBytes: 15 * 1024 * 1024,
  maxChangedPaths: 24,
});

const JSON_KEYS = ["site", "projects", "certificates", "skills", "visuals"] as const;

export interface MediaManifestEntry {
  kind: "certificate" | "screenshot";
  recordId: string;
  index: number;
  name: string;
  size: number;
  type: string;
}

export interface PublishPayload {
  files: unknown;
  base: { commitSha: string; blobShas: Record<string, string> };
  media?: MediaManifestEntry[];
}

export interface PublicationRequest {
  payload: PublishPayload;
  form: FormData;
  requestBytes: number;
  payloadBytes: number;
}

interface PublicationByteUsage {
  requestBytes?: number;
  payloadBytes?: number;
  jsonBytes?: Record<string, number>;
  mediaBytes?: number[];
}

export function parseContent(files: unknown): any {
  try { return parsePortfolioFiles(files); } catch (error) {
    const issues = (error as { issues?: Array<{ path: Array<string | number>; message: string }> }).issues?.slice(0, 30).map((issue) => ({ path: issue.path.join("."), message: issue.message }));
    throw httpError(422, "CONTENT_VALIDATION_FAILED", "İçerik şema doğrulamasından geçemedi.", issues);
  }
}

function isPendingMediaPath(path: unknown): path is string {
  return typeof path === "string" && /\/pending(?:\.[a-z0-9]+)?$/i.test(path);
}

export function validatePublicationByteLimits({ requestBytes = 0, payloadBytes = 0, jsonBytes = {}, mediaBytes = [] }: PublicationByteUsage): void {
  if (requestBytes > PUBLICATION_LIMITS.maxRequestBytes) throw httpError(413, "PUBLISH_TOO_LARGE", "Yayın isteği izin verilen toplam boyutu aşıyor.");
  if (payloadBytes > PUBLICATION_LIMITS.maxPayloadBytes) throw httpError(413, "PUBLISH_PAYLOAD_INVALID", "Yayın manifesti izin verilen boyutu aşıyor.");
  for (const [key, bytes] of Object.entries(jsonBytes)) {
    if (bytes > PUBLICATION_LIMITS.maxJsonBytes) throw httpError(413, "JSON_TOO_LARGE", `${key} JSON dosyası 1 MiB sınırını aşıyor.`);
  }
  let totalMedia = 0;
  for (const bytes of mediaBytes) {
    if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > PUBLICATION_LIMITS.maxFileBytes) throw httpError(413, "MEDIA_FILE_TOO_LARGE", "Dosya boş olamaz ve 5 MiB sınırını aşamaz.");
    totalMedia += bytes;
  }
  if (totalMedia > PUBLICATION_LIMITS.maxMediaBytes) throw httpError(413, "MEDIA_TOTAL_TOO_LARGE", "Bir yayındaki toplam medya 8 MiB sınırını aşamaz.");
}

function jsonByteUsage(files: any): Record<string, number> {
  return Object.fromEntries(JSON_KEYS.map((key) => [key, new TextEncoder().encode(`${JSON.stringify(files[key], null, 2)}\n`).byteLength]));
}

function validateManifestShape(manifest: MediaManifestEntry): void {
  if (
    !Number.isSafeInteger(manifest.index) || manifest.index < 0 ||
    !["certificate", "screenshot"].includes(manifest.kind) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.recordId) ||
    typeof manifest.name !== "string" || !manifest.name || manifest.name.length > 255 || /[\\/]/.test(manifest.name) ||
    !Number.isSafeInteger(manifest.size) || typeof manifest.type !== "string"
  ) {
    throw httpError(422, "MEDIA_MANIFEST_INVALID", "Medya manifesti geçersiz.");
  }
  if (!mediaTypeForMetadata(manifest.kind, manifest.name, manifest.type)) {
    throw httpError(422, "MEDIA_TYPE_INVALID", "Medya dosya adı ve MIME türü desteklenmiyor.");
  }
}

export function validateMediaReferences(files: any, manifests: MediaManifestEntry[] = []): void {
  if (!Array.isArray(manifests) || manifests.length > PUBLICATION_LIMITS.maxChangedPaths - 4) {
    throw httpError(413, "MEDIA_COUNT_EXCEEDED", "Bir yayında çok fazla medya dosyası var.");
  }
  const pending = new Map<string, { kind: "certificate" | "screenshot"; recordId: string }>();
  for (const certificate of files.certificates.items) {
    if (!isPendingMediaPath(certificate.shared.file)) continue;
    pending.set(`certificate:${certificate.id}`, { kind: "certificate", recordId: certificate.id });
  }
  for (const project of files.projects.items) {
    const visual = project.shared.visual;
    if (visual.mode !== "screenshot" || !isPendingMediaPath(visual.path)) continue;
    pending.set(`screenshot:${project.id}`, { kind: "screenshot", recordId: project.id });
  }

  const seen = new Set<string>();
  for (const manifest of manifests) {
    validateManifestShape(manifest);
    const key = `${manifest.kind}:${manifest.recordId}`;
    if (seen.has(key)) throw httpError(422, "MEDIA_DUPLICATE", "Aynı kayıt için birden fazla medya dosyası gönderildi.");
    if (!pending.has(key)) throw httpError(422, "MEDIA_REFERENCE_MISMATCH", "Medya manifesti aktif bir geçici içerik referansıyla eşleşmiyor.");
    seen.add(key);
  }
  for (const { kind, recordId } of pending.values()) {
    if (seen.has(`${kind}:${recordId}`)) continue;
    if (kind === "certificate") throw httpError(422, "CERTIFICATE_UPLOAD_REQUIRED", "Yeni veya değiştirilen sertifika için bir PDF seçilmelidir.");
    throw httpError(422, "SCREENSHOT_UPLOAD_REQUIRED", "Ekran görüntüsü modundaki proje için PNG, JPG veya WebP görsel seçilmelidir.");
  }
}

export function validatePublicationPayload(payload: PublishPayload, requestBytes = 0, payloadBytes = 0): any {
  const files = parseContent(payload?.files);
  const manifests = payload?.media || [];
  validateMediaReferences(files, manifests);
  validatePublicationByteLimits({
    requestBytes,
    payloadBytes,
    jsonBytes: jsonByteUsage(files),
    mediaBytes: manifests.map((manifest) => manifest.size),
  });
  return files;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isStableIdCollection(value: unknown[]): boolean {
  return value.every((item) => isJsonObject(item) && typeof item.id === "string");
}

/**
 * Carries only extensions that already exist in the validated remote JSON.
 * Known values always come from the canonical client model, while ID collections
 * follow the new order and omit records the user actually deleted.
 */
export function preserveRemoteExtensions(rawRemote: unknown, remoteModel: unknown, nextModel: unknown): unknown {
  if (Array.isArray(nextModel)) {
    if (!Array.isArray(rawRemote) || !Array.isArray(remoteModel) || !isStableIdCollection(nextModel) || !isStableIdCollection(remoteModel)) {
      return nextModel;
    }
    const rawById = new Map(rawRemote.filter(isJsonObject).filter((item) => typeof item.id === "string").map((item) => [item.id as string, item]));
    const modelById = new Map(remoteModel.map((item) => [(item as Record<string, unknown>).id as string, item]));
    return nextModel.map((item) => {
      const id = (item as Record<string, unknown>).id as string;
      const previousModel = modelById.get(id);
      const previousRaw = rawById.get(id);
      return previousModel && previousRaw ? preserveRemoteExtensions(previousRaw, previousModel, item) : item;
    });
  }

  if (!isJsonObject(nextModel) || !isJsonObject(rawRemote) || !isJsonObject(remoteModel)) return nextModel;
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Object.keys(rawRemote)) {
    if (!hasOwn(remoteModel, key)) {
      result[key] = rawRemote[key];
    } else if (hasOwn(nextModel, key)) {
      result[key] = preserveRemoteExtensions(rawRemote[key], remoteModel[key], nextModel[key]);
    }
  }
  for (const key of Object.keys(nextModel)) {
    if (!hasOwn(rawRemote, key)) result[key] = nextModel[key];
  }
  return result;
}

function jsonValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => jsonValuesEqual(item, right[index]));
  }
  if (!isJsonObject(left) || !isJsonObject(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => hasOwn(right, key) && jsonValuesEqual(left[key], right[key]));
}

export async function readPublicationRequest(request: Request): Promise<PublicationRequest> {
  const declaredBytes = Number(request.headers.get("Content-Length") || 0);
  if (!Number.isFinite(declaredBytes) || declaredBytes < 0) throw httpError(400, "PUBLISH_LENGTH_INVALID", "Yayın isteği boyutu geçersiz.");
  validatePublicationByteLimits({ requestBytes: declaredBytes });
  const bytes = await request.arrayBuffer();
  validatePublicationByteLimits({ requestBytes: bytes.byteLength });
  const contentType = request.headers.get("Content-Type") || "";
  let form: FormData;
  try {
    form = await new Response(bytes, { headers: { "Content-Type": contentType } }).formData();
  } catch {
    throw httpError(400, "PUBLISH_FORM_INVALID", "Yayın isteği multipart form biçiminde değil.");
  }
  const rawPayload = form.get("payload");
  if (typeof rawPayload !== "string") throw httpError(400, "PUBLISH_PAYLOAD_INVALID", "Yayın manifesti eksik veya geçersiz.");
  const payloadBytes = new TextEncoder().encode(rawPayload).byteLength;
  validatePublicationByteLimits({ requestBytes: bytes.byteLength, payloadBytes });
  let payload: PublishPayload;
  try { payload = JSON.parse(rawPayload) as PublishPayload; } catch { throw httpError(400, "PUBLISH_JSON_INVALID", "Yayın manifesti JSON değil."); }
  payload.files = validatePublicationPayload(payload, bytes.byteLength, payloadBytes);
  return { payload, form, requestBytes: bytes.byteLength, payloadBytes };
}

function assertNoPendingMedia(files: any): void {
  const certificate = files.certificates.items.find((item: any) => isPendingMediaPath(item.shared.file));
  const project = files.projects.items.find((item: any) => item.shared.visual.mode === "screenshot" && isPendingMediaPath(item.shared.visual.path));
  if (certificate || project) throw httpError(422, "PENDING_MEDIA_UNRESOLVED", "Medya yüklemesi çözümlenemedi; yayınlanacak içerikte geçici yol kaldı.");
}

export async function preparePublication(payload: PublishPayload, form: FormData, snapshot: RepositorySnapshot): Promise<{ files: any; changes: GitChange[] }> {
  if (!payload.base || !/^[a-f0-9]{40}$/i.test(payload.base.commitSha) || typeof payload.base.blobShas !== "object") {
    throw httpError(400, "BASE_INVALID", "Yayın taban bilgisi eksik veya geçersiz.");
  }
  const conflictingPaths = Object.values(CONTENT_PATHS).filter((path) => payload.base.blobShas[path] !== snapshot.blobShas[path]);
  if (conflictingPaths.length) throw httpError(409, "CONTENT_CONFLICT", "Uzak içerik düzenleme sırasında değişti; sessizce üzerine yazılmadı.", { paths: conflictingPaths });
  const remoteModel = parseContent(snapshot.rawFiles);
  let files = validatePublicationPayload(payload);

  const mediaChanges: GitChange[] = [];
  const manifests = payload.media || [];
  const seen = new Set<string>();
  for (const manifest of manifests) {
    const manifestKey = `${manifest.kind}:${manifest.recordId}`;
    if (seen.has(manifestKey)) throw httpError(422, "MEDIA_DUPLICATE", "Aynı kayıt için birden fazla medya dosyası gönderildi.");
    seen.add(manifestKey);
    const file = form.get(`file-${manifest.index}`);
    if (!(file instanceof File) || file.size !== manifest.size || file.type !== manifest.type || file.name !== manifest.name) throw httpError(422, "MEDIA_FILE_MISMATCH", "Medya dosyası manifest ile eşleşmiyor.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = validateMediaUpload(bytes, file.name, file.type, manifest.kind);
    const path = manifest.kind === "certificate"
      ? `/media/certificates/${manifest.recordId}/${randomToken(12)}.${extension}`
      : `/media/projects/${manifest.recordId}/${randomToken(12)}.${extension}`;
    if (manifest.kind === "certificate") {
      const certificate = files.certificates.items.find((item: any) => item.id === manifest.recordId);
      if (!certificate) throw httpError(422, "CERTIFICATE_MISSING", "PDF için sertifika kaydı bulunamadı.");
      certificate.shared.file = path;
    } else {
      const project = files.projects.items.find((item: any) => item.id === manifest.recordId);
      if (!project || project.shared.visual.mode !== "screenshot") throw httpError(422, "SCREENSHOT_PROJECT_INVALID", "Ekran görüntüsü için uygun proje kaydı bulunamadı.");
      project.shared.visual.path = path;
    }
    mediaChanges.push({ path: `public${path}`, content: bytes });
  }
  assertNoPendingMedia(files);
  files = parseContent(files);
  const commitFiles = preserveRemoteExtensions(snapshot.rawFiles, remoteModel, files) as any;
  validatePublicationByteLimits({ jsonBytes: jsonByteUsage(commitFiles), mediaBytes: manifests.map((manifest) => manifest.size) });
  const changes: GitChange[] = [];
  for (const key of ["site", "projects", "certificates", "skills", "visuals"] as const) {
    const content = `${JSON.stringify(commitFiles[key], null, 2)}\n`;
    if (!jsonValuesEqual(commitFiles[key], snapshot.rawFiles[key])) changes.push({ path: CONTENT_PATHS[key], content });
  }
  changes.push(...mediaChanges);
  if (!changes.length) throw httpError(422, "NO_CHANGES", "Yayınlanacak değişiklik bulunamadı.");
  if (changes.length > PUBLICATION_LIMITS.maxChangedPaths) throw httpError(413, "CHANGE_COUNT_EXCEEDED", "Bir yayındaki değişmiş yol sınırı aşıldı.");
  return { files, changes };
}

export function validateMediaSignature(bytes: Uint8Array, mime: string, kind: "certificate" | "screenshot"): string {
  const signature = detectMediaSignature(bytes);
  const normalizedMime = normalizeMediaMime(mime);
  const rule = MEDIA_FILE_TYPES.find((candidate) => candidate.kind === kind && candidate.mime === normalizedMime && candidate.signature === signature);
  if (rule) return rule.outputExtension;
  if (kind === "certificate") throw httpError(422, "PDF_SIGNATURE_INVALID", "PDF MIME türü veya dosya imzası geçersiz.");
  throw httpError(422, "IMAGE_SIGNATURE_INVALID", "Görsel MIME türü veya dosya imzası geçersiz.");
}

export function validateMediaUpload(bytes: Uint8Array, name: string, mime: string, kind: "certificate" | "screenshot"): string {
  const metadata = mediaTypeForMetadata(kind, name, mime);
  if (!metadata) throw httpError(422, "MEDIA_TYPE_INVALID", "Medya dosya adı ve MIME türü desteklenmiyor.");
  const extension = validateMediaSignature(bytes, mime, kind);
  if (metadata.outputExtension !== extension) throw httpError(422, "MEDIA_TYPE_INVALID", "Medya uzantısı, MIME türü ve dosya imzası eşleşmiyor.");
  return extension;
}
