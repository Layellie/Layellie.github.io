// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import SkillsEditor from "../../src/admin/editors/SkillsEditor.jsx";

afterEach(cleanup);

describe("SkillsEditor global skill IDs", () => {
  it("uses one ID scope across different groups and new skill cards", () => {
    let latestSkills;
    function Harness() {
      const [skills, setSkills] = useState(() => structuredClone(portfolioFiles.skills));
      latestSkills = skills;
      return <SkillsEditor skills={skills} onChange={setSkills} />;
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Ek gruplar" }));
    fireEvent.click(screen.getByRole("button", { name: "Yetenek ekle" }));
    expect(screen.getByLabelText("new-skill adı")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Araçlar & IDE'ler/ }));
    fireEvent.click(screen.getByRole("button", { name: "Yetenek ekle" }));
    expect(screen.getByLabelText("new-skill-2 adı")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Yetenek kartları" }));
    fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
    expect(latestSkills.skillCards.at(-1).id).toBe("new-skill-3");
  });
});
