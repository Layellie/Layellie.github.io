// @vitest-environment jsdom
import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CertificateCard } from "../../src/App.jsx";
import IconPicker from "../../src/admin/components/IconPicker.jsx";
import { SAFE_ICONS, SAFE_ICON_IDS, SafeIcon } from "../../src/components/project-visuals/iconRegistry.jsx";
import { ICON_IDS } from "../../src/content/schemas.js";

describe("shared skill icon registry", () => {
  it("offers only icons that the public SafeIcon renderer can render", () => {
    const { container } = render(<IconPicker value={SAFE_ICON_IDS[0]} onChange={() => {}} />);
    const pickerValues = [...container.querySelectorAll("option")].map((option) => option.value);
    expect(pickerValues).toEqual(SAFE_ICON_IDS);
    expect(ICON_IDS).toEqual(SAFE_ICON_IDS);
    expect(Object.keys(SAFE_ICONS)).toEqual(SAFE_ICON_IDS);
    for (const icon of pickerValues) expect(SAFE_ICONS[icon]).toBeTypeOf("object");
  });

  it.each([
    ["BellRing", "lucide-bell-ring"],
    ["FileText", "lucide-file-text"],
  ])("renders the selected %s icon on a public certificate card", (icon, expectedClass) => {
    const { container } = render(<CertificateCard cert={{ icon, file: "/sertifikalar/test.pdf", title: "Test", issuer: "Issuer", date: "2026-07-19", code: "TEST", skill: "Skill" }} labels={{ verified: "Verified", validates: "Validates", view: "View" }} />);
    const renderedIcon = container.querySelector("a > div:first-child > div:first-child svg");
    expect(renderedIcon?.classList.contains(expectedClass)).toBe(true);
    expect(renderedIcon?.classList.contains("lucide-award")).toBe(false);
  });

  it("falls back to Award for an invalid legacy certificate icon", () => {
    const { container } = render(<CertificateCard cert={{ icon: "UnknownLegacyIcon", file: "/sertifikalar/test.pdf", title: "Test", issuer: "Issuer", date: "2026-07-19", code: "TEST", skill: "Skill" }} labels={{ verified: "Verified", validates: "Validates", view: "View" }} />);
    const renderedIcon = container.querySelector("a > div:first-child > div:first-child svg");
    expect(renderedIcon?.classList.contains("lucide-award")).toBe(true);
  });

  it("renders a safe fallback for an unexpected public skill icon", () => {
    const { container } = render(<SafeIcon name="UnknownFutureIcon" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
