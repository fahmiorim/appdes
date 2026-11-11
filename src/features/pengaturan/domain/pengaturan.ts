import { z } from "zod";

/**
 * Pengaturan aplikasi terpusat.
 *
 * Kunci di database dipetakan ke field bertipe di sini. Nilai yang hilang,
 * rusak, atau di luar batas selalu jatuh ke bawaan domain — satu baris data
 * lama tidak boleh membuat aplikasi gagal.
 */
export const PETA_KUNCI = {
  komentarAktif: "web.komentar_aktif",
  beritaBeranda: "web.berita_beranda",
  pendaftaranWargaAktif: "mandiri.pendaftaran_warga",
  /** Mode penomoran surat (1–4). Dipindahkan dari identitas_desa. */
  penomoranSurat: "surat.penomoran_mode",
} as const;

export type KunciPengaturan = keyof typeof PETA_KUNCI;

const SKEMA_FIELD = {
  komentarAktif: z.boolean(),
  beritaBeranda: z.number().int().min(1).max(12),
  pendaftaranWargaAktif: z.boolean(),
  penomoranSurat: z.number().int().min(1).max(4),
} satisfies Record<KunciPengaturan, z.ZodTypeAny>;

export const pengaturanSchema = z.object({
  /** Tampilkan & terima komentar pada halaman kontak publik. */
  komentarAktif: z.boolean().default(true),
  /** Jumlah berita yang ditampilkan pada beranda publik. */
  beritaBeranda: z.coerce
    .number()
    .int("Jumlah berita harus bilangan bulat.")
    .min(1, "Jumlah berita minimal 1.")
    .max(12, "Jumlah berita maksimal 12.")
    .default(5),
  /** Izinkan pengajuan akun warga dari halaman publik. */
  pendaftaranWargaAktif: z.boolean().default(true),
  /** Mode penomoran surat: 1=manual, 2=otomatis per tahun, 3=otomatis per bulan, 4=otomatis per jenis. */
  penomoranSurat: z.coerce.number().int().min(1).max(4).default(2),
});

export type Pengaturan = z.infer<typeof pengaturanSchema>;

export const PENGATURAN_DEFAULT: Pengaturan = pengaturanSchema.parse({});

/** Cari field dari kunci database; `null` bila kunci tidak dikenal. */
function fieldDariKunci(kunci: string): KunciPengaturan | null {
  for (const [field, nilai] of Object.entries(PETA_KUNCI)) {
    if (nilai === kunci) return field as KunciPengaturan;
  }
  return null;
}

/** Susun pengaturan efektif dari baris database (bawaan + override valid). */
export function parsePengaturan(
  baris: ReadonlyArray<{ kunci: string; nilai: string | null }>,
): Pengaturan {
  const hasil: Pengaturan = { ...PENGATURAN_DEFAULT };

  for (const { kunci, nilai } of baris) {
    const field = fieldDariKunci(kunci);
    if (!field || nilai === null) continue;

    let mentah: unknown;
    try {
      mentah = JSON.parse(nilai);
    } catch {
      continue;
    }

    const parsed = SKEMA_FIELD[field].safeParse(mentah);
    if (parsed.success) {
      Object.assign(hasil, { [field]: parsed.data });
    }
  }

  return hasil;
}

/** Ubah pengaturan tervalidasi menjadi baris siap simpan (JSON per kunci). */
export function serialisasiPengaturan(
  pengaturan: Pengaturan,
): Array<{ kunci: string; nilai: string }> {
  return (Object.keys(PETA_KUNCI) as KunciPengaturan[]).map((field) => ({
    kunci: PETA_KUNCI[field],
    nilai: JSON.stringify(pengaturan[field]),
  }));
}

/**
 * Baca checkbox `FormData`: hanya nilai `"on"`/`"true"`/`"1"` dianggap aktif.
 */
export function checkboxAktif(nilai: FormDataEntryValue | null): boolean {
  if (typeof nilai !== "string") return false;
  return ["on", "true", "1"].includes(nilai.toLowerCase());
}
