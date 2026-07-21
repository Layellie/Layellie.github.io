const OWNER = "[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?";
const REPOSITORY = "[A-Za-z0-9._-]{1,100}";
const CANONICAL_REPOSITORY_URL = new RegExp(`^https://github\\.com/(${OWNER})/(${REPOSITORY})$`);

export function parseGithubRepositoryUrl(value) {
  if (typeof value !== "string") return null;
  const match = CANONICAL_REPOSITORY_URL.exec(value);
  if (!match || match[1].includes("--") || match[2] === "." || match[2] === "..") return null;
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.hostname !== "github.com" || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) return null;
  return { owner: match[1], repository: match[2], url: value };
}

export function githubRepositoryName(value) {
  return parseGithubRepositoryUrl(value)?.repository || null;
}

export function selectMoreGithubRepositories(repositories, projects, limit = 6) {
  const featured = new Set(projects.map((project) => githubRepositoryName(project.github)?.toLocaleLowerCase("en-US")).filter(Boolean));
  return repositories
    .filter((repository) => {
      const name = repository.name.toLocaleLowerCase("en-US");
      return !repository.fork && !repository.archived && !name.endsWith(".github.io") && !featured.has(name);
    })
    .sort((left, right) => right.stargazers_count - left.stargazers_count || new Date(right.pushed_at) - new Date(left.pushed_at))
    .slice(0, limit);
}
