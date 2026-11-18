import type { Metadata } from "next";

import { listBeritaAdminData } from "@/features/publik/application/konten-admin";

export const metadata: Metadata = {
  title: "Berita Desa",
};

const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function BeritaAdminPage() {
  const rows = await listBeritaAdminData();

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Publikasi</span>
          <h1>Berita Desa</h1>
          <p>{rows.length.toLocaleString("id-ID")} berita tersimpan pada desa ini.</p>
        </div>
      </div>

      <section className="modul-card">
        {rows.length === 0 ? (
          <p className="modul-empty">Belum ada berita yang ditulis.</p>
        ) : (
          <div className="modul-scroll">
            <table className="modul-table">
              <thead>
                <tr>
                  <th scope="col">Judul</th>
                  <th scope="col">Kategori</th>
                  <th scope="col">Terbit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.judul}</strong>
                      {row.ringkasan ? <span className="modul-muted">{row.ringkasan}</span> : null}
                    </td>
                    <td>
                      <span className="beranda-chip" data-tone="netral">
                        {row.kategori ?? "Umum"}
                      </span>
                    </td>
                    <td>
                      {row.terbitPada ? (
                        FORMAT_TANGGAL.format(row.terbitPada)
                      ) : (
                        <span className="modul-muted">Belum terbit</span>
                      )}
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
