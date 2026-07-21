import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

function stub(name) {
  return env.ADMIN_STATE.get(env.ADMIN_STATE.idFromName(name));
}

async function call(target, operation, payload) {
  const response = await target.fetch("https://state.test/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, payload }),
  });
  return { response, body: await response.json() };
}

describe("AdminSessionStore", () => {
  it("consumes OAuth state exactly once", async () => {
    const target = stub("oauth-once");
    const expiresAt = Date.now() + 60_000;
    expect((await call(target, "oauth.create", { id: "tx", stateHash: "hash", verifier: "verifier", expiresAt, rateKey: "client" })).response.status).toBe(200);
    const first = await call(target, "oauth.consume", { id: "tx", stateHash: "hash" });
    expect(first.response.status).toBe(200);
    expect(first.body.value.verifier).toBe("verifier");
    expect((await call(target, "oauth.consume", { id: "tx", stateHash: "hash" })).response.status).toBe(400);
  });

  it("enforces exact rate limits in SQLite", async () => {
    const target = stub("exact-rate");
    expect((await call(target, "rate.check", { key: "session", limit: 2, periodMs: 60_000 })).response.status).toBe(200);
    expect((await call(target, "rate.check", { key: "session", limit: 2, periodMs: 60_000 })).response.status).toBe(200);
    const limited = await call(target, "rate.check", { key: "session", limit: 2, periodMs: 60_000 });
    expect(limited.response.status).toBe(429);
    expect(limited.body.code).toBe("RATE_LIMITED");
  });

  it("allows only one concurrent publisher and releases by owner", async () => {
    const target = stub("publish-lock");
    expect((await call(target, "publish.acquire", { sessionId: "one", owner: "owner-a" })).response.status).toBe(200);
    expect((await call(target, "publish.acquire", { sessionId: "two", owner: "owner-b" })).response.status).toBe(423);
    await call(target, "publish.release", { owner: "owner-a" });
    expect((await call(target, "publish.acquire", { sessionId: "two", owner: "owner-b" })).response.status).toBe(200);
  });
});
