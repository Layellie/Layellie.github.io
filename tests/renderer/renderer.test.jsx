// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import visuals from "../../src/content/visuals.json";
import MockupRenderer, { modulePlacementClasses } from "../../src/components/project-visuals/MockupRenderer.jsx";

describe("MockupRenderer", () => {
  it.each(visuals.presets.map((preset) => [preset.id, preset]))("renders the %s starter preset", (_id, preset) => {
    const { container } = render(<MockupRenderer preset={preset} lang="tr" />);
    expect(container.querySelector("[role=status]")).toBeNull();
    expect(container.textContent).toContain(preset.shared.window.title);
  });

  it("renders an explanatory fallback for an unknown module", () => {
    const preset = structuredClone(visuals.presets[0]);
    preset.modules.push({
      id: "future-module",
      type: "futureWidget",
      shared: { placement: { mobileColSpan: 12, desktopColSpan: 12, rowSpan: 1, height: "normal" } },
      tr: {},
      en: {},
    });
    render(<MockupRenderer preset={preset} lang="en" />);
    expect(screen.getByText("Unsupported module")).toBeTruthy();
    expect(screen.getByText(/futureWidget/)).toBeTruthy();
  });

  it("falls back safely when the preset is invalid", () => {
    render(<MockupRenderer preset={{ id: "broken" }} lang="tr" />);
    expect(screen.getByText("Invalid visual preset")).toBeTruthy();
  });

  it("previews legacy list rows with default tone as safe text rows", () => {
    const preset = structuredClone(visuals.presets[0]);
    const row = preset.modules.find((module) => module.type === "listRow");
    row.shared.tone = "default";
    const { container } = render(<MockupRenderer preset={preset} lang="tr" />);
    expect(container.querySelector("[role=status]")).toBeNull();
    expect(container.textContent).toContain(row.tr.text);
  });

  it("uses deterministic mobile and desktop spans only for explicit previews", () => {
    const placement = { mobileColSpan: 12, desktopColSpan: 7, rowSpan: 2, height: "tall" };
    expect(modulePlacementClasses(placement, "mobile")).toContain("col-span-12");
    expect(modulePlacementClasses(placement, "mobile")).not.toContain("sm:col-span-7");
    expect(modulePlacementClasses(placement, "mobile")).not.toContain("row-span");
    expect(modulePlacementClasses(placement, "desktop")).toContain("col-span-7 row-span-2");
    expect(modulePlacementClasses(placement)).toContain("col-span-12 sm:col-span-7 sm:row-span-2");
  });
});
