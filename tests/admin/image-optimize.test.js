// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  IMAGE_OPTIMIZATION_PROFILES,
  computeImageCrop,
  optimizeImageUpload,
} from "../../src/admin/validation/imageOptimize.js";

describe("admin browser image optimization helpers", () => {
  it("computes exact center-crop rectangles for 1:1 avatar and 3:1 banner", () => {
    const avatarCrop = computeImageCrop(800, 400, IMAGE_OPTIMIZATION_PROFILES["profile-avatar"]);
    expect(avatarCrop).toEqual({ sx: 200, sy: 0, sw: 400, sh: 400, dstW: 112, dstH: 112 });

    const bannerCrop = computeImageCrop(1200, 600, IMAGE_OPTIMIZATION_PROFILES["profile-banner"]);
    expect(bannerCrop).toEqual({ sx: 0, sy: 100, sw: 1200, sh: 400, dstW: 648, dstH: 216 });
  });

  it("scales oversized screenshots down without upscaling small ones", () => {
    expect(computeImageCrop(3200, 1800, IMAGE_OPTIMIZATION_PROFILES.screenshot)).toEqual({
      sx: 0,
      sy: 0,
      sw: 3200,
      sh: 1800,
      dstW: 1600,
      dstH: 900,
    });
    expect(computeImageCrop(800, 600, IMAGE_OPTIMIZATION_PROFILES.screenshot)).toEqual({
      sx: 0,
      sy: 0,
      sw: 800,
      sh: 600,
      dstW: 800,
      dstH: 600,
    });
  });

  it("preserves animated GIFs and falls back cleanly when canvas decoding is unavailable", async () => {
    const gif = new File([new Uint8Array([0x47, 0x49, 0x46, 0x38])], "anim.gif", { type: "image/gif" });
    const gifRes = await optimizeImageUpload(gif, "profile-avatar");
    expect(gifRes.optimized).toBe(false);
    expect(gifRes.file).toBe(gif);

    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "shot.png", { type: "image/png" });
    const pngRes = await optimizeImageUpload(png, "screenshot");
    expect(pngRes.file).toBe(png);
  });
});
