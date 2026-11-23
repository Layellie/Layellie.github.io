import { describe, expect, it } from "vitest";
import { CONTENT } from "../../src/content/loadContent.js";
import {
  classifyCertificate,
  filterCertificates,
  summarizeCertificateCategories,
} from "../../src/content/certificateCategories.js";

describe("certificate category classification & filtering", () => {
  it("classifies all 14 real TR and EN certificates consistently", () => {
    const trCategories = summarizeCertificateCategories(CONTENT.tr.certificates.items);
    const enCategories = summarizeCertificateCategories(CONTENT.en.certificates.items);

    const trCounts = Object.fromEntries(trCategories.map((c) => [c.id, c.count]));
    const enCounts = Object.fromEntries(enCategories.map((c) => [c.id, c.count]));

    expect(trCounts).toEqual(enCounts);
    expect(trCounts.all).toBe(14);
    expect(trCounts.software).toBe(5);
    expect(trCounts.ai).toBe(4);
    expect(trCounts.security).toBe(3);
    expect(trCounts.other).toBe(2);
  });

  it("filters certificates by category and returns all items for 'all'", () => {
    const items = CONTENT.tr.certificates.items;
    expect(filterCertificates(items, "all")).toHaveLength(14);
    expect(filterCertificates(items, "security")).toHaveLength(3);
    expect(filterCertificates(items, "ai")).toHaveLength(4);
    expect(filterCertificates(items, "software")).toHaveLength(5);
    expect(filterCertificates(items, "other")).toHaveLength(2);
  });

  it("handles unknown or empty certificates gracefully", () => {
    expect(classifyCertificate(null)).toBe("other");
    expect(classifyCertificate({ title: "Custom Workshop" })).toBe("other");
    expect(classifyCertificate({ title: "Cyber Defense 101" })).toBe("security");
    expect(classifyCertificate({ title: "LLM Prompting" })).toBe("ai");
    expect(classifyCertificate({ title: "C# Fundamentals" })).toBe("software");
  });
});
