import { describe, expect, it } from "vitest";
import { renderAdminRedirect } from "../../build/admin-redirect.js";

describe("GitHub Pages admin redirect", () => {
  it("fails safely when the Worker origin is not configured", () => {
    const html = renderAdminRedirect("");
    expect(html).toContain("henüz yapılandırılmadı");
    expect(html).not.toContain("location.replace");
  });

  it("accepts only a clean HTTPS origin", () => {
    expect(renderAdminRedirect("https://admin.example.workers.dev")).toContain('location.replace("https://admin.example.workers.dev")');
    expect(renderAdminRedirect("javascript:alert(1)")).not.toContain("location.replace");
    expect(renderAdminRedirect("https://admin.example.workers.dev/unsafe")).not.toContain("location.replace");
  });
});
