import {
  laporanDokumenFormSchema,
  validasiBerkasLaporan,
  type BerkasLaporan,
} from "./laporan-dokumen";

/**
 * Impor **banyak** dokumen laporan periodik sekaligus (Lapis D).
 *
 * Setiap berkas membawa metadata sendiri (judul, jenis, tahun, semester) agar
 * satu impor dapat mengarsipkan dokumen lintas periode/jenis. Validasi di sini
 * **murni** — tanpa `File`/FormData/DB — sehingga dapat diuji langsung dan
 * dipakai ulang oleh use-case.
 */

/** Maksimal dokumen yang boleh diproses dalam satu kali impor. */
export const MAKS_DOKUMEN_IMPOR = 20;

/** Satu berkas beserta metadata yang hendak diimpor. */
export interface ImporDokumenItem {
  /** Nama berkas asli (dengan ekstensi). */
  nama: string;
  /** Ukuran berkas dalam byte. */
  ukuran: number;
  /** Tipe MIME berkas. */
  mime: string;
  judul: string;
  /** Jenis dokumen (lihat `LAPORAN_TIPE`). */
  jenis: string;
  tahun: number;
  semester: number;
}

/** Hasil validasi satu berkas impor. */
export interface ImporDokumenItemHasil {
  nama: string;
  judul: string;
  jenis: string;
  tahun: number;
  semester: number;
  ok: boolean;
  /** Pesan kesalahan bila `ok` false; `null` bila sah. */
  pesan: string | null;
}

export interface ImporDokumenValidasi {
  /** `true` hanya bila seluruh berkas sah. */
  ok: boolean;
  /** Ringkasan kesalahan untuk ditampilkan; `null` bila semua sah. */
  pesan: string | null;
  items: ImporDokumenItemHasil[];
}

/** Turunkan judul bawaan dari nama berkas (tanpa ekstensi). */
export function judulDariNamaBerkas(nama: string): string {
  const base = nama
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base.length >= 3 ? base.slice(0, 255) : "Dokumen Laporan";
}

/** Kunci keunikan satu dokumen di arsip: jenis + tahun + semester. */
function kunciPeriode(jenis: string, tahun: number, semester: number): string {
  return `${jenis}|${tahun}|${semester}`;
}

/**
 * Validasi sekumpulan berkas impor beserta metadatanya.
 *
 * Memeriksa jumlah berkas, tipe/ukuran tiap berkas (PDF ≤ 8 MB), metadata
 * (lewat `laporanDokumenFormSchema`), dan menolak kombinasi
 * jenis+tahun+semester ganda dalam satu impor.
 */
export function validasiImporDokumen(items: readonly ImporDokumenItem[]): ImporDokumenValidasi {
  if (items.length === 0) {
    return { ok: false, pesan: "Pilih minimal satu berkas untuk diimpor.", items: [] };
  }
  if (items.length > MAKS_DOKUMEN_IMPOR) {
    return {
      ok: false,
      pesan: `Maksimal ${MAKS_DOKUMEN_IMPOR} dokumen per impor.`,
      items: [],
    };
  }

  const terlihat = new Set<string>();
  const hasil: ImporDokumenItemHasil[] = items.map((item) => {
    let judul = item.judul;
    let jenis = item.jenis;
    let tahun = item.tahun;
    let semester = item.semester;

    const berkas: BerkasLaporan = { nama: item.nama, ukuran: item.ukuran, tipe: item.mime };
    let pesan = validasiBerkasLaporan(berkas);

    if (!pesan) {
      const parsed = laporanDokumenFormSchema.safeParse({
        tipe: item.jenis,
        judul: item.judul,
        tahun: item.tahun,
        semester: item.semester,
      });
      if (!parsed.success) {
        pesan = parsed.error.issues[0]?.message ?? "Metadata dokumen tidak valid.";
      } else {
        judul = parsed.data.judul;
        jenis = parsed.data.tipe;
        tahun = parsed.data.tahun;
        semester = parsed.data.semester;

        const kunci = kunciPeriode(jenis, tahun, semester);
        if (terlihat.has(kunci)) {
          pesan = "Jenis, tahun, dan semester ganda dalam satu impor.";
        } else {
          terlihat.add(kunci);
        }
      }
    }

    return { nama: item.nama, judul, jenis, tahun, semester, ok: pesan === null, pesan };
  });

  const gagal = hasil.filter((item) => !item.ok).length;
  return {
    ok: gagal === 0,
    pesan: gagal === 0 ? null : `${gagal} dari ${hasil.length} dokumen tidak valid.`,
    items: hasil,
  };
}
