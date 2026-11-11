import "server-only";

export const BACKUP_EXT = ".sql" as const;
export const BACKUP_GZIP_EXT = ".sql.gz" as const;
export const RESTORE_SQL_EXTS = [".sql", ".sql.gz"] as const;

export const MAX_RESTORE_BYTES = 200 * 1024 * 1024; // 200 MB

/** Tabel inti yang wajib ada setelah restore skema penuh. */
export const TABEL_WAJIB_RESTORE = [
  "users",
  "villages",
  "roles",
  "sessions",
  "audit_logs",
  "pengaturan_desa",
  "pengguna_shortcut",
] as const;

/** Nama tabel yang hilang dari daftar hasil `SHOW TABLES`. */
export function tabelHilang(
  tabel: readonly string[],
  wajib: readonly string[] = TABEL_WAJIB_RESTORE,
): string[] {
  const tersedia = new Set(tabel.map((nama) => nama.toLowerCase()));
  return wajib.filter((nama) => !tersedia.has(nama.toLowerCase()));
}

export type BackupResult = {
  filename: string;
  mime: "application/sql" | "application/gzip";
  buffer: Buffer;
};

export function isAllowedSqlFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(BACKUP_EXT) || lower.endsWith(BACKUP_GZIP_EXT);
}

export function normalizeSqlFilename(filename: string): string {
  const base = filename.replace(/[^A-Za-z0-9._-]+/g, "_");
  const lower = base.toLowerCase();
  if (lower.endsWith(BACKUP_GZIP_EXT)) return base;
  if (lower.endsWith(BACKUP_EXT)) return base;
  return `${base}${BACKUP_EXT}`;
}
