/**
 * Aturan tunggal ekspor tenant kedaluwarsa.
 *
 * Dua jalur memakai aturan ini:
 * - `bersihkanEksporKedaluwarsa()` di `lifecycle-tenant-repository.ts`
 *   (dipanggil use case server-side / kelak konsol Super Admin);
 * - `scripts/platform/cleanup-exports.mjs` (systemd timer/cron, tanpa sesi).
 *
 * Karena CLI dijalankan Node langsung tanpa build, modul ini sengaja `.mjs`:
 * dapat diimpor TypeScript lewat `ekspor-kedaluwarsa.d.mts` dan diimpor Node
 * tanpa langkah kompilasi. Jangan menambahkan import aplikasi (`@/...`) di sini.
 *
 * Modul ini tidak menyentuh database. Pemanggil memilih baris
 * (`id`, `berkas`, `kedaluwarsaPada`) dan modul ini yang menentukan baris mana
 * yang kedaluwarsa serta berkas mana yang boleh dihapus.
 */
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Baris ekspor yang sudah melewati `kedaluwarsaPada`.
 *
 * Batasnya inklusif (`<=`), sama dengan `kedaluwarsa_pada <= NOW()` pada
 * kebijakan retensi. Baris dengan tanggal tidak valid **tidak** dianggap
 * kedaluwarsa agar data rusak tidak memicu penghapusan yang salah.
 */
export function pilihKedaluwarsa(daftar, sekarang = new Date()) {
  const batas = sekarang.getTime();
  if (!Number.isFinite(batas)) throw new TypeError("Waktu pembanding tidak valid.");

  return daftar.filter((baris) => {
    const waktu =
      baris.kedaluwarsaPada instanceof Date
        ? baris.kedaluwarsaPada.getTime()
        : new Date(baris.kedaluwarsaPada).getTime();
    return Number.isFinite(waktu) && waktu <= batas;
  });
}

/**
 * Path absolut berkas ekspor, atau `null` bila berada di luar folder ekspor.
 *
 * Path absolut, `..`, dan folder berawalan mirip (`storage/exports-lain`)
 * ditolak supaya data `tenant_exports` yang tidak wajar tidak dapat menghapus
 * berkas di luar `storage/exports`.
 */
export function jalurBerkasAman(akarEkspor, berkas, cwd = process.cwd()) {
  const akar = path.resolve(akarEkspor);
  const absolut = path.resolve(cwd, berkas);
  if (!absolut.startsWith(akar + path.sep)) return null;
  return absolut;
}

/** Hitung berkas yang memenuhi syarat hapus tanpa menyentuh filesystem. */
export function periksaBerkasEkspor(akarEkspor, daftar, cwd = process.cwd()) {
  let berkasDihapus = 0;
  let berkasTidakAda = 0;
  let berkasDilewati = 0;

  for (const catatan of daftar) {
    const absolut = jalurBerkasAman(akarEkspor, catatan.berkas, cwd);
    if (absolut === null) {
      berkasDilewati += 1;
      continue;
    }
    if (existsSync(absolut)) berkasDihapus += 1;
    else berkasTidakAda += 1;
  }

  return { berkasDihapus, berkasTidakAda, berkasDilewati };
}

/**
 * Hapus berkas ekspor yang aman. Berkas yang sudah hilang dihitung
 * `berkasTidakAda` (bukan kegagalan), dan path tidak aman dihitung
 * `berkasDilewati` agar pemanggil dapat melaporkannya.
 */
export async function hapusBerkasEkspor(akarEkspor, daftar, cwd = process.cwd()) {
  let berkasDihapus = 0;
  let berkasTidakAda = 0;
  let berkasDilewati = 0;

  for (const catatan of daftar) {
    const absolut = jalurBerkasAman(akarEkspor, catatan.berkas, cwd);
    if (absolut === null) {
      berkasDilewati += 1;
      continue;
    }
    try {
      await unlink(absolut);
      berkasDihapus += 1;
    } catch (error) {
      if (error?.code === "ENOENT") berkasTidakAda += 1;
      else berkasDilewati += 1;
    }
  }

  return { berkasDihapus, berkasTidakAda, berkasDilewati };
}
