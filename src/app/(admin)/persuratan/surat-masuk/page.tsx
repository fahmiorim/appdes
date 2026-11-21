import Link from "next/link";

import { getBukuAgendaData } from "@/features/surat/application/buku-agenda-use-cases";

import { hapusSuratMasukAction } from "../buku-agenda-actions";

export const metadata = { title: "Surat Masuk" };
export default async function SuratMasukPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; berhasil?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").slice(0, 100);
  const { rows, canCreate, canUpdate, canDelete } = await getBukuAgendaData("masuk", q);
  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administrasi Surat</span>
          <h1>Surat Masuk</h1>
          <p>Buku agenda surat yang diterima oleh pemerintah desa.</p>
        </div>
        {canCreate ? (
          <Link className="button button-primary" href="/persuratan/surat-masuk/baru">
            ＋ Tambah Surat Masuk
          </Link>
        ) : null}
      </div>
      {params.berhasil ? (
        <div className="alert alert-info">Perubahan data surat masuk berhasil.</div>
      ) : null}
      <section className="modul-card">
        <form method="get" className="modul-filter-row">
          <input name="q" defaultValue={q} placeholder="Cari nomor surat, pengirim, ringkasan…" />
          <button className="button button-secondary">Cari</button>
        </form>
        <div className="modul-scroll">
          <table className="modul-table">
            <thead>
              <tr>
                <th>No. Agenda</th>
                <th>Nomor Surat</th>
                <th>Diterima</th>
                <th>Pengirim</th>
                <th>Klasifikasi</th>
                <th>Ringkasan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.agendaNumber}</td>
                  <td className="modul-mono">{row.letterNumber}</td>
                  <td>{row.receivedDate}</td>
                  <td>{row.sender ?? "—"}</td>
                  <td>{row.classificationName ?? "—"}</td>
                  <td>{row.summary ?? "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      {canUpdate ? (
                        <Link
                          className="button button-secondary"
                          href={`/persuratan/surat-masuk/${row.id}/edit`}
                        >
                          Ubah
                        </Link>
                      ) : null}
                      {canDelete ? (
                        <form action={hapusSuratMasukAction}>
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
        {rows.length === 0 ? <p className="modul-empty">Belum ada surat masuk.</p> : null}
      </section>
    </div>
  );
}
