import type { Env } from "./types";
import { finishGithubAuth, beginGithubAuth } from "./auth/github";
import { authenticate, sessionToken } from "./auth/session";
import { parseContent, preparePublication, readPublicationRequest } from "./content/validation";
import { storeCall } from "./durable/client";
import { AdminSessionStore } from "./durable/AdminSessionStore";
import { commitChanges, deploymentForCommit, loadRepositorySnapshot, revokeToken } from "./github/client";
import { cookies, readCookie } from "./security/cookies";
import { randomToken } from "./security/crypto";
import { ConfigurationError, getConfig } from "./security/config";
import { errorResponse, httpError, json } from "./security/responses";

export { AdminSessionStore };

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith("/auth/")) return env.ASSETS.fetch(request);
    try {
      const config = getConfig(env);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { Allow: "GET, POST, OPTIONS" } });
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
