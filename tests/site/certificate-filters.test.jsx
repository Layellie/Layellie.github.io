// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../../src/App.jsx";

beforeAll(() => {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = () => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
  if (typeof globalThis.IntersectionObserver === "undefined") {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

afterEach(() => {
  cleanup();
  window.localStorage?.clear?.();
});

describe("Certificates category filter UI", () => {
  it("renders category filter pills, filters visible cards, and resets on cross-link event", () => {
    const { container } = render(<App />);

    const allButton = screen.getByRole("button", { name: "Tümü (14)" });
    const securityButton = screen.getByRole("button", { name: "Siber Güvenlik (3)" });
    const aiButton = screen.getByRole("button", { name: "Yapay Zekâ (4)" });

    expect(allButton.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll("[data-cert-code]").length).toBe(14);

    fireEvent.click(securityButton);
    expect(securityButton.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll("[data-cert-code]").length).toBe(3);

    fireEvent.click(aiButton);
    expect(aiButton.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll("[data-cert-code]").length).toBe(4);

    fireEvent(window, new CustomEvent("reset-cert-filter"));
    expect(allButton.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll("[data-cert-code]").length).toBe(14);
  });
});
