const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function base64UrlEncode(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

export function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  const result = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) result[index] = binary.charCodeAt(index);
  return result;
}

export function randomToken(bytes = 32): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(value: string): Promise<string> {
  return base64UrlEncode(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function pkceChallenge(verifier: string): Promise<string> {
  return sha256(verifier);
}

async function deriveSessionKey(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("layellie-portfolio-admin/session-token/v1"),
      info: encoder.encode("github-user-access-token/aes-gcm"),
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptToken(token: string, secret: string): Promise<string> {
  const key = await deriveSessionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const additionalData = encoder.encode("layellie-admin-token:v1");
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData }, key, encoder.encode(token));
  return JSON.stringify({ v: 1, iv: base64UrlEncode(iv), ciphertext: base64UrlEncode(ciphertext) });
}

export async function decryptToken(payload: string, secret: string): Promise<string> {
  const parsed = JSON.parse(payload) as { v?: number; iv?: string; ciphertext?: string };
  if (parsed.v !== 1 || !parsed.iv || !parsed.ciphertext) throw new Error("Şifreli session verisi geçersiz.");
  const key = await deriveSessionKey(secret);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlDecode(parsed.iv), additionalData: encoder.encode("layellie-admin-token:v1") },
    key,
    base64UrlDecode(parsed.ciphertext),
  );
  return decoder.decode(plaintext);
}
