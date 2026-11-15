/** Tipe publik `scripts/visual-qa/guard.mjs` untuk dipakai unit test TypeScript. */

export interface OpsiKoneksiVisual {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface KonfigurasiDatabaseVisual {
  dsn: string;
  database: string;
  host: string;
  opsiKoneksi: OpsiKoneksiVisual;
}

export declare const POLA_NAMA_DATABASE_VISUAL: RegExp;
export declare const DSN_BAWAAN: string;

export declare function namaDatabaseDariDsn(dsn: string): string;
export declare function validasiDsnVisual(dsn: string): KonfigurasiDatabaseVisual;
export declare function validasiEnvVisual(
  sumber?: Readonly<Record<string, string | undefined>>,
): KonfigurasiDatabaseVisual;
export declare function ringkasTarget(konfigurasi: KonfigurasiDatabaseVisual): string;
