// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import SkillsEditor from "../../src/admin/editors/SkillsEditor.jsx";

function editorFixture() {
  const skills = structuredClone(portfolioFiles.skills);
  let index = 1;
  for (const card of skills.skillCards) card.id = `existing-card-${index++}`;
  for (const group of skills.additionalGroups) for (const item of group.items) item.id = `existing-group-${index++}`;
  return skills;
}

afterEach(cleanup);

describe("SkillsEditor global skill IDs", () => {
  it("uses one ID scope across different groups and new skill cards", () => {
    let latestSkills;
    function Harness() {
      const [skills, setSkills] = useState(editorFixture);
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
