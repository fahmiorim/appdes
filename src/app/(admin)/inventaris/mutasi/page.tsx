import Link from "next/link";

import { getPemeliharaanPageData } from "@/features/inventaris/application/inventaris-use-cases";
import {
  INVENTARIS_KONDISI_LABELS,
  MUTASI_JENIS_LABELS,
  MUTASI_STATUS_LABELS,
  MUTASI_STEP_LABELS,
  nextMutasiStep,
} from "@/features/inventaris/domain/inventaris";
import { formatRupiah } from "@/features/keuangan/domain/keuangan";

import {
  ajukanMutasiInventarisAction,
  buatJadwalPemeliharaanAction,
  hapusJadwalPemeliharaanAction,
  setujuiMutasiInventarisAction,
  tolakMutasiInventarisAction,
  ubahStatusPemeliharaanAction,
} from "../actions";
import styles from "../inventaris.module.css";

export const metadata = { title: "Mutasi & Pemeliharaan Aset" };
type Props = { searchParams: Promise<{ inventarisId?: string; jenis?: string }> };
const dateLabel = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "UTC" }).format(
        new Date(v + "T00:00:00Z"),
      )
    : "—";

export default async function MutasiPemeliharaanPage({ searchParams }: Props) {
  const p = await searchParams;
  const id = Number(p.inventarisId);
  const selected = Number.isSafeInteger(id) && id > 0 ? id : undefined;
  const data = await getPemeliharaanPageData();
  const selectedAsset = data.inventaris.find((x) => x.id === selected);
  const pending = data.mutasi.filter((x) => x.status === "diajukan").length;
  const scheduled = data.pemeliharaan.filter((x) => x.status === "terjadwal").length;
  const progress = data.pemeliharaan.filter((x) => x.status === "dalam_proses").length;
  const done = data.pemeliharaan.filter((x) => x.status === "selesai").length;
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.headingIcon}>⇄</div>
        <div>
          <span className={styles.eyebrow}>INVENTARIS &amp; ASET DESA</span>
          <h1>Mutasi &amp; Pemeliharaan Aset</h1>
          <p>
            Kelola perpindahan, perubahan kondisi, penghapusan, serta jadwal pemeliharaan aset desa.
          </p>
        </div>
      </header>
      <section className={styles.metrics}>
        <article className={`${styles.metric} ${styles.metricPrimary}`}>
          <span>Total Aset Aktif</span>
          <strong>{data.inventaris.length} jenis</strong>
          <small>Barang terdaftar</small>
        </article>
        <article className={styles.metric}>
          <span>Riwayat Mutasi</span>
          <strong>{data.mutasi.length} kejadian</strong>
          <small>{pending} menunggu persetujuan</small>
        </article>
        <article className={styles.metric}>
          <span>Pemeliharaan</span>
          <strong>{data.pemeliharaan.length} kegiatan</strong>
          <small>{progress} sedang dikerjakan</small>
        </article>
        <article className={styles.metric}>
          <span>Jadwal Terjadwal</span>
          <strong>{scheduled} agenda</strong>
          <small>Menunggu pelaksanaan</small>
        </article>
        <article className={styles.metric}>
          <span>Pemeliharaan Selesai</span>
          <strong>{done} kegiatan</strong>
          <small>Riwayat perawatan</small>
        </article>
      </section>
      <nav className={styles.tabs}>
        <Link href="/inventaris/dashboard">Dashboard</Link>
        <Link href="/inventaris">Daftar Inventaris</Link>
        <Link href="/inventaris/pengelolaan">Pengelolaan Aset</Link>
        <Link className={styles.active} href="/inventaris/mutasi">
          Mutasi &amp; Pemeliharaan
        </Link>
        <Link href="/inventaris/laporan">Laporan &amp; Statistik</Link>
      </nav>
      <nav className={styles.tabs}>
        <a href="#riwayat-mutasi">Riwayat Mutasi</a>
        <a href="#pengajuan-mutasi">Mutasi Aset</a>
        <Link href="/inventaris/mutasi?jenis=hapus#pengajuan-mutasi">Penghapusan Aset</Link>
        <a href="#jadwal-pemeliharaan">Pemeliharaan Aset</a>
        <a href="#riwayat-pemeliharaan">Riwayat Pemeliharaan</a>
      </nav>
      <section className={styles.panel} id="riwayat-mutasi">
        <div className={styles.panelHead}>
          <div>
            <h2>Riwayat Mutasi Aset</h2>
            <p>
              Pengajuan pindah lokasi, perubahan kondisi, perbaikan, dan penghapusan dengan
              persetujuan berjenjang.
            </p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Kode Inventaris</th>
                <th>Nama Aset</th>
                <th>Jenis Mutasi</th>
                <th>Detail</th>
                <th>Pengaju</th>
                <th>Status</th>
                <th>Verifikasi / Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.mutasi.map((m) => {
                const step = nextMutasiStep(m);
                const allowed = step !== null && data.approverSteps.includes(step);
                return (
                  <tr key={m.id}>
                    <td>{dateLabel(m.tanggalMutasi)}</td>
                    <td>{m.nomorInventaris ?? "—"}</td>
                    <td>{m.namaBarang ?? "Aset dihapus"}</td>
                    <td>{MUTASI_JENIS_LABELS[m.jenis]}</td>
                    <td>
                      {m.lokasiBaru ??
                        (m.kondisiBaru
                          ? INVENTARIS_KONDISI_LABELS[m.kondisiBaru]
                          : (m.alasan ?? "—"))}
                    </td>
                    <td>{m.diajukanOleh ?? "—"}</td>
                    <td>
                      <span
                        className={`${styles.tag} ${m.status === "disetujui" ? styles.good : m.status === "ditolak" ? styles.bad : styles.warn}`}
                      >
                        {MUTASI_STATUS_LABELS[m.status]}
                      </span>
                    </td>
                    <td>
                      {m.status === "diajukan" && allowed ? (
                        <div className={styles.actions}>
                          <form action={setujuiMutasiInventarisAction}>
                            <input type="hidden" name="id" value={m.id} />
                            <button className={styles.primary}>
                              Setujui · {MUTASI_STEP_LABELS[step]}
                            </button>
                          </form>
                          <form action={tolakMutasiInventarisAction}>
                            <input type="hidden" name="id" value={m.id} />
                            <input
                              name="catatanPenolakan"
                              placeholder="Alasan penolakan"
                              required
                            />
                            <button className={styles.secondary}>Tolak</button>
                          </form>
                        </div>
                      ) : (
                        <span className={styles.muted}>
                          {m.status === "diajukan"
                            ? "Menunggu " + (step ? MUTASI_STEP_LABELS[step] : "verifikasi")
                            : (m.disetujuiOleh ?? m.catatanPenolakan ?? "—")}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.mutasi.length === 0 ? (
            <p className={styles.empty}>Belum ada riwayat mutasi aset.</p>
          ) : null}
        </div>
      </section>
      {data.canMutate ? (
        <section className={styles.panel} id="pengajuan-mutasi">
          <div className={styles.panelHead}>
            <div>
              <h2>Ajukan Mutasi Aset / Penghapusan</h2>
              <p>Pengajuan akan melalui verifikasi operator, sekretaris desa, dan kepala desa.</p>
            </div>
          </div>
          <form action={ajukanMutasiInventarisAction} className={styles.form}>
            <label>
              Aset *
              <select name="inventarisId" required defaultValue={selected ?? ""}>
                <option value="">Pilih aset</option>
                {data.inventaris.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nomorInventaris ?? "INV-" + x.id} · {x.namaBarang} ({x.jumlah} {x.satuan})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Jenis Mutasi *
              <select name="jenis" defaultValue={p.jenis === "hapus" ? "hapus" : "pindah"}>
                <option value="pindah">Pindah Lokasi</option>
                <option value="rusak">Perubahan Kondisi / Rusak</option>
                <option value="perbaikan">Perbaikan</option>
                <option value="hapus">Penghapusan</option>
              </select>
            </label>
            <label>
              Tanggal Mutasi *
              <input
                name="tanggalMutasi"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </label>
            <label>
              Jumlah Mutasi *
              <input
                name="jumlahMutasi"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={p.jenis === "hapus" && selectedAsset ? selectedAsset.jumlah : "1"}
                required
              />
            </label>
            <label>
              Lokasi Baru
              <input name="lokasiBaru" maxLength={150} />
            </label>
            <label>
              Kondisi Baru
              <select name="kondisiBaru">
                <option value="">Tidak berubah</option>
                <option value="baik">Baik</option>
                <option value="rusak_ringan">Rusak Ringan</option>
                <option value="rusak_berat">Rusak Berat</option>
                <option value="dalam_perbaikan">Dalam Perbaikan</option>
              </select>
            </label>
            <label className={styles.wide}>
              Alasan Mutasi *<textarea name="alasan" rows={2} required />
            </label>
            <label className={styles.wide}>
              Keterangan Tambahan
              <textarea name="keterangan" rows={2} />
            </label>
            <button className={styles.primary}>Kirim Pengajuan</button>
          </form>
        </section>
      ) : null}
      <section className={styles.panel} id="jadwal-pemeliharaan">
        <div className={styles.panelHead}>
          <div>
            <h2>Jadwal &amp; Pemeliharaan Aset</h2>
            <p>Kelola perawatan berkala, servis, perbaikan, biaya, dan hasil pekerjaan.</p>
          </div>
        </div>
        <div className={styles.grid}>
          <div>
            <h2 style={{ fontSize: 13, marginBottom: 10 }}>Jadwal Pemeliharaan</h2>
            {data.pemeliharaan.length ? (
              <div className={styles.timeline}>
                {data.pemeliharaan.map((x) => (
                  <article key={x.id}>
                    <strong>
                      {x.jenis} · {x.namaBarang ?? "Aset"}
                    </strong>
                    <small>
                      {dateLabel(x.tanggalRencana)} · {x.pelaksana ?? "Pelaksana belum ditentukan"}
                    </small>
                    <small>
                      {x.deskripsi ?? "Tidak ada deskripsi"} · Biaya {formatRupiah(x.biaya)}
                    </small>
                    <div className={styles.actions} style={{ marginTop: 8 }}>
                      <form action={ubahStatusPemeliharaanAction}>
                        <input type="hidden" name="id" value={x.id} />
                        <input
                          name="jenis"
                          aria-label="Jenis pemeliharaan"
                          defaultValue={x.jenis}
                        />
                        <input
                          type="date"
                          name="tanggalRencana"
                          aria-label="Tanggal rencana"
                          defaultValue={x.tanggalRencana}
                        />
                        <input
                          name="biaya"
                          type="number"
                          min="0"
                          step="0.01"
                          aria-label="Biaya"
                          defaultValue={x.biaya}
                        />
                        <input
                          name="pelaksana"
                          aria-label="Pelaksana"
                          defaultValue={x.pelaksana ?? ""}
                        />
                        <input
                          name="deskripsi"
                          aria-label="Deskripsi"
                          defaultValue={x.deskripsi ?? ""}
                        />
                        <select name="status" defaultValue={x.status}>
                          <option value="terjadwal">Terjadwal</option>
                          <option value="dalam_proses">Dalam Proses</option>
                          <option value="selesai">Selesai</option>
                          <option value="dibatalkan">Dibatalkan</option>
                        </select>
                        <input
                          type="date"
                          name="tanggalSelesai"
                          defaultValue={x.tanggalSelesai ?? ""}
                        />
                        <input
                          name="hasil"
                          placeholder="Hasil pekerjaan"
                          defaultValue={x.hasil ?? ""}
                        />
                        <select name="kondisiSetelah" defaultValue={x.kondisiSetelah ?? ""}>
                          <option value="">Pilih kondisi akhir (wajib jika selesai)</option>
                          <option value="baik">Baik</option>
                          <option value="rusak_ringan">Rusak Ringan</option>
                          <option value="rusak_berat">Rusak Berat</option>
                          <option value="dalam_perbaikan">Dalam Perbaikan</option>
                        </select>
                        <button className={styles.secondary}>Perbarui</button>
                      </form>
                      <form action={hapusJadwalPemeliharaanAction}>
                        <input type="hidden" name="id" value={x.id} />
                        <button className={styles.secondary}>Hapus</button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>Belum ada jadwal pemeliharaan.</p>
            )}
          </div>
          {data.canWrite ? (
            <div>
              <h2 style={{ fontSize: 13, marginBottom: 10 }}>Tambah Jadwal</h2>
              <form
                action={buatJadwalPemeliharaanAction}
                className={styles.form}
                style={{ gridTemplateColumns: "1fr" }}
              >
                <label>
                  Aset *
                  <select name="inventarisId" required>
                    <option value="">Pilih aset</option>
                    {data.inventaris.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.namaBarang}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Jenis Pemeliharaan *
                  <input name="jenis" required placeholder="Servis berkala / perawatan rutin" />
                </label>
                <label>
                  Tanggal Rencana *<input name="tanggalRencana" type="date" required />
                </label>
                <label>
                  Estimasi Biaya (Rp)
                  <input name="biaya" type="number" min="0" step="0.01" defaultValue="0" />
                </label>
                <label>
                  Pelaksana
                  <input name="pelaksana" />
                </label>
                <label>
                  Deskripsi
                  <textarea name="deskripsi" rows={3} />
                </label>
                <button className={styles.primary}>Tambah Jadwal</button>
              </form>
            </div>
          ) : null}
        </div>
      </section>
      <section className={styles.panel} id="riwayat-pemeliharaan">
        <div className={styles.panelHead}>
          <div>
            <h2>Riwayat Pemeliharaan</h2>
            <p>
              Jejak penambahan, perubahan status, pembaruan biaya, dan penghapusan jadwal beserta
              petugasnya.
            </p>
          </div>
        </div>
        {data.riwayatPemeliharaan.length ? (
          <div className={styles.timeline}>
            {data.riwayatPemeliharaan.map((h) => (
              <article key={h.id}>
                <strong>
                  {h.namaBarang ?? "Aset"} · {h.jenis ?? "Pemeliharaan"} ·{" "}
                  {h.aksi === "dibuat"
                    ? "Jadwal dibuat"
                    : h.aksi === "diperbarui"
                      ? "Jadwal diperbarui"
                      : "Jadwal dihapus"}
                </strong>
                <small>
                  {dateLabel(h.createdAt.toISOString().slice(0, 10))} · {h.dilakukanOleh}
                </small>
                <small>
                  {h.statusSebelum ?? "—"} → {h.statusSesudah ?? "—"} ·{" "}
                  {h.ringkasan ?? "Tidak ada catatan"}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>Belum ada aktivitas pemeliharaan yang tercatat.</p>
        )}
      </section>
    </main>
  );
}
