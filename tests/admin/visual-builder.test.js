import { describe, expect, it } from "vitest";
import visuals from "../../src/content/visuals.json";
import { visualModuleEnvelopeSchema, visualPresetSchema, visualsFileSchema } from "../../src/content/schemas.js";
import { MODULE_CATALOG, MODULE_SCHEMAS, normalizeListRowTone } from "../../src/components/project-visuals/moduleRegistry.jsx";
import { createModule, duplicateModule } from "../../src/admin/visuals/moduleDefaults.js";
import { moduleFieldType, parseNumberArrayInput } from "../../src/admin/visuals/fieldMetadata.js";

describe("visual builder controlled module defaults", () => {
  it("keeps all three production presets valid under canonical module validation", () => {
    expect(visualsFileSchema.parse(visuals)).toEqual(visuals);
  });

  it.each(MODULE_CATALOG)("creates schema-valid %s data without free-form code", (type) => {
    const module = createModule(type, []);
    const merged = { ...module.shared, ...module.tr };
    expect(MODULE_SCHEMAS[type].safeParse(merged).success).toBe(true);
    const preset = structuredClone(visuals.presets[0]);
    preset.modules = [module];
    expect(visualPresetSchema.safeParse(preset).success).toBe(true);
    expect(JSON.stringify(module)).not.toMatch(/<script|className|tailwind|javascript:/i);
  });

  it("duplicates modules with stable ordering and a unique id", () => {
    const modules = [createModule("metric", [])];
    const result = duplicateModule(modules, modules[0].id);
    expect(result).toHaveLength(2);
    expect(result[0].id).not.toBe(result[1].id);
    expect(result[1].type).toBe("metric");
  });

  it("uses text for the default list row tone and normalizes the legacy default value", () => {
    expect(normalizeListRowTone("default")).toBe("text");
    const module = createModule("listRow", []);
    module.shared.tone = "default";
    const parsed = MODULE_SCHEMAS.listRow.parse({ ...module.shared, ...module.tr });
    expect(parsed.tone).toBe("text");
  });

  it.each([
    ["techTags", "locale", "tags"],
    ["codeLines", "locale", "lines"],
    ["tabs", "locale", "items"],
    ["table", "locale", "headers"],
  ])("keeps an empty %s.%s.%s field typed as a string array", (moduleType, bucket, property) => {
    expect(moduleFieldType(moduleType, bucket, property, [])).toBe("string-array");
  });

  it("keeps chart values typed as numbers and rejects invalid input without a partial value", () => {
    expect(moduleFieldType("lineChart", "shared", "values", [])).toBe("number-array");
    expect(parseNumberArrayInput("12, 18, 24")).toEqual({ success: true, value: [12, 18, 24] });
    expect(parseNumberArrayInput("12, invalid, 24")).toEqual({ success: false, error: "Bütün değerler geçerli bir sayı olmalı." });
  });

  it.each([-1, 101])("rejects an out-of-range progress value %s before publish", (progress) => {
    const module = createModule("circularProgress", []);
    module.shared.progress = progress;
    expect(visualModuleEnvelopeSchema.safeParse(module).success).toBe(false);
  });

  it.each(["lineChart", "barChart"])("rejects empty %s values before publish", (type) => {
    const module = createModule(type, []);
    module.shared.values = [];
    expect(visualModuleEnvelopeSchema.safeParse(module).success).toBe(false);
  });
});
