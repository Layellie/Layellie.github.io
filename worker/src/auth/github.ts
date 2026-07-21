import type { AppConfig, Env } from "../types";
import { storeCall } from "../durable/client";
import { githubFetch, revokeToken } from "../github/client";
import { cookies, readCookie } from "../security/cookies";
import { encryptToken, pkceChallenge, randomToken, sha256 } from "../security/crypto";
import { httpError, redirect } from "../security/responses";

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

export function isAllowedGithubUser(user: { id: number; login: string }, config: AppConfig): boolean {
  return user.id === config.allowedUserId && user.login.toLocaleLowerCase("en-US") === config.allowedUser.toLocaleLowerCase("en-US");
}

interface UserInstallation {
  id: number;
  account?: { login?: string };
  permissions?: { contents?: string };
  suspended_at?: string | null;
}

interface InstallationRepository {
  full_name?: string;
  permissions?: { push?: boolean };
}

export async function assertRepositoryWriteAccess(config: AppConfig, token: string): Promise<void> {
  const result = await githubFetch<{ installations?: UserInstallation[] }>(config, token, "/user/installations?per_page=100");
  const owner = config.owner.toLocaleLowerCase("en-US");
  const target = `${config.owner}/${config.repository}`.toLocaleLowerCase("en-US");
  const installations = (result.installations || []).filter((installation) =>
    installation.account?.login?.toLocaleLowerCase("en-US") === owner &&
    installation.permissions?.contents === "write" &&
    !installation.suspended_at,
  );
  for (const installation of installations) {
    for (let page = 1; page <= 10; page += 1) {
      const repositories = await githubFetch<{ repositories?: InstallationRepository[] }>(config, token, `/user/installations/${installation.id}/repositories?per_page=100&page=${page}`);
      const items = repositories.repositories || [];
      const repository = items.find((item) => item.full_name?.toLocaleLowerCase("en-US") === target);
      if (repository) {
        if (repository.permissions?.push === true) return;
        throw httpError(403, "REPOSITORY_WRITE_ACCESS_REQUIRED", "GitHub App hedef depoda Contents: Read and write yetkisine sahip değil.");
      }
      if (items.length < 100) break;
    }
  }
  throw httpError(403, "REPOSITORY_WRITE_ACCESS_REQUIRED", "GitHub App hedef Layellie/Layellie.github.io deposuna yazma yetkisiyle kurulmamış.");
}

export async function beginGithubAuth(request: Request, env: Env, config: AppConfig): Promise<Response> {
  const transactionId = randomToken(24);
  const state = randomToken(32);
  const verifier = randomToken(64);
  const clientAddress = request.headers.get("CF-Connecting-IP") || "unknown";
  const rateKey = await sha256(`login:${clientAddress}`);
  await storeCall(env, "oauth.create", {
    id: transactionId,
    stateHash: await sha256(state),
    verifier,
    expiresAt: Date.now() + 600_000,
    rateKey,
  });
  const callback = `${config.adminOrigin}/auth/callback`;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: callback,
    state,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: "S256",
  });
  return redirect(`https://github.com/login/oauth/authorize?${params}`, { "Set-Cookie": cookies.oauth(transactionId) });
}

export async function finishGithubAuth(request: Request, env: Env, config: AppConfig): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const transactionId = readCookie(request, cookies.oauthName);
  if (!code || !state || !transactionId) throw httpError(400, "OAUTH_CALLBACK_INVALID", "OAuth callback parametreleri eksik.");
  const transaction = await storeCall<{ verifier: string }>(env, "oauth.consume", { id: transactionId, stateHash: await sha256(state) });
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Layellie-Portfolio-Admin" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: `${config.adminOrigin}/auth/callback`,
      code_verifier: transaction.verifier,
    }),
  });
  const tokenResult = await response.json() as TokenResponse;
  if (!response.ok || !tokenResult.access_token || tokenResult.error) throw httpError(401, "OAUTH_EXCHANGE_FAILED", "GitHub OAuth token değişimi başarısız oldu.");
  const token = tokenResult.access_token;
  try {
    const user = await githubFetch<{ id: number; login: string }>(config, token, "/user");
    const allowed = isAllowedGithubUser(user, config);
    if (!allowed) {
      await revokeToken(config, token).catch(() => {});
      throw httpError(403, "USER_NOT_ALLOWED", "Bu GitHub hesabı yönetim paneline yetkili değil.");
    }
    await assertRepositoryWriteAccess(config, token);
    const sessionId = randomToken(32);
    const csrfToken = randomToken(32);
    const maxSessionMs = 8 * 60 * 60 * 1000;
    const tokenMs = tokenResult.expires_in ? Math.max(60_000, tokenResult.expires_in * 1000 - 60_000) : maxSessionMs;
    const expiresAt = Date.now() + Math.min(maxSessionMs, tokenMs);
    await storeCall(env, "session.create", {
      id: sessionId,
      userId: user.id,
      login: user.login,
      tokenCipher: await encryptToken(token, config.sessionSecret),
      csrfHash: await sha256(csrfToken),
      csrfToken,
      expiresAt,
    });
    return redirect(config.adminOrigin, [
      ["Set-Cookie", cookies.session(sessionId, Math.floor((expiresAt - Date.now()) / 1000))],
      ["Set-Cookie", cookies.clearOauth()],
    ]);
  } catch (error) {
    if ((error as { code?: string }).code !== "USER_NOT_ALLOWED") await revokeToken(config, token).catch(() => {});
    throw error;
  }
}
