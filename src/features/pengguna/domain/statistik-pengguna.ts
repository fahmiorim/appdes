export interface BarisStatistikPengguna {
  active: boolean;
  roleId: number | null;
}

export interface StatistikPengguna {
  total: number;
  aktif: number;
  nonaktif: number;
  /** Jumlah pengguna per `roleId`; role tanpa anggota tidak muncul. */
  perRole: Readonly<Record<number, number>>;
}

/**
 * Hitung ringkasan pengguna desa dari daftar yang sudah dibatasi tenant.
 *
 * Fungsi murni agar halaman tidak menghitung ulang dengan cara berbeda dan
 * hasilnya bisa diuji tanpa database.
 */
export function hitungStatistikPengguna(
  rows: readonly BarisStatistikPengguna[],
): StatistikPengguna {
  const perRole: Record<number, number> = {};
  let aktif = 0;

  for (const row of rows) {
    if (row.active) aktif += 1;
    if (row.roleId !== null) perRole[row.roleId] = (perRole[row.roleId] ?? 0) + 1;
  }

  return {
    total: rows.length,
    aktif,
    nonaktif: rows.length - aktif,
    perRole,
  };
}
