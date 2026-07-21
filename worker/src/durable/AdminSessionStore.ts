import type { Env } from "../types";

type Input = { operation?: string; payload?: Record<string, unknown> };

export class AdminSessionStore {
  constructor(private readonly state: DurableObjectState, _env: Env) {
    this.state.blockConcurrencyWhile(async () => {
      this.state.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS oauth_transactions (
          id TEXT PRIMARY KEY,
          state_hash TEXT NOT NULL,
          verifier TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          consumed INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          login TEXT NOT NULL,
          token_cipher TEXT NOT NULL,
          csrf_hash TEXT NOT NULL,
          csrf_token TEXT NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS rate_limits (
          key TEXT NOT NULL,
          window_start INTEGER NOT NULL,
          count INTEGER NOT NULL,
          PRIMARY KEY (key, window_start)
        );
        CREATE TABLE IF NOT EXISTS publish_locks (
          name TEXT PRIMARY KEY,
          owner TEXT NOT NULL,
          expires_at INTEGER NOT NULL
        );
      `);
    });
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return this.result(null, 405, "METHOD_NOT_ALLOWED", "Yöntem desteklenmiyor.");
    try {
      const { operation, payload = {} } = await request.json<Input>();
      const now = Date.now();
      this.cleanup(now);
      switch (operation) {
        case "oauth.create": return this.oauthCreate(payload, now);
        case "oauth.consume": return this.oauthConsume(payload, now);
        case "session.create": return this.sessionCreate(payload);
        case "session.get": return this.sessionGet(payload, now);
        case "session.delete": return this.sessionDelete(payload);
        case "rate.check": return this.rateCheck(payload, now);
        case "publish.acquire": return this.publishAcquire(payload, now);
        case "publish.release": return this.publishRelease(payload);
        default: return this.result(null, 400, "UNKNOWN_OPERATION", "Durum işlemi tanınmıyor.");
      }
    } catch {
      return this.result(null, 400, "STATE_REQUEST_INVALID", "Durum isteği geçersiz.");
    }
  }

  private oauthCreate(payload: Record<string, unknown>, now: number): Response {
    const { id, stateHash, verifier, rateKey } = this.strings(payload, ["id", "stateHash", "verifier", "rateKey"]);
    const expiry = this.number(payload.expiresAt);
    return this.state.storage.transactionSync(() => {
      const limited = this.enforceRate(`oauth:${rateKey}`, 10, 60_000, now);
      if (limited) return limited;
      this.state.storage.sql.exec("INSERT INTO oauth_transactions (id,state_hash,verifier,expires_at,consumed) VALUES (?,?,?,?,0)", id, stateHash, verifier, Math.min(expiry, now + 600_000));
      return this.result({ created: true });
    });
  }

  private oauthConsume(payload: Record<string, unknown>, now: number): Response {
    const { id, stateHash } = this.strings(payload, ["id", "stateHash"]);
    return this.state.storage.transactionSync(() => {
      const rows = this.state.storage.sql.exec<{ verifier: string }>("SELECT verifier FROM oauth_transactions WHERE id=? AND state_hash=? AND consumed=0 AND expires_at>?", id, stateHash, now).toArray();
      if (rows.length !== 1) return this.result(null, 400, "OAUTH_STATE_INVALID", "OAuth state geçersiz, süresi dolmuş veya daha önce kullanılmış.");
      this.state.storage.sql.exec("UPDATE oauth_transactions SET consumed=1 WHERE id=?", id);
      return this.result({ verifier: rows[0].verifier });
    });
  }

  private sessionCreate(payload: Record<string, unknown>): Response {
    const { id, login, tokenCipher, csrfHash, csrfToken } = this.strings(payload, ["id", "login", "tokenCipher", "csrfHash", "csrfToken"]);
    const userId = this.number(payload.userId);
    const expiresAt = this.number(payload.expiresAt);
    this.state.storage.sql.exec("INSERT INTO sessions (id,user_id,login,token_cipher,csrf_hash,csrf_token,expires_at) VALUES (?,?,?,?,?,?,?)", id, userId, login, tokenCipher, csrfHash, csrfToken, expiresAt);
    return this.result({ created: true });
  }

  private sessionGet(payload: Record<string, unknown>, now: number): Response {
    const { id } = this.strings(payload, ["id"]);
    const rows = this.state.storage.sql.exec<{ id: string; user_id: number; login: string; token_cipher: string; csrf_hash: string; csrf_token: string; expires_at: number }>("SELECT id,user_id,login,token_cipher,csrf_hash,csrf_token,expires_at FROM sessions WHERE id=? AND expires_at>?", id, now).toArray();
    if (rows.length !== 1) return this.result(null, 401, "SESSION_INVALID", "Oturum bulunamadı veya süresi doldu.");
    const row = rows[0];
    return this.result({ id: row.id, userId: row.user_id, login: row.login, tokenCipher: row.token_cipher, csrfHash: row.csrf_hash, csrfToken: row.csrf_token, expiresAt: row.expires_at });
  }

  private sessionDelete(payload: Record<string, unknown>): Response {
    const { id } = this.strings(payload, ["id"]);
    this.state.storage.sql.exec("DELETE FROM sessions WHERE id=?", id);
    return this.result({ deleted: true });
  }

  private rateCheck(payload: Record<string, unknown>, now: number): Response {
    const { key } = this.strings(payload, ["key"]);
    const limit = Math.min(1000, Math.max(1, this.number(payload.limit)));
    const periodMs = Math.min(3_600_000, Math.max(1_000, this.number(payload.periodMs)));
    return this.state.storage.transactionSync(() => this.enforceRate(key, limit, periodMs, now) || this.result({ allowed: true }));
  }

  private publishAcquire(payload: Record<string, unknown>, now: number): Response {
    const { sessionId, owner } = this.strings(payload, ["sessionId", "owner"]);
    return this.state.storage.transactionSync(() => {
      const limited = this.enforceRate(`publish:${sessionId}`, 3, 60_000, now);
      if (limited) return limited;
      const lock = this.state.storage.sql.exec<{ owner: string; expires_at: number }>("SELECT owner,expires_at FROM publish_locks WHERE name='portfolio-publish'").toArray()[0];
      if (lock && lock.expires_at > now) return this.result(null, 423, "PUBLISH_LOCKED", "Başka bir yayın işlemi devam ediyor.");
      this.state.storage.sql.exec("INSERT INTO publish_locks (name,owner,expires_at) VALUES ('portfolio-publish',?,?) ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at", owner, now + 120_000);
      return this.result({ owner, expiresAt: now + 120_000 });
    });
  }

  private publishRelease(payload: Record<string, unknown>): Response {
    const { owner } = this.strings(payload, ["owner"]);
    this.state.storage.sql.exec("DELETE FROM publish_locks WHERE name='portfolio-publish' AND owner=?", owner);
    return this.result({ released: true });
  }

  private enforceRate(key: string, limit: number, periodMs: number, now: number): Response | null {
    const windowStart = Math.floor(now / periodMs) * periodMs;
    const row = this.state.storage.sql.exec<{ count: number }>("INSERT INTO rate_limits (key,window_start,count) VALUES (?,?,1) ON CONFLICT(key,window_start) DO UPDATE SET count=count+1 RETURNING count", key, windowStart).one();
    if (row.count > limit) return this.result(null, 429, "RATE_LIMITED", "İstek sınırı aşıldı; daha sonra tekrar dene.", Math.ceil((windowStart + periodMs - now) / 1000));
    return null;
  }

  private cleanup(now: number): void {
    this.state.storage.sql.exec("DELETE FROM oauth_transactions WHERE expires_at<?", now);
    this.state.storage.sql.exec("DELETE FROM sessions WHERE expires_at<?", now);
    this.state.storage.sql.exec("DELETE FROM publish_locks WHERE expires_at<?", now);
    this.state.storage.sql.exec("DELETE FROM rate_limits WHERE window_start<?", now - 3_600_000);
  }

  private strings(payload: Record<string, unknown>, keys: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of keys) {
      if (typeof payload[key] !== "string" || !payload[key]) throw new Error("invalid");
      result[key] = payload[key] as string;
    }
    return result;
  }

  private number(value: unknown): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("invalid");
    return value;
  }

  private result(value: unknown, status = 200, code?: string, message?: string, retryAfter?: number): Response {
    return new Response(JSON.stringify(status < 400 ? { ok: true, value } : { ok: false, code, message, retryAfter }), { status, headers: { "Content-Type": "application/json" } });
  }
}
