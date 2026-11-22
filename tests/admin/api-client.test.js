// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminApi } from "../../src/admin/api/client.js";

afterEach(() => vi.unstubAllGlobals());

describe("admin API client logout", () => {
  it("returns the real successful logout result with the CSRF-protected request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ loggedOut: true }, {
      status: 200,
      headers: { "Set-Cookie": "__Host-layellie-session=; Max-Age=0" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(adminApi.logout("logout-csrf")).resolves.toEqual({ loggedOut: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("/auth/logout");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", credentials: "same-origin", cache: "no-store" });
    expect(fetchMock.mock.calls[0][1].headers.get("X-CSRF-Token")).toBe("logout-csrf");
  });

  it("requests latest deployment without a commit param and specific commit when supplied", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ status: "completed", conclusion: "success" }))
      .mockResolvedValueOnce(Response.json({ status: "in_progress", conclusion: null }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(adminApi.deployment()).resolves.toEqual({ status: "completed", conclusion: "success" });
    await expect(adminApi.deployment("a".repeat(40))).resolves.toEqual({ status: "in_progress", conclusion: null });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/deployments");
    expect(fetchMock.mock.calls[1][0]).toBe(`/api/deployments?commit=${"a".repeat(40)}`);
  });

  it("requests recent commits from /api/commits", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ commits: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(adminApi.commits()).resolves.toEqual({ commits: [] });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/commits");
  });
});
