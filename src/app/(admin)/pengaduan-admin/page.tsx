import type { Metadata } from "next";

import { listPengaduanData } from "@/features/pengaduan/application/use-cases";
import { labelStatus } from "@/features/pengaduan/domain/pengaduan";

export const metadata: Metadata = {
  title: "Pengaduan Warga",
};

const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function PengaduanAdminPage() {
  const rows = await listPengaduanData({});
  const baru = rows.filter((row) => row.status === "baru").length;

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Layanan Warga</span>
          <h1>Pengaduan Warga</h1>
          <p>
            {rows.length.toLocaleString("id-ID")} pengaduan masuk · {baru.toLocaleString("id-ID")}{" "}
            belum ditangani.
          </p>
        </div>
      </div>

      <section className="modul-card">
        {rows.length === 0 ? (
          <p className="modul-empty">Belum ada pengaduan dari warga.</p>
        ) : (
          <div className="modul-scroll">
            <table className="modul-table">
              <thead>
                <tr>
                  <th scope="col">Tiket</th>
                  <th scope="col">Judul</th>
                  <th scope="col">Pelapor</th>
                  <th scope="col">Masuk</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="modul-mono">{row.nomorTiket}</td>
                    <td>
                      <strong>{row.judul}</strong>
                      {row.petugasNama ? (
                        <span className="modul-muted">Ditangani {row.petugasNama}</span>
                      ) : null}
                    </td>
                    <td>{row.namaPelapor}</td>
                    <td>{row.createdAt ? FORMAT_TANGGAL.format(row.createdAt) : "—"}</td>
                    <td>
                      <span
                        className="beranda-chip"
                        data-tone={row.status === "baru" ? "peringatan" : "netral"}
                      >
                        {labelStatus(row.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
