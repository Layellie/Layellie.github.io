import { describe, expect, it } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import { clonePortfolio } from "../../src/admin/data/model.js";
import { mergePortfolioFiles } from "../../src/admin/data/merge.js";

describe("three-way portfolio merge", () => {
  const collections = [
    ["projects", (files) => files.projects.items, (items, value) => { items[0].tr.name = value; }, (items) => items[0].tr.name],
    ["certificates", (files) => files.certificates.items, (items, value) => { items[0].tr.title = value; }, (items) => items[0].tr.title],
    ["focus areas", (files) => files.skills.focusAreas, (items, value) => { items[0].tr.title = value; }, (items) => items[0].tr.title],
    ["skill cards", (files) => files.skills.skillCards, (items, value) => { items[0].tr.name = value; }, (items) => items[0].tr.name],
    ["additional groups", (files) => files.skills.additionalGroups, (items, value) => { items[0].tr.title = value; }, (items) => items[0].tr.title],
    ["skills inside a group", (files) => files.skills.additionalGroups[0].items, (items, value) => { items[0].tr.name = value; }, (items) => items[0].tr.name],
    ["visual presets", (files) => files.visuals.presets, (items, value) => { items[0].name = value; }, (items) => items[0].name],
  ];

  it("merges independent record fields without a conflict", () => {
    const local = clonePortfolio(portfolioFiles);
    const remote = clonePortfolio(portfolioFiles);
    local.projects.items[0].tr.name = "Local name";
    remote.projects.items[1].en.description = "Remote description";
    const result = mergePortfolioFiles(portfolioFiles, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.files.projects.items[0].tr.name).toBe("Local name");
    expect(result.files.projects.items[1].en.description).toBe("Remote description");
  });

  it("requires an explicit local/remote choice for the same changed field", () => {
    const local = clonePortfolio(portfolioFiles);
    const remote = clonePortfolio(portfolioFiles);
    local.projects.items[0].tr.name = "Local";
    remote.projects.items[0].tr.name = "Remote";
    const pending = mergePortfolioFiles(portfolioFiles, local, remote);
    expect(pending.conflicts).toHaveLength(1);
    expect(pending.conflicts[0].path).toContain("#clipboard.tr.name");
    const resolved = mergePortfolioFiles(portfolioFiles, local, remote, { [pending.conflicts[0].key]: "remote" });
    expect(resolved.conflicts).toEqual([]);
    expect(resolved.files.projects.items[0].tr.name).toBe("Remote");
  });

  it("keeps deterministic local ordering while appending remote-only records", () => {
    const local = clonePortfolio(portfolioFiles);
    const remote = clonePortfolio(portfolioFiles);
    local.projects.items.reverse();
    remote.projects.items.push({ ...structuredClone(remote.projects.items[0]), id: "remote-project" });
    const result = mergePortfolioFiles(portfolioFiles, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.files.projects.items.at(-1).id).toBe("remote-project");
  });

  it.each(collections)("keeps a local %s field edit together with a remote-only reorder", (_label, getItems, changeField, readField) => {
    const local = clonePortfolio(portfolioFiles);
    const remote = clonePortfolio(portfolioFiles);
    const editedId = getItems(local)[0].id;
    changeField(getItems(local), "Local field edit");
    getItems(remote).reverse();
    const remoteOrder = getItems(remote).map((item) => item.id);
    const result = mergePortfolioFiles(portfolioFiles, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(getItems(result.files).map((item) => item.id)).toEqual(remoteOrder);
    expect(readField([getItems(result.files).find((item) => item.id === editedId)])).toBe("Local field edit");
  });

  it.each(collections)("keeps a local-only %s reorder together with a remote field edit", (_label, getItems, changeField, readField) => {
    const local = clonePortfolio(portfolioFiles);
    const remote = clonePortfolio(portfolioFiles);
    const editedId = getItems(remote)[0].id;
    getItems(local).reverse();
    const localOrder = getItems(local).map((item) => item.id);
    changeField(getItems(remote), "Remote field edit");
    const result = mergePortfolioFiles(portfolioFiles, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(getItems(result.files).map((item) => item.id)).toEqual(localOrder);
    expect(readField([getItems(result.files).find((item) => item.id === editedId)])).toBe("Remote field edit");
  });

  it("uses the shared order when both sides perform the same reorder", () => {
    const local = clonePortfolio(portfolioFiles);
    const remote = clonePortfolio(portfolioFiles);
    local.projects.items.reverse();
    remote.projects.items.reverse();
    const result = mergePortfolioFiles(portfolioFiles, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.files.projects.items.map((item) => item.id)).toEqual(local.projects.items.map((item) => item.id));
  });

  it("requires an explicit choice for incompatible local and remote collection orders", () => {
    const local = clonePortfolio(portfolioFiles);
    const remote = clonePortfolio(portfolioFiles);
    local.projects.items = [local.projects.items[1], local.projects.items[0], local.projects.items[2]];
    remote.projects.items = [remote.projects.items[0], remote.projects.items[2], remote.projects.items[1]];
    const pending = mergePortfolioFiles(portfolioFiles, local, remote);
    const orderConflict = pending.conflicts.find((conflict) => conflict.path === "projects.items.$order");
    expect(orderConflict).toBeTruthy();
    const resolved = mergePortfolioFiles(portfolioFiles, local, remote, { [orderConflict.key]: "remote" });
    expect(resolved.conflicts).toEqual([]);
    expect(resolved.files.projects.items.map((item) => item.id)).toEqual(remote.projects.items.map((item) => item.id));
  });

  it("keeps independent additions and deletions deterministic without losing records", () => {
    const local = clonePortfolio(portfolioFiles);
    const remote = clonePortfolio(portfolioFiles);
    local.projects.items.splice(1, 0, { ...structuredClone(local.projects.items[0]), id: "local-project" });
    remote.projects.items.push({ ...structuredClone(remote.projects.items[0]), id: "remote-project" });
    remote.projects.items = remote.projects.items.filter((item) => item.id !== "standby");
    const result = mergePortfolioFiles(portfolioFiles, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.files.projects.items.map((item) => item.id)).toEqual(["clipboard", "local-project", "eyehealth", "remote-project"]);
  });
});
