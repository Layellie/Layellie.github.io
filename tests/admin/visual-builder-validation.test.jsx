// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import visuals from "../../src/content/visuals.json";
import projects from "../../src/content/projects.json";
import VisualBuilder from "../../src/admin/editors/VisualBuilder.jsx";
import { createModule } from "../../src/admin/visuals/moduleDefaults.js";

function Harness({ initial, projectFiles = projects }) {
  const [value, setValue] = useState(initial);
  return <VisualBuilder visuals={value} projects={projectFiles} onChange={setValue} />;
}

afterEach(cleanup);

describe("VisualBuilder canonical module errors", () => {
  it("shows the selected module and field when progress is invalid", () => {
    const invalid = structuredClone(visuals);
    const module = createModule("circularProgress", invalid.presets[0].modules);
    module.shared.progress = 101;
    invalid.presets[0].modules.push(module);
    render(<Harness initial={invalid} />);

    const moduleLabel = screen.getAllByText("circularProgress").find((element) => element.tagName === "SPAN");
    fireEvent.click(moduleLabel.closest("button"));
    const errorTitle = screen.getByText("circularProgress modülü geçersiz");
    expect(errorTitle).toBeTruthy();
    expect(errorTitle.closest('[role="status"]').textContent).toContain("shared.progress");
    expect(screen.getByRole("spinbutton", { name: /^Progress/ }).getAttribute("aria-describedby")).toBeTruthy();
  });

  it("blocks deletion of a preset used by a published project and names the project", () => {
    const onChange = vi.fn();
    const projectFiles = structuredClone(projects);
    const project = projectFiles.items[0];
    project.shared.visual = { mode: "builder", visualId: visuals.presets[0].id };
    render(<VisualBuilder visuals={structuredClone(visuals)} projects={projectFiles} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Preset sil" }));

    expect(screen.getByText("Preset yayındaki projeler tarafından kullanılıyor")).toBeTruthy();
    expect(screen.getByText(new RegExp(project.tr.name))).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("allows the old preset to be deleted after its project moves to another preset", () => {
    const onChange = vi.fn();
    const projectFiles = structuredClone(projects);
    projectFiles.items[0].shared.visual = { mode: "builder", visualId: visuals.presets[1].id };
    render(<VisualBuilder visuals={structuredClone(visuals)} projects={projectFiles} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Preset sil" }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0].presets.some((preset) => preset.id === visuals.presets[0].id)).toBe(false);
  });

  it("deletes an unused preset normally", () => {
    const onChange = vi.fn();
    render(<VisualBuilder visuals={structuredClone(visuals)} projects={{ items: [] }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Preset sil" }));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("shows a draft dependency warning before explicitly allowing deletion", () => {
    const onChange = vi.fn();
    const projectFiles = structuredClone(projects);
    projectFiles.items[0].publicationStatus = "draft";
    projectFiles.items[0].shared.visual = { mode: "builder", visualId: visuals.presets[0].id };
    render(<VisualBuilder visuals={structuredClone(visuals)} projects={projectFiles} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Preset sil" }));
    expect(screen.getByText("Preset taslak projeler tarafından kullanılıyor")).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Taslak referanslarına rağmen sil" }));
    expect(onChange).toHaveBeenCalledOnce();
  });
});
