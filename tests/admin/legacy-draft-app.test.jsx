// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import { createDraftRecord } from "../../src/admin/draft/storage.js";
import { createProject } from "../../src/admin/data/model.js";

vi.mock("../../src/admin/api/client.js", () => ({
  adminApi: {
    content: vi.fn(),
    session: vi.fn(),
    validate: vi.fn(),
    publish: vi.fn(),
    deployment: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("../../src/admin/draft/storage.js", async (importOriginal) => ({
  ...(await importOriginal()),
  loadDraft: vi.fn(),
  clearDraft: vi.fn(),
}));

import AdminApp from "../../src/admin/AdminApp.jsx";
import { adminApi } from "../../src/admin/api/client.js";
import { clearDraft, loadDraft } from "../../src/admin/draft/storage.js";

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

describe("legacy admin draft safety", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    const remoteFiles = structuredClone(portfolioFiles);
    adminApi.content.mockResolvedValue({ files: remoteFiles, base: { commitSha: "b".repeat(40), blobShas: {} } });
    adminApi.validate.mockResolvedValue({ valid: true });
    clearDraft.mockResolvedValue(undefined);
    const localFiles = structuredClone(portfolioFiles);
    localFiles.projects.items[0].tr.name = "Legacy local change";
    loadDraft.mockResolvedValue({ files: localFiles, uploads: [], savedAt: "2026-07-18T12:00:00.000Z" });
  });

  it("blocks validation and publish until a legacy draft is reloaded from a safe remote base", async () => {
    render(<AdminApp initialSession={{ user: { login: "Layellie" }, csrfToken: "csrf" }} />);
    fireEvent.click(await screen.findByRole("button", { name: "Taslağı geri yükle" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Doğrula & yayınla" })[0]);

    expect(screen.getByText("Güvenli base snapshot eksik")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Değişiklikleri doğrula" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "GitHub’a gönder ve yayınla" }).disabled).toBe(true);
    expect(adminApi.validate).not.toHaveBeenCalled();
    expect(adminApi.publish).not.toHaveBeenCalled();
  });

  it("keeps publish enabled after successful validation when only draft warnings exist", async () => {
    const localFiles = structuredClone(portfolioFiles);
    localFiles.projects.items.push(createProject(localFiles.projects.items));
    localFiles.certificates.items[0].tr.title = "Unrelated certificate change";
    const base = { commitSha: "b".repeat(40), blobShas: {} };
    loadDraft.mockResolvedValue(createDraftRecord({ files: localFiles, baseFiles: portfolioFiles, base, uploads: [] }));
    adminApi.validate.mockResolvedValue({ valid: true });

    render(<AdminApp initialSession={{ user: { login: "Layellie" }, csrfToken: "csrf" }} />);
    fireEvent.click(await screen.findByRole("button", { name: "Taslağı geri yükle" }));
    await screen.findByText("Yeni Proje");
    fireEvent.click(screen.getAllByRole("button", { name: "Doğrula & yayınla" })[0]);
    await screen.findByRole("heading", { name: "Doğrula, karşılaştır, yayınla" });
    const validateButton = screen.getByRole("button", { name: "Değişiklikleri doğrula" });
    expect(screen.getAllByRole("status").map((item) => item.textContent)).toEqual(expect.arrayContaining([expect.stringMatching(/eksik çeviri\/alan uyarısı/)]));
    expect(validateButton.disabled).toBe(false);
    fireEvent.click(validateButton);
    await waitFor(() => expect(screen.getByRole("button", { name: "GitHub’a gönder ve yayınla" }).disabled).toBe(false));
  });

  async function editAndOpenPublish() {
    render(<AdminApp initialSession={{ user: { login: "Layellie" }, csrfToken: "csrf" }} />);
    await screen.findByRole("button", { name: "Taslağı geri yükle" });
    fireEvent.click(screen.getAllByRole("button", { name: "Projeler" })[0]);
    const projectName = await screen.findByRole("textbox", { name: "Proje adı" });
    fireEvent.change(projectName, { target: { value: "Published remote change" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Doğrula & yayınla" })[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Değişiklikleri doğrula" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "GitHub’a gönder ve yayınla" }).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "GitHub’a gönder ve yayınla" }));
    fireEvent.click(await screen.findByRole("button", { name: "Commit oluştur" }));
  }

  it("clears persistent and in-memory saved drafts after a successful publish", async () => {
    adminApi.publish.mockImplementation(async ({ files }) => ({
      files,
      base: { commitSha: "c".repeat(40), blobShas: {} },
      commit: { sha: "c".repeat(40) },
    }));

    await editAndOpenPublish();

    await waitFor(() => expect(adminApi.publish).toHaveBeenCalledOnce());
    expect(clearDraft).toHaveBeenCalledOnce();
    expect(screen.queryByText("Bu tarayıcıda yayınlanmamış taslak bulundu")).toBeNull();
    expect(screen.queryByRole("button", { name: "Taslağı geri yükle" })).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "Projeler" })[0]);
    expect(screen.getByRole("textbox", { name: "Proje adı" }).value).toBe("Published remote change");
    expect(screen.queryByDisplayValue("Legacy local change")).toBeNull();
  });

  it("preserves the saved draft and restore path when publish fails", async () => {
    adminApi.publish.mockRejectedValue(new Error("GitHub unavailable"));

    await editAndOpenPublish();

    await screen.findByText("İşlem tamamlanamadı");
    expect(clearDraft).not.toHaveBeenCalled();
    const restoreButton = screen.getByRole("button", { name: "Taslağı geri yükle" });
    fireEvent.click(restoreButton);
    fireEvent.click(screen.getAllByRole("button", { name: "Projeler" })[0]);
    expect(screen.getByRole("textbox", { name: "Proje adı" }).value).toBe("Legacy local change");
  });
});
