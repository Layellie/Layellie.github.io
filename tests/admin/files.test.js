// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { validateFileMetadata, validateFileSignature, validateManagedUrl } from "../../src/admin/validation/files.js";
import { validateMediaUpload } from "../../worker/src/content/validation.ts";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0x00]);
const WEBP = new TextEncoder().encode("RIFF0000WEBP");
const PDF = new TextEncoder().encode("%PDF-1.7\n");

describe("admin upload validation", () => {
  it("accepts PDF metadata and signature", async () => {
    const file = new File([PDF], "certificate.pdf", { type: "application/pdf" });
    expect(validateFileMetadata(file, "certificate")).toBe(true);
    await expect(validateFileSignature(file, "certificate")).resolves.toBe(true);
  });

  it("rejects spoofed file contents", async () => {
    const file = new File(["not a pdf"], "certificate.pdf", { type: "application/pdf" });
    await expect(validateFileSignature(file, "certificate")).rejects.toThrow(/içeriği/);
  });

  it("rejects unsupported and oversized uploads", () => {
    expect(() => validateFileMetadata({ name: "x.exe", type: "application/octet-stream", size: 10 }, "screenshot")).toThrow();
    expect(() => validateFileMetadata({ name: "x.png", type: "image/png", size: 5 * 1024 * 1024 + 1 }, "screenshot")).toThrow(/5 MiB/);
  });

  it.each([
    ["PNG", "screenshot", "image.PNG", "image/png", PNG, "png"],
    ["JPG", "screenshot", "image.jpg", "image/jpeg", JPEG, "jpg"],
    ["JPEG", "screenshot", "image.jpeg", "image/jpeg", JPEG, "jpg"],
    ["WebP", "screenshot", "image.webp", "image/webp", WEBP, "webp"],
    ["PDF", "certificate", "certificate.PDF", "application/pdf", PDF, "pdf"],
  ])("accepts matching %s extension, MIME and signature in admin and Worker", async (_label, kind, name, mime, bytes, extension) => {
    const file = new File([bytes], name, { type: mime });
    await expect(validateFileSignature(file, kind)).resolves.toBe(true);
    expect(validateMediaUpload(bytes, name, mime, kind)).toBe(extension);
  });

  it.each([
    ["JPEG bytes presented as PNG", "image.png", "image/png", JPEG],
    ["PNG extension with JPEG MIME", "image.png", "image/jpeg", PNG],
    ["WebP bytes presented as JPG", "image.jpg", "image/jpeg", WEBP],
  ])("rejects %s consistently in admin and Worker", async (_label, name, mime, bytes) => {
    const file = new File([bytes], name, { type: mime });
    await expect(validateFileSignature(file, "screenshot")).rejects.toThrow(/(uzantısı|içeriği)/);
    expect(() => validateMediaUpload(bytes, name, mime, "screenshot")).toThrow();
  });

  it("allows only canonical HTTPS GitHub repository URLs", () => {
    expect(validateManagedUrl("https://github.com/Layellie/EyeHealth")).toBe("https://github.com/Layellie/EyeHealth");
    expect(() => validateManagedUrl("javascript:alert(1)")).toThrow();
    expect(() => validateManagedUrl("https://example.com/Layellie/EyeHealth")).toThrow();
  });
});
