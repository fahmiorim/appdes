/**
 * Tipe untuk fungsi murni `cleanup-exports.mjs` yang diuji unit.
 *
 * Skrip CLI-nya sengaja tetap `.mjs` (bukan TypeScript) agar dapat dijalankan
 * langsung oleh Node dari systemd timer tanpa build tambahan.
 */

export interface OpsiCleanupEkspor {
  dryRun: boolean;
  json: boolean;
  help: boolean;
}

export function parseArgumen(argv: string[]): OpsiCleanupEkspor;

/**
 * Path absolut berkas ekspor, atau `null` bila path berada di luar folder
 * ekspor (absolut, `..`, atau awalan mirip seperti `storage/exports-lain`).
 */
export function jalurBerkasAman(akarEkspor: string, berkas: string, cwd?: string): string | null;
