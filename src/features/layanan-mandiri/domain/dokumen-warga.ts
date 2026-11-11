import { z } from "zod";

/**
 * Arsip dokumen pribadi warga.
 *
 * Daftar jenis bersifat baku agar label konsisten dan tidak bergantung pada
 * master syarat surat yang bisa kosong pada desa baru. Nilai yang disimpan di
 * DB adalah kode, bukan label.
 */
export const JENIS_DOKUMEN_WARGA = {
  ktp: "KTP",
  kk: "Kartu Keluarga",
  akta_kelahiran: "Akta Kelahiran",
  akta_nikah: "Akta Perkawinan",
  ijazah: "Ijazah",
  npwp: "NPWP",
  bpjs: "Kartu BPJS",
  buku_rekening: "Buku Rekening",
  lainnya: "Dokumen Lainnya",
} as const;

export type JenisDokumenWarga = keyof typeof JENIS_DOKUMEN_WARGA;

export const KODE_JENIS_DOKUMEN = Object.keys(JENIS_DOKUMEN_WARGA) as [
  JenisDokumenWarga,
  ...JenisDokumenWarga[],
];

export const jenisDokumenWargaSchema = z.enum(KODE_JENIS_DOKUMEN);

export const dokumenWargaSchema = z.object({
  jenis: jenisDokumenWargaSchema,
  nama: z
    .string()
    .trim()
    .min(1, "Nama dokumen wajib diisi.")
    .max(200, "Nama maksimal 200 karakter."),
});

export type DokumenWargaInput = z.infer<typeof dokumenWargaSchema>;

export type SumberDokumen = "warga" | "operator";

export interface DokumenWargaDTO {
  id: number;
  jenis: JenisDokumenWarga;
  nama: string;
  mime: string;
  namaAsli: string;
  sumber: SumberDokumen;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/** Label jenis; kode tak dikenal tetap ditampilkan apa adanya. */
export function labelJenisDokumen(jenis: string): string {
  return JENIS_DOKUMEN_WARGA[jenis as JenisDokumenWarga] ?? jenis;
}

/** Nilai jenis dari DB; kode lama/tak dikenal jatuh ke "Dokumen Lainnya". */
export function jenisDokumenTersimpan(jenis: string): JenisDokumenWarga {
  return jenis in JENIS_DOKUMEN_WARGA ? (jenis as JenisDokumenWarga) : "lainnya";
}

export function sumberDokumen(value: string): SumberDokumen {
  return value === "operator" ? "operator" : "warga";
}

export function labelSumberDokumen(sumber: SumberDokumen): string {
  return sumber === "operator" ? "Diunggah operator" : "Unggahan saya";
}

/** Hanya unggahan warga sendiri yang boleh diubah/dihapus. */
export function bisaDiubahWarga(dokumen: Pick<DokumenWargaDTO, "sumber">): boolean {
  return dokumen.sumber === "warga";
}
