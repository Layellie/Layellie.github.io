import type { AppConfig, Env, SessionRecord } from "../types";
import { storeCall } from "../durable/client";
import { cookies, readCookie } from "../security/cookies";
import { decryptToken, sha256 } from "../security/crypto";
import { assertOrigin, httpError } from "../security/responses";

export interface AuthenticatedSession extends SessionRecord {
  accessToken: string;
}

interface AuthenticationOptions {
  requireCsrf?: boolean;
  rateLimit?: boolean;
}

export async function authenticate(
  request: Request,
  env: Env,
  config: AppConfig,
  { requireCsrf = false, rateLimit = true }: AuthenticationOptions = {},
): Promise<AuthenticatedSession> {
  const id = readCookie(request, cookies.sessionName);
  if (!id) throw httpError(401, "SESSION_REQUIRED", "Güvenli GitHub oturumu gerekli.");
  const session = await storeCall<SessionRecord>(env, "session.get", { id });
  if (session.userId !== config.allowedUserId || session.login.toLocaleLowerCase("en-US") !== config.allowedUser.toLocaleLowerCase("en-US")) {
    await storeCall(env, "session.delete", { id });
    throw httpError(403, "USER_NOT_ALLOWED", "Bu GitHub hesabı yönetim paneline yetkili değil.");
  }
  let accessToken: string;
  try {
    accessToken = await decryptToken(session.tokenCipher, config.sessionSecret);
  } catch {
    await storeCall(env, "session.delete", { id }).catch(() => {});
    throw httpError(401, "SESSION_INVALID", "Oturum geçersiz veya şifreleme anahtarı değişmiş; yeniden giriş yap.");
  }
  if (rateLimit) await storeCall(env, "rate.check", { key: `api:${session.id}`, limit: 60, periodMs: 60_000 });
  if (requireCsrf) {
    assertOrigin(request, config);
    const token = request.headers.get("X-CSRF-Token") || "";
    if (!token || await sha256(token) !== session.csrfHash) throw httpError(403, "CSRF_REJECTED", "CSRF doğrulaması başarısız oldu.");
  }
  return { ...session, accessToken };
}

export async function sessionToken(session: SessionRecord & { accessToken?: string }, config: AppConfig): Promise<string> {
  if (session.accessToken) return session.accessToken;
  try {
    return await decryptToken(session.tokenCipher, config.sessionSecret);
  } catch {
    throw httpError(401, "SESSION_INVALID", "Oturum geçersiz veya şifreleme anahtarı değişmiş; yeniden giriş yap.");
  }
}
