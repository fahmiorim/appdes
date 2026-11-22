import Link from "next/link";

import { getInventarisTablePageData } from "@/features/inventaris/application/inventaris-use-cases";
import {
  INVENTARIS_KATEGORI_LABELS,
  INVENTARIS_KONDISI_LABELS,
} from "@/features/inventaris/domain/inventaris";
import { formatRupiah } from "@/features/keuangan/domain/keuangan";

import {
  hapusKategoriInventarisAction,
  simpanInventarisAction,
  simpanKategoriInventarisAction,
} from "./actions";
import styles from "./inventaris.module.css";

export const metadata = { title: "Daftar Inventaris" };
type Props = {
  searchParams: Promise<{
    q?: string;
    kategori?: string;
    lokasi?: string;
    kondisi?: string;
    page?: string;
  }>;
};

export default async function DaftarInventarisPage({ searchParams }: Props) {
  const p = await searchParams;
  const q = (p.q ?? "").trim().slice(0, 100);
  const pageRaw = Number(p.page);
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSize = 10;
  const kategoriId = p.kategori && /^\d+$/.test(p.kategori) ? Number(p.kategori) : undefined;
  const data = await getInventarisTablePageData({
    search: q,
    kategoriId,
    lokasi: p.lokasi,
    kondisi: p.kondisi,
    page,
    pageSize,
  });
  const pageCount = Math.max(1, Math.ceil(data.total / pageSize));
  const current = data.currentPage;
  const rows = data.rows;
  const totalUnit = data.summaryRows.reduce((s, x) => s + Number(x.jumlah), 0);
  const totalValue = data.summaryRows.reduce((s, x) => s + Number(x.nilaiAkhir ?? 0), 0);
  const count = (k: string) =>
    data.summaryRows.filter((x) => x.kondisi === k).reduce((s, x) => s + Number(x.jumlah), 0);
  const params = (n: number) =>
    new URLSearchParams({
      q,
      kategori: p.kategori ?? "",
      lokasi: p.lokasi ?? "",
      kondisi: p.kondisi ?? "",
      page: String(n),
    }).toString();
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.headingIcon}>▤</div>
        <div>
          <span className={styles.eyebrow}>INVENTARIS &amp; ASET DESA</span>
          <h1>Daftar Inventaris</h1>
          <p>
            Data seluruh barang inventaris dan aset milik desa, lengkap dengan kategori, lokasi,
            kondisi, dan nilai aset.
          </p>
        </div>
      </header>
      <section className={styles.metrics}>
        <article className={`${styles.metric} ${styles.metricPrimary}`}>
          <span>Total Inventaris</span>
          <strong>{totalUnit.toLocaleString("id-ID")} Unit</strong>
          <small>{data.summaryRows.length} catatan barang aktif</small>
        </article>
        <article className={styles.metric}>
          <span>Baik</span>
          <strong>{count("baik").toLocaleString("id-ID")} Unit</strong>
          <small>{totalUnit ? ((count("baik") / totalUnit) * 100).toFixed(1) : "0"}%</small>
        </article>
        <article className={styles.metric}>
          <span>Rusak Ringan</span>
          <strong>{count("rusak_ringan").toLocaleString("id-ID")} Unit</strong>
          <small>Perlu pemantauan</small>
        </article>
        <article className={styles.metric}>
          <span>Rusak Berat</span>
          <strong>{count("rusak_berat").toLocaleString("id-ID")} Unit</strong>
          <small>Perlu tindakan</small>
        </article>
        <article className={styles.metric}>
          <span>Dalam Perbaikan</span>
          <strong>{count("dalam_perbaikan").toLocaleString("id-ID")} Unit</strong>
          <small>Sedang ditangani</small>
        </article>
        <article className={styles.metric}>
          <span>Nilai Total Aset</span>
          <strong>{formatRupiah(totalValue.toFixed(2))}</strong>
          <small>Akumulasi nilai tercatat</small>
        </article>
      </section>
      <nav className={styles.tabs}>
        <Link href="/inventaris/dashboard">Dashboard</Link>
        <Link className={styles.active} href="/inventaris">
          Daftar Inventaris
        </Link>
        <Link href="/inventaris/pengelolaan">Pengelolaan Aset</Link>
        <Link href="/inventaris/laporan">Rekap Nilai Aset</Link>
        <Link href="/inventaris/mutasi">Mutasi &amp; Pemeliharaan</Link>
      </nav>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Data Inventaris</h2>
            <p>
              Gunakan filter untuk menemukan aset. Klik kode atau nama barang untuk melihat detail.
            </p>
          </div>
          <div className={styles.actions}>
            <Link className={styles.secondary} href="/inventaris/laporan/ekspor">
              Export CSV ↓
            </Link>
            {data.canWrite ? (
              <a className={styles.primary} href="#tambah">
                ＋ Tambah Inventaris
              </a>
            ) : null}
          </div>
        </div>
        <form method="get" className={styles.filters}>
          <input name="q" placeholder="Cari kode, nama barang, atau merek..." defaultValue={q} />
          <select name="kategori" defaultValue={p.kategori ?? ""}>
            <option value="">Semua Kategori</option>
            {data.kategori.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
          <select name="lokasi" defaultValue={p.lokasi ?? ""}>
            <option value="">Semua Lokasi</option>
            {data.locations.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <select name="kondisi" defaultValue={p.kondisi ?? ""}>
            <option value="">Semua Kondisi</option>
            {Object.entries(INVENTARIS_KONDISI_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button className={styles.primary}>Filter</button>
          <Link className={styles.secondary} href="/inventaris">
            Reset
          </Link>
        </form>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>No.</th>
                <th>Kode Inventaris</th>
                <th>Nama Barang</th>
                <th>Kategori</th>
                <th>Lokasi</th>
                <th>Kondisi</th>
                <th>Jumlah</th>
                <th>Nilai Satuan</th>
                <th>Total Nilai</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x, i) => (
                <tr key={x.id}>
                  <td>{(current - 1) * pageSize + i + 1}</td>
                  <td>
                    <Link href={"/inventaris/" + x.id}>
                      {x.nomorInventaris ?? x.kodeBarang ?? "—"}
                    </Link>
                  </td>
                  <td>
                    <Link href={"/inventaris/" + x.id}>{x.namaBarang}</Link>
                    <small className={styles.muted} style={{ display: "block" }}>
                      {[x.merk, x.tipe].filter(Boolean).join(" ")}
                    </small>
                  </td>
                  <td>{x.kategoriNama ?? "Tanpa kategori"}</td>
                  <td>{x.lokasi ?? "—"}</td>
                  <td>
                    <span
                      className={`${styles.tag} ${x.kondisi === "baik" ? styles.good : x.kondisi === "rusak_ringan" ? styles.warn : styles.bad}`}
                    >
                      {INVENTARIS_KONDISI_LABELS[x.kondisi]}
                    </span>
                  </td>
                  <td>
                    {Number(x.jumlah).toLocaleString("id-ID")} {x.satuan}
                  </td>
                  <td>{formatRupiah(x.hargaSatuan ?? "0")}</td>
                  <td>{formatRupiah(x.nilaiAkhir ?? "0")}</td>
                  <td>
                    <div className={styles.actions}>
                      <Link href={"/inventaris/" + x.id}>Detail</Link>
                      {data.canWrite ? (
                        <Link href={"/inventaris/" + x.id + "?edit=1"}>Edit</Link>
                      ) : null}
                      {data.canMutateCreate ? (
                        <Link href={"/inventaris/mutasi?inventarisId=" + x.id + "&jenis=hapus"}>
                          Ajukan Penghapusan
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className={styles.empty}>Tidak ada inventaris yang sesuai filter.</p>
          ) : null}
        </div>
        <div className={styles.pagination}>
          <span>
            Menampilkan {data.total ? (current - 1) * pageSize + 1 : 0}–
            {Math.min(current * pageSize, data.total)} dari {data.total} data
          </span>
          <div className={styles.actions}>
            {current > 1 ? (
              <Link className={styles.secondary} href={"/inventaris?" + params(current - 1)}>
                ←
              </Link>
            ) : null}
            <strong>
              {current} / {pageCount}
            </strong>
            {current < pageCount ? (
              <Link className={styles.secondary} href={"/inventaris?" + params(current + 1)}>
                →
              </Link>
            ) : null}
          </div>
        </div>
      </section>
      {data.canWrite ? (
        <section className={styles.panel} id="tambah">
          <div className={styles.panelHead}>
            <div>
              <h2>Tambah Inventaris</h2>
              <p>Isi data barang, perolehan, kondisi, dan nilai aset.</p>
            </div>
          </div>
          <form action={simpanInventarisAction} className={styles.form}>
            <label>
              Nama Barang *<input name="namaBarang" required maxLength={200} />
            </label>
            <label>
              Nomor Inventaris
              <input name="nomorInventaris" maxLength={50} />
            </label>
            <label>
              Kategori
              <select name="kategoriId">
                <option value="">Tanpa kategori</option>
                {data.kategori.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Merk
              <input name="merk" maxLength={100} />
            </label>
            <label>
              Tipe
              <input name="tipe" maxLength={100} />
            </label>
            <label>
              Kode Barang
              <input name="kodeBarang" maxLength={50} />
            </label>
            <label>
              Jumlah *
              <input name="jumlah" type="number" min="0.01" step="0.01" defaultValue="1" required />
            </label>
            <label>
              Satuan
              <input name="satuan" defaultValue="unit" maxLength={20} />
            </label>
            <label>
              Harga Satuan (Rp)
              <input name="hargaSatuan" type="number" min="0" step="0.01" />
            </label>
            <label>
              Saldo Awal Penyusutan (Rp)
              <input
                name="akumulasiPenyusutan"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
              />
            </label>
            <label>
              Umur Manfaat (bulan)
              <input
                name="umurManfaatBulan"
                type="number"
                min="1"
                max="1200"
                placeholder="Contoh: 60"
              />
            </label>
            <label>
              Nilai Residu (Rp)
              <input name="nilaiResidu" type="number" min="0" step="0.01" defaultValue="0" />
            </label>
            <label>
              Tanggal Mulai Penyusutan
              <input name="tanggalMulaiPenyusutan" type="date" />
            </label>
            <label>
              Tanggal Perolehan
              <input name="tanggalPembelian" type="date" />
            </label>
            <label>
              Tahun Perolehan
              <input name="tahunPembelian" type="number" min="1900" max="2100" />
            </label>
            <label>
              Asal Perolehan
              <select name="asal">
                <option value="">Pilih asal</option>
                <option value="pembelian">Pembelian</option>
                <option value="hibah">Hibah</option>
                <option value="bantuan_pemerintah">Bantuan Pemerintah</option>
                <option value="sumbangan">Sumbangan</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </label>
            <label>
              Donatur / Penyedia
              <input name="donatur" maxLength={150} />
            </label>
            <label>
              Penanggung Jawab
              <input name="penanggungJawab" maxLength={150} />
            </label>
            <label>
              Jabatan Penanggung Jawab
              <input name="jabatanPenanggungJawab" maxLength={100} />
            </label>
            <label>
              Telepon Penanggung Jawab
              <input name="teleponPenanggungJawab" maxLength={30} />
            </label>
            <label>
              Lokasi
              <input name="lokasi" maxLength={150} />
            </label>
            <label>
              Kondisi
              <select name="kondisi">
                <option value="baik">Baik</option>
                <option value="rusak_ringan">Rusak Ringan</option>
                <option value="rusak_berat">Rusak Berat</option>
                <option value="dalam_perbaikan">Dalam Perbaikan</option>
              </select>
            </label>
            <label className={styles.wide}>
              Spesifikasi
              <textarea name="spesifikasi" rows={2} />
            </label>
            <label className={styles.wide}>
              Keterangan
              <textarea name="keterangan" rows={2} />
            </label>
            <button className={styles.primary}>Simpan Inventaris</button>
          </form>
        </section>
      ) : null}
      {data.canWrite ? (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Kategori Inventaris</h2>
              <p>Kelola klasifikasi aset yang berlaku untuk desa ini.</p>
            </div>
          </div>
          <div>
            {data.kategori.map((k) => (
              <div className={styles.statLine} key={k.id}>
                <form action={simpanKategoriInventarisAction} className={styles.actions}>
                  <input type="hidden" name="id" value={k.id} />
                  <input
                    name="kode"
                    defaultValue={k.kode}
                    aria-label="Kode kategori"
                    maxLength={20}
                    required
                  />
                  <input
                    name="nama"
                    defaultValue={k.nama}
                    aria-label="Nama kategori"
                    maxLength={150}
                    required
                  />
                  <select name="golongan" defaultValue={k.golongan}>
                    {Object.entries(INVENTARIS_KATEGORI_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button className={styles.secondary}>Simpan</button>
                </form>
                {data.canManage ? (
                  <form action={hapusKategoriInventarisAction}>
                    <input type="hidden" name="id" value={k.id} />
                    <button className={styles.secondary}>Hapus</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
          <form
            action={simpanKategoriInventarisAction}
            className={styles.form}
            style={{ marginTop: 14 }}
          >
            <label>
              Kode Kategori
              <input name="kode" required maxLength={20} />
            </label>
            <label>
              Nama Kategori
              <input name="nama" required maxLength={150} />
            </label>
            <label>
              Golongan
              <select name="golongan">
                {Object.entries(INVENTARIS_KATEGORI_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.wide}>
              Keterangan
              <input name="keterangan" />
            </label>
            <button className={styles.primary}>Tambah Kategori</button>
          </form>
        </section>
      ) : null}
    </main>
  );
}
