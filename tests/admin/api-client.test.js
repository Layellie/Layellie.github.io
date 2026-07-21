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
});
