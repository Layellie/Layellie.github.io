// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";

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
  clearDraft: vi.fn().mockResolvedValue(undefined),
}));

import AdminApp from "../../src/admin/AdminApp.jsx";
import { adminApi } from "../../src/admin/api/client.js";
import { clearDraft } from "../../src/admin/draft/storage.js";

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

const session = { user: { login: "Layellie" }, csrfToken: "logout-csrf" };
const content = { files: portfolioFiles, base: { commitSha: "a".repeat(40), blobShas: {} } };

function logoutError(status) {
  const error = new Error(status ? `HTTP ${status}` : "Network failure");
  if (status) error.status = status;
  return error;
}

async function renderAndLogout() {
  const user = userEvent.setup();
  render(<AdminApp initialSession={session} initialContent={content} />);
  await user.click(screen.getByRole("button", { name: "Güvenli çıkış" }));
  return user;
}

describe("AdminApp secure logout", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("clears the authenticated UI and local draft after a successful logout", async () => {
    adminApi.logout.mockResolvedValue({ loggedOut: true });
    await renderAndLogout();
    expect(await screen.findByRole("link", { name: "GitHub App ile giriş yap" })).toBeTruthy();
    expect(clearDraft).toHaveBeenCalledOnce();
  });

  it.each([
    ["network failure", undefined],
    ["429", 429],
    ["500", 500],
  ])("keeps the authenticated UI visible after %s", async (_label, status) => {
    adminApi.logout.mockRejectedValue(logoutError(status));
    await renderAndLogout();
    expect(await screen.findByText("Çıkış başarısız")).toBeTruthy();
    expect(screen.getByText("Güvenli çıkış tamamlanamadı. Tekrar deneyin.")).toBeTruthy();
    expect(screen.getByText("Portfolio Control")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Güvenli çıkış" })).toBeTruthy();
    expect(clearDraft).not.toHaveBeenCalled();
  });

  it("completes local logout when the server reliably reports an invalid session", async () => {
    adminApi.logout.mockRejectedValue(logoutError(401));
    await renderAndLogout();
    expect(await screen.findByRole("link", { name: "GitHub App ile giriş yap" })).toBeTruthy();
    expect(clearDraft).toHaveBeenCalledOnce();
  });

  it("allows retry after a failed logout and completes when retry succeeds", async () => {
    adminApi.logout.mockRejectedValueOnce(logoutError(500)).mockResolvedValueOnce({ loggedOut: true });
    const user = await renderAndLogout();
    await screen.findByText("Çıkış başarısız");
    await user.click(screen.getByRole("button", { name: "Güvenli çıkış" }));
    expect(await screen.findByRole("link", { name: "GitHub App ile giriş yap" })).toBeTruthy();
    expect(adminApi.logout).toHaveBeenCalledTimes(2);
    expect(clearDraft).toHaveBeenCalledOnce();
  });

  it("preserves the edited in-memory draft when logout fails", async () => {
    adminApi.logout.mockRejectedValue(logoutError());
    const user = userEvent.setup();
    render(<AdminApp initialSession={session} initialContent={content} />);
    await user.click(screen.getAllByRole("button", { name: "Projeler" })[0]);
    const name = screen.getByRole("textbox", { name: "Proje adı" });
    await user.clear(name);
    await user.type(name, "Korunan taslak");
    await user.click(screen.getByRole("button", { name: "Güvenli çıkış" }));
    await screen.findByText("Çıkış başarısız");
    expect(screen.getByRole("textbox", { name: "Proje adı" }).value).toBe("Korunan taslak");
    expect(clearDraft).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Güvenli çıkış" }).disabled).toBe(false));
  });
});
