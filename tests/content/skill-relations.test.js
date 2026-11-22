import { describe, expect, it } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import { findSkillRelations } from "../../src/content/skillRelations.js";

describe("skill cross-link relations", () => {
  it("maps C# to C#/.NET projects and C# certificate without cross-matching C++", () => {
    const result = findSkillRelations("C#", portfolioFiles, "tr");
    expect(result.projects.map((p) => p.id)).toEqual(["standby", "clipboard"]);
    expect(result.certificates.map((c) => c.id)).toEqual(["certificate-c-programlama"]);
  });

  it("maps C++ to C++20 projects and C++ certificate without cross-matching C#", () => {
    const result = findSkillRelations("C++", portfolioFiles, "tr");
    expect(result.projects.map((p) => p.id)).toEqual(["eyehealth", "clipboard"]);
    expect(result.certificates.map((c) => c.id)).toEqual(["certificate-c-ile-programlamaya-giris"]);
  });

  it("links SQL, MS SQL Server, and MySQL to the database certificate", () => {
    for (const skillName of ["SQL", "MS SQL Server", "MySQL"]) {
      const result = findSkillRelations(skillName, portfolioFiles, "tr");
      expect(result.certificates.map((c) => c.id)).toContain("certificate-veri-tabanina-giris");
    }
  });

  it("aggregates all cybersecurity certificates under Siber Güvenlik in both locales", () => {
    const tr = findSkillRelations("Siber Güvenlik", portfolioFiles, "tr");
    const en = findSkillRelations("Cybersecurity", portfolioFiles, "en");
    expect(tr.certificates.map((c) => c.id)).toEqual([
      "new-certificate-5",
      "new-certificate",
      "new-certificate-3",
    ]);
    expect(en.certificates).toHaveLength(3);
  });

  it("links Git ve Github even when relatedSkillId is null", () => {
    const result = findSkillRelations("Git ve Github", portfolioFiles, "tr");
    expect(result.certificates.map((c) => c.id)).toContain("new-certificate-2");
  });

  it("links focus areas to matching flagship projects", () => {
    const opt = findSkillRelations("Sistem Optimizasyonu", portfolioFiles, "tr");
    expect(opt.projects.map((p) => p.id)).toEqual(["standby"]);

    const hw = findSkillRelations("Donanım Seviyesi Geliştirme", portfolioFiles, "tr");
    expect(hw.projects.map((p) => p.id)).toEqual(["standby", "eyehealth", "clipboard"]);
  });

  it("does not produce false links for unlinked items", () => {
    const lang = findSkillRelations("İngilizce", portfolioFiles, "tr");
    expect(lang.projects).toEqual([]);
    expect(lang.certificates).toEqual([]);
  });
});
