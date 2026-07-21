// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import { synchronizeUploads } from "../../src/admin/data/model.js";
import { createProject } from "../../src/admin/data/model.js";

vi.mock("../../src/admin/validation/files.js", () => ({ validateFileSignature: vi.fn().mockResolvedValue(true) }));

import ProjectEditor from "../../src/admin/editors/ProjectEditor.jsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function screenshotProject(source, id) {
  const project = structuredClone(source);
  project.id = id;
  project.tr.name = `${id} TR`;
  project.en.name = `${id} EN`;
  project.shared.visual = {
    mode: "screenshot",
    path: `/media/projects/${id}/existing.png`,
    objectFit: "contain",
    alt: { tr: `${id} görseli`, en: `${id} image` },
  };
  return project;
}

function ScreenshotFlowHarness({ initialProject, onUploadObserved }) {
  const [project, setProject] = useState(initialProject);
  const [uploads, setUploads] = useState([]);
  const updateProject = (next) => {
    setProject(next);
    setUploads((current) => synchronizeUploads({
      ...portfolioFiles,
      projects: { ...portfolioFiles.projects, items: [next] },
    }, current));
  };
  const addUpload = (entry) => {
    onUploadObserved(entry);
    setUploads((current) => [...current.filter((item) => !(item.kind === entry.kind && item.recordId === entry.recordId)), entry]);
  };
  return <><ProjectEditor project={project} presets={portfolioFiles.visuals.presets} pendingUpload={uploads[0]} publicSiteOrigin="https://portfolio.example" onUpload={addUpload} onChange={updateProject} /><output data-testid="pending-path">{project.shared.visual.path || ""}</output><output data-testid="upload-manifest">{uploads.map((entry) => entry.file.name).join(",")}</output></>;
}

describe("ProjectEditor screenshot preview lifecycle", () => {
  it("keeps a new project's preset selector and first preview on the selected preset", () => {
    const preset = portfolioFiles.visuals.presets[1];
    const project = createProject([], portfolioFiles.visuals.presets, preset.id);
    render(<ProjectEditor project={project} presets={portfolioFiles.visuals.presets} publicSiteOrigin="https://portfolio.example" onUpload={vi.fn()} onChange={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Builder preset" }).value).toBe(preset.id);
    expect(screen.getAllByText(preset.shared.window.title).length).toBeGreaterThan(0);
  });

  it("starts without a dangling builder reference and explains the missing-preset action", () => {
    const project = createProject([], []);
    render(<ProjectEditor project={project} presets={[]} publicSiteOrigin="https://portfolio.example" onUpload={vi.fn()} onChange={vi.fn()} />);
    expect(project.shared.visual).toEqual({ mode: "custom", componentId: "legacy-clipboard" });
    expect(screen.getByRole("combobox", { name: "Görsel modu" }).value).toBe("custom");
    expect(screen.getByText("Builder preset’i bulunmuyor")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Modüler builder" }).disabled).toBe(true);
  });

  it("loads a persisted screenshot from public origin and keeps a new blob preview local", async () => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:new-local-preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const project = screenshotProject(portfolioFiles.projects.items[0], "persisted-project");
    const { rerender } = render(<ProjectEditor project={project} presets={portfolioFiles.visuals.presets} publicSiteOrigin="https://portfolio.example" onUpload={vi.fn()} onChange={vi.fn()} />);
    expect(screen.getByRole("img").getAttribute("src")).toBe("https://portfolio.example/media/projects/persisted-project/existing.png");

    const pending = { kind: "screenshot", recordId: project.id, file: new File(["new"], "new.webp", { type: "image/webp" }) };
    rerender(<ProjectEditor project={project} presets={portfolioFiles.visuals.presets} pendingUpload={pending} publicSiteOrigin="https://portfolio.example" onUpload={vi.fn()} onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("img").getAttribute("src")).toBe("blob:new-local-preview"));
  });

  it("never carries project A's blob preview into project B and restores B's active upload", async () => {
    let counter = 0;
    const createObjectURL = vi.fn((file) => `blob:${file.name}-${++counter}`);
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const projectA = screenshotProject(portfolioFiles.projects.items[0], "project-a");
    const projectB = screenshotProject(portfolioFiles.projects.items[1], "project-b");
    const fileA = new File(["a"], "a.png", { type: "image/png" });
    const fileB = new File(["b"], "b.png", { type: "image/png" });
    const fileBReplacement = new File(["b2"], "b-new.png", { type: "image/png" });
    const onUpload = vi.fn();
    const onChange = vi.fn();
    const { rerender, unmount } = render(<ProjectEditor project={projectA} presets={portfolioFiles.visuals.presets} onUpload={onUpload} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/PNG, JPG veya WebP seç/), { target: { files: [fileA] } });
    await waitFor(() => expect(screen.getByRole("img").getAttribute("src")).toBe("blob:a.png-1"));

    rerender(<ProjectEditor project={projectB} presets={portfolioFiles.visuals.presets} pendingUpload={{ kind: "screenshot", recordId: projectB.id, file: fileB }} onUpload={onUpload} onChange={onChange} />);
    await waitFor(() => expect(screen.getByRole("img").getAttribute("src")).toBe("blob:b.png-2"));
    expect(screen.getByRole("img").getAttribute("src")).not.toContain("a.png");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:a.png-1");

    fireEvent.change(screen.getByLabelText(/PNG, JPG veya WebP seç/), { target: { files: [fileBReplacement] } });
    await waitFor(() => expect(screen.getByRole("img").getAttribute("src")).toBe("blob:b-new.png-3"));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:b.png-2");
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:b-new.png-3");
  });

  it("re-registers the same local file after screenshot → builder → screenshot", async () => {
    let counter = 0;
    const createObjectURL = vi.fn((file) => `blob:${file.name}-${++counter}`);
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const project = screenshotProject(portfolioFiles.projects.items[0], "mode-switch-project");
    const file = new File(["image"], "selected.webp", { type: "image/webp" });
    const onUploadObserved = vi.fn();
    render(<ScreenshotFlowHarness initialProject={project} onUploadObserved={onUploadObserved} />);

    fireEvent.change(screen.getByLabelText(/PNG, JPG veya WebP seç/), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("img").getAttribute("src")).toBe("blob:selected.webp-1"));
    expect(screen.getByTestId("pending-path").textContent).toBe("/media/projects/mode-switch-project/pending.webp");
    expect(screen.getByTestId("upload-manifest").textContent).toBe("selected.webp");

    fireEvent.change(screen.getByRole("combobox", { name: "Görsel modu" }), { target: { value: "builder" } });
    await waitFor(() => expect(screen.getByTestId("upload-manifest").textContent).toBe(""));
    expect(screen.queryByRole("img")).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:selected.webp-1");

    fireEvent.change(screen.getByRole("combobox", { name: "Görsel modu" }), { target: { value: "screenshot" } });
    await waitFor(() => expect(screen.getByRole("img").getAttribute("src")).toBe("blob:selected.webp-2"));
    expect(screen.getByTestId("pending-path").textContent).toBe("/media/projects/mode-switch-project/pending.webp");
    expect(screen.getByTestId("upload-manifest").textContent).toBe("selected.webp");
    expect(onUploadObserved).toHaveBeenCalledTimes(2);
    expect(onUploadObserved.mock.calls[1][0].file).toBe(file);

    fireEvent.change(screen.getByRole("combobox", { name: "Görsel modu" }), { target: { value: "custom" } });
    await waitFor(() => expect(screen.getByTestId("upload-manifest").textContent).toBe(""));
    expect(screen.queryByRole("img")).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:selected.webp-2");
  });
});
