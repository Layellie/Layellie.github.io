// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TerminalGames from "../../src/components/TerminalGames.jsx";

afterEach(() => {
  cleanup();
  window.localStorage?.clear?.();
});

describe("TerminalGames", () => {
  it("renders snake mode, supports pause, and exits with summary on Escape", () => {
    const onExit = vi.fn();
    render(<TerminalGames mode="snake" lang="tr" onExit={onExit} />);
    expect(screen.getByText(/snake\.exe/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Duraklat" }));
    expect(screen.getByText("DURAKLATILDI")).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onExit).toHaveBeenCalledOnce();
    expect(onExit.mock.calls[0][0]).toMatch(/skor: 0/i);
  });

  it("completes a typing snippet and reports accuracy and WPM on exit", () => {
    const onExit = vi.fn();
    render(<TerminalGames mode="typing" lang="tr" onExit={onExit} />);
    expect(screen.getByText(/typing-bench/i)).toBeTruthy();

    const input = screen.getByPlaceholderText("Yazmaya başla…");
    const snippet = "NtSetTimerResolution(5000, true, out uint currentResolution);";
    fireEvent.change(input, { target: { value: snippet } });

    expect(screen.getByText(/Tamamlandı/i)).toBeTruthy();
    expect(screen.getAllByText(/%100/).length).toBeGreaterThan(0);

    fireEvent.keyDown(input, { key: "Escape" });
    expect(onExit).toHaveBeenCalledOnce();
    expect(onExit.mock.calls[0][0]).toMatch(/WPM/);
  });
});
