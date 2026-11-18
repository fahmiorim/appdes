import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createIdleActionState, type ActionState } from "@/lib/action-state";

import { DialogFormTenant } from "./dialog-form-tenant";

const navigasi = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => navigasi }));

const aksi = vi.fn(
  async (
    _state: ActionState<{ id: number }>,
    _formData: FormData,
  ): Promise<ActionState<{ id: number }>> => createIdleActionState<{ id: number }>(),
);

const Dialog = DialogFormTenant<{ id: number }>;

function renderDialog(judul: string, labelPemicu: string, labelSubmit: string, namaField: string) {
  return renderToStaticMarkup(
    createElement(
      Dialog,
      {
        aksi,
        deskripsi: "Form ini muncul di dialog.",
        judul,
        labelBatal: "Batal",
        labelPemicu,
        labelSubmit,
        stateAwal: createIdleActionState<{ id: number }>(),
      },
      createElement(
        "label",
        null,
        createElement("span", null, namaField),
        createElement("input", { name: namaField, required: true }),
      ),
    ),
  );
}

describe("DialogFormTenant", () => {
  it("menempatkan form input dan submit di dalam dialog native", () => {
    const html = renderDialog(
      "Tambah domain atau alias",
      "Tambah domain",
      "Simpan domain",
      "domain",
    );

    expect(html).toContain("<dialog aria-labelledby=");
    expect(html).toContain("Tambah domain</button>");
    expect(html).toContain("Tambah domain atau alias");
    expect(html).toMatch(/<input[^>]*name="domain"[^>]*>/);
    expect(html).toMatch(/<input[^>]*required=""[^>]*name="domain"[^>]*>/);
    expect(html).toContain("Simpan domain");
    expect(html).toContain("Batal");
    expect(html.indexOf("<form")).toBeGreaterThan(html.indexOf("<dialog"));
  });

  it("menghubungkan judul ke dialog dan menyediakan label tutup", () => {
    const html = renderDialog(
      "Konfirmasi purge",
      "Purge data desa",
      "Purge permanen",
      "konfirmasi",
    );

    expect(html).toMatch(/<dialog aria-labelledby="([^"]+)"/);
    expect(html).toMatch(/<h2 id="[^"]+">Konfirmasi purge<\/h2>/);
    expect(html).toContain('aria-label="Tutup dialog"');
  });
});
