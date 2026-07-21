import type { AppConfig } from "../types";

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function appendHeaders(target: Headers, input: HeadersInit): void {
  if (Array.isArray(input)) {
    for (const [key, value] of input) target.append(key, value);
    return;
  }
  new Headers(input).forEach((value, key) => target.append(key, value));
}

export function json(payload: unknown, status = 200, headers: HeadersInit = {}): Response {
  const responseHeaders = new Headers(SECURITY_HEADERS);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  appendHeaders(responseHeaders, headers);
  return new Response(JSON.stringify(payload), { status, headers: responseHeaders });
}

export function redirect(location: string, headers: HeadersInit = {}): Response {
  const responseHeaders = new Headers(SECURITY_HEADERS);
  responseHeaders.set("Location", location);
  appendHeaders(responseHeaders, headers);
  return new Response(null, { status: 302, headers: responseHeaders });
}

export function errorResponse(error: unknown, headers: HeadersInit = {}): Response {
  const value = error as { status?: number; code?: string; message?: string; details?: unknown };
  const status = Number.isInteger(value?.status) ? value.status! : value?.code === "CONFIGURATION_ERROR" ? 503 : 500;
  const code = value?.code || (status === 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED");
  const safeMessage = status === 500 ? "Beklenmeyen bir hata oluştu; hassas ayrıntılar gizlendi." : value?.message || "İşlem tamamlanamadı.";
  return json({ code, message: safeMessage, ...(value?.details ? { details: value.details } : {}) }, status, headers);
}

export function assertOrigin(request: Request, config: AppConfig): void {
  const requestOrigin = request.headers.get("Origin");
  if (!requestOrigin || ![config.adminOrigin, config.devOrigin].filter(Boolean).includes(requestOrigin)) {
    throw httpError(403, "ORIGIN_REJECTED", "İstek origin doğrulamasından geçemedi.");
  }
}

export function httpError(status: number, code: string, message: string, details?: unknown): Error {
  return Object.assign(new Error(message), { status, code, details });
}
