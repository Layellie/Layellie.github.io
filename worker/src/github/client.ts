import type { AppConfig } from "../types";
import { httpError } from "../security/responses";

export const CONTENT_PATHS = {
  site: "src/content/site.json",
  projects: "src/content/projects.json",
  certificates: "src/content/certificates.json",
  skills: "src/content/skills.json",
  visuals: "src/content/visuals.json",
} as const;

type ContentKey = keyof typeof CONTENT_PATHS;

export interface RepositorySnapshot {
  commitSha: string;
  treeSha: string;
  blobShas: Record<string, string>;
  rawFiles: Record<ContentKey, unknown>;
}

export const TOKEN_REVOKE_TIMEOUT_MS = 5_000;

interface GitHubError extends Error {
  status?: number;
  code?: string;
}

export async function githubFetch<T>(config: AppConfig, token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Layellie-Portfolio-Admin",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const retryAfter = response.headers.get("Retry-After");
    const rateRemaining = response.headers.get("X-RateLimit-Remaining");
    const status = response.status === 401 ? 401 : response.status === 403 && rateRemaining === "0" ? 429 : response.status;
    const code = status === 429 ? "GITHUB_QUOTA_EXCEEDED" : status === 409 || status === 422 ? "GITHUB_CONFLICT" : "GITHUB_API_ERROR";
    const message = status === 429
      ? `GitHub API kotası doldu${retryAfter ? `; yaklaşık ${retryAfter} saniye sonra tekrar dene` : ""}.`
      : status === 409 || status === 422
        ? "GitHub dalı yayın sırasında değişti; yerel taslak korunuyor."
        : "GitHub API isteği güvenli biçimde başarısız oldu.";
    throw Object.assign(new Error(message), { status, code }) as GitHubError;
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export async function loadRepositorySnapshot(config: AppConfig, token: string): Promise<RepositorySnapshot> {
  const reference = await githubFetch<{ object: { sha: string } }>(config, token, `/repos/${config.owner}/${config.repository}/git/ref/heads/${encodeURIComponent(config.branch)}`);
  const commit = await githubFetch<{ tree: { sha: string } }>(config, token, `/repos/${config.owner}/${config.repository}/git/commits/${reference.object.sha}`);
  const tree = await githubFetch<{ truncated: boolean; tree: Array<{ path: string; type: string; sha: string }> }>(config, token, `/repos/${config.owner}/${config.repository}/git/trees/${commit.tree.sha}?recursive=1`);
  if (tree.truncated) throw httpError(503, "GITHUB_TREE_TRUNCATED", "Depo ağacı güvenli içerik okuması için fazla büyük.");
  const entries = new Map(tree.tree.filter((entry) => entry.type === "blob").map((entry) => [entry.path, entry.sha]));
  const rawFiles = {} as Record<ContentKey, unknown>;
  const blobShas: Record<string, string> = {};
  for (const [key, path] of Object.entries(CONTENT_PATHS) as Array<[ContentKey, string]>) {
    const sha = entries.get(path);
    if (!sha) throw httpError(503, "CONTENT_FILE_MISSING", `Yönetilen içerik dosyası bulunamadı: ${path}`);
    const blob = await githubFetch<{ content: string; encoding: string }>(config, token, `/repos/${config.owner}/${config.repository}/git/blobs/${sha}`);
    if (blob.encoding !== "base64") throw httpError(503, "CONTENT_ENCODING_INVALID", "GitHub içerik encoding değeri geçersiz.");
    try {
      rawFiles[key] = JSON.parse(decodeBase64Text(blob.content));
    } catch {
      throw httpError(503, "CONTENT_JSON_INVALID", `Uzak JSON doğrulanamadı: ${path}`);
    }
    blobShas[path] = sha;
  }
  return { commitSha: reference.object.sha, treeSha: commit.tree.sha, blobShas, rawFiles };
}

export interface GitChange {
  path: string;
  content: string | Uint8Array;
}

export async function commitChanges(config: AppConfig, token: string, snapshot: RepositorySnapshot, changes: GitChange[]): Promise<{ sha: string; url: string; treeSha: string; blobShas: Record<string, string> }> {
  const treeEntries: Array<{ path: string; mode: "100644"; type: "blob"; sha: string }> = [];
  for (const change of changes) {
    const body = typeof change.content === "string"
      ? { content: change.content, encoding: "utf-8" }
      : { content: encodeBase64(change.content), encoding: "base64" };
    const blob = await githubFetch<{ sha: string }>(config, token, `/repos/${config.owner}/${config.repository}/git/blobs`, { method: "POST", body: JSON.stringify(body) });
    treeEntries.push({ path: change.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const tree = await githubFetch<{ sha: string }>(config, token, `/repos/${config.owner}/${config.repository}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: snapshot.treeSha, tree: treeEntries }),
  });
  const commit = await githubFetch<{ sha: string; html_url: string }>(config, token, `/repos/${config.owner}/${config.repository}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message: "content: update portfolio from admin panel", tree: tree.sha, parents: [snapshot.commitSha] }),
  });
  await githubFetch(config, token, `/repos/${config.owner}/${config.repository}/git/refs/heads/${encodeURIComponent(config.branch)}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  const blobShas = { ...snapshot.blobShas };
  for (const entry of treeEntries) if ((Object.values(CONTENT_PATHS) as string[]).includes(entry.path)) blobShas[entry.path] = entry.sha;
  return { sha: commit.sha, url: commit.html_url, treeSha: tree.sha, blobShas };
}

export async function deploymentForCommit(config: AppConfig, token: string, commit: string): Promise<unknown> {
  if (!/^[a-f0-9]{40}$/i.test(commit)) throw httpError(400, "COMMIT_INVALID", "Commit SHA geçersiz.");
  const workflowPath = ".github/workflows/deploy.yml";
  const result = await githubFetch<{ workflow_runs: Array<{ status: string; conclusion: string | null; html_url: string; name: string; path: string; updated_at: string }> }>(config, token, `/repos/${config.owner}/${config.repository}/actions/workflows/deploy.yml/runs?event=push&head_sha=${commit}&per_page=5`);
  const run = result.workflow_runs.find((candidate) => candidate.path.split("@", 1)[0] === workflowPath);
  return run ? { commit, status: run.status, conclusion: run.conclusion, url: run.html_url, name: run.name, updatedAt: run.updated_at } : { commit, status: "not_found" };
}

export async function revokeToken(config: AppConfig, token: string): Promise<void> {
  const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Response>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error("Token iptal isteği zaman aşımına uğradı."));
    }, TOKEN_REVOKE_TIMEOUT_MS);
  });
  let response: Response;
  try {
    response = await Promise.race([
      fetch(`https://api.github.com/applications/${config.clientId}/token`, {
        method: "DELETE",
        headers: { Accept: "application/vnd.github+json", Authorization: `Basic ${credentials}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "Layellie-Portfolio-Admin", "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token }),
        signal: controller.signal,
      }),
      timeout,
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
  if (!response.ok && response.status !== 404 && response.status !== 401) throw new Error("Token iptal isteği başarısız oldu.");
}

function decodeBase64Text(value: string): string {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let index = 0; index < bytes.length; index += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + 0x8000)));
  }
  return btoa(chunks.join(""));
}
