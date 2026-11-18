import type { Metadata } from "next";

import { listKeuangan } from "@/features/keuangan/application/keuangan-use-cases";
import { formatRupiah } from "@/features/keuangan/domain/keuangan";

export const metadata: Metadata = {
  title: "Keuangan Desa",
};

export default async function KeuanganPage() {
  const data = await listKeuangan();
  const akun = data.rows;

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Perencanaan</span>
          <h1>Keuangan Desa</h1>
          <p>
            {data.tersedia
              ? `APBDes tahun anggaran ${data.tahun}.`
              : `Belum ada APBDes untuk tahun ${data.tahun}.`}
          </p>
        </div>
      </div>

      <section className="modul-card">
        {akun.length === 0 ? (
          <p className="modul-empty">
            Anggaran desa belum disusun. Data akan tampil setelah APBDes diisi.
          </p>
        ) : (
          <div className="modul-scroll">
            <table className="modul-table">
              <thead>
                <tr>
                  <th scope="col">Uraian</th>
                  <th scope="col" className="modul-angka">
                    Anggaran
                  </th>
                  <th scope="col" className="modul-angka">
                    Realisasi
                  </th>
                </tr>
              </thead>
              <tbody>
                {akun.map((row) => (
                  <tr key={row.templateUuid}>
                    <td>
                      <span
                        className={row.level === 1 ? "modul-strong" : undefined}
                        style={{ paddingLeft: (row.level - 1) * 16 }}
                      >
                        {row.uraian}
                      </span>
                    </td>
                    <td className="modul-angka">{formatRupiah(row.anggaran)}</td>
                    <td className="modul-angka">{formatRupiah(row.realisasi)}</td>
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
