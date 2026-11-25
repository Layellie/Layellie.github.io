export const IMAGE_OPTIMIZATION_PROFILES = Object.freeze({
  "profile-avatar": { mode: "cover", width: 112, height: 112, quality: 0.92 },
  "profile-banner": { mode: "cover", width: 648, height: 216, quality: 0.92 },
  screenshot: { mode: "contain", maxWidth: 1600, maxHeight: 1200, quality: 0.88 },
});

/**
 * Computes source crop rectangle and output canvas dimensions for a given
 * optimization profile. Pure math so it stays easily testable.
 */
export function computeImageCrop(srcWidth, srcHeight, profile) {
  if (!Number.isFinite(srcWidth) || !Number.isFinite(srcHeight) || srcWidth <= 0 || srcHeight <= 0) {
    return null;
  }
  if (profile.mode === "cover") {
    const dstW = profile.width;
    const dstH = profile.height;
    const targetRatio = dstW / dstH;
    const srcRatio = srcWidth / srcHeight;
    let sx = 0;
    let sy = 0;
    let sw = srcWidth;
    let sh = srcHeight;
    if (srcRatio > targetRatio) {
      sw = Math.round(srcHeight * targetRatio);
      sx = Math.round((srcWidth - sw) / 2);
    } else if (srcRatio < targetRatio) {
      sh = Math.round(srcWidth / targetRatio);
      sy = Math.round((srcHeight - sh) / 2);
    }
    return { sx, sy, sw, sh, dstW, dstH };
  }
  const scale = Math.min(1, profile.maxWidth / srcWidth, profile.maxHeight / srcHeight);
  const dstW = Math.max(1, Math.round(srcWidth * scale));
  const dstH = Math.max(1, Math.round(srcHeight * scale));
  return { sx: 0, sy: 0, sw: srcWidth, sh: srcHeight, dstW, dstH };
}

function replaceExtensionWithWebp(filename) {
  const base = String(filename || "image").replace(/\.[^.]+$/, "");
  return `${base || "image"}.webp`;
}

async function decodeImageSource(file) {
  if (typeof globalThis.createImageBitmap === "function") {
    const bitmap = await globalThis.createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close?.(),
    };
  }
  if (typeof Image === "undefined" || typeof URL?.createObjectURL !== "function") return null;
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const timer = globalThis.setTimeout(() => reject(new Error("decode-timeout")), 3000);
      const el = new Image();
      el.onload = () => { globalThis.clearTimeout(timer); resolve(el); };
      el.onerror = () => { globalThis.clearTimeout(timer); reject(new Error("decode-failed")); };
      el.src = objectUrl;
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch {
    URL.revokeObjectURL(objectUrl);
    return null;
  }
}

/**
 * Optimizes PNG/JPG/WebP uploads inside the browser using Canvas -> WebP
 * (automatically stripping EXIF/XMP metadata and right-sizing PP/Banner/Screenshots).
 * Animated GIFs and unsupported environments gracefully keep the original file.
 */
export async function optimizeImageUpload(file, profileKey) {
  const originalBytes = file?.size || 0;
  const fallback = { file, optimized: false, originalBytes, finalBytes: originalBytes };
  const profile = IMAGE_OPTIMIZATION_PROFILES[profileKey];
  if (!file || !profile || file.type === "image/gif" || typeof document === "undefined") {
    return fallback;
  }

  // Verify Canvas 2D + toBlob capability BEFORE decoding so non-browser/jsdom
  // environments return immediately without creating object URLs or hanging.
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext?.("2d");
  if (!ctx || typeof canvas.toBlob !== "function") return fallback;

  let decoded = null;
  try {
    decoded = await decodeImageSource(file);
    if (!decoded) return fallback;
    const crop = computeImageCrop(decoded.width, decoded.height, profile);
    if (!crop) return fallback;

    canvas.width = crop.dstW;
    canvas.height = crop.dstH;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(decoded.source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.dstW, crop.dstH);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", profile.quality));
    if (!blob || blob.size <= 0 || blob.type !== "image/webp") return fallback;

    const resized = decoded.width !== crop.dstW || decoded.height !== crop.dstH;
    if (!resized && file.type === "image/webp" && blob.size >= originalBytes) {
      return fallback;
    }

    const nextFile = new File([blob], replaceExtensionWithWebp(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });
    return {
      file: nextFile,
      optimized: true,
      originalBytes,
      finalBytes: nextFile.size,
      width: crop.dstW,
      height: crop.dstH,
    };
  } catch {
    return fallback;
  } finally {
    decoded?.close?.();
  }
}
