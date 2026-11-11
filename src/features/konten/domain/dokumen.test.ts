import { describe, expect, it } from "vitest";

import { isPdfDocument, isSafeDocumentLink } from "@/features/publik/domain/dokumen";

import { dokumenPublikFormSchema } from "./dokumen";

function masukanDokumenEmbed(tautan: string) {
  return {
    nama: "Embed layanan informasi",
    slug: "embed-layanan-informasi",
    kategori: "embed",
    tautan,
    tahun: 2025,
    aktif: true,
  };
}

describe("dokumen publik embed", () => {
  it("menerima sumber embed HTTPS", () => {
    expect(
      dokumenPublikFormSchema.safeParse(masukanDokumenEmbed("https://portal.example.id/embed"))
        .success,
    ).toBe(true);
  });

  it.each(["http://portal.example.id/embed", "/dokumen/peraturan.pdf", "javascript:alert(1)"])(
    "menolak sumber embed yang bukan HTTPS: %s",
    (tautan) => {
      expect(dokumenPublikFormSchema.safeParse(masukanDokumenEmbed(tautan)).success).toBe(false);
    },
  );

  it("mewajibkan URL sumber untuk kategori embed", () => {
    expect(
      dokumenPublikFormSchema.safeParse({ ...masukanDokumenEmbed(""), berkas: "peraturan.pdf" })
        .success,
    ).toBe(false);
  });

  it("memvalidasi signature PDF sebelum disimpan", () => {
    expect(isPdfDocument(new TextEncoder().encode("%PDF-1.7"))).toBe(true);
    expect(isPdfDocument(new TextEncoder().encode("<html>"))).toBe(false);
  });

  it.each([
    "javascript:alert(1)",
    "//foreign.example/file.pdf",
    "https://user:pass@example.test/file.pdf",
  ])("menolak tautan dokumen tidak aman: %s", (tautan) => {
    expect(isSafeDocumentLink(tautan)).toBe(false);
  });

  it("menerima tautan publik HTTPS dan path lokal", () => {
    expect(isSafeDocumentLink("https://example.test/dokumen.pdf")).toBe(true);
    expect(isSafeDocumentLink("/api/publik/media/1/dokumen/file.pdf")).toBe(true);
  });
});
