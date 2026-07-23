// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import { parsePortfolioFiles } from "../../src/content/schemas.js";
import AboutEditor from "../../src/admin/editors/AboutEditor.jsx";

function renderEditor() {
  let latest = structuredClone(portfolioFiles);
  function Harness() {
    const [site, setSite] = useState(() => structuredClone(portfolioFiles.site));
    latest.site = site;
    return <AboutEditor site={site} onChange={setSite} />;
  }
  render(<Harness />);
  return () => latest.site;
}

afterEach(cleanup);

describe("AboutEditor", () => {
  it("loads the canonical about content and switches locales", () => {
    renderEditor();
    // TR content is shown first.
    expect(screen.getByDisplayValue("Hakkımda")).toBeTruthy();
    expect(screen.getByDisplayValue(/Meslek Yüksekokulu'nda Bilgisayar/)).toBeTruthy();
    // Statement is split into editable, coloured segments.
    expect(screen.getByLabelText("Parça 1")).toBeTruthy();
    expect(screen.getByLabelText("Parça 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "English" }));
    expect(screen.getByDisplayValue("About")).toBeTruthy();
    expect(screen.getByDisplayValue(/Computer Programming at Kütahya/)).toBeTruthy();
  });

  it("edits a segment tone and reflects it in the live preview", () => {
    const site = renderEditor();
    const toneGroups = screen.getAllByRole("group", { name: "Vurgu rengi" });
    fireEvent.click(within(toneGroups[0]).getByRole("button", { name: "Lime" }));
    expect(site().tr.about.statement[0].tone).toBe("accent");

    const preview = screen.getByLabelText("Hakkımda önizlemesi");
    expect(preview.textContent).toContain(site().tr.about.statement[0].text.trim());
  });

  it("adds, edits and removes paragraphs and keeps the model valid", () => {
    const site = renderEditor();
    const paragraphCount = site().tr.about.paragraphs.length;
    fireEvent.click(screen.getByRole("button", { name: "Paragraf ekle" }));
    expect(site().tr.about.paragraphs.length).toBe(paragraphCount + 1);

    const newParagraph = screen.getByLabelText(`Paragraf ${paragraphCount + 1}`);
    fireEvent.change(newParagraph, { target: { value: "Eklenen paragraf metni" } });
    expect(site().tr.about.paragraphs.at(-1)).toBe("Eklenen paragraf metni");

    fireEvent.click(screen.getByRole("button", { name: `Paragraf ${paragraphCount + 1} sil` }));
    expect(site().tr.about.paragraphs.length).toBe(paragraphCount);
    // The whole document still parses under the shared schema.
    expect(() => parsePortfolioFiles(structuredClone({ ...portfolioFiles, site: site() }))).not.toThrow();
  });

  it("adds a fact with a stable label/value pair and generates safe defaults", () => {
    const site = renderEditor();
    const factCount = site().tr.about.facts.length;
    fireEvent.click(screen.getByRole("button", { name: "Bilgi kutusu ekle" }));
    expect(site().tr.about.facts.length).toBe(factCount + 1);
    expect(site().tr.about.facts.at(-1)).toMatchObject({ label: "Yeni etiket", value: "Değer" });
  });

  it("shows an inline validation message when a required field is emptied", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Başlık"), { target: { value: "   " } });
    expect(screen.getAllByText("Bu alan boş bırakılamaz.").length).toBeGreaterThan(0);
  });

  it("keeps the user's text while typing a comma or blank into a segment", () => {
    const site = renderEditor();
    const segment = screen.getByLabelText("Parça 1");
    fireEvent.change(segment, { target: { value: "geçici, virgüllü" } });
    expect(site().tr.about.statement[0].text).toBe("geçici, virgüllü");
    expect(screen.getByDisplayValue("geçici, virgüllü")).toBeTruthy();
  });

  it("exposes keyboard-accessible reorder handles for every list", () => {
    renderEditor();
    // dnd-kit sortable handles carry an accessible name so reordering is not
    // mouse-only. One per statement segment, paragraph and fact row.
    expect(screen.getAllByRole("button", { name: /kaydını sırala/ }).length).toBeGreaterThanOrEqual(
      portfolioFiles.site.tr.about.statement.length +
        portfolioFiles.site.tr.about.paragraphs.length +
        portfolioFiles.site.tr.about.facts.length,
    );
  });
});
