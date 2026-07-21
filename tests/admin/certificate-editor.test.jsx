// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import CertificateEditor from "../../src/admin/editors/CertificateEditor.jsx";

afterEach(cleanup);

describe("CertificateEditor upload state", () => {
  it("clears the previous certificate's rejected file and error when the certificate changes", async () => {
    const first = structuredClone(portfolioFiles.certificates.items[0]);
    const second = structuredClone(portfolioFiles.certificates.items[1]);
    const user = userEvent.setup();
    const props = { skillOptions: [], onChange: vi.fn(), onUpload: vi.fn() };
    const { rerender } = render(<CertificateEditor certificate={first} {...props} />);
    const input = screen.getByLabelText("PDF yükle");

    await user.upload(input, new File(["not a pdf"], "invalid.pdf", { type: "application/pdf" }));
    expect(await screen.findByText("PDF kabul edilmedi")).toBeTruthy();
    expect(input.files).toHaveLength(1);

    rerender(<CertificateEditor certificate={second} {...props} />);

    await waitFor(() => expect(screen.queryByText("PDF kabul edilmedi")).toBeNull());
    expect(screen.getByLabelText("PDF yükle").files).toHaveLength(0);
    expect(props.onUpload).not.toHaveBeenCalled();
  });
});
