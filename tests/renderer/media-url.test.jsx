// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ProjectVisual from "../../src/components/project-visuals/ProjectVisual.jsx";
import { resolveMediaUrl } from "../../src/components/project-visuals/mediaUrl.js";

const reference = {
  mode: "screenshot",
  path: "/media/projects/test.webp",
  objectFit: "contain",
  alt: { tr: "Test görseli", en: "Test image" },
};

afterEach(cleanup);

describe("project media URL resolution", () => {
  it("resolves persisted admin media against the configured public origin", () => {
    expect(resolveMediaUrl(reference.path, { publicSiteOrigin: "https://portfolio.example", requirePublicOrigin: true })).toBe("https://portfolio.example/media/projects/test.webp");
  });

  it("keeps the public renderer's root-relative behavior", () => {
    render(<ProjectVisual reference={reference} presets={[]} lang="tr" />);
    expect(screen.getByRole("img").getAttribute("src")).toBe("/media/projects/test.webp");
  });

  it.each([
    "https://cdn.example/test.webp",
    "http://localhost:4173/test.webp",
    "blob:local-preview",
    "data:image/webp;base64,AAAA",
  ])("does not rewrite absolute media URL %s", (value) => {
    expect(resolveMediaUrl(value, { publicSiteOrigin: "https://portfolio.example", requirePublicOrigin: true })).toBe(value);
  });

  it("fails safely instead of resolving admin media against the Worker origin", () => {
    render(<ProjectVisual reference={reference} presets={[]} lang="tr" requirePublicMediaOrigin />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText(/Public media origin is not configured/)).toBeTruthy();
  });
});
