import Link from "next/link";

import { getSuratDinasData } from "@/features/surat/application/surat-dinas-use-cases";

import { hapusSuratDinasAction } from "./actions";

export const metadata = { title: "Surat Dinas" };

export default async function SuratDinasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; berhasil?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").slice(0, 100);
  const { rows, canCreate, canUpdate, canDelete } = await getSuratDinasData(q);
  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administrasi Surat</span>
          <h1>Surat Dinas</h1>
          <p>Kelola surat resmi perangkat desa untuk instansi, lembaga, dan keperluan kedinasan.</p>
        </div>
        {canCreate ? (
          <Link className="button button-primary" href="/persuratan/surat-dinas/baru">
            ＋ Buat Surat Dinas
          </Link>
        ) : null}
      </div>
      {params.berhasil ? (
        <div className="alert alert-info">Perubahan data surat dinas berhasil.</div>
      ) : null}
      <section className="modul-card">
        <form method="get" className="modul-filter-row">
          <input name="q" defaultValue={q} placeholder="Cari nomor, perihal, penerima…" />
          <button className="button button-secondary">Cari</button>
        </form>
        <div className="modul-scroll">
          <table className="modul-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Nomor Surat</th>
                <th>Perihal</th>
                <th>Penerima</th>
                <th>Klasifikasi</th>
                <th>Arsip</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.letterDate}</td>
                  <td className="modul-mono">{row.letterNumber}</td>
                  <td>{row.subject}</td>
                  <td>{row.recipient ?? "—"}</td>
                  <td>{row.classificationName ?? "—"}</td>
                  <td>
                    {row.archiveFile ? (
                      <Link
                        className="table-action-link"
                        href={`/api/admin/persuratan/surat-dinas/${row.id}/lampiran`}
                        target="_blank"
                      >
                        Lihat PDF →
                      </Link>
                    ) : (
                      (row.archiveLocation ?? "—")
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      {canUpdate ? (
                        <Link
                          className="button button-secondary"
                          href={`/persuratan/surat-dinas/${row.id}/edit`}
                        >
                          Ubah
                        </Link>
                      ) : null}
                      {canDelete ? (
                        <form action={hapusSuratDinasAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <button className="button button-danger-ghost" type="submit">
                            Hapus
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <p className="modul-empty">Belum ada surat dinas.</p> : null}
      </section>
    </div>
  );
}
