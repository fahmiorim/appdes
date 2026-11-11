import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Register audit konsistensi.
 *
 * Dua dokumen audit lama (`AUDIT-2026-11-12.md` dan
 * `AUDIT-2026-11-12-pasca-cleanup.md`) sengaja dikeluarkan pemilik proyek dari
 * working tree agar tidak ikut commit, sehingga register yang berlaku adalah
 * `AUDIT-2026-11-12-konsistensi.md`.
 */
const DOKUMEN = fileURLToPath(
  new URL("../../docs/AUDIT-2026-11-12-konsistensi.md", import.meta.url),
);
const AKAR = fileURLToPath(new URL("../../", import.meta.url));

function baca(): string {
  return fs.readFileSync(DOKUMEN, "utf8");
}

function bacaKode(relatif: string): string {
  return fs.readFileSync(`${AKAR}${relatif}`, "utf8");
}

describe("register audit", () => {
  it("mencatat 15 temuan K-01 sampai K-15 secara berurutan", () => {
    const isi = baca();

    for (let nomor = 1; nomor <= 15; nomor += 1) {
      expect(isi, `bagian K-${String(nomor).padStart(2, "0")}`).toContain(
        `### K-${String(nomor).padStart(2, "0")}.`,
      );
    }
  });

  it("setiap temuan punya lokasi, bukti, perbaikan, dan status", () => {
    const isi = baca();
    const bagian = isi.split(/^### K-\d+\./gm).slice(1);

    expect(bagian).toHaveLength(15);
    for (const [indeks, teks] of bagian.entries()) {
      const label = `temuan K-${String(indeks + 1).padStart(2, "0")}`;
      expect(teks, label).toContain("**Lokasi:**");
      expect(teks, label).toContain("**Bukti:**");
      expect(teks, label).toContain("**Perbaikan:**");
      expect(teks, label).toContain("**Status:**");
    }
  });

  it("hanya memakai status yang dikenal", () => {
    const status = [...baca().matchAll(/\*\*Status:\*\*\s*([A-Za-z]+)/g)].map((cocok) => cocok[1]);

    expect(status).toHaveLength(15);
    for (const nilai of status) {
      expect(["Selesai", "Ditunda", "Statis", "Proses"]).toContain(nilai);
    }
  });

  it("klaim perbaikan utama punya bukti kode yang masih hidup", () => {
    expect(bacaKode("src/features/kesehatan/application/kia-use-cases.ts")).toContain(
      "requirePermission",
    );
    expect(bacaKode("src/features/kesehatan/application/kia-use-cases.ts")).not.toContain(
      '"use server"',
    );
    expect(bacaKode("src/features/kesehatan/application/ekspor-kesehatan.ts")).toContain(
      "konteksEksporKesehatan",
    );
    expect(bacaKode("src/features/api-eksternal/domain/auth.ts")).toContain("lastUsedAt");
    expect(bacaKode("src/lib/request-body.ts")).toContain("BodyLimitError");
    expect(bacaKode("src/lib/csv.ts")).toContain("amanFormula");
    expect(bacaKode("src/lib/client-ip.ts")).toContain("percayaProxy");
    expect(fs.existsSync(`${AKAR}src/app/api/docs-status/route.ts`)).toBe(false);
    expect(fs.existsSync(`${AKAR}src/features/inventaris/domain/inventaris-publik.ts`)).toBe(false);
    expect(
      bacaKode("src/features/inventaris/infrastructure/inventaris-repository.ts"),
    ).not.toContain("listInventarisPublik");
  });
});
