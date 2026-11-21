import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPengajuanDetailData,
  listBerkasPengajuanAdminData,
} from "@/features/pelayanan/application/pengajuan-use-cases";

import { ubahStatusPengajuanAction, unggahHasilPengajuanAction } from "../actions";

const labels: Record<string, string> = {
  diajukan: "Menunggu",
  diverifikasi: "Diverifikasi",
  diproses: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};
const transitions: Record<string, string[]> = {
  diajukan: ["diverifikasi", "ditolak"],
  diverifikasi: ["diproses", "ditolak"],
  diproses: ["selesai", "ditolak"],
  selesai: [],
  ditolak: [],
};
const timeline = ["diajukan", "diverifikasi", "diproses", "selesai"];
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tersimpan?: string; hasil?: string }>;
}) {
  const p = await params,
    id = Number(p.id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const [d, semuaBerkas, s] = await Promise.all([
    getPengajuanDetailData(id),
    listBerkasPengajuanAdminData(id),
    searchParams,
  ]);
  const berkas = semuaBerkas.filter((file) => file.jenis === "persyaratan");
  const hasil = semuaBerkas.filter((file) => file.jenis === "hasil");
  const r = d.request,
    next = transitions[r.status] ?? [];
  const currentStep = timeline.indexOf(r.status);
  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Pelayanan Publik / Pengajuan</span>
          <h1>{r.nomorTiket}</h1>
          <p>Rincian pemohon, dokumen, riwayat, dan tindak lanjut petugas.</p>
        </div>
        <div className="page-heading-actions">
          <span className={"request-status request-status-" + r.status}>
            {labels[r.status] ?? r.status}
          </span>
          <Link className="button button-secondary" href="/pelayanan-publik/pengajuan">
            ← Kembali ke antrean
          </Link>
        </div>
      </div>
      {s.tersimpan ? (
        <div className="alert alert-info">Status pengajuan berhasil diperbarui.</div>
      ) : null}
      {s.hasil ? (
        <div className="alert alert-info">Dokumen hasil pelayanan berhasil diunggah.</div>
      ) : null}
      <section className="modul-card request-progress">
        <h2>Progres Pelayanan</h2>
        <div className="request-progress-track">
          {timeline.map((step, index) => (
            <div
              className={
                "request-progress-step " +
                (currentStep >= index && r.status !== "ditolak" ? "is-done" : "") +
                (r.status === "ditolak" && index === currentStep ? " is-rejected" : "")
              }
              key={step}
            >
              <span>{index + 1}</span>
              <strong>{labels[step]}</strong>
            </div>
          ))}
        </div>
        {r.status === "ditolak" ? (
          <p className="request-rejected-note">Pengajuan ditolak. {r.alasanPenolakan ?? ""}</p>
        ) : null}
      </section>
      <div className="request-detail-layout">
        <div className="request-detail-main">
          <section className="modul-card">
            <h2>Informasi Pemohon</h2>
            <div className="request-info-grid">
              <div>
                <small>Nama pemohon</small>
                <strong>{r.namaPemohon}</strong>
              </div>
              <div>
                <small>NIK</small>
                <strong>{r.nik ?? "—"}</strong>
              </div>
              <div>
                <small>Telepon</small>
                <strong>{r.telepon ?? "—"}</strong>
              </div>
              <div>
                <small>Email</small>
                <strong>{r.email ?? "—"}</strong>
              </div>
              <div>
                <small>Alamat</small>
                <strong>{r.alamat ?? "—"}</strong>
              </div>
              <div>
                <small>Tanggal pengajuan</small>
                <strong>{r.createdAt.toLocaleString("id-ID")}</strong>
              </div>
            </div>
            <div className="request-purpose">
              <small>Keperluan</small>
              <p>{r.keperluan}</p>
            </div>
          </section>
          <section className="modul-card">
            <h2>Informasi Layanan</h2>
            <div className="request-info-grid">
              <div>
                <small>Jenis layanan</small>
                <strong>{d.namaLayanan ?? "Layanan telah dihapus"}</strong>
              </div>
              <div>
                <small>Estimasi</small>
                <strong>
                  {d.estimasiHari ?? "—"}
                  {d.estimasiHari === null ? "" : " hari kerja"}
                </strong>
              </div>
              <div>
                <small>Biaya</small>
                <strong>
                  {d.biaya === null
                    ? "—"
                    : d.biaya === 0
                      ? "Gratis"
                      : d.biaya.toLocaleString("id-ID") + " rupiah"}
                </strong>
              </div>
              <div>
                <small>Status saat ini</small>
                <strong>{labels[r.status] ?? r.status}</strong>
              </div>
            </div>
          </section>
          <section className="modul-card">
            <h2>Dokumen Persyaratan</h2>
            {berkas.length ? (
              <ul className="request-file-list">
                {berkas.map((file) => (
                  <li key={file.id}>
                    <span>
                      <strong>{file.namaPersyaratan}</strong>
                      <small>
                        {file.namaAsli} · {(file.ukuran / 1024).toFixed(0)} KB
                      </small>
                    </span>
                    <a
                      className="button button-secondary"
                      href={"/api/admin/pelayanan-publik/pengajuan/" + id + "/berkas/" + file.id}
                    >
                      Unduh
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="modul-empty">Tidak ada dokumen persyaratan yang diunggah.</p>
            )}
          </section>
          <section className="modul-card">
            <h2>Hasil Pelayanan</h2>
            {hasil.length ? (
              <ul className="request-file-list">
                {hasil.map((file) => (
                  <li key={file.id}>
                    <span>
                      <strong>{file.namaAsli}</strong>
                      <small>{(file.ukuran / 1024).toFixed(0)} KB</small>
                    </span>
                    <a
                      className="button button-secondary"
                      href={"/api/admin/pelayanan-publik/pengajuan/" + id + "/berkas/" + file.id}
                    >
                      Unduh
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Belum ada dokumen hasil yang diterbitkan.</p>
            )}
            {["diproses", "selesai"].includes(r.status) ? (
              <form
                action={unggahHasilPengajuanAction}
                className="modul-form-grid"
                encType="multipart/form-data"
              >
                <input type="hidden" name="id" value={id} />
                <label className="modul-field">
                  <span>Unggah dokumen hasil (PDF, maksimal 10 file)</span>
                  <input
                    type="file"
                    name="dokumenHasil"
                    accept="application/pdf,.pdf"
                    multiple
                    required
                  />
                </label>
                <div>
                  <button className="button button-primary">＋ Unggah Hasil Pelayanan</button>
                </div>
              </form>
            ) : (
              <p>Dokumen hasil dapat diunggah saat pengajuan diproses atau selesai.</p>
            )}
          </section>
          <section className="modul-card">
            <h2>Riwayat Status</h2>
            {d.riwayat.length ? (
              <ol className="request-timeline">
                {[...d.riwayat].reverse().map((item) => (
                  <li key={item.id}>
                    <span className="request-timeline-dot" />
                    <div>
                      <strong>
                        {item.statusSebelumnya
                          ? labels[item.statusSebelumnya]
                          : "Permohonan dibuat"}{" "}
                        → {labels[item.statusBaru] ?? item.statusBaru}
                      </strong>
                      <p>{item.catatan ?? "Tidak ada catatan"}</p>
                      <small>{item.createdAt.toLocaleString("id-ID")}</small>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="modul-empty">Belum ada riwayat perubahan status.</p>
            )}
          </section>
        </div>
        <aside className="request-detail-aside">
          <section className="modul-card">
            <h2>Tindak Lanjut Petugas</h2>
            {next.length ? (
              <form action={ubahStatusPengajuanAction} className="request-action-form">
                <input type="hidden" name="id" value={id} />
                <label className="modul-field">
                  <span>Ubah status menjadi</span>
                  <select name="status" defaultValue={next[0]}>
                    {next.map((v) => (
                      <option key={v} value={v}>
                        {labels[v]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="modul-field">
                  <span>Catatan petugas</span>
                  <textarea
                    name="catatanPetugas"
                    rows={4}
                    defaultValue={r.catatanPetugas ?? ""}
                    placeholder="Tambahkan catatan proses…"
                  />
                </label>
                <label className="modul-field">
                  <span>Alasan penolakan (wajib jika ditolak)</span>
                  <textarea
                    name="alasanPenolakan"
                    rows={3}
                    defaultValue={r.alasanPenolakan ?? ""}
                  />
                </label>
                <button className="button button-primary">Simpan Perubahan Status</button>
              </form>
            ) : (
              <p className="modul-empty">
                <strong>Pengajuan ditutup</strong>
                <span>Status {labels[r.status] ?? r.status}; tidak ada tahapan lanjutan.</span>
              </p>
            )}
          </section>
          <section className="modul-card">
            <h2>Catatan Terakhir</h2>
            <p>{r.catatanPetugas ?? "Belum ada catatan petugas."}</p>
            {r.alasanPenolakan ? (
              <>
                <h3>Alasan Penolakan</h3>
                <p>{r.alasanPenolakan}</p>
              </>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
