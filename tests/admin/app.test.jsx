// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import AdminApp from "../../src/admin/AdminApp.jsx";

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

const session = { user: { login: "Layellie" }, csrfToken: "test-csrf" };
const content = { files: portfolioFiles, base: { commitSha: "0123456789abcdef", blobShas: {} } };

describe("AdminApp", () => {
  it("renders a Layellie-styled dashboard after a real session is supplied", () => {
    render(<AdminApp initialSession={session} initialContent={content} />);
    expect(screen.getByText("Portfolio Control")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /İçerik.*Görsel.*Yayın/ })).toBeTruthy();
    expect(screen.getByText("Yayındaki projeler")).toBeTruthy();
    expect(screen.getByText("Durable Object publish kilidi")).toBeTruthy();
  });

  it("opens project management without losing existing projects", () => {
    render(<AdminApp initialSession={session} initialContent={content} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Projeler" })[0]);
    expect(screen.getByText("Projelerini kod yazmadan yönet")).toBeTruthy();
    expect(screen.getAllByText("AIO-Hybrid-Clipboard").length).toBeGreaterThan(0);
    expect(screen.getByText("Gerçek kart önizlemesi · TR")).toBeTruthy();
  });
});
