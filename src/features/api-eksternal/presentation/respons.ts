import { NextResponse } from "next/server";

/**
 * Bentuk galat tunggal untuk seluruh API eksternal.
 *
 * Wajib sama dengan komponen `Galat` pada `openapi.ts`; sebelum helper ini ada,
 * route baca mengembalikan `{ message }` sementara route tulis mengembalikan
 * `{ ok: false, error }`, sehingga klien yang mengikuti kontrak mendapat
 * `undefined`.
 */
export interface GalatApiEksternal {
  ok: false;
  error: string;
  detail?: string;
}

/** Respons galat JSON dengan bentuk yang dijanjikan kontrak OpenAPI. */
export function jsonGalat(status: number, error: string, detail?: string) {
  const body: GalatApiEksternal = { ok: false, error, ...(detail ? { detail } : {}) };
  return NextResponse.json(body, { status });
}
