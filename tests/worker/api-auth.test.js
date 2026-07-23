import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { istanbulDay } from "../../src/analytics/visitor.js";
import { portfolioFiles } from "../../src/content/loadContent.js";
import { encryptToken, sha256 } from "../../worker/src/security/crypto.ts";
import { TOKEN_REVOKE_TIMEOUT_MS } from "../../worker/src/github/client.ts";
import worker from "../../worker/src/index.ts";

const contentKeys = ["site", "projects", "certificates", "skills", "visuals"];

async function stateCall(operation, payload) {
  const target = env.ADMIN_STATE.get(env.ADMIN_STATE.idFromName("global-admin-state-v1"));
  const response = await target.fetch("https://state.test/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, payload }),
  });
  expect(response.ok).toBe(true);
  return response;
}

async function stateResponse(operation, payload) {
  const target = env.ADMIN_STATE.get(env.ADMIN_STATE.idFromName("global-admin-state-v1"));
  return target.fetch("https://state.test/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, payload }),
  });
}

async function createSession(id, { userId = 12345, login = "Layellie", csrf = `csrf-${id}`, tokenCipher } = {}) {
  await stateCall("session.create", {
    id,
    userId,
    login,
    tokenCipher: tokenCipher || await encryptToken("ghu_test_token", env.SESSION_SECRET),
    csrfHash: await sha256(csrf),
    csrfToken: csrf,
    expiresAt: Date.now() + 60_000,
  });
  return { id, csrf };
}

function sessionRequest(path, session, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cookie", `__Host-layellie-session=${session.id}`);
  return new Request(`https://admin.test${path}`, { ...init, headers });
}

function executionContext() {
  const pending = [];
  return {
    pending,
    context: {
      waitUntil(promise) { pending.push(promise); },
      passThroughOnException() {},
    },
  };
}

function encodeBase64Json(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function publicationForm() {
  const files = structuredClone(portfolioFiles);
  files.projects.items[0].tr.name = "Validated project change";
  const blobShas = Object.fromEntries(contentKeys.map((key) => [`src/content/${key}.json`, `blob-${key}`]));
  const form = new FormData();
  form.set("payload", JSON.stringify({
    files,
    base: { commitSha: "a".repeat(40), blobShas },
    media: [],
  }));
  return form;
}

function mockRepositorySnapshot() {
  vi.stubGlobal("fetch", vi.fn(async (input) => {
    const url = String(input);
    if (url.includes("/git/ref/heads/main")) return Response.json({ object: { sha: "a".repeat(40) } });
    if (url.includes(`/git/commits/${"a".repeat(40)}`)) return Response.json({ tree: { sha: "b".repeat(40) } });
    if (url.includes(`/git/trees/${"b".repeat(40)}?recursive=1`)) {
      return Response.json({ truncated: false, tree: contentKeys.map((key) => ({ path: `src/content/${key}.json`, type: "blob", sha: `blob-${key}` })) });
    }
    const blobKey = contentKeys.find((key) => url.endsWith(`/git/blobs/blob-${key}`));
    if (blobKey) return Response.json({ encoding: "base64", content: encodeBase64Json(portfolioFiles[blobKey]) });
    throw new Error(`Unexpected GitHub test request: ${url}`);
  }));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Worker authentication boundary", () => {
  it("records a browser visit idempotently without exposing analytics data", async () => {
    const visitorId = "11111111-1111-4111-8111-111111111111";
    const request = () => new Request("https://admin.test/api/analytics/visit", { method: "POST", headers: { Origin: "https://layellie.github.io", "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" }, body: JSON.stringify({ visitorId, schemaVersion: 1 }) });
    const first = await exports.default.fetch(request());
    const second = await exports.default.fetch(request());
    expect(first.status).toBe(204);
    expect(await first.text()).toBe("");
    expect(second.status).toBe(204);
    expect(first.headers.get("Cache-Control")).toBe("no-store");
    expect(first.headers.get("Access-Control-Allow-Origin")).toBe("https://layellie.github.io");
  });

  it("counts a POSTed visit in the admin summary read from the same Durable Object and stays idempotent", async () => {
    const session = await createSession("analytics-visibility-owner");
    const readToday = async () => {
      const response = await exports.default.fetch(sessionRequest("/api/admin/analytics?range=7d", session));
      expect(response.status).toBe(200);
      return (await response.json()).today.uniqueVisitors;
    };
    const visitorId = crypto.randomUUID();
    const post = () => exports.default.fetch(new Request("https://admin.test/api/analytics/visit", { method: "POST", headers: { Origin: "https://layellie.github.io", "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" }, body: JSON.stringify({ visitorId, schemaVersion: 1 }) }));

    const before = await readToday();
    expect((await post()).status).toBe(204);
    expect(await readToday()).toBe(before + 1);
    // A second POST from the same browser/day must not inflate the counter.
    expect((await post()).status).toBe(204);
    expect(await readToday()).toBe(before + 1);
  });

  it("retains the 30-day dashboard window under the 35-day retention cutoff", async () => {
    const session = await createSession("retention-window-owner");
    const today = istanbulDay();
    const within = istanbulDay(new Date(Date.now() - 29 * 86_400_000));
    const stale = istanbulDay(new Date(Date.now() - 40 * 86_400_000));
    await stateCall("analytics.visit", { day: today, visitorHash: "r".repeat(40), deviceCategory: "desktop" });
    await stateCall("analytics.visit", { day: within, visitorHash: "s".repeat(40), deviceCategory: "mobile" });
    await stateCall("analytics.visit", { day: stale, visitorHash: "t".repeat(40), deviceCategory: "desktop" });
    const summary = (await (await stateResponse("analytics.summary", { range: "30d", day: today })).json()).value;
    // A 29-day-old visit survives cleanup and shows in the dashboard window.
    expect(summary.days.some((entry) => entry.day === within)).toBe(true);
    // A 40-day-old visit is beyond retention and never counted.
    expect(summary.days.some((entry) => entry.day === stale)).toBe(false);
    expect(summary.total).toBeGreaterThanOrEqual(2);
    // Reading the summary requires the owner session (kept intact).
    const authed = await exports.default.fetch(sessionRequest("/api/admin/analytics?range=30d", session));
    expect(authed.status).toBe(200);
  });

  it("rejects malformed analytics requests and does not accept foreign origins", async () => {
    const badBody = await exports.default.fetch(new Request("https://admin.test/api/analytics/visit", { method: "POST", headers: { Origin: "https://layellie.github.io", "Content-Type": "application/json" }, body: JSON.stringify({ visitorId: "not-a-uuid", schemaVersion: 1 }) }));
    expect(badBody.status).toBe(400);
    const foreign = await exports.default.fetch(new Request("https://admin.test/api/analytics/visit", { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: JSON.stringify({ visitorId: "11111111-1111-4111-8111-111111111111", schemaVersion: 1 }) }));
    expect(foreign.status).toBe(403);
  });

  it("protects admin analytics behind the existing owner session", async () => {
    expect((await exports.default.fetch(new Request("https://admin.test/api/admin/analytics?range=7d"))).status).toBe(401);
    const session = await createSession("analytics-owner");
    const response = await exports.default.fetch(sessionRequest("/api/admin/analytics?range=7d", session));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ range: "7d", today: { uniqueVisitors: expect.any(Number) } });
  });
  it("returns malformed origin configuration as CONFIGURATION_ERROR without leaking its value", async () => {
    const invalidValue = "not-a-url-sensitive-value";
    const response = await worker.fetch(new Request("https://admin.test/api/session"), { ...env, ADMIN_ORIGIN: invalidValue });
    const payload = await response.json();
    expect(response.status).toBe(503);
    expect(payload).toMatchObject({ code: "CONFIGURATION_ERROR", message: expect.stringContaining("ADMIN_ORIGIN") });
    expect(JSON.stringify(payload)).not.toContain(invalidValue);
  });

  it("returns session data only for the immutable Layellie id and login", async () => {
    const allowed = await createSession("allowed-session");
    const response = await exports.default.fetch(sessionRequest("/api/session", allowed));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ authenticated: true, user: { id: 12345, login: "Layellie" }, publicSiteOrigin: "https://layellie.github.io" });

    const rejected = await createSession("rejected-session", { userId: 99999, login: "Layellie" });
    const denied = await exports.default.fetch(sessionRequest("/api/session", rejected));
    expect(denied.status).toBe(403);
    expect((await denied.json()).code).toBe("USER_NOT_ALLOWED");
  });

  it("requires both exact Origin and session-bound CSRF for validation", async () => {
    const session = await createSession("csrf-session");
    mockRepositorySnapshot();
    const valid = await exports.default.fetch(sessionRequest("/api/validate", session, {
      method: "POST",
      headers: { Origin: "https://admin.test", "X-CSRF-Token": session.csrf },
      body: publicationForm(),
    }));
    expect(valid.status).toBe(200);

    const wrongOrigin = await exports.default.fetch(sessionRequest("/api/validate", session, {
      method: "POST",
      headers: { Origin: "https://evil.example", "X-CSRF-Token": session.csrf },
      body: publicationForm(),
    }));
    expect(wrongOrigin.status).toBe(403);

    const wrongToken = await exports.default.fetch(sessionRequest("/api/validate", session, {
      method: "POST",
      headers: { Origin: "https://admin.test", "X-CSRF-Token": "wrong" },
      body: publicationForm(),
    }));
    expect(wrongToken.status).toBe(403);
  });

  it("invalidates and removes a session encrypted with a rotated SESSION_SECRET", async () => {
    const tokenCipher = await encryptToken("ghu_old_token", "old-session-secret-that-is-longer-than-32-bytes");
    const session = await createSession("rotated-secret-session", { tokenCipher });
    const response = await exports.default.fetch(sessionRequest("/api/session", session));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "SESSION_INVALID" });
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect((await stateResponse("session.get", { id: session.id })).status).toBe(401);
  });

  it("clears a corrupted session before any protected GitHub request can run", async () => {
    const session = await createSession("corrupt-session", { tokenCipher: "corrupt-ciphertext" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await exports.default.fetch(sessionRequest("/api/content", session));
    const body = await response.text();
    expect(response.status).toBe(401);
    expect(body).toContain("SESSION_INVALID");
    expect(body).not.toContain("corrupt-ciphertext");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await stateResponse("session.get", { id: session.id })).status).toBe(401);
  });

  it("clears a corrupted session even when logout cannot decrypt its token", async () => {
    const session = await createSession("corrupt-logout-session", { tokenCipher: "{\"v\":1,\"iv\":\"broken\",\"ciphertext\":\"broken\"}" });
    const response = await exports.default.fetch(sessionRequest("/auth/logout", session, {
      method: "POST",
      headers: { Origin: "https://admin.test", "X-CSRF-Token": session.csrf },
    }));
    expect(response.status).toBe(401);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect((await stateResponse("session.get", { id: session.id })).status).toBe(401);
  });

  it("deletes the local session and clears the cookie before a pending revoke times out", async () => {
    vi.useFakeTimers();
    const session = await createSession("revoke-timeout-session");
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const { context, pending } = executionContext();
    const response = await worker.fetch(sessionRequest("/auth/logout", session, {
      method: "POST",
      headers: { Origin: "https://admin.test", "X-CSRF-Token": session.csrf },
    }), env, context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ loggedOut: true });
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect((await stateResponse("session.get", { id: session.id })).status).toBe(401);
    const nextSession = await worker.fetch(sessionRequest("/api/session", session), env);
    expect(nextSession.status).toBe(401);
    expect((await nextSession.json()).authenticated).not.toBe(true);
    expect(pending).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(TOKEN_REVOKE_TIMEOUT_MS);
    await pending[0];
  });

  it.each([
    ["network error", () => Promise.reject(new Error("network unavailable"))],
    ["GitHub 5xx", () => Promise.resolve(new Response("upstream failure", { status: 500 }))],
  ])("keeps local logout successful after a revoke %s", async (_label, revokeResult) => {
    const session = await createSession(`revoke-failure-${_label.replace(/\W+/g, "-")}`);
    vi.stubGlobal("fetch", vi.fn(revokeResult));
    const { context, pending } = executionContext();
    const response = await worker.fetch(sessionRequest("/auth/logout", session, {
      method: "POST",
      headers: { Origin: "https://admin.test", "X-CSRF-Token": session.csrf },
    }), env, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect((await stateResponse("session.get", { id: session.id })).status).toBe(401);
    await expect(pending[0]).resolves.toBeUndefined();
  });

  it("still revokes the GitHub token after local logout succeeds", async () => {
    const session = await createSession("revoke-success-session");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { context, pending } = executionContext();
    const response = await worker.fetch(sessionRequest("/auth/logout", session, {
      method: "POST",
      headers: { Origin: "https://admin.test", "X-CSRF-Token": session.csrf },
    }), env, context);

    expect(response.status).toBe(200);
    expect((await stateResponse("session.get", { id: session.id })).status).toBe(401);
    await pending[0];
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.github.com/applications/test-client-id/token");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
  });

  it("lets logout delete the session after the authenticated API limit is exhausted", async () => {
    const session = await createSession("rate-limited-logout-session");
    for (let index = 0; index < 60; index += 1) {
      const response = await exports.default.fetch(sessionRequest("/api/session", session));
      expect(response.status).toBe(200);
    }

    const limited = await exports.default.fetch(sessionRequest("/api/session", session));
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ code: "RATE_LIMITED" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("upstream failure", { status: 500 })));
    const logout = await exports.default.fetch(sessionRequest("/auth/logout", session, {
      method: "POST",
      headers: { Origin: "https://admin.test", "X-CSRF-Token": session.csrf },
    }));
    expect(logout.status).toBe(200);
    expect(logout.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect((await stateResponse("session.get", { id: session.id })).status).toBe(401);
  });

  it("keeps Origin and CSRF checks on rate-limit-exempt logout", async () => {
    const session = await createSession("logout-csrf-session");
    const response = await exports.default.fetch(sessionRequest("/auth/logout", session, {
      method: "POST",
      headers: { Origin: "https://evil.example", "X-CSRF-Token": session.csrf },
    }));
    expect(response.status).toBe(403);
    expect((await stateResponse("session.get", { id: session.id })).status).toBe(200);
  });
});
