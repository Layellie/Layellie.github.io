// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";

vi.mock("../../src/admin/api/client.js", () => ({
  adminApi: { content: vi.fn(), session: vi.fn(), validate: vi.fn(), publish: vi.fn(), deployment: vi.fn(), logout: vi.fn() },
}));

import AdminApp from "../../src/admin/AdminApp.jsx";

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
afterEach(cleanup);

describe("new project preset selection", () => {
  it("passes the currently selected valid preset into the new project selector and preview", () => {
    const files = structuredClone(portfolioFiles);
    const selectedPreset = files.visuals.presets[1];
    files.projects.items[0].shared.visual = { mode: "builder", visualId: selectedPreset.id, fallbackComponentId: "legacy-clipboard" };
    render(<AdminApp initialSession={{ user: { login: "Layellie" }, csrfToken: "csrf" }} initialContent={{ files, base: { commitSha: "a".repeat(40), blobShas: {} } }} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Projeler" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Yeni proje" }));

    expect(screen.getByRole("combobox", { name: "Builder preset" }).value).toBe(selectedPreset.id);
    expect(screen.getAllByText(selectedPreset.shared.window.title).length).toBeGreaterThan(0);
    expect(screen.getByText("draft")).toBeTruthy();
  });
});
