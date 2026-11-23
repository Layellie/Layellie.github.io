// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import { clonePortfolio, createPortfolioBackup } from "../../src/admin/data/model.js";
import { adminApi } from "../../src/admin/api/client.js";
import * as draftStorage from "../../src/admin/draft/storage.js";
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
    expect(screen.getByText("İçerik sağlığı & yedek")).toBeTruthy();
    expect(screen.getByText("Sağlıklı")).toBeTruthy();
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

  it("downloads a dated JSON backup from the dashboard health card", () => {
    const createObjectURL = vi.fn(() => "blob:backup-test");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<AdminApp initialSession={session} initialContent={content} />);
    fireEvent.click(screen.getByRole("button", { name: /JSON yedek indir/i }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:backup-test");
    expect(screen.getByText(/Yedek indirildi: layellie-portfolio-backup-/i)).toBeTruthy();
  });

  it("restores a validated JSON backup into the working draft after confirmation and rejects invalid JSON", async () => {
    render(<AdminApp initialSession={session} initialContent={content} />);
    const fileInput = screen.getByLabelText("JSON yedek dosyası seç");

    const invalidFile = new File(["{not-valid-json"], "broken.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    expect(await screen.findByText(/Geçersiz JSON dosyası/i)).toBeTruthy();

    const edited = clonePortfolio(portfolioFiles);
    edited.projects.items[0].tr.name = "Yedekten Gelen Proje";
    const backup = createPortfolioBackup(edited, content.base);
    const validFile = new File([backup.json], backup.filename, { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    expect(await screen.findByText("Yedekten çalışma kopyasına yükle")).toBeTruthy();
    expect(screen.getByText(/1 değişiklik içeriyor/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Taslağa yükle" }));
    expect(await screen.findByText("Yedek çalışma kopyasına yüklendi")).toBeTruthy();
    expect(screen.getByText("Yedekten Gelen Proje")).toBeTruthy();
    // Unsaved changes badge appears in the sticky header and Ctrl+S triggers local draft save.
    expect(screen.getByRole("button", { name: /1 değişiklik/i })).toBeTruthy();

    const saveSpy = vi.spyOn(draftStorage, "saveDraft").mockResolvedValue(undefined);
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect(await screen.findByText("Taslak yerel olarak korundu")).toBeTruthy();
    expect(saveSpy).toHaveBeenCalledOnce();

    // Undo / Redo buttons restore and re-apply draft changes cleanly.
    const originalFirstName = portfolioFiles.projects.items[0].tr.name;
    fireEvent.click(screen.getByRole("button", { name: "Geri al" }));
    expect(screen.getByText(originalFirstName)).toBeTruthy();
    expect(screen.queryByText("Yedekten Gelen Proje")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "İleri al" }));
    expect(screen.getByText("Yedekten Gelen Proje")).toBeTruthy();
  });

  it("shows 7-day trend percentage and exports analytics as CSV", async () => {
    const createObjectURL = vi.fn(() => "blob:analytics-csv");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.spyOn(adminApi, "analytics").mockResolvedValue({
      range: "7d",
      total: 15,
      previousTotal: 10,
      changePercent: 50,
      today: { uniqueVisitors: 4, desktop: 3, mobileTablet: 1 },
      days: [{ day: "2026-11-22", uniqueVisitors: 4, desktop: 3, mobileTablet: 1 }],
    });

    render(<AdminApp initialSession={session} initialContent={content} />);
    expect(await screen.findByText("+%50")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Analitiği CSV olarak indir" }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:analytics-csv");
  });

  it("renders recent commits on the dashboard and refreshes on click", async () => {
    const commitsSpy = vi.spyOn(adminApi, "commits")
      .mockResolvedValueOnce({
        commits: [
          {
            sha: "a004847617326c3a26cefbfd2db5979fd2dfa662",
            shortSha: "a004847",
            message: "feat(admin): add validated JSON backup import flow",
            author: "Layellie",
            date: "2026-11-23T02:11:00Z",
            url: "https://github.com/Layellie/Layellie.github.io/commit/a004847",
          },
        ],
      })
      .mockResolvedValueOnce({
        commits: [
          {
            sha: "b115958617326c3a26cefbfd2db5979fd2dfa662",
            shortSha: "b115958",
            message: "chore: refreshed commit",
            author: "Layellie",
            date: "2026-11-23T02:15:00Z",
            url: "https://evil.example/commit",
          },
        ],
      });

    render(<AdminApp initialSession={session} initialContent={content} />);
    expect(await screen.findByText("feat(admin): add validated JSON backup import flow")).toBeTruthy();
    expect(screen.getByText("a004847")).toBeTruthy();
    expect(screen.getByRole("link", { name: /GitHub/i }).getAttribute("href")).toBe(
      "https://github.com/Layellie/Layellie.github.io/commit/a004847",
    );

    fireEvent.click(screen.getByRole("button", { name: "Commit geçmişini yenile" }));
    expect(await screen.findByText("chore: refreshed commit")).toBeTruthy();
    expect(commitsSpy).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("link", { name: /^GitHub$/i })).toBeNull();
  });

  it("opens project management without losing existing projects", () => {
    render(<AdminApp initialSession={session} initialContent={content} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Projeler" })[0]);
    expect(screen.getByText("Projelerini kod yazmadan yönet")).toBeTruthy();
    expect(screen.getAllByText("AIO-Hybrid-Clipboard").length).toBeGreaterThan(0);
    expect(screen.getByText("Gerçek kart önizlemesi · TR")).toBeTruthy();
  });

  it("lets admin toggle Discord live presence and professional filter with ID validation", () => {
    render(<AdminApp initialSession={session} initialContent={content} />);

    const presenceSwitch = screen.getByRole("switch", { name: "Discord canlı durum rozeti" });
    const filterSwitch = screen.getByRole("switch", { name: "Profesyonellik filtresi" });
    const idInput = screen.getByLabelText(/Discord User ID/i);

    expect(presenceSwitch.getAttribute("aria-checked")).toBe("false");
    expect(filterSwitch.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(presenceSwitch);
    expect(presenceSwitch.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(/17-20 haneli geçerli bir Discord User ID girilmelidir/i)).toBeTruthy();

    fireEvent.change(idInput, { target: { value: "123456789012345678" } });
    expect(screen.queryByText(/17-20 haneli geçerli bir Discord User ID girilmelidir/i)).toBeNull();

    fireEvent.click(filterSwitch);
    expect(filterSwitch.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(/1 değişiklik/i)).toBeTruthy();
  });
});
