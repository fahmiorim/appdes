/**
 * Pembacaan tabel impor (CSV & XLSX) untuk modul kependudukan, bantuan, dan
 * kontak.
 *
 * Semua fungsi di berkas ini **murni** dan bebas dari `db`/sesi agar mudah
 * diuji. Berkas CSV diurai sendiri (tanpa dependency) dengan dukungan tanda
 * kutip RFC 4180; berkas XLSX dibaca lewat `exceljs` yang dimuat dinamis supaya
 * tidak ikut ke bundel klien.
 */

/** Satu definisi kolom impor: kunci kanonik, label header, dan alias header. */
export interface KolomImpor<Kunci extends string> {
  /** Nama kanonik yang dipakai kode (mis. `nik`). */
  kunci: Kunci;
  /** Label header yang ditulis di template dan dicari di berkas. */
  label: string;
  /** Header alternatif yang tetap diterima (mis. singkatan). */
  alias?: readonly string[];
  /** Kolom wajib: baris tanpa kolom ini dilaporkan sebagai galat. */
  wajib?: boolean;
}

/** Satu baris hasil impor yang sudah dipetakan ke kunci kanonik. */
export interface BarisImpor<Kunci extends string> {
  /** Nomor baris data pada berkas (1 = baris pertama di bawah header). */
  baris: number;
  nilai: Record<Kunci, string>;
  /**
   * Kolom yang tidak didefinisikan di `kolom`, dipetakan apa adanya.
   *
   * Dipakai modul dengan kolom dinamis (mis. isian suplemen) yang bentuknya
   * baru diketahui saat berkas diunggah.
   */
  tambahan: Record<string, string>;
}

/** Baris yang gagal dipetakan beserta alasannya. */
export interface GalatImpor {
  baris: number;
  pesan: string;
}

export interface HasilImpor<Kunci extends string> {
  baris: BarisImpor<Kunci>[];
  galat: GalatImpor[];
  /** Header pada berkas yang tidak dikenali kolom mana pun. */
  headerTakDikenal: string[];
}

/** Nama kolom header yang tidak dikenali definisi kolom (tetap & berurutan). */
function headerTambahan(
  header: readonly string[],
  petaKolom: ReadonlyMap<number, string>,
): { indeks: number; nama: string }[] {
  const hasil: { indeks: number; nama: string }[] = [];
  header.forEach((nama, indeks) => {
    const bersih = (nama ?? "").trim();
    if (bersih === "" || petaKolom.has(indeks)) return;
    hasil.push({ indeks, nama: bersih });
  });
  return hasil;
}

/** Berkas impor yang didukung. */
export const EKSTENSI_IMPOR = [".csv", ".txt", ".xlsx"] as const;

/** Batas ukuran berkas impor (5 MB) — cukup untuk puluhan ribu baris. */
export const BATAS_UKURAN_IMPOR = 5 * 1024 * 1024;

/** Normalisasi header: tanpa spasi, garis bawah, dan tanda baca. */
function normalisasiHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Tebak delimiter dari baris pertama.
 *
 * Berkas ekspor Excel di banyak daerah memakai titik koma (`;`), sedangkan
 * ekspor sistem ini memakai koma (`,`). Delimiter dipilih dari yang paling
 * sering muncul di baris pertama, di luar tanda kutip.
 */
function tebakDelimiter(teks: string): string {
  const barisPertama = teks.slice(0, teks.indexOf("\n") === -1 ? teks.length : teks.indexOf("\n"));
  let koma = 0;
  let titikKoma = 0;
  let dalamKutip = false;

  for (const karakter of barisPertama) {
    if (karakter === '"') dalamKutip = !dalamKutip;
    if (dalamKutip) continue;
    if (karakter === ",") koma += 1;
    if (karakter === ";") titikKoma += 1;
  }

  return titikKoma > koma ? ";" : ",";
}

/** Urai teks CSV menjadi baris & kolom, menghormati tanda kutip. */
export function parseCsv(teks: string, delimiter?: string): string[][] {
  const isi = teks.replace(/^\uFEFF/, "");
  const pemisah = delimiter ?? tebakDelimiter(isi);
  const baris: string[][] = [];
  let kolom: string[] = [];
  let sel = "";
  let dalamKutip = false;

  for (let i = 0; i < isi.length; i += 1) {
    const karakter = isi[i];

    if (dalamKutip) {
      if (karakter === '"') {
        if (isi[i + 1] === '"') {
          sel += '"';
          i += 1;
        } else {
          dalamKutip = false;
        }
      } else {
        sel += karakter;
      }
      continue;
    }

    if (karakter === '"') {
      dalamKutip = true;
    } else if (karakter === pemisah) {
      kolom.push(sel);
      sel = "";
    } else if (karakter === "\n") {
      kolom.push(sel);
      baris.push(kolom);
      kolom = [];
      sel = "";
    } else if (karakter === "\r") {
      // Diabaikan; `\n` yang menutup baris.
    } else {
      sel += karakter;
    }
  }

  kolom.push(sel);
  baris.push(kolom);

  return baris;
}

/** Nilai sel ExcelJS → teks yang bisa divalidasi Zod. */
function selKeTeks(nilai: unknown): string {
  if (nilai === null || nilai === undefined) return "";
  if (nilai instanceof Date) return nilai.toISOString().slice(0, 10);
  if (typeof nilai === "object") {
    const obj = nilai as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.result === "string" || typeof obj.result === "number") return String(obj.result);
    if (Array.isArray(obj.richText)) {
      return (obj.richText as { text?: string }[]).map((bagian) => bagian.text ?? "").join("");
    }
    if (typeof obj.hyperlink === "string") return obj.hyperlink;
    if (typeof obj.error === "string") return "";
    return "";
  }
  return String(nilai);
}

/** Baca sheet pertama sebuah berkas XLSX menjadi baris teks. */
export async function bacaTabelXlsx(isi: Buffer): Promise<string[][]> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(isi as unknown as ArrayBuffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const baris: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const kolom: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, nomor) => {
      kolom[nomor - 1] = selKeTeks(cell.value).trim();
    });
    baris.push(kolom);
  });

  return baris;
}

/** Baca berkas impor (CSV/TXT/XLSX) menjadi tabel teks. */
export async function bacaTabelImpor(isi: Buffer, namaBerkas: string): Promise<string[][]> {
  const nama = namaBerkas.toLowerCase();
  if (nama.endsWith(".xlsx")) return bacaTabelXlsx(isi);

  const teks = isi.toString("utf8");
  return parseCsv(teks).map((baris) => baris.map((sel) => sel.trim()));
}

/** Apakah ekstensi berkas termasuk daftar impor yang didukung? */
export function ekstensiImporDidukung(namaBerkas: string): boolean {
  const nama = namaBerkas.toLowerCase();
  return EKSTENSI_IMPOR.some((ekstensi) => nama.endsWith(ekstensi));
}

/**
 * Petakan tabel teks ke baris terpilih berdasarkan definisi kolom.
 *
 * Baris pertama wajib berupa header. Kolom yang tidak dikenal diabaikan tetapi
 * dilaporkan agar pengguna tahu berkasnya tidak sepenuhnya terbaca. Baris kosong
 * dilewati; kolom wajib yang kosong dilaporkan sebagai galat per baris.
 */
export function petakanKolom<Kunci extends string>(
  tabel: string[][],
  kolom: readonly KolomImpor<Kunci>[],
): HasilImpor<Kunci> {
  if (tabel.length === 0) {
    return { baris: [], galat: [{ baris: 0, pesan: "Berkas kosong." }], headerTakDikenal: [] };
  }

  const header = tabel[0] ?? [];
  const data = tabel.slice(1);
  const petaKolom = new Map<number, Kunci>();
  const indeksDikenal = new Set<number>();
  const headerTakDikenal: string[] = [];

  const cariKolom = (nama: string): KolomImpor<Kunci> | undefined =>
    kolom.find(
      (item) =>
        normalisasiHeader(item.label) === normalisasiHeader(nama) ||
        (item.alias ?? []).some((alias) => normalisasiHeader(alias) === normalisasiHeader(nama)),
    );

  header.forEach((nama, indeks) => {
    const cocok = cariKolom(nama ?? "");
    if (cocok) {
      if (!petaKolom.has(indeks)) {
        petaKolom.set(indeks, cocok.kunci);
        indeksDikenal.add(indeks);
      }
    } else if ((nama ?? "").trim() !== "") {
      headerTakDikenal.push(nama.trim());
    }
  });

  const galat: GalatImpor[] = [];
  if (petaKolom.size === 0) {
    galat.push({
      baris: 0,
      pesan: `Header tidak dikenali. Kolom yang diharapkan: ${kolom.map((item) => item.label).join(", ")}.`,
    });
    return { baris: [], galat, headerTakDikenal };
  }

  const hasil: BarisImpor<Kunci>[] = [];
  const kolomTambahan = headerTambahan(header, petaKolom);

  data.forEach((isiBaris, indeksBaris) => {
    const nomorBaris = indeksBaris + 1;
    if (isiBaris.every((sel) => (sel ?? "").trim() === "")) return;

    const nilai = Object.fromEntries(kolom.map((item) => [item.kunci, ""])) as Record<
      Kunci,
      string
    >;
    for (const [indeks, kunci] of petaKolom) {
      nilai[kunci] = (isiBaris[indeks] ?? "").trim();
    }

    const kurang = kolom.filter((item) => item.wajib && nilai[item.kunci] === "");
    if (kurang.length > 0) {
      galat.push({
        baris: nomorBaris,
        pesan: `Kolom wajib kosong: ${kurang.map((item) => item.label).join(", ")}.`,
      });
      return;
    }

    const tambahan: Record<string, string> = {};
    for (const item of kolomTambahan) {
      const isi = (isiBaris[item.indeks] ?? "").trim();
      if (isi !== "") tambahan[item.nama] = isi;
    }

    hasil.push({ baris: nomorBaris, nilai, tambahan });
  });

  return { baris: hasil, galat, headerTakDikenal };
}

/** Sel CSV: kutip bila memuat pemisah, tanda kutip, atau baris baru. */
export function selCsv(nilai: string | number | null | undefined, delimiter = ","): string {
  const teks = nilai === null || nilai === undefined ? "" : String(nilai);
  if (teks.includes(delimiter) || teks.includes('"') || /[\r\n]/.test(teks)) {
    return `"${teks.replace(/"/g, '""')}"`;
  }
  return teks;
}

/** Template CSV berisi header saja, untuk diunduh pengguna sebelum mengisi. */
export function templateCsv<Kunci extends string>(
  kolom: readonly KolomImpor<Kunci>[],
  barisContoh: Partial<Record<Kunci, string>>[] = [],
): string {
  const header = kolom.map((item) => selCsv(item.label)).join(",");
  const contoh = barisContoh.map((baris) =>
    kolom.map((item) => selCsv(baris[item.kunci] ?? "")).join(","),
  );
  const semua = [header, ...contoh].join("\r\n");
  return `\uFEFF${semua}\r\n`;
}
