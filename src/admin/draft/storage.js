import { normalizeLegacyListRowTones } from "../../content/schemas.js";

const DB_NAME = "layellie-admin-drafts";
const STORE_NAME = "drafts";
const DRAFT_KEY = "portfolio-v1";
export const DRAFT_FORMAT_VERSION = 2;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Yerel taslak veritabanı açılamadı."));
  });
}

async function transaction(mode, action) {
  const database = await openDatabase();
  try {
    const store = database.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
    return await new Promise((resolve, reject) => {
      const request = action(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("Yerel taslak işlemi başarısız oldu."));
    });
  } finally {
    database.close();
  }
}

export async function loadDraft() {
  if (typeof indexedDB === "undefined") return null;
  return transaction("readonly", (store) => store.get(DRAFT_KEY));
}

export function hasDraftBaseSnapshot(record) {
  return Boolean(
    record?.formatVersion === DRAFT_FORMAT_VERSION &&
    record.baseFiles &&
    record.base &&
    typeof record.base.commitSha === "string" &&
    record.base.blobShas &&
    typeof record.base.blobShas === "object",
  );
}

export function createDraftRecord(payload, savedAt = new Date().toISOString()) {
  if (!payload?.files || !payload?.baseFiles || !payload?.base) {
    throw new Error("Taslak güvenli bir base snapshot olmadan kaydedilemez.");
  }
  return {
    formatVersion: DRAFT_FORMAT_VERSION,
    files: payload.files,
    baseFiles: payload.baseFiles,
    base: payload.base,
    uploads: payload.uploads || [],
    savedAt,
  };
}

export function restoreDraftRecord(record) {
  if (!record?.files) return null;
  const complete = hasDraftBaseSnapshot(record);
  return {
    files: normalizeLegacyListRowTones(record.files),
    uploads: Array.isArray(record.uploads) ? record.uploads : [],
    baseFiles: complete ? record.baseFiles : null,
    base: complete ? record.base : null,
    needsRebase: !complete,
  };
}

export async function saveDraft(payload) {
  if (typeof indexedDB === "undefined") return;
  const record = createDraftRecord(payload);
  await transaction("readwrite", (store) => store.put(record, DRAFT_KEY));
}

export async function clearDraft() {
  if (typeof indexedDB === "undefined") return;
  await transaction("readwrite", (store) => store.delete(DRAFT_KEY));
}
