/**
 * Tipe untuk `cleanup-exports.mjs`.
 *
 * Skrip CLI-nya sengaja tetap `.mjs` (bukan TypeScript) agar dapat dijalankan
 * langsung oleh Node dari systemd timer tanpa build tambahan. Aturan
 * kedaluwarsa dan penjagaan path berada di
 * `src/features/multi-desa/domain/ekspor-kedaluwarsa.mjs`; file ini hanya
 * mendeklarasikan parsing argumen milik CLI.
 */

export interface OpsiCleanupEkspor {
  dryRun: boolean;
  json: boolean;
  help: boolean;
}

export function parseArgumen(argv: string[]): OpsiCleanupEkspor;
