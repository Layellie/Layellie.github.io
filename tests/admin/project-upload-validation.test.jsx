// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import ProjectEditor from "../../src/admin/editors/ProjectEditor.jsx";

afterEach(cleanup);

describe("ProjectEditor screenshot validation", () => {
  it("does not preview or register a mismatched image file", async () => {
    const project = structuredClone(portfolioFiles.projects.items[0]);
    project.shared.visual = {
      mode: "screenshot",
      path: `/media/projects/${project.id}/existing.png`,
      objectFit: "contain",
      alt: { tr: "Önizleme", en: "Preview" },
    };
    const createObjectURL = vi.fn(() => "blob:must-not-be-used");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const onUpload = vi.fn();
    const onChange = vi.fn();
    render(<ProjectEditor project={project} presets={portfolioFiles.visuals.presets} publicSiteOrigin="https://portfolio.example" onUpload={onUpload} onChange={onChange} />);
    const originalSource = screen.getByRole("img").getAttribute("src");
    const spoofed = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0x00])], "spoofed.png", { type: "image/png" });

    fireEvent.change(screen.getByLabelText(/PNG, JPG veya WebP seç/), { target: { files: [spoofed] } });

    expect(await screen.findByText("Dosya kabul edilmedi")).toBeTruthy();
    expect(screen.getByRole("img").getAttribute("src")).toBe(originalSource);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(onUpload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
