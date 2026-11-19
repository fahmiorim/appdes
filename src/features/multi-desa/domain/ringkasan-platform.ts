/**
 * Agregasi ringkasan platform untuk dashboard Super Admin.
 *
 * Semua input berasal dari baris tenant yang sudah diotorisasi dan dimuat
 * halaman. Modul ini murni: tidak menyentuh database dan tidak memakai deret
 * atau angka contoh.
 */

export interface DistribusiPlatformItem {
  /** Label unik yang ditampilkan di legenda/daftar. */
  readonly label: string;
  /** Jumlah tenant pada kelompok ini. */
  readonly value: number;
  /** Persentase terhadap seluruh tenant, dibulatkan ke bilangan bulat. */
  readonly persentase: number;
}

export interface DistribusiKecamatan {
  readonly items: readonly DistribusiPlatformItem[];
  readonly total: number;
  /** Tenant yang kecamatannya kosong atau belum diisi. */
  readonly tanpaKecamatan: number;
}

export interface DistribusiTema {
  readonly items: readonly DistribusiPlatformItem[];
  readonly total: number;
  /** Tenant dengan tema aktif. */
  readonly bertema: number;
  /** Tenant tanpa baris tema aktif. */
  readonly tanpaTema: number;
  /** Jumlah slug tema berbeda yang benar-benar dipakai tenant. */
  readonly temaUnik: number;
}

export interface BarisTemaPlatform {
  readonly tema: string | null;
  readonly temaNama: string | null;
}

export interface BarisKecamatanPlatform {
  readonly district: string | null;
}

interface Kelompok {
  readonly kunci: string;
  readonly label: string;
}

function batasiJumlah(batas: number): number {
  if (!Number.isFinite(batas)) return 5;
  return Math.min(Math.max(Math.trunc(batas), 1), 20);
}

function persentase(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

/**
 * Kelompokkan nilai, urutkan dari yang terbanyak, lalu gabungkan sisanya.
 * `ambil` harus mengembalikan kunci stabil dan label bersih, atau `null`.
 */
function rangkum(
  rows: readonly unknown[],
  ambil: (row: unknown) => Kelompok | null,
  batas: number,
  labelSisa: string,
): {
  items: DistribusiPlatformItem[];
  total: number;
  tanpaData: number;
  jumlahKelompok: number;
} {
  const hitung = new Map<string, { label: string; value: number }>();
  let tanpaData = 0;

  for (const row of rows) {
    const kelompok = ambil(row);
    if (kelompok === null) {
      tanpaData += 1;
      continue;
    }
    const sebelumnya = hitung.get(kelompok.kunci);
    if (sebelumnya) {
      sebelumnya.value += 1;
    } else {
      hitung.set(kelompok.kunci, { label: kelompok.label, value: 1 });
    }
  }

  const urut = [...hitung.values()].sort(
    (a, b) => b.value - a.value || a.label.localeCompare(b.label, "id-ID"),
  );
  const teratas = urut.slice(0, batas);
  const sisa = urut.slice(batas).reduce((total, item) => total + item.value, 0);
  const items = teratas.map((item) => ({
    label: item.label,
    value: item.value,
    persentase: persentase(item.value, rows.length),
  }));

  if (sisa > 0) {
    items.push({ label: labelSisa, value: sisa, persentase: persentase(sisa, rows.length) });
  }

  return { items, total: rows.length, tanpaData, jumlahKelompok: urut.length };
}

/** Distribusi tenant per kecamatan, termasuk kelompok "Kecamatan lain". */
export function distribusiKecamatan(
  rows: readonly BarisKecamatanPlatform[],
  batas = 5,
): DistribusiKecamatan {
  const hasil = rangkum(
    rows,
    (row) => {
      const nilai = (row as BarisKecamatanPlatform).district?.trim();
      return nilai ? { kunci: nilai, label: nilai } : null;
    },
    batasiJumlah(batas),
    "Kecamatan lain",
  );

  return {
    items: hasil.items,
    total: hasil.total,
    tanpaKecamatan: hasil.tanpaData,
  };
}

/**
 * Distribusi tema publik yang sedang aktif per tenant.
 *
 * Tema dihitung per slug, bukan per nama, agar dua tenant dengan nama tampilan
 * sama tetapi slug berbeda tidak tergabung. Label memakai nama tema bila ada,
 * dengan slug sebagai cadangan agar entri lama tetap terbaca.
 */
export function distribusiTema(rows: readonly BarisTemaPlatform[], batas = 5): DistribusiTema {
  const hasil = rangkum(
    rows,
    (row) => {
      const baris = row as BarisTemaPlatform;
      const slug = baris.tema?.trim();
      if (!slug) return null;
      const nama = baris.temaNama?.trim();
      return { kunci: slug, label: nama || slug };
    },
    batasiJumlah(batas),
    "Tema lain",
  );

  return {
    items: hasil.items,
    total: hasil.total,
    bertema: rows.length - hasil.tanpaData,
    tanpaTema: hasil.tanpaData,
    temaUnik: hasil.jumlahKelompok,
  };
}
