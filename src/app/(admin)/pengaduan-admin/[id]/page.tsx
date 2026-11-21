import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPengaduanDetailData } from "@/features/pengaduan/application/use-cases";
import {
  KATEGORI_PENGADUAN,
  STATUS_PENGADUAN,
  labelKategori,
  labelStatus,
} from "@/features/pengaduan/domain/pengaduan";

import { hapusPengaduanAction, simpanTanggapanPengaduanAction } from "../actions";

export const metadata: Metadata = { title: "Detail Pengaduan" };

function tanggal(value: Date | null): string {
  return value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(value) : "—";
}

export default async function DetailPengaduanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; berhasil?: string }>;
}) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const row = await getPengaduanDetailData(id);
  if (!row) notFound();

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div><span className="eyebrow">Layanan Warga · Pengaduan</span><h1>Detail Pengaduan</h1><p>{row.nomorTiket} · Dikirim {tanggal(row.createdAt)}</p></div>
        <Link className="button button-secondary" href="/pengaduan-admin">Kembali ke daftar</Link>
      </div>
      {query.error ? <p className="alert alert-info" role="alert">{query.error}</p> : null}
      {query.berhasil ? <p className="alert alert-info" role="status">{query.berhasil}</p> : null}
      <div className="modul-form-grid">
        <section className="modul-card">
          <div className="page-heading"><div><span className="eyebrow">{labelKategori(row.kategori)}</span><h2>{row.judul}</h2></div><strong>{labelStatus(row.status)}</strong></div>
          <p style={{ whiteSpace: "pre-wrap" }}>{row.isi}</p>
          {row.lampiran ? <p><a className="button button-secondary" href={`/pengaduan-admin/${row.id}/lampiran`}>Unduh lampiran bukti</a></p> : <p className="modul-muted">Tidak ada lampiran.</p>}
          <dl className="modul-detail-grid">
            <div><dt>Nama pelapor</dt><dd>{row.namaPelapor}</dd></div>
            <div><dt>NIK</dt><dd>{row.nik ?? "Tidak diisi"}</dd></div>
            <div><dt>Telepon</dt><dd>{row.telepon ?? "Tidak diisi"}</dd></div>
            <div><dt>Email</dt><dd>{row.email ?? "Tidak diisi"}</dd></div>
            <div><dt>Alamat</dt><dd>{row.alamat ?? "Tidak diisi"}</dd></div>
            <div><dt>Petugas</dt><dd>{row.petugasNama ?? "Belum ditugaskan"}</dd></div>
            <div><dt>Terakhir ditanggapi</dt><dd>{tanggal(row.ditanggapiPada)}</dd></div>
          </dl>
        </section>
        <section className="modul-card">
          <span className="eyebrow">Tindak lanjut</span><h2>Perbarui penanganan</h2>
          <form action={simpanTanggapanPengaduanAction} className="modul-form-grid">
            <input type="hidden" name="id" value={row.id} />
            <label className="modul-field">Status<select name="status" defaultValue={row.status}>{STATUS_PENGADUAN.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="modul-field">Tanggapan / hasil penanganan<textarea name="tanggapan" rows={7} maxLength={4000} defaultValue={row.tanggapan ?? ""} placeholder="Jelaskan tindak lanjut atau alasan penolakan..." /></label>
            <label className="modul-field"><span><input type="checkbox" name="publik" defaultChecked={row.publik} /> Izinkan tampil pada halaman publik</span><small>Nama pelapor akan disamarkan pada halaman publik.</small></label>
            <div className="modul-form-actions"><button className="button button-primary" type="submit">Simpan Tanggapan</button></div>
          </form>
          <hr />
          <form action={hapusPengaduanAction}>
            <input type="hidden" name="id" value={row.id} />
            <button className="button button-danger-ghost" type="submit">Hapus Pengaduan</button>
            <p className="modul-muted">Penghapusan menghapus data pengaduan dan lampiran yang tersimpan.</p>
          </form>
        </section>
      </div>
    </div>
  );
}
