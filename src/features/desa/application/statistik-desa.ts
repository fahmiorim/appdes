import {
  queryJumlahSuratTerbit,
  queryStatistikDesa,
  querySuratTerbitTerbaru,
} from "@/features/desa/infrastructure/statistik-desa-repository";

/**
 * Statistik ringkas desa untuk situs publik.
 *
 * Semua query dibatasi `villageId` dari host sehingga satu basis kode dapat
 * melayani banyak desa tanpa kebocoran data antar-tenant.
 */
export interface StatistikDesa {
  total: number;
  lakiLaki: number;
  perempuan: number;
  keluarga: number;
  perDusun: { label: string; total: number }[];
}

export async function getStatistikDesa(villageId: number): Promise<StatistikDesa> {
  const { ringkas, keluarga, perDusun } = await queryStatistikDesa(villageId);

  return {
    total: ringkas?.total ?? 0,
    lakiLaki: Number(ringkas?.lakiLaki ?? 0),
    perempuan: Number(ringkas?.perempuan ?? 0),
    keluarga,
    perDusun: perDusun.map((row) => ({
      label: row.dusun?.trim() || "Belum diisi",
      total: row.total,
    })),
  };
}

export interface SuratPublikRow {
  id: number;
  jenisSurat: string | null;
  tanggalLabel: string | null;
}

const TANGGAL_FORMAT = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

/** Surat terbit terbaru untuk ditampilkan di beranda publik. */
export async function listSuratTerbitTerbaru(
  villageId: number,
  limit = 5,
): Promise<SuratPublikRow[]> {
  const rows = await querySuratTerbitTerbaru(villageId, limit);

  return rows.map((row) => {
    const tanggal = row.issuedAt ?? row.createdAt;
    return {
      id: row.id,
      jenisSurat: row.typeName ?? null,
      tanggalLabel: tanggal ? TANGGAL_FORMAT.format(tanggal) : null,
    };
  });
}

/** Banyaknya surat terbit; dipakai kartu statistik layanan. */
export async function countSuratTerbit(villageId: number): Promise<number> {
  return queryJumlahSuratTerbit(villageId);
}
