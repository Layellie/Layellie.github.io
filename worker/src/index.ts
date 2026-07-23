import type { Env } from "./types";
import { finishGithubAuth, beginGithubAuth } from "./auth/github";
import { authenticate, sessionToken } from "./auth/session";
import { parseContent, preparePublication, readPublicationRequest } from "./content/validation";
import { storeCall } from "./durable/client";
import { AdminSessionStore } from "./durable/AdminSessionStore";
import { commitChanges, deploymentForCommit, loadRepositorySnapshot, revokeToken } from "./github/client";
import { cookies, readCookie } from "./security/cookies";
import { analyticsVisitorHash, randomToken } from "./security/crypto";
import { ConfigurationError, getConfig } from "./security/config";
import { errorResponse, httpError, json } from "./security/responses";

export { AdminSessionStore };

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|bingpreview/i;

function istanbulDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

function deviceCategory(userAgent: string | null): "desktop" | "mobile" | "tablet" {
  if (/ipad|tablet|kindle|silk/i.test(userAgent || "")) return "tablet";
  return /mobi|android|iphone|ipod/i.test(userAgent || "") ? "mobile" : "desktop";
}

function analyticsHeaders(config: ReturnType<typeof getConfig>): HeadersInit {
  return { "Access-Control-Allow-Origin": config.publicSiteOrigin, Vary: "Origin", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "no-store" };
}

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith("/auth/")) return env.ASSETS.fetch(request);
    try {
      const config = getConfig(env);
      if (url.pathname === "/api/analytics/visit" && request.method === "OPTIONS") {
        if (request.headers.get("Origin") !== config.publicSiteOrigin) throw httpError(403, "ORIGIN_REJECTED", "İstek origin doğrulamasından geçemedi.");
        return new Response(null, { status: 204, headers: analyticsHeaders(config) });
      }
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { Allow: "GET, POST, OPTIONS" } });
      if (url.pathname === "/api/analytics/visit" && request.method === "POST") {
        if (request.headers.get("Origin") !== config.publicSiteOrigin) throw httpError(403, "ORIGIN_REJECTED", "İstek origin doğrulamasından geçemedi.");
        if (!request.headers.get("Content-Type")?.toLocaleLowerCase("en-US").startsWith("application/json")) throw httpError(415, "CONTENT_TYPE_INVALID", "JSON içerik türü gerekli.");
        const body = await request.json().catch(() => null) as { visitorId?: unknown; schemaVersion?: unknown } | null;
        if (!body || Object.keys(body).length !== 2 || body.schemaVersion !== 1 || typeof body.visitorId !== "string" || body.visitorId.length !== 36 || !UUID_V4.test(body.visitorId)) throw httpError(400, "ANALYTICS_REQUEST_INVALID", "Ziyaret kaydı geçersiz.");
        if (!BOT_UA.test(request.headers.get("User-Agent") || "")) {
          const visitorHash = await analyticsVisitorHash(body.visitorId, istanbulDay(), config.sessionSecret);
          await storeCall(env, "rate.check", { key: `analytics:${visitorHash.slice(0, 24)}`, limit: 12, periodMs: 60_000 });
          await storeCall(env, "analytics.visit", { day: istanbulDay(), visitorHash, deviceCategory: deviceCategory(request.headers.get("User-Agent")) });
        }
        return new Response(null, { status: 204, headers: analyticsHeaders(config) });
      }
      if (url.pathname === "/auth/github" && request.method === "GET") return beginGithubAuth(request, env, config);
      if (url.pathname === "/auth/callback" && request.method === "GET") return await finishGithubAuth(request, env, config);
      if (url.pathname === "/auth/logout" && request.method === "POST") {
        const session = await authenticate(request, env, config, { requireCsrf: true, rateLimit: false });
        const token = await sessionToken(session, config);
        await storeCall(env, "session.delete", { id: session.id });
        const revocation = revokeToken(config, token).catch(() => {});
        if (ctx) ctx.waitUntil(revocation);
        else void revocation;
        return json({ loggedOut: true }, 200, { "Set-Cookie": cookies.clearSession() });
      }
      if (url.pathname === "/api/session" && request.method === "GET") {
        const session = await authenticate(request, env, config);
        return json({ authenticated: true, user: { id: session.userId, login: session.login }, csrfToken: session.csrfToken, expiresAt: session.expiresAt, publicSiteOrigin: config.publicSiteOrigin });
      }
      if (url.pathname === "/api/admin/analytics" && request.method === "GET") {
        const session = await authenticate(request, env, config);
        await storeCall(env, "rate.check", { key: `analytics-admin:${session.id}`, limit: 12, periodMs: 60_000 });
        const range = url.searchParams.get("range") || "7d";
        if (range !== "7d" && range !== "30d") throw httpError(400, "ANALYTICS_RANGE_INVALID", "Analiz aralığı geçersiz.");
        return json(await storeCall(env, "analytics.summary", { range, day: istanbulDay() }));
      }
      if (url.pathname === "/api/content" && request.method === "GET") {
        const session = await authenticate(request, env, config);
        const snapshot = await loadRepositorySnapshot(config, await sessionToken(session, config));
        return json({ files: parseContent(snapshot.rawFiles), base: { commitSha: snapshot.commitSha, blobShas: snapshot.blobShas } });
      }
      if (url.pathname === "/api/validate" && request.method === "POST") {
        const session = await authenticate(request, env, config, { requireCsrf: true });
        await storeCall(env, "rate.check", { key: `validate:${session.id}`, limit: 10, periodMs: 60_000 });
        const publication = await readPublicationRequest(request);
        const token = await sessionToken(session, config);
        const snapshot = await loadRepositorySnapshot(config, token);
        const prepared = await preparePublication(publication.payload, publication.form, snapshot);
        return json({ valid: true, changedPaths: prepared.changes.length });
      }
      if (url.pathname === "/api/publish" && request.method === "POST") {
        const session = await authenticate(request, env, config, { requireCsrf: true });
        const publication = await readPublicationRequest(request);
        const lockOwner = randomToken(24);
        await storeCall(env, "publish.acquire", { sessionId: session.id, owner: lockOwner });
        try {
          const token = await sessionToken(session, config);
          const snapshot = await loadRepositorySnapshot(config, token);
          const prepared = await preparePublication(publication.payload, publication.form, snapshot);
          const commit = await commitChanges(config, token, snapshot, prepared.changes);
          return json({ files: prepared.files, commit: { sha: commit.sha, url: commit.url }, base: { commitSha: commit.sha, blobShas: commit.blobShas } });
        } finally {
          await storeCall(env, "publish.release", { owner: lockOwner }).catch(() => {});
        }
      }
      if (url.pathname === "/api/deployments" && request.method === "GET") {
        const session = await authenticate(request, env, config);
        await storeCall(env, "rate.check", { key: `deployment:${session.id}`, limit: 1, periodMs: 30_000 });
        return json(await deploymentForCommit(config, await sessionToken(session, config), url.searchParams.get("commit") || ""));
      }
      throw httpError(404, "NOT_FOUND", "API yolu bulunamadı.");
    } catch (error) {
      let sessionCookie: string | null = null;
      if (!(error instanceof ConfigurationError) && (error as { status?: number }).status === 401) {
        const sessionId = readCookie(request, cookies.sessionName);
        if (sessionId) await storeCall(env, "session.delete", { id: sessionId }).catch(() => {});
        sessionCookie = cookies.clearSession();
      }
      return errorResponse(error, sessionCookie ? { "Set-Cookie": sessionCookie } : {});
    }
  },
} satisfies ExportedHandler<Env>;
