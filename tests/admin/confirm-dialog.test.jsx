// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../../src/admin/components/AdminUi.jsx";

function DialogHarness({ title, busy = false }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button">Arka plan kontrolü</button>
      <button type="button" onClick={() => setOpen(true)}>Onayı aç</button>
      <ConfirmDialog
        open={open}
        title={title}
        description="Bu işlem onay gerektirir."
        confirmLabel="Onayla"
        busy={busy}
        onClose={() => setOpen(false)}
        onConfirm={vi.fn()}
      />
    </div>
  );
}

describe("ConfirmDialog keyboard focus management", () => {
  afterEach(cleanup);

  it.each(["Projeyi sil", "GitHub’a yayınla"])("traps focus and restores the keyboard trigger for %s", async (title) => {
    const user = userEvent.setup();
    render(<DialogHarness title={title} />);
    const trigger = screen.getByRole("button", { name: "Onayı aç" });
    trigger.focus();
    await user.keyboard("{Enter}");

    const dialog = screen.getByRole("alertdialog", { name: title });
    const cancel = screen.getByRole("button", { name: "Vazgeç" });
    const confirm = screen.getByRole("button", { name: "Onayla" });
    const close = screen.getByRole("button", { name: "Kapat" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(cancel));

    await user.tab();
    expect(document.activeElement).toBe(confirm);
    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirm);

    screen.getByRole("button", { name: "Arka plan kontrolü" }).focus();
    expect(document.activeElement).toBe(cancel);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("does not allow Escape or close controls while a non-dismissible operation is busy", async () => {
    const user = userEvent.setup();
    render(<DialogHarness title="Devam eden işlem" busy />);
    const trigger = screen.getByRole("button", { name: "Onayı aç" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog", { name: "Devam eden işlem" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kapat" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Vazgeç" }).disabled).toBe(true);
  });
});
