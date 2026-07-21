// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminApp from "../../src/admin/AdminApp.jsx";
import { adminApi } from "../../src/admin/api/client.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("admin API connection failures", () => {
  it("rejects Vite HTML fallback as an unavailable API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Vite fallback</html>", { status: 200, headers: { "Content-Type": "text/html" } })));
    await expect(adminApi.session()).rejects.toMatchObject({ code: "API_UNREACHABLE", message: expect.stringContaining("Yerel Worker") });
  });

  it("shows a visible connection error when the Worker is offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("connect ECONNREFUSED")));
    render(<AdminApp />);
    expect(await screen.findByText("Admin API’ye bağlanılamadı")).toBeTruthy();
    expect(screen.getByText(/Yerel Worker'ın çalıştığını doğrula/)).toBeTruthy();
  });

  it("shows the configuration setup state for a Worker CONFIGURATION_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "CONFIGURATION_ERROR", message: "ADMIN_ORIGIN geçerli bir URL origin biçiminde olmalı." }, { status: 503 })));
    render(<AdminApp />);
    expect(await screen.findByText("Admin henüz yapılandırılmadı")).toBeTruthy();
    expect(screen.getByText(/ADMIN_ORIGIN geçerli bir URL origin/)).toBeTruthy();
  });
});
