// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TagsField } from "../../src/admin/components/AdminUi.jsx";
import { ControlledFields } from "../../src/admin/editors/VisualBuilder.jsx";

afterEach(cleanup);

describe("VisualBuilder declared array field types", () => {
  it.each([
    ["techTags", "tags", "React, Vite", ["React", "Vite"]],
    ["codeLines", "lines", "npm run build, done", ["npm run build", "done"]],
    ["tabs", "items", "Genel, Detay", ["Genel", "Detay"]],
    ["table", "headers", "Ad, Değer", ["Ad", "Değer"]],
  ])("allows an emptied %s.%s string array to accept text again", (moduleType, property, input, expected) => {
    const onChange = vi.fn();
    render(<ControlledFields moduleType={moduleType} bucket="locale" values={{ [property]: [] }} onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: input } });
    expect(onChange).toHaveBeenLastCalledWith(property, expected);
  });

  it("keeps invalid number-array input visible and preserves the previous value", () => {
    const onChange = vi.fn();
    render(<ControlledFields moduleType="lineChart" bucket="shared" values={{ values: [12, 18] }} onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: /Values/ });
    fireEvent.change(input, { target: { value: "12, invalid, 24" } });
    expect(input.value).toBe("12, invalid, 24");
    expect(screen.getByText("Bütün değerler geçerli bir sayı olmalı.")).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "12, 24" } });
    expect(onChange).toHaveBeenLastCalledWith("values", [12, 24]);
  });

  it("preserves a table's trailing newline while a second row is typed", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness moduleType="table" bucket="locale" initialValues={{ rows: [] }} />);
    const input = screen.getByRole("textbox", { name: /Rows/ });
    await user.type(input, "Ad, 1");
    await user.type(input, "{Enter}");
    expect(input.value).toBe("Ad, 1\n");
    await user.type(input, "Değer, 2");
    expect(input.value).toBe("Ad, 1\nDeğer, 2");
    expect(screen.getByTestId("field-model").textContent).toBe(JSON.stringify({ rows: [["Ad", "1"], ["Değer", "2"]] }));
  });

  it("keeps an empty middle table line raw and removes it consistently on blur", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness moduleType="table" bucket="locale" initialValues={{ rows: [] }} />);
    const input = screen.getByRole("textbox", { name: /Rows/ });
    await user.type(input, "İlk{Enter}{Enter}İkinci");
    expect(input.value).toBe("İlk\n\nİkinci");
    expect(screen.getByTestId("field-model").textContent).toBe(JSON.stringify({ rows: [["İlk"], ["İkinci"]] }));
    await user.tab();
    expect(input.value).toBe("İlk\nİkinci");
  });

  it("preserves number-array tokens and reports invalid input without data loss", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness moduleType="lineChart" bucket="shared" initialValues={{ values: [] }} />);
    const input = screen.getByRole("textbox", { name: /Values/ });

    await user.type(input, "12");
    await user.type(input, ",");
    expect(input.value).toBe("12,");
    await user.type(input, "24");
    await user.type(input, ",");
    expect(input.value).toBe("12,24,");
    await user.type(input, "36");
    expect(screen.getByTestId("field-model").textContent).toBe(JSON.stringify({ values: [12, 24, 36] }));

    await user.clear(input);
    await user.type(input, "-1.5,2.25");
    expect(screen.getByTestId("field-model").textContent).toBe(JSON.stringify({ values: [-1.5, 2.25] }));

    await user.clear(input);
    await user.type(input, "12,");
    await user.type(input, "x");
    expect(input.value).toBe("12,x");
    expect(screen.getByText("Bütün değerler geçerli bir sayı olmalı.")).toBeTruthy();
    expect(screen.getByTestId("field-model").textContent).toBe(JSON.stringify({ values: [12] }));
    await user.type(input, "{Backspace}24");
    expect(input.value).toBe("12,24");
    expect(screen.queryByText("Bütün değerler geçerli bir sayı olmalı.")).toBeNull();
    expect(screen.getByTestId("field-model").textContent).toBe(JSON.stringify({ values: [12, 24] }));
  });

  it("replaces invalid raw number text when the external model changes", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness moduleType="lineChart" bucket="shared" initialValues={{ values: [12] }} externalValues={{ values: [7, 8] }} />);
    const input = screen.getByRole("textbox", { name: /Values/ });
    await user.clear(input);
    await user.type(input, "12,x");
    expect(screen.getByText("Bütün değerler geçerli bir sayı olmalı.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Dış model değerini uygula" }));
    expect(input.value).toBe("7, 8");
    expect(screen.queryByText("Bütün değerler geçerli bir sayı olmalı.")).toBeNull();
  });
});

describe("comma-separated list editing", () => {
  it("keeps each partial C++ and Qt token visible while typing", async () => {
    const user = userEvent.setup();
    render(<TagsHarness label="Teknolojiler" />);
    const input = screen.getByRole("textbox", { name: /^Teknolojiler/ });
    await user.type(input, "C++");
    expect(input.value).toBe("C++");
    await user.type(input, ",");
    expect(input.value).toBe("C++,");
    await user.type(input, " Qt");
    expect(input.value).toBe("C++, Qt");
    await user.type(input, " 6");
    expect(input.value).toBe("C++, Qt 6");
    expect(screen.getByTestId("tags-model").textContent).toBe(JSON.stringify(["C++", "Qt 6"]));
  });

  it.each(["Özellikler", "Durumlar", "Teknolojiler", "Etiketler"])("supports multiple %s values through the shared field", async (label) => {
    const user = userEvent.setup();
    render(<TagsHarness label={label} />);
    const input = screen.getByRole("textbox", { name: new RegExp(`^${label}`) });
    await user.type(input, "Bir,İki,Üç");
    expect(screen.getByTestId("tags-model").textContent).toBe(JSON.stringify(["Bir", "İki", "Üç"]));
  });

  it("synchronizes raw text when the parent model genuinely changes", async () => {
    const user = userEvent.setup();
    render(<TagsHarness label="Etiketler" />);
    const input = screen.getByRole("textbox", { name: /^Etiketler/ });
    await user.type(input, "Yerel,");
    expect(input.value).toBe("Yerel,");
    await user.click(screen.getByRole("button", { name: "Dış değeri uygula" }));
    expect(input.value).toBe("Rust, Cargo");
  });
});

function TagsHarness({ label }) {
  const [value, setValue] = useState([]);
  return <><TagsField label={label} value={value} onChange={setValue} /><button type="button" onClick={() => setValue(["Rust", "Cargo"])}>Dış değeri uygula</button><output data-testid="tags-model">{JSON.stringify(value)}</output></>;
}

function ControlledHarness({ moduleType, bucket, initialValues, externalValues }) {
  const [values, setValues] = useState(initialValues);
  return <><ControlledFields moduleType={moduleType} bucket={bucket} values={values} onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))} />{externalValues && <button type="button" onClick={() => setValues(externalValues)}>Dış model değerini uygula</button>}<output data-testid="field-model">{JSON.stringify(values)}</output></>;
}
