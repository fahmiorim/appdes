/**
 * Normalisasi nomor telepon Indonesia menjadi JID WhatsApp.
 *
 * Data penduduk menyimpan nomor dalam berbagai bentuk (`0812…`, `+62 812-…`,
 * `62812…`), sedangkan Baileys membutuhkan JID `62812…@s.whatsapp.net`.
 * Fungsi ini murni agar dapat diuji tanpa membuka koneksi WhatsApp.
 */
const KODE_NEGARA = "62";
const PANJANG_MIN = 9;
const PANJANG_MAKS = 15;

export function normalisasiNomorWhatsApp(target: string): string | null {
  let digit = target.replace(/\D/g, "");

  if (digit.startsWith("00")) digit = digit.slice(2);
  if (digit.startsWith("0")) digit = KODE_NEGARA + digit.slice(1);
  else if (digit.startsWith("8")) digit = KODE_NEGARA + digit;

  if (digit.length < PANJANG_MIN || digit.length > PANJANG_MAKS) return null;

  return `${digit}@s.whatsapp.net`;
}
