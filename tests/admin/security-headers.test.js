import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readPublicSiteOrigin, renderAdminSecurityHeaders } from "../../build/admin-security-headers.js";

function directive(policy, name) {
  return policy.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name} `));
}

describe("admin production security headers", () => {
  it("builds img-src from the same PUBLIC_SITE_ORIGIN used by the Worker", async () => {
    const template = await readFile(path.resolve("admin/public/_headers"), "utf8");
    const publicOrigin = await readPublicSiteOrigin();
    const output = renderAdminSecurityHeaders(template, publicOrigin);
    const csp = output.match(/Content-Security-Policy: (.+)/)?.[1];

    expect(publicOrigin).toBe("https://layellie.github.io");
    expect(directive(csp, "img-src")).toBe("img-src 'self' data: blob: https://layellie.github.io");
    expect(directive(csp, "connect-src")).toBe("connect-src 'self'");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(output).not.toContain("{{PUBLIC_SITE_ORIGIN}}");
    expect(directive(csp, "img-src")).not.toMatch(/(?:^|\s)(?:\*|https:)(?:\s|$)/);
  });

  it("allows a configured public origin distinct from the admin origin without widening CSP", async () => {
    const template = await readFile(path.resolve("admin/public/_headers"), "utf8");
    const adminOrigin = "https://admin.example.workers.dev";
    const publicOrigin = "https://portfolio.example.com";
    const output = renderAdminSecurityHeaders(template, publicOrigin);
    const imgSrc = directive(output.match(/Content-Security-Policy: (.+)/)?.[1], "img-src");

    expect(publicOrigin).not.toBe(adminOrigin);
    expect(imgSrc).toContain(publicOrigin);
    expect(imgSrc).not.toContain(adminOrigin);
    expect(imgSrc).toContain("'self'");
    expect(imgSrc).toContain("data:");
    expect(imgSrc).toContain("blob:");
  });

  it.each(["*", "https:", "http://portfolio.example.com", "https://portfolio.example.com/path"])("rejects unsafe public origin %s", async (origin) => {
    const template = await readFile(path.resolve("admin/public/_headers"), "utf8");
    expect(() => renderAdminSecurityHeaders(template, origin)).toThrow();
  });
});
