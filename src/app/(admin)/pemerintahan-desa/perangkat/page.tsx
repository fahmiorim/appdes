import Link from "next/link";

import { getPerangkatDesaData } from "@/features/pemerintahan/application/use-cases";

import {
  hapusDokumenPemerintahanAction,
  hapusJabatanAction,
  hapusPerangkatAction,
  hapusRiwayatAction,
  simpanJabatanAction,
  simpanPerangkatAction,
  simpanRiwayatAction,
  ubahDokumenPemerintahanAction,
  unggahDokumenPemerintahanAction,
} from "../actions";

export const metadata = { title: "Perangkat Desa" };

export default async function PerangkatDesaPage() {
  const { rows, jabatan, riwayat, dokumen } = await getPerangkatDesaData();
  const active = rows.filter((row) => row.status === "aktif").length;
  return (
    <div className="modul-page pemerintahan-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">PEMERINTAHAN DESA</span>
          <h1>Perangkat Desa</h1>
          <p>
            Kelola data perangkat, jabatan, status kepegawaian, masa jabatan, dan dokumen pendukung.
          </p>
        </div>
        <Link className="button button-secondary" href="/pemerintahan-desa">
          ← Dashboard
        </Link>
      </header>
      <nav className="pemerintahan-tabs">
        <Link href="/pemerintahan-desa">Dashboard Pemerintahan</Link>
        <Link className="active" href="/pemerintahan-desa/perangkat">
          Perangkat Desa
        </Link>
        <Link href="/pemerintahan-desa/lembaga">Lembaga & BPD</Link>
        <Link href="/pemerintahan-desa/wilayah">Wilayah & Organisasi</Link>
      </nav>
      <section className="pemerintahan-metrics compact">
        <article className="pemerintahan-metric pemerintahan-metric-primary">
          <span>Total Perangkat</span>
          <strong>{rows.length} orang</strong>
          <small>Seluruh status</small>
        </article>
        <article className="pemerintahan-metric">
          <span>Aktif</span>
          <strong>{active}</strong>
        </article>
        <article className="pemerintahan-metric">
          <span>Nonaktif</span>
          <strong>{rows.length - active}</strong>
        </article>
        <article className="pemerintahan-metric">
          <span>Jabatan Terdaftar</span>
          <strong>{jabatan.length}</strong>
        </article>
      </section>
      <section className="modul-card">
        <div className="pemerintahan-card-heading">
          <div>
            <h2>Jabatan & Tugas</h2>
            <p>
              Master jabatan digunakan bersama pada profil dan struktur organisasi perangkat desa.
            </p>
          </div>
        </div>
        <form action={simpanJabatanAction} className="pemerintahan-form compact-form">
          <label>
            Nama Jabatan
            <input name="nama" required placeholder="Kepala Desa / Sekretaris Desa / Kaur" />
          </label>
          <label>
            Urutan
            <input name="urut" type="number" defaultValue="0" />
          </label>
          <div className="pemerintahan-form-actions">
            <button className="button button-primary" type="submit">
              Tambah Jabatan
            </button>
          </div>
        </form>
        <div className="pemerintahan-layer-list">
          {jabatan.map((item) => (
            <details key={item.id}>
              <summary>{item.nama}</summary>
              <form action={simpanJabatanAction} className="pemerintahan-form compact-form">
                <input type="hidden" name="id" value={item.id} />
                <label>
                  Nama Jabatan
                  <input name="nama" defaultValue={item.nama} required />
                </label>
                <label>
                  Urutan
                  <input name="urut" type="number" defaultValue="0" />
                </label>
                <button className="button button-primary" type="submit">
                  Simpan Jabatan
                </button>
              </form>
              <form action={hapusJabatanAction}>
                <input type="hidden" name="id" value={item.id} />
                <button className="button button-danger-ghost" type="submit">
                  Hapus Jabatan
                </button>
              </form>
            </details>
          ))}
        </div>
      </section>
      <section className="modul-card pemerintahan-form-card">
        <h2>Tambah Perangkat Desa</h2>
        <form
          action={simpanPerangkatAction}
          encType="multipart/form-data"
          className="pemerintahan-form"
        >
          <label>
            Nama Lengkap
            <input name="nama" required maxLength={100} />
          </label>
          <label>
            Gelar Depan
            <input name="gelarDepan" />
          </label>
          <label>
            Gelar Belakang
            <input name="gelarBelakang" />
          </label>
          <label>
            Jabatan
            <select name="jabatanId" defaultValue="">
              <option value="">Pilih jabatan</option>
              {jabatan.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nama}
                </option>
              ))}
            </select>
          </label>
          <label>
            Atasan Langsung
            <select name="atasanId" defaultValue="">
              <option value="">Tidak ada / Kepala Desa</option>
              {rows
                .filter((x) => x.status === "aktif")
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nama} — {x.jabatan}
                  </option>
                ))}
            </select>
          </label>
          <label>
            NIP
            <input name="nip" />
          </label>
          <label>
            NIK (internal)
            <input name="nik" maxLength={16} />
          </label>
          <label>
            Jenis Kelamin
            <select name="jenisKelamin">
              <option value="">Pilih</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </select>
          </label>
          <label>
            Tempat Lahir
            <input name="tempatLahir" />
          </label>
          <label>
            Tanggal Lahir
            <input name="tanggalLahir" type="date" />
          </label>
          <label>
            Pendidikan
            <input name="pendidikan" />
          </label>
          <label>
            Telepon
            <input name="telepon" />
          </label>
          <label>
            Email
            <input name="email" type="email" />
          </label>
          <label>
            Alamat
            <input name="alamat" />
          </label>
          <label>
            Foto Perangkat
            <input type="file" name="fotoFile" accept="image/jpeg,image/png,image/webp" />
          </label>
          <label>
            Periode Jabatan
            <input name="periode" placeholder="2024–2030" />
          </label>
          <label>
            Nomor SK Pengangkatan
            <input name="nomorSkPengangkatan" />
          </label>
          <label>
            Tanggal Pengangkatan
            <input name="tanggalPengangkatan" type="date" />
          </label>
          <label>
            Nomor SK Pemberhentian
            <input name="nomorSkPemberhentian" />
          </label>
          <label>
            Tanggal Pemberhentian
            <input name="tanggalPemberhentian" type="date" />
          </label>
          <label>
            Status
            <select name="status">
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </label>
          <label>
            Urutan
            <input name="urut" type="number" min="0" defaultValue="0" />
          </label>
          <div className="pemerintahan-form-actions">
            <button className="button button-primary" type="submit">
              Simpan Perangkat
            </button>
          </div>
        </form>
      </section>
      <section className="modul-card">
        <div className="pemerintahan-card-heading">
          <div>
            <h2>Daftar Perangkat Desa</h2>
            <p>Data pribadi dan status hanya tersedia untuk petugas berwenang.</p>
          </div>
          <span>{rows.length} data</span>
        </div>
        {rows.length ? (
          <div className="modul-table-wrap">
            <table className="modul-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Jabatan</th>
                  <th>Status</th>
                  <th>Masa Jabatan</th>
                  <th>Pendidikan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>
                        {[row.gelarDepan, row.nama, row.gelarBelakang].filter(Boolean).join(" ")}
                      </strong>
                      <small>{row.nip ?? "NIP belum diisi"}</small>
                    </td>
                    <td>{row.jabatan ?? "Belum ditentukan"}</td>
                    <td>
                      <span
                        className={
                          row.status === "aktif"
                            ? "pemerintahan-status-active"
                            : "pemerintahan-status-inactive"
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>{row.periode ?? "—"}</td>
                    <td>{row.pendidikan ?? "—"}</td>
                    <td>
                      <details className="pemerintahan-row-edit">
                        <summary>Kelola</summary>
                        <form
                          action={simpanPerangkatAction}
                          encType="multipart/form-data"
                          className="pemerintahan-form compact-form"
                        >
                          <input type="hidden" name="id" value={row.id} />
                          <label>
                            Nama
                            <input name="nama" required defaultValue={row.nama} />
                          </label>
                          <label>
                            Gelar Depan
                            <input name="gelarDepan" defaultValue={row.gelarDepan ?? ""} />
                          </label>
                          <label>
                            Gelar Belakang
                            <input name="gelarBelakang" defaultValue={row.gelarBelakang ?? ""} />
                          </label>
                          <label>
                            Jabatan
                            <select name="jabatanId" defaultValue={row.jabatanId ?? ""}>
                              <option value="">Pilih</option>
                              {jabatan.map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.nama}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Atasan
                            <select name="atasanId" defaultValue={row.atasanId ?? ""}>
                              <option value="">Tidak ada</option>
                              {rows
                                .filter((x) => x.id !== row.id)
                                .map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.nama}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label>
                            NIP
                            <input name="nip" defaultValue={row.nip ?? ""} />
                          </label>
                          <label>
                            NIK
                            <input name="nik" defaultValue={row.nik ?? ""} />
                          </label>
                          <label>
                            Jenis Kelamin
                            <select name="jenisKelamin" defaultValue={row.jenisKelamin ?? ""}>
                              <option value="">Pilih</option>
                              <option value="male">Laki-laki</option>
                              <option value="female">Perempuan</option>
                            </select>
                          </label>
                          <label>
                            Tempat Lahir
                            <input name="tempatLahir" defaultValue={row.tempatLahir ?? ""} />
                          </label>
                          <label>
                            Tanggal Lahir
                            <input
                              type="date"
                              name="tanggalLahir"
                              defaultValue={row.tanggalLahir ?? ""}
                            />
                          </label>
                          <label>
                            Pendidikan
                            <input name="pendidikan" defaultValue={row.pendidikan ?? ""} />
                          </label>
                          <label>
                            Telepon
                            <input name="telepon" defaultValue={row.telepon ?? ""} />
                          </label>
                          <label>
                            Email
                            <input name="email" type="email" defaultValue={row.email ?? ""} />
                          </label>
                          <label>
                            Alamat
                            <input name="alamat" defaultValue={row.alamat ?? ""} />
                          </label>
                          <input type="hidden" name="foto" value={row.foto ?? ""} />
                          <label>
                            Ganti Foto
                            <input
                              type="file"
                              name="fotoFile"
                              accept="image/jpeg,image/png,image/webp"
                            />
                          </label>
                          <label>
                            Periode
                            <input name="periode" defaultValue={row.periode ?? ""} />
                          </label>
                          <label>
                            Nomor SK
                            <input
                              name="nomorSkPengangkatan"
                              defaultValue={row.nomorSkPengangkatan ?? ""}
                            />
                          </label>
                          <label>
                            Tanggal SK
                            <input
                              type="date"
                              name="tanggalPengangkatan"
                              defaultValue={row.tanggalPengangkatan ?? ""}
                            />
                          </label>
                          <label>
                            Nomor SK Pemberhentian
                            <input
                              name="nomorSkPemberhentian"
                              defaultValue={row.nomorSkPemberhentian ?? ""}
                            />
                          </label>
                          <label>
                            Tanggal Pemberhentian
                            <input
                              type="date"
                              name="tanggalPemberhentian"
                              defaultValue={row.tanggalPemberhentian ?? ""}
                            />
                          </label>
                          <label>
                            Status
                            <select name="status" defaultValue={row.status}>
                              <option value="aktif">Aktif</option>
                              <option value="nonaktif">Nonaktif</option>
                            </select>
                          </label>
                          <label>
                            Urutan
                            <input type="number" name="urut" defaultValue={row.urut} />
                          </label>
                          <div className="pemerintahan-form-actions">
                            <button className="button button-primary" type="submit">
                              Simpan Perubahan
                            </button>
                          </div>
                        </form>
                        <form action={hapusPerangkatAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <button className="button button-danger-ghost" type="submit">
                            Hapus Perangkat
                          </button>
                        </form>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="modul-empty">Belum ada data perangkat desa.</p>
        )}
      </section>
      <section className="modul-card">
        <div className="pemerintahan-card-heading">
          <div>
            <h2>Dokumen Perangkat Desa</h2>
            <p>
              Unggah SK pengangkatan, pemberhentian, dan dokumen biodata. Dokumen privat tidak
              tampil di website.
            </p>
          </div>
        </div>
        <form
          action={unggahDokumenPemerintahanAction}
          encType="multipart/form-data"
          className="pemerintahan-form"
        >
          <label>
            Perangkat
            <select name="perangkatId" required>
              <option value="">Pilih perangkat</option>
              {rows.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nama}
                </option>
              ))}
            </select>
          </label>
          <label>
            Judul Dokumen
            <input name="judul" required placeholder="SK Pengangkatan" />
          </label>
          <label>
            Nomor Dokumen
            <input name="nomor" />
          </label>
          <label>
            Tanggal Dokumen
            <input type="date" name="tanggal" />
          </label>
          <label>
            Berkas PDF / gambar
            <input
              type="file"
              name="berkas"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              required
            />
          </label>
          <label className="pemerintahan-check">
            <input type="checkbox" name="tampilPublik" /> Izinkan unduh dari website publik
          </label>
          <button className="button button-primary" type="submit">
            Unggah Dokumen
          </button>
        </form>
        {dokumen.filter((x) => x.perangkatId !== null).length ? (
          <div className="modul-table-wrap">
            <table className="modul-table">
              <thead>
                <tr>
                  <th>Perangkat</th>
                  <th>Dokumen</th>
                  <th>Nomor</th>
                  <th>Publik</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {dokumen
                  .filter((x) => x.perangkatId !== null)
                  .map((doc) => (
                    <tr key={doc.id}>
                      <td>{rows.find((x) => x.id === doc.perangkatId)?.nama ?? "—"}</td>
                      <td>
                        <a href={`/api/pemerintahan/dokumen/${doc.id}`}>{doc.judul}</a>
                      </td>
                      <td>{doc.nomor ?? "—"}</td>
                      <td>{doc.tampilPublik ? "Ya" : "Tidak"}</td>
                      <td>
                        <details className="pemerintahan-row-edit">
                          <summary>Kelola</summary>
                          <form
                            action={ubahDokumenPemerintahanAction}
                            className="pemerintahan-form compact-form"
                          >
                            <input type="hidden" name="id" value={doc.id} />
                            <label>
                              Judul
                              <input name="judul" defaultValue={doc.judul} required />
                            </label>
                            <label>
                              Nomor
                              <input name="nomor" defaultValue={doc.nomor ?? ""} />
                            </label>
                            <label>
                              Tanggal
                              <input type="date" name="tanggal" defaultValue={doc.tanggal ?? ""} />
                            </label>
                            <label className="pemerintahan-check">
                              <input
                                type="checkbox"
                                name="tampilPublik"
                                defaultChecked={doc.tampilPublik}
                              />{" "}
                              Publikasikan
                            </label>
                            <button className="button button-primary" type="submit">
                              Simpan
                            </button>
                          </form>
                          <form action={hapusDokumenPemerintahanAction}>
                            <input type="hidden" name="id" value={doc.id} />
                            <button className="button button-danger-ghost" type="submit">
                              Hapus
                            </button>
                          </form>
                        </details>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="modul-empty">Belum ada dokumen perangkat.</p>
        )}
      </section>
      <section className="modul-card">
        <div className="pemerintahan-card-heading">
          <div>
            <h2>Riwayat Jabatan</h2>
            <p>Catat riwayat penempatan, masa jabatan, dan SK setiap perangkat.</p>
          </div>
        </div>
        <form action={simpanRiwayatAction} className="pemerintahan-form">
          <label>
            Perangkat
            <select name="perangkatId" required>
              <option value="">Pilih perangkat</option>
              {rows.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nama}
                </option>
              ))}
            </select>
          </label>
          <label>
            Jabatan
            <input name="jabatan" required />
          </label>
          <label>
            Nomor SK
            <input name="nomorSk" />
          </label>
          <label>
            Mulai
            <input name="mulai" type="date" />
          </label>
          <label>
            Selesai
            <input name="selesai" type="date" />
          </label>
          <label>
            Keterangan
            <input name="keterangan" />
          </label>
          <label className="pemerintahan-check">
            <input type="checkbox" name="tampilPublik" /> Tampilkan riwayat di website
          </label>
          <button className="button button-primary" type="submit">
            Tambah Riwayat
          </button>
        </form>
        {riwayat.length ? (
          <div className="modul-table-wrap">
            <table className="modul-table">
              <thead>
                <tr>
                  <th>Perangkat</th>
                  <th>Jabatan</th>
                  <th>Nomor SK</th>
                  <th>Periode</th>
                  <th>Publik</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((item) => (
                  <tr key={item.id}>
                    <td>{rows.find((x) => x.id === item.perangkatId)?.nama ?? "—"}</td>
                    <td>{item.jabatan}</td>
                    <td>{item.nomorSk ?? "—"}</td>
                    <td>
                      {item.mulai ?? "—"} – {item.selesai ?? "Sekarang"}
                    </td>
                    <td>{item.tampilPublik ? "Ya" : "Tidak"}</td>
                    <td>
                      <details className="pemerintahan-row-edit">
                        <summary>Kelola</summary>
                        <form
                          action={simpanRiwayatAction}
                          className="pemerintahan-form compact-form"
                        >
                          <input type="hidden" name="id" value={item.id} />
                          <label>
                            Perangkat
                            <select name="perangkatId" defaultValue={item.perangkatId}>
                              {rows.map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.nama}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Jabatan
                            <input name="jabatan" defaultValue={item.jabatan} />
                          </label>
                          <label>
                            Nomor SK
                            <input name="nomorSk" defaultValue={item.nomorSk ?? ""} />
                          </label>
                          <label>
                            Mulai
                            <input type="date" name="mulai" defaultValue={item.mulai ?? ""} />
                          </label>
                          <label>
                            Selesai
                            <input type="date" name="selesai" defaultValue={item.selesai ?? ""} />
                          </label>
                          <label>
                            Keterangan
                            <input name="keterangan" defaultValue={item.keterangan ?? ""} />
                          </label>
                          <label className="pemerintahan-check">
                            <input
                              type="checkbox"
                              name="tampilPublik"
                              defaultChecked={item.tampilPublik}
                            />{" "}
                            Publikasikan
                          </label>
                          <button className="button button-primary" type="submit">
                            Simpan Riwayat
                          </button>
                        </form>
                        <form action={hapusRiwayatAction}>
                          <input type="hidden" name="id" value={item.id} />
                          <button className="button button-danger-ghost" type="submit">
                            Hapus
                          </button>
                        </form>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="modul-empty">Riwayat jabatan belum dicatat.</p>
        )}
      </section>
    </div>
  );
}
