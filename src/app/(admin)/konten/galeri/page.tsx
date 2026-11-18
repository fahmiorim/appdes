import type { Metadata } from "next";

import { listGaleriAdminData } from "@/features/publik/application/konten-admin";

export const metadata: Metadata = {
  title: "Galeri Desa",
};

export default async function GaleriAdminPage() {
  const rows = await listGaleriAdminData();
  const totalFoto = rows.reduce((jumlah, row) => jumlah + row.jumlahFoto, 0);

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Publikasi</span>
          <h1>Galeri Desa</h1>
          <p>
            {rows.length.toLocaleString("id-ID")} album · {totalFoto.toLocaleString("id-ID")} foto.
          </p>
        </div>
      </div>

      <section className="modul-card">
        {rows.length === 0 ? (
          <p className="modul-empty">Belum ada album galeri yang dibuat.</p>
        ) : (
          <div className="modul-scroll">
            <table className="modul-table">
              <thead>
                <tr>
                  <th scope="col">Album</th>
                  <th scope="col">Keterangan</th>
                  <th scope="col">Foto</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.nama}</strong>
                    </td>
                    <td>{row.keterangan ?? "—"}</td>
                    <td>
                      <span className="beranda-chip" data-tone="netral">
                        {row.jumlahFoto} foto
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
