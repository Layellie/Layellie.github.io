import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sha256 } from "../../worker/src/security/crypto.ts";

let sequence = 0;

async function stateCall(operation, payload) {
  const target = env.ADMIN_STATE.get(env.ADMIN_STATE.idFromName("global-admin-state-v1"));
  const response = await target.fetch("https://state.test/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, payload }),
  });
  expect(response.ok).toBe(true);
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

async function runCallback({ installations, repositories = {} }) {
  sequence += 1;
  const transactionId = `repository-access-${sequence}`;
  const state = `state-${sequence}`;
  await stateCall("oauth.create", {
    id: transactionId,
    stateHash: await sha256(state),
    verifier: `verifier-${sequence}`,
    expiresAt: Date.now() + 60_000,
    rateKey: `repository-access-rate-${sequence}`,
  });

  const calls = [];
  vi.stubGlobal("fetch", vi.fn(async (input, init = {}) => {
    const url = String(input);
    const method = init.method || "GET";
    calls.push({ url, method });
    if (url === "https://github.com/login/oauth/access_token") {
      return jsonResponse({ access_token: `ghu_access_${sequence}`, expires_in: 3600 });
    }
    if (url === "https://api.github.com/user") return jsonResponse({ id: 12345, login: "Layellie" });
    if (url.includes("/user/installations?")) return jsonResponse({ installations });
    const match = url.match(/\/user\/installations\/(\d+)\/repositories/);
    if (match) return jsonResponse({ repositories: repositories[match[1]] || [] });
    if (url.includes("/applications/test-client-id/token") && method === "DELETE") return new Response(null, { status: 204 });
    throw new Error(`Unexpected GitHub test request: ${method} ${url}`);
  }));

  const request = new Request(`https://admin.test/auth/callback?code=code-${sequence}&state=${encodeURIComponent(state)}`, {
    headers: { Cookie: `__Host-layellie-oauth=${transactionId}` },
    redirect: "manual",
  });
  return { response: await exports.default.fetch(request), calls };
}

afterEach(() => vi.unstubAllGlobals());

describe("GitHub App repository authorization", () => {
  it("rejects login when the GitHub App has no visible target-owner installation", async () => {
    const { response, calls } = await runCallback({ installations: [] });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "REPOSITORY_WRITE_ACCESS_REQUIRED" });
    expect(response.headers.getSetCookie().some((cookie) => cookie.startsWith("__Host-layellie-session="))).toBe(false);
    expect(calls.some(({ url }) => url.includes("/repos/Layellie/Layellie.github.io"))).toBe(false);
  });

  it("rejects an installation that is configured for a different repository", async () => {
    const { response } = await runCallback({
      installations: [{ id: 21, account: { login: "Layellie" }, permissions: { contents: "write" }, suspended_at: null }],
      repositories: { 21: [{ full_name: "Layellie/another-repository", permissions: { push: true } }] },
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "REPOSITORY_WRITE_ACCESS_REQUIRED" });
  });

  it("rejects a target-owner installation whose Contents permission is read-only", async () => {
    const { response, calls } = await runCallback({
      installations: [{ id: 22, account: { login: "Layellie" }, permissions: { contents: "read" }, suspended_at: null }],
      repositories: { 22: [{ full_name: "Layellie/Layellie.github.io", permissions: { push: true } }] },
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "REPOSITORY_WRITE_ACCESS_REQUIRED" });
    expect(calls.some(({ url }) => url.includes("/user/installations/22/repositories"))).toBe(false);
  });

  it("creates a session only when installation Contents write and repository push access intersect", async () => {
    const { response, calls } = await runCallback({
      installations: [{ id: 23, account: { login: "layellie" }, permissions: { contents: "write" }, suspended_at: null }],
      repositories: { 23: [{ full_name: "Layellie/Layellie.github.io", permissions: { push: true } }] },
    });
    expect(response.status).toBe(302);
    const sessionCookie = response.headers.getSetCookie().find((cookie) => cookie.startsWith("__Host-layellie-session="));
    expect(sessionCookie).toBeTruthy();
    const sessionResponse = await exports.default.fetch(new Request("https://admin.test/api/session", {
      headers: { Cookie: sessionCookie.split(";", 1)[0] },
    }));
    expect(sessionResponse.status).toBe(200);
    expect(await sessionResponse.json()).toMatchObject({ authenticated: true, user: { id: 12345, login: "Layellie" } });
    expect(calls.some(({ url, method }) => url.startsWith("https://api.github.com/") && ["POST", "PUT", "PATCH"].includes(method))).toBe(false);
  });
});
