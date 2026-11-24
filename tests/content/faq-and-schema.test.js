import { describe, expect, it } from "vitest";
import { FAQ_CONTENT } from "../../src/content/faq.js";
import { buildContentView } from "../../src/content/contentView.js";
import {
  renderInitialShellHtml,
  renderLlmsTxt,
  renderStructuredData,
} from "../../build/prerender-shell.js";
import site from "../../src/content/site.json";
import projects from "../../src/content/projects.json";
import certificates from "../../src/content/certificates.json";
import skills from "../../src/content/skills.json";
import visuals from "../../src/content/visuals.json";

const view = buildContentView(
  { site, projects, certificates, skills, visuals },
  { includeVisual: false },
);

describe("FAQ content and structured data", () => {
  it("keeps Turkish and English FAQ entries aligned without private contact data", () => {
    expect(FAQ_CONTENT.tr.items.length).toBeGreaterThanOrEqual(3);
    expect(FAQ_CONTENT.en.items.length).toBe(FAQ_CONTENT.tr.items.length);

    for (const locale of ["tr", "en"]) {
      for (const item of FAQ_CONTENT[locale].items) {
        expect(item.q.trim().length).toBeGreaterThan(10);
        expect(item.a.trim().length).toBeGreaterThan(20);
        expect(item.a).not.toMatch(/\+90|05\d{2}/);
      }
    }
  });

  it("emits FAQPage JSON-LD matching the default rendered TR FAQ items", () => {
    const raw = renderStructuredData(
      { identity: view.identity, tr: view.content.tr, en: view.content.en },
      "2026-11-23",
    );
    const parsed = JSON.parse(raw);
    const faqNode = parsed["@graph"].find((node) => node["@type"] === "FAQPage");

    expect(faqNode).toBeDefined();
    expect(faqNode.mainEntity).toHaveLength(FAQ_CONTENT.tr.items.length);
    expect(faqNode.mainEntity[0]).toEqual({
      "@type": "Question",
      name: FAQ_CONTENT.tr.items[0].q,
      acceptedAnswer: {
        "@type": "Answer",
        text: FAQ_CONTENT.tr.items[0].a,
      },
    });
  });

  it("includes the FAQ section and enriched project descriptions in llms.txt", () => {
    const llms = renderLlmsTxt({
      identity: view.identity,
      tr: view.content.tr,
      en: view.content.en,
    });

    expect(llms).toContain("## Frequently Asked Questions");
    expect(llms).toContain(FAQ_CONTENT.en.items[0].q);
    expect(llms).toContain("NtSetTimerResolution");
    expect(llms).toContain("SHA-256");
  });

  it("prerenders the Hero LCP banner card and synced mobile Hero spacing to prevent CLS", () => {
    const shell = renderInitialShellHtml({
      identity: view.identity,
      tr: view.content.tr,
      discordPresence: view.discordPresence,
    });

    expect(shell).toContain('aria-label="Discord canlı profil kartı"');
    expect(shell).toContain('src="/media/profile/banner/layellie-banner.webp"');
    expect(shell).toContain('fetchpriority="high"');
    expect(shell).toContain('width="324" height="108"');
    expect(shell).toContain('mt-2.5 text-sm leading-relaxed text-muted sm:text-base md:mt-3 md:text-lg');
  });
});
