import Link from "next/link";

import {
  getInventarisPageData,
  getNeracaAset,
  getPemeliharaanPageData,
} from "@/features/inventaris/application/inventaris-use-cases";
import { INVENTARIS_KONDISI_LABELS } from "@/features/inventaris/domain/inventaris";
import { formatRupiah } from "@/features/keuangan/domain/keuangan";

import styles from "../inventaris.module.css";

export const metadata = { title: "Dashboard Inventaris & Aset" };

export default async function InventarisDashboardPage() {
  const [data, neracaData, maintenance] = await Promise.all([
    getInventarisPageData(""),
    getNeracaAset(),
    getPemeliharaanPageData(),
  ]);
  const rows = data.rows;
  const count = (kondisi: string) =>
    rows.filter((x) => x.kondisi === kondisi).reduce((sum, x) => sum + Number(x.jumlah), 0);
  const unit = rows.reduce((sum, x) => sum + Number(x.jumlah), 0);
  const total = Number(neracaData.neraca.grandTotal);
  const totalNilaiBuku = rows.reduce((sum, x) => sum + Number(x.nilaiBuku ?? x.nilaiAkhir ?? 0), 0);
  const categories = neracaData.neraca.baris;
  const lokasi = new Map<string, number>();
  for (const row of rows)
    lokasi.set(
      row.lokasi || "Lokasi belum ditentukan",
      (lokasi.get(row.lokasi || "Lokasi belum ditentukan") ?? 0) + Number(row.jumlah),
    );
  const locations = [...lokasi.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxLocation = Math.max(1, ...locations.map((x) => x[1]));
  const acquisition = new Map<number, number>();
  for (const row of rows) {
    const year =
      row.tahunPembelian ??
      (row.tanggalPembelian ? Number(row.tanggalPembelian.slice(0, 4)) : null);
    if (year)
      acquisition.set(
        year,
        (acquisition.get(year) ?? 0) + Number(row.hargaSatuan ?? 0) * Number(row.jumlah),
      );
  }
  const acquisitionYears = [...acquisition.entries()].sort((a, b) => a[0] - b[0]).slice(-3);
  const maxAcquisition = Math.max(1, ...acquisitionYears.map((x) => x[1]));
  const upcoming = maintenance.pemeliharaan
    .filter((x) => x.status === "terjadwal" || x.status === "dalam_proses")
    .slice(0, 4);
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.headingIcon}>▣</div>
        <div>
          <span className={styles.eyebrow}>INVENTARIS &amp; ASET DESA</span>
          <h1>Dashboard Inventaris &amp; Aset</h1>
          <p>Ringkasan data inventaris, kondisi, nilai, dan pemanfaatan aset desa.</p>
        </div>
      </header>
      <section className={styles.metrics}>
        <article className={`${styles.metric} ${styles.metricPrimary}`}>
          <span>Total Aset</span>
          <strong>{unit.toLocaleString("id-ID")} Unit</strong>
          <small>{rows.length} jenis inventaris aktif</small>
        </article>
        <article className={styles.metric}>
          <span>Nilai Perolehan</span>
          <strong>{formatRupiah(neracaData.neraca.grandTotal)}</strong>
          <small>Akumulasi harga perolehan</small>
        </article>
        <article className={styles.metric}>
          <span>Nilai Buku Saat Ini</span>
          <strong>{formatRupiah(totalNilaiBuku.toFixed(2))}</strong>
          <small>Setelah penyusutan</small>
        </article>
        <article className={styles.metric}>
          <span>Aset Kondisi Baik</span>
          <strong>{count("baik").toLocaleString("id-ID")} Unit</strong>
          <small>{unit ? ((count("baik") / unit) * 100).toFixed(1) : "0"}% dari total unit</small>
        </article>
        <article className={styles.metric}>
          <span>Rusak Ringan / Berat</span>
          <strong>
            {(count("rusak_ringan") + count("rusak_berat")).toLocaleString("id-ID")} Unit
          </strong>
          <small>Perlu tindak lanjut</small>
        </article>
        <article className={styles.metric}>
          <span>Dalam Perbaikan</span>
          <strong>{count("dalam_perbaikan").toLocaleString("id-ID")} Unit</strong>
          <small>Status kondisi dalam perbaikan</small>
        </article>
      </section>
      <nav className={styles.tabs}>
        <Link className={styles.active} href="/inventaris/dashboard">
          Dashboard
        </Link>
        <Link href="/inventaris">Daftar Inventaris</Link>
        <Link href="/inventaris/pengelolaan">Pengelolaan Aset</Link>
        <Link href="/inventaris/laporan">Laporan &amp; Statistik</Link>
        <Link href="/inventaris/mutasi">Mutasi &amp; Pemeliharaan</Link>
      </nav>
      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Komposisi Aset per Kategori</h2>
              <p>Jumlah unit berdasarkan kelompok aset.</p>
            </div>
            <Link className={styles.secondary} href="/inventaris/laporan">
              Lihat Laporan
            </Link>
          </div>
          {categories.length ? (
            categories.map((x) => (
              <div key={x.kategoriId ?? x.nama} className={styles.statLine}>
                <span>{x.nama}</span>
                <strong>{Number(x.totalUnit).toLocaleString("id-ID")} unit</strong>
              </div>
            ))
          ) : (
            <p className={styles.empty}>Belum ada data aset.</p>
          )}
        </section>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Kondisi Aset</h2>
              <p>Komposisi kondisi seluruh inventaris.</p>
            </div>
          </div>
          {(["baik", "rusak_ringan", "rusak_berat", "dalam_perbaikan"] as const).map((k) => (
            <div key={k} style={{ marginBottom: 16 }}>
              <div className={styles.statLine}>
                <span>{INVENTARIS_KONDISI_LABELS[k]}</span>
                <strong>
                  {count(k).toLocaleString("id-ID")} unit ·{" "}
                  {unit ? ((count(k) / unit) * 100).toFixed(1) : "0"}%
                </strong>
              </div>
              <div className={styles.bar}>
                <i style={{ width: (unit ? (count(k) / unit) * 100 : 0) + "%" }} />
              </div>
            </div>
          ))}
        </section>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Nilai Aset per Kategori</h2>
              <p>Nilai buku/akhir berdasarkan pencatatan inventaris.</p>
            </div>
          </div>
          {categories.map((x) => (
            <div key={x.kategoriId ?? x.nama} style={{ marginBottom: 13 }}>
              <div className={styles.statLine}>
                <span>{x.nama}</span>
                <strong>{formatRupiah(x.totalNilai)}</strong>
              </div>
              <div className={styles.bar}>
                <i style={{ width: (total ? (Number(x.totalNilai) / total) * 100 : 0) + "%" }} />
              </div>
            </div>
          ))}
          <div className={styles.statLine}>
            <strong>Total Nilai Aset</strong>
            <strong>{formatRupiah(neracaData.neraca.grandTotal)}</strong>
          </div>
        </section>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Aset per Lokasi</h2>
              <p>Jumlah unit pada lokasi penyimpanan.</p>
            </div>
          </div>
          {locations.map(([name, value]) => (
            <div key={name} style={{ marginBottom: 13 }}>
              <div className={styles.statLine}>
                <span>{name}</span>
                <strong>{value.toLocaleString("id-ID")} unit</strong>
              </div>
              <div className={styles.bar}>
                <i style={{ width: (value / maxLocation) * 100 + "%" }} />
              </div>
            </div>
          ))}
        </section>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Perolehan Aset per Tahun</h2>
              <p>
                Nilai pengadaan berdasarkan tahun perolehan yang tercatat, bukan valuasi historis.
              </p>
            </div>
          </div>
          {acquisitionYears.length ? (
            acquisitionYears.map(([year, value]) => (
              <div key={year} style={{ marginBottom: 13 }}>
                <div className={styles.statLine}>
                  <span>{year}</span>
                  <strong>{formatRupiah(value.toFixed(2))}</strong>
                </div>
                <div className={styles.bar}>
                  <i style={{ width: (value / maxAcquisition) * 100 + "%" }} />
                </div>
              </div>
            ))
          ) : (
            <p className={styles.empty}>Data tahun perolehan belum lengkap.</p>
          )}
        </section>
      </div>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Aset Terbaru</h2>
            <p>Inventaris yang terakhir dicatat.</p>
          </div>
          <Link className={styles.secondary} href="/inventaris">
            Lihat Semua →
          </Link>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kode Inventaris</th>
                <th>Nama Barang</th>
                <th>Kategori</th>
                <th>Lokasi</th>
                <th>Kondisi</th>
                <th>Nilai</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((x) => (
                <tr key={x.id}>
                  <td>{x.nomorInventaris ?? "—"}</td>
                  <td>
                    <Link href={"/inventaris/" + x.id}>{x.namaBarang}</Link>
                  </td>
                  <td>{x.kategoriNama ?? "—"}</td>
                  <td>{x.lokasi ?? "—"}</td>
                  <td>
                    <span
                      className={`${styles.tag} ${x.kondisi === "baik" ? styles.good : styles.warn}`}
                    >
                      {INVENTARIS_KONDISI_LABELS[x.kondisi]}
                    </span>
                  </td>
                  <td>{formatRupiah(x.nilaiAkhir ?? "0")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Agenda Pemeliharaan Aset</h2>
            <p>Jadwal perawatan terdekat yang perlu ditindaklanjuti.</p>
          </div>
          <Link className={styles.secondary} href="/inventaris/mutasi">
            Lihat Semua →
          </Link>
        </div>
        {upcoming.length ? (
          <div className={styles.timeline}>
            {upcoming.map((x) => (
              <article key={x.id}>
                <strong>
                  {x.jenis} · {x.namaBarang ?? "Aset"}
                </strong>
                <small>
                  {x.tanggalRencana} · {x.pelaksana ?? "Pelaksana belum ditentukan"} ·{" "}
                  {x.status === "terjadwal" ? "Terjadwal" : "Dalam Proses"}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>Belum ada agenda pemeliharaan mendatang.</p>
        )}
      </section>
    </main>
  );
}
