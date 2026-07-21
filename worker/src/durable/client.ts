import type { Env } from "../types";
import { httpError } from "../security/responses";

export async function storeCall<T>(env: Env, operation: string, payload: Record<string, unknown>): Promise<T> {
  const id = env.ADMIN_STATE.idFromName("global-admin-state-v1");
  const response = await env.ADMIN_STATE.get(id).fetch("https://admin-state.internal/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, payload }),
  });
  const result = await response.json() as { ok?: boolean; value?: T; code?: string; message?: string; retryAfter?: number };
  if (!response.ok || !result.ok) {
    const error = httpError(response.status || 500, result.code || "STATE_ERROR", result.message || "Güvenli durum işlemi başarısız oldu.");
    if (result.retryAfter) Object.assign(error, { details: { retryAfter: result.retryAfter } });
    throw error;
  }
  return result.value as T;
}
