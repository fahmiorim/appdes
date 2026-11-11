export const CSV_SEPARATOR = ";";

/**
 * Cegah formula injection saat CSV dibuka di Excel/LibreOffice.
 *
 * Nilai yang dimulai `=`, `+`, `-`, atau `@` dapat dieksekusi sebagai formula.
 * Angka biasa (mis. `-5`) dibiarkan agar tidak merusak nilai numerik.
 */
export function amanFormula(value: string): string {
  const kandidat = value.trim();
  if (!/^[=+\-@]/.test(kandidat)) return value;
  if (kandidat === "-") return value;
  if (/^[+-]?\d+(?:[.,]\d+)?$/.test(kandidat)) return value;
  return `'${value}`;
}

/** Bungkus satu sel CSV dan lindungi dari formula injection. */
export function csvCell(value: string, separator = CSV_SEPARATOR): string {
  const teks = amanFormula(value);
  const needsQuote =
    teks.includes(separator) || teks.includes('"') || teks.includes("\n") || teks.includes("\r");
  if (!needsQuote) return teks;
  return `"${teks.replace(/"/g, '""')}"`;
}

/** Susun teks CSV dari baris-baris sel. */
export function toCsv(rows: readonly (readonly string[])[], separator = CSV_SEPARATOR): string {
  return rows
    .map((row) => row.map((cell) => csvCell(cell, separator)).join(separator))
    .join("\r\n");
}
