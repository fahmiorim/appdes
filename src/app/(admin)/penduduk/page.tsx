import type { Metadata } from "next";

import { listPenduduk } from "@/features/penduduk/application/use-cases";
import {
  filterPendudukKosong,
  GENDER_LABELS,
  LIFE_STATUS_LABELS,
} from "@/features/penduduk/domain/penduduk";

export const metadata: Metadata = {
  title: "Data Penduduk",
};

/** NIK disamarkan pada daftar agar layar tidak memaparkan data pribadi penuh. */
function samarkanNik(nik: string | null): string {
  if (!nik) return "—";
  if (nik.length < 8) return "••••••••";
  return `${nik.slice(0, 6)}••••••${nik.slice(-2)}`;
}

export default async function PendudukPage() {
  const hasil = await listPenduduk({
    filter: filterPendudukKosong(),
    page: 1,
    pageSize: 25,
  });

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Kependudukan</span>
          <h1>Data Penduduk</h1>
          <p>
            {hasil.total.toLocaleString("id-ID")} penduduk terdaftar. NIK disamarkan pada daftar
            ini.
          </p>
        </div>
      </div>

      <section className="modul-card">
        {hasil.rows.length === 0 ? (
          <p className="modul-empty">Belum ada data penduduk pada desa ini.</p>
        ) : (
          <div className="modul-scroll">
            <table className="modul-table">
              <thead>
                <tr>
                  <th scope="col">Nama</th>
                  <th scope="col">NIK</th>
                  <th scope="col">Jenis kelamin</th>
                  <th scope="col">Wilayah</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {hasil.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      {row.familyNumber ? (
                        <span className="modul-muted">KK {row.familyNumber}</span>
                      ) : null}
                    </td>
                    <td className="modul-mono">{samarkanNik(row.nationalId)}</td>
                    <td>{GENDER_LABELS[row.gender]}</td>
                    <td>{row.regionLabel ?? "Belum diisi"}</td>
                    <td>
                      <span className="beranda-chip" data-tone="netral">
                        {LIFE_STATUS_LABELS[row.lifeStatus]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasil.pageCount > 1 ? (
          <p className="modul-total">
            Halaman {hasil.page} dari {hasil.pageCount} · {hasil.pageSize} baris per halaman
          </p>
        ) : null}
      </section>
    </div>
  );
}
