// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import { adminApi } from "../../src/admin/api/client.js";
import AdminApp from "../../src/admin/AdminApp.jsx";

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

const session = { user: { login: "Layellie" }, csrfToken: "test-csrf" };
const content = { files: portfolioFiles, base: { commitSha: "0123456789abcdef", blobShas: {} } };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AdminApp", () => {
  it("renders a Layellie-styled dashboard after a real session is supplied", () => {
    render(<AdminApp initialSession={session} initialContent={content} />);
    expect(screen.getByText("Portfolio Control")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /İçerik.*Görsel.*Yayın/ })).toBeTruthy();
    expect(screen.getByText("Yayındaki projeler")).toBeTruthy();
    expect(screen.getByText("Canlı deploy durumu")).toBeTruthy();
    expect(screen.getByText("Ziyaret analitiği")).toBeTruthy();
    // Publish-safety checklist moved to the Publish Center, not the dashboard.
    expect(screen.queryByText("Durable Object publish kilidi")).toBeNull();
  });

  it("shows live GitHub Pages deployment status on the dashboard and refreshes on click", async () => {
    vi.spyOn(adminApi, "analytics").mockResolvedValue({
      range: "7d",
      total: 12,
      today: { uniqueVisitors: 3, desktop: 2, mobileTablet: 1 },
      days: [{ day: "2026-07-18", uniqueVisitors: 3 }],
    });
    const deploySpy = vi.spyOn(adminApi, "deployment")
      .mockResolvedValueOnce({
        commit: "f2a21f4000000000000000000000000000000000",
        status: "in_progress",
        conclusion: null,
        name: "Deploy to GitHub Pages",
        commitMessage: "feat(site): quick summary modal",
        url: "https://github.com/Layellie/Layellie.github.io/actions/runs/123",
        updatedAt: "2026-07-18T12:00:00Z",
      })
      .mockResolvedValueOnce({
        commit: "f2a21f4000000000000000000000000000000000",
        status: "completed",
        conclusion: "success",
        name: "Deploy to GitHub Pages",
        commitMessage: "feat(site): quick summary modal",
        url: "https://evil.example/phish",
        updatedAt: "2026-07-18T12:01:00Z",
      });

    render(<AdminApp initialSession={session} initialContent={content} />);
    expect(await screen.findByText("Dağıtılıyor")).toBeTruthy();
    expect(screen.getByText("feat(site): quick summary modal")).toBeTruthy();
    expect(screen.getByText("f2a21f4")).toBeTruthy();
    const actionsLink = screen.getByRole("link", { name: /GitHub Actions/i });
    expect(actionsLink.getAttribute("href")).toBe("https://github.com/Layellie/Layellie.github.io/actions/runs/123");

    fireEvent.click(screen.getByRole("button", { name: "Deploy durumunu yenile" }));
    expect(await screen.findByText("Yayında")).toBeTruthy();
    expect(deploySpy).toHaveBeenCalledTimes(2);
    // Unsafe non-github.com URLs must not render an external link.
    expect(screen.queryByRole("link", { name: /GitHub Actions/i })).toBeNull();
  });

  it("relocates the publish-safety checklist into the publish center", () => {
    render(<AdminApp initialSession={session} initialContent={content} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Doğrula & yayınla" })[0]);
    expect(screen.getByRole("heading", { name: "Yayın güvenliği" })).toBeTruthy();
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
