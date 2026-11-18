import type { Metadata } from "next";

import { listSuratWithMeta } from "@/features/surat/application/surat-use-cases";
import { LETTER_STATUS_LABELS } from "@/features/surat/domain/surat";

export const metadata: Metadata = {
  title: "Administrasi Surat",
};

const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function SuratPage() {
  const hasil = await listSuratWithMeta({ search: "", status: null, page: 1 });

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administrasi</span>
          <h1>Administrasi Surat</h1>
          <p>{hasil.total.toLocaleString("id-ID")} surat tercatat pada desa ini.</p>
        </div>
      </div>

      <section className="modul-card">
        {hasil.rows.length === 0 ? (
          <p className="modul-empty">Belum ada surat yang dibuat.</p>
        ) : (
          <div className="modul-scroll">
            <table className="modul-table">
              <thead>
                <tr>
                  <th scope="col">Nomor</th>
                  <th scope="col">Jenis surat</th>
                  <th scope="col">Pemohon</th>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {hasil.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="modul-mono">{row.number ?? "—"}</td>
                    <td>
                      <strong>{row.typeName}</strong>
                      {row.purpose ? <span className="modul-muted">{row.purpose}</span> : null}
                    </td>
                    <td>{row.residentName ?? "—"}</td>
                    <td>{FORMAT_TANGGAL.format(new Date(`${row.letterDate}T00:00:00`))}</td>
                    <td>
                      <span className="beranda-chip" data-tone="netral">
                        {LETTER_STATUS_LABELS[row.status]}
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
