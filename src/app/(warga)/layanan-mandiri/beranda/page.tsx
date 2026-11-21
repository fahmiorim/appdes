import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { ambilProfilWargaData } from "@/features/layanan-mandiri/application/profil-warga-use-cases";
import {
  daftarDokumenWargaData,
  listJenisSuratWargaData,
  listPermohonanWargaData,
} from "@/features/layanan-mandiri/application/warga-use-cases";
import { labelJenisDokumen } from "@/features/layanan-mandiri/domain/dokumen-warga";
import { labelPermohonanStatus } from "@/features/layanan-mandiri/domain/layanan-mandiri";
import { listPengajuanLayananWargaData } from "@/features/pelayanan/application/pengajuan-warga-use-cases";
import { getSurveiWargaPageData } from "@/features/pelayanan/application/survei-use-cases";
import { verifyWargaPage } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Beranda Layanan Warga",
  robots: { index: false, follow: false },
};

const PERMOHONAN_DITAMPILKAN = 8;
const DOKUMEN_DITAMPILKAN = 8;

function formatTanggal(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(value);
}

/**
 * Beranda warga: ringkasan profil, permohonan, dokumen, dan jenis surat aktif.
 *
 * Semua data berasal dari use case yang membatasi query pada `residentId` sesi.
 * Halaman ini adalah target redirect `verifyWargaPage`, sehingga warga dengan
 * PIN sementara dialihkan ke `/layanan-mandiri/ubah-pin` lebih dulu.
 */
export default async function BerandaWargaPage() {
  const user = await verifyWargaPage();
  const [
    { profil, mustChangePin },
    permohonan,
    dokumen,
    jenisSurat,
    pengajuanLayanan,
    surveiAktif,
  ] = await Promise.all([
    ambilProfilWargaData(),
    listPermohonanWargaData(),
    daftarDokumenWargaData(),
    listJenisSuratWargaData(),
    listPengajuanLayananWargaData(),
    getSurveiWargaPageData(),
  ]);

  const permohonanAktif = permohonan.filter((row) => row.status !== 4 && row.status !== 5).length;

  return (
    <main className="page-container warga-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Layanan mandiri</span>
          <h1>Selamat datang, {user.name.split(" ")[0]}</h1>
          <p>Ringkasan permohonan surat dan dokumen pribadi Anda.</p>
        </div>
        <Link className="button button-secondary" href="/layanan-mandiri/ubah-pin">
          Ubah PIN
        </Link>
      </div>

      {mustChangePin ? (
        <Alert variant="info">
          Anda masih memakai PIN sementara. Ganti PIN terlebih dahulu sebelum mengajukan surat.{" "}
          <Link href="/layanan-mandiri/ubah-pin">Ubah PIN sekarang</Link>.
        </Alert>
      ) : null}

      {profil === null ? (
        <Alert variant="error">
          Data penduduk untuk akun ini tidak ditemukan pada desa aktif. Hubungi administrator desa.
        </Alert>
      ) : (
        <div className="stats-grid">
          <Card>
            <div className="stat-card-label">Nama</div>
            <div className="stat-card-value">{profil.name}</div>
            <div className="stat-card-note">NIK {profil.nationalId ?? "belum tercatat"}</div>
          </Card>
          <Card>
            <div className="stat-card-label">Permohonan aktif</div>
            <div className="stat-card-value">{permohonanAktif.toLocaleString("id-ID")}</div>
            <div className="stat-card-note">
              Dari {permohonan.length.toLocaleString("id-ID")} permohonan yang tercatat
            </div>
          </Card>
          <Card>
            <div className="stat-card-label">Dokumen tersimpan</div>
            <div className="stat-card-value">{dokumen.length.toLocaleString("id-ID")}</div>
            <div className="stat-card-note">
              {jenisSurat.length.toLocaleString("id-ID")} jenis surat aktif
            </div>
          </Card>
        </div>
      )}

      {profil !== null ? (
        <section className="dashboard-section">
          <h2>Data kependudukan</h2>
          <p>
            {profil.familyNumber
              ? `Kartu Keluarga ${profil.familyNumber}`
              : "Nomor KK belum tercatat"}
            {profil.regionLabel ? ` · ${profil.regionLabel}` : ""}
            {profil.address ? ` · ${profil.address}` : ""}
          </p>
        </section>
      ) : null}

      <section className="dashboard-section">
        <div className="page-heading">
          <div>
            <h2>Pengajuan layanan publik</h2>
            <p>Pengajuan layanan administrasi dan layanan publik desa.</p>
          </div>
          <Link className="button button-primary" href="/layanan-mandiri/pengajuan/baru">
            Ajukan Layanan
          </Link>
        </div>
        {pengajuanLayanan.length === 0 ? (
          <p>Belum ada pengajuan layanan publik.</p>
        ) : (
          <div className="tenant-table-scroll" style={{ marginTop: 14 }}>
            <table className="tenant-table">
              <thead>
                <tr>
                  <th>Tiket</th>
                  <th>Layanan</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {pengajuanLayanan.slice(0, 8).map((row) => (
                  <tr key={row.id}>
                    <td>{row.nomorTiket}</td>
                    <td>{row.namaLayanan ?? "Layanan"}</td>
                    <td>{row.status}</td>
                    <td>{formatTanggal(row.createdAt)}</td>
                    <td>
                      <Link href={`/layanan-mandiri/pengajuan/${row.id}`}>Lihat</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <div className="page-heading">
          <div>
            <h2>Survei & Kepuasan Masyarakat</h2>
            <p>Bantu desa meningkatkan kualitas pelayanan dengan mengisi survei yang tersedia.</p>
          </div>
          <Link className="button button-primary" href="/layanan-mandiri/survei">
            Lihat Survei
          </Link>
        </div>
        {surveiAktif.length === 0 ? (
          <p>Belum ada survei yang sedang dibuka.</p>
        ) : (
          <ul>
            {surveiAktif.slice(0, 5).map((item) => (
              <li key={item.id}>
                <strong>{item.judul}</strong>
                {item.deskripsi ? " — " + item.deskripsi : ""}{" "}
                <Link href={"/layanan-mandiri/survei/" + item.id}>Isi survei</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Permohonan surat</h2>
        <p>Status diperbarui oleh operator desa sesuai tahapan pelayanan.</p>
        {permohonan.length === 0 ? (
          <p>Belum ada permohonan. Ajukan surat melalui kantor desa atau petugas layanan.</p>
        ) : (
          <div className="tenant-table-scroll" style={{ marginTop: 14 }}>
            <table className="tenant-table">
              <thead>
                <tr>
                  <th scope="col">Jenis surat</th>
                  <th scope="col">Nomor antrean</th>
                  <th scope="col">Status</th>
                  <th scope="col">Diajukan</th>
                  <th scope="col">Surat</th>
                </tr>
              </thead>
              <tbody>
                {permohonan.slice(0, PERMOHONAN_DITAMPILKAN).map((row) => (
                  <tr key={row.id}>
                    <td>{row.namaSurat ?? "Jenis surat tidak ditemukan"}</td>
                    <td>{row.noAntrian ?? "—"}</td>
                    <td>{labelPermohonanStatus(row.status)}</td>
                    <td>{formatTanggal(row.createdAt)}</td>
                    <td>
                      {row.letterId !== null ? (
                        <Link href={`/layanan-mandiri/surat/${row.letterId}/pdf`}>Unduh PDF</Link>
                      ) : (
                        "Belum terbit"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Dokumen pribadi</h2>
        <p>Dokumen disimpan pada penyimpanan privat dan hanya dapat diunduh oleh pemilik akun.</p>
        {dokumen.length === 0 ? (
          <p>Belum ada dokumen tersimpan.</p>
        ) : (
          <div className="tenant-table-scroll" style={{ marginTop: 14 }}>
            <table className="tenant-table">
              <thead>
                <tr>
                  <th scope="col">Nama dokumen</th>
                  <th scope="col">Jenis</th>
                  <th scope="col">Sumber</th>
                  <th scope="col">Diunggah</th>
                  <th scope="col">Berkas</th>
                </tr>
              </thead>
              <tbody>
                {dokumen.slice(0, DOKUMEN_DITAMPILKAN).map((row) => (
                  <tr key={row.id}>
                    <td>{row.nama}</td>
                    <td>{labelJenisDokumen(row.jenis)}</td>
                    <td>{row.sumber === "operator" ? "Operator desa" : "Unggahan saya"}</td>
                    <td>{formatTanggal(row.createdAt)}</td>
                    <td>
                      <Link href={`/layanan-mandiri/dokumen/${row.id}/berkas`}>Unduh</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Jenis surat yang tersedia</h2>
        {jenisSurat.length === 0 ? (
          <p>Belum ada jenis surat aktif di desa ini.</p>
        ) : (
          <ul>
            {jenisSurat.map((item) => (
              <li key={item.id}>
                <strong>{item.nama}</strong>
                {item.syarat.length > 0
                  ? ` — syarat: ${item.syarat.map((syarat) => syarat.nama).join(", ")}`
                  : " — tanpa syarat berkas"}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
