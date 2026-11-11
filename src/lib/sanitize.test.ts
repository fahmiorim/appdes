import { describe, expect, it } from "vitest";

import { sanitasiHtml, teksPolos } from "./sanitize";

describe("sanitasiHtml", () => {
  it("membiarkan formatting dasar", () => {
    const hasil = sanitasiHtml("<p>Halo <strong>warga</strong></p>");
    expect(hasil).toBe("<p>Halo <strong>warga</strong></p>");
  });

  it("membuang tag <script> beserta isinya", () => {
    const hasil = sanitasiHtml('<p>Aman</p><script>alert("xss")</script>');
    expect(hasil).not.toContain("script");
    expect(hasil).not.toContain("alert");
    expect(hasil).toContain("Aman");
  });

  it("membuang event handler onerror", () => {
    const hasil = sanitasiHtml('<img src="https://contoh.id/a.png" onerror="alert(1)">');
    expect(hasil).not.toContain("onerror");
    expect(hasil).toContain("contoh.id");
  });

  it("membuang atribut style", () => {
    const hasil = sanitasiHtml('<p style="background:url(javascript:alert(1))">x</p>');
    expect(hasil).not.toContain("style");
    expect(hasil).toBe("<p>x</p>");
  });

  it("menolak URI javascript: pada tautan", () => {
    const hasil = sanitasiHtml('<a href="javascript:alert(1)">klik</a>');
    expect(hasil).not.toContain("javascript:");
  });

  it("membuang <iframe>", () => {
    const hasil = sanitasiHtml('<iframe src="https://jahat.id"></iframe><p>ok</p>');
    expect(hasil).not.toContain("iframe");
    expect(hasil).toContain("ok");
  });

  it("menambahkan rel noopener noreferrer pada tautan", () => {
    const hasil = sanitasiHtml('<a href="https://contoh.id">x</a>');
    expect(hasil).toContain('rel="noopener noreferrer"');
  });

  it("menolak gambar data: URI", () => {
    const hasil = sanitasiHtml('<img src="data:image/svg+xml;base64,PHN2Zz4=">');
    expect(hasil).not.toContain("data:");
  });

  it("dapat menonaktifkan gambar", () => {
    const hasil = sanitasiHtml('<img src="https://contoh.id/a.png"><p>x</p>', { gambar: false });
    expect(hasil).not.toContain("<img");
    expect(hasil).toContain("<p>x</p>");
  });
});

describe("teksPolos", () => {
  it("membuang tag dan memadatkan spasi", () => {
    expect(teksPolos("<p>Halo   <strong>warga</strong>\ndesa</p>")).toBe("Halo warga desa");
  });

  it("mengembalikan string kosong untuk nilai kosong", () => {
    expect(teksPolos(null)).toBe("");
    expect(teksPolos(undefined)).toBe("");
  });
});
