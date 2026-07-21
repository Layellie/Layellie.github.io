import type { AppConfig, Env } from "../types";

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new ConfigurationError(`${name} yapılandırılmadı.`);
  return value.trim();
}

export function parseOrigin(value: string | undefined, name: string, allowLocal = false): string {
  const input = required(value, name);
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new ConfigurationError(`${name} geçerli bir URL origin biçiminde olmalı.`);
  }
  const local = allowLocal && parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
  const originOnlyInput = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]+\/?$/i.test(input) && !input.includes("\\");
  if (!originOnlyInput || (!local && parsed.protocol !== "https:") || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new ConfigurationError(`${name} yalnız temiz bir HTTPS origin${allowLocal ? " veya izin verilen localhost HTTP origin'i" : ""} olmalı.`);
  }
  return parsed.origin;
}

export class ConfigurationError extends Error {
  code = "CONFIGURATION_ERROR";
}

export function getConfig(env: Env): AppConfig {
  const allowedUser = required(env.GITHUB_ALLOWED_USER, "GITHUB_ALLOWED_USER");
  if (allowedUser.toLocaleLowerCase("en-US") !== "layellie") throw new ConfigurationError("GITHUB_ALLOWED_USER güvenli varsayılanla eşleşmiyor.");
  const allowedUserId = Number(required(env.GITHUB_ALLOWED_USER_ID, "GITHUB_ALLOWED_USER_ID"));
  if (!Number.isSafeInteger(allowedUserId) || allowedUserId <= 0) throw new ConfigurationError("GITHUB_ALLOWED_USER_ID geçersiz.");
  const sessionSecret = required(env.SESSION_SECRET, "SESSION_SECRET");
  if (new TextEncoder().encode(sessionSecret).byteLength < 32) throw new ConfigurationError("SESSION_SECRET en az 32 bayt olmalı.");
  const owner = required(env.GITHUB_OWNER, "GITHUB_OWNER");
  const repository = required(env.GITHUB_REPOSITORY, "GITHUB_REPOSITORY");
  const branch = required(env.GITHUB_DEFAULT_BRANCH, "GITHUB_DEFAULT_BRANCH");
  if (
    !/^[A-Za-z0-9_.-]+$/.test(owner) ||
    !/^[A-Za-z0-9_.-]+$/.test(repository) ||
    !/^[A-Za-z0-9._/-]+$/.test(branch) ||
    branch.includes("..") || branch.includes("//") || branch.startsWith("/") || branch.endsWith("/")
  ) {
    throw new ConfigurationError("GitHub depo veya dal yapılandırması geçersiz.");
  }
  if (owner.toLocaleLowerCase("en-US") !== "layellie" || repository.toLocaleLowerCase("en-US") !== "layellie.github.io") {
    throw new ConfigurationError("Worker yalnız Layellie/Layellie.github.io deposuna yazabilir.");
  }
  return {
    clientId: required(env.GITHUB_CLIENT_ID, "GITHUB_CLIENT_ID"),
    clientSecret: required(env.GITHUB_CLIENT_SECRET, "GITHUB_CLIENT_SECRET"),
    owner,
    repository,
    branch,
    allowedUser,
    allowedUserId,
    sessionSecret,
    adminOrigin: parseOrigin(env.ADMIN_ORIGIN, "ADMIN_ORIGIN", true),
    publicSiteOrigin: parseOrigin(env.PUBLIC_SITE_ORIGIN, "PUBLIC_SITE_ORIGIN"),
    devOrigin: env.ADMIN_DEV_ORIGIN ? parseOrigin(env.ADMIN_DEV_ORIGIN, "ADMIN_DEV_ORIGIN", true) : undefined,
  };
}
