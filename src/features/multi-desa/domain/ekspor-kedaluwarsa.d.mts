/**
 * Tipe untuk `ekspor-kedaluwarsa.mjs`.
 *
 * Modul implementasinya `.mjs` karena dipakai juga oleh CLI Node tanpa build
 * (`scripts/platform/cleanup-exports.mjs`). Deklarasi ini menjaga repository,
 * use case, dan test TypeScript memakai kontrak yang sama.
 */

export interface BarisKedaluwarsa {
  kedaluwarsaPada: Date | string | number;
}

export interface BarisBerkasEkspor {
  berkas: string;
}

export interface HasilBerkasEkspor {
  berkasDihapus: number;
  berkasTidakAda: number;
  berkasDilewati: number;
}

/** Baris yang `kedaluwarsaPada`-nya sudah lewat (batas inklusif). */
export function pilihKedaluwarsa<T extends BarisKedaluwarsa>(
  daftar: readonly T[],
  sekarang?: Date,
): T[];

/** Path absolut di dalam folder ekspor, atau `null` bila tidak aman. */
export function jalurBerkasAman(akarEkspor: string, berkas: string, cwd?: string): string | null;

export function periksaBerkasEkspor<T extends BarisBerkasEkspor>(
  akarEkspor: string,
  daftar: readonly T[],
  cwd?: string,
): HasilBerkasEkspor;

export function hapusBerkasEkspor<T extends BarisBerkasEkspor>(
  akarEkspor: string,
  daftar: readonly T[],
  cwd?: string,
): Promise<HasilBerkasEkspor>;
