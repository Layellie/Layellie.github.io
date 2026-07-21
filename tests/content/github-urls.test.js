import { describe, expect, it } from "vitest";
import { githubRepositoryName, parseGithubRepositoryUrl, selectMoreGithubRepositories } from "../../src/content/githubUrls.js";

describe("canonical GitHub repository URLs", () => {
  it("accepts an exact owner/repository URL and extracts its repository", () => {
    expect(parseGithubRepositoryUrl("https://github.com/owner/repo")).toEqual({ owner: "owner", repository: "repo", url: "https://github.com/owner/repo" });
    expect(githubRepositoryName("https://github.com/Layellie/EyeHealth")).toBe("EyeHealth");
  });

  it.each([
    "https://github.com/owner/repo/",
    "https://github.com/owner/repo?tab=readme",
    "https://github.com/owner/repo#readme",
    "https://github.com/owner/repo/issues",
    "https://github.com/owner%2Frepo/project",
    "https://github.com/owner/repo%2Fissues",
    "https://github.com/owner",
    "https://github.com//repo",
    "https://user:pass@github.com/owner/repo",
    "https://github.com/invalid_owner/repo",
    "https://github.com/invalid--owner/repo",
    "https://github.com/owner/repo name",
  ])("rejects a non-canonical repository URL: %s", (value) => {
    expect(parseGithubRepositoryUrl(value)).toBeNull();
  });

  it("does not repeat a featured repository in the more-repositories result", () => {
    const projects = [{ github: "https://github.com/Layellie/EyeHealth" }];
    const repositories = [
      { name: "EyeHealth", fork: false, archived: false, stargazers_count: 20, pushed_at: "2026-01-01" },
      { name: "AnotherRepo", fork: false, archived: false, stargazers_count: 5, pushed_at: "2026-01-02" },
    ];
    expect(selectMoreGithubRepositories(repositories, projects).map((repository) => repository.name)).toEqual(["AnotherRepo"]);
  });
});
