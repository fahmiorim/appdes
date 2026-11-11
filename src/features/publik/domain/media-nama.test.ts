import { describe, expect, it } from "vitest";

import { namaBerkasAman } from "./media";

/**
 * Catatan: `media-storage.ts` mengimpor `server-only` sehingga tidak dapat
 * diimpor di lingkungan Vitest tanpa shim. Uji di sini memverifikasi kontrak
 * penamaan aman yang menjadi sumber ekstensi berkas di disk; penjagaan
 * traversal jalur diuji melalui smoke test route.
 */
describe("kontrak nama berkas media", () => {
  it("tidak pernah menyisakan karakter jalur", () => {
    const nama = namaBerkasAman("../../evil/../shell.php");
    expect(nama).not.toContain("/");
    expect(nama).not.toContain("\\");
    expect(nama).not.toContain("..");
  });

  it("hanya memuat huruf kecil, angka, dan tanda hubung", () => {
    const nama = namaBerkasAman("Foto Rapat Warga 2024!!.JPG");
    expect(nama).toMatch(/^[a-z0-9-]+$/);
  });
});
