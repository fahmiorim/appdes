"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "./katalog-layanan.module.css";

type Service = {
  source: "surat" | "desa";
  id: number;
  nama: string;
  kode?: string;
  klasifikasi?: string | null;
  butuhPenduduk?: boolean;
  masaBerlakuBulan?: number;
  kategori?: string;
  deskripsi?: string | null;
  persyaratan?: string | null;
  estimasiHari?: number;
  biaya?: number;
  metode?: string;
};
type Props = { layanan: Service[] };

const categories = [
  "Semua Layanan",
  "Administrasi",
  "Kependudukan",
  "Sosial",
  "Ekonomi & Usaha",
  "Lainnya",
];

function categoryFor(item: Service): string {
  if (item.source === "desa") {
    const category = (item.kategori ?? "").toLocaleLowerCase("id-ID");
    if (category === "sosial") return "Sosial";
    if (category === "ekonomi" || category === "usaha") return "Ekonomi & Usaha";
    if (category === "kependudukan") return "Kependudukan";
    if (category === "administrasi" || category === "surat") return "Administrasi";
    return "Lainnya";
  }
  const value =
    (item.klasifikasi ?? "").toLocaleLowerCase("id-ID") +
    " " +
    item.nama.toLocaleLowerCase("id-ID");
  if (/sosial|miskin|bantuan/.test(value)) return "Sosial";
  if (/usaha|ekonomi|dagang|niaga/.test(value)) return "Ekonomi & Usaha";
  if (/penduduk|domisili|nik|kk|kelahiran|kematian|kawin|nikah/.test(value)) return "Kependudukan";
  if (/administrasi|pengantar|keterangan|surat/.test(value)) return "Administrasi";
  return "Lainnya";
}

function iconFor(item: Service): string {
  const value = item.nama.toLocaleLowerCase("id-ID");
  if (/usaha/.test(value)) return "♙";
  if (/nikah|kawin/.test(value)) return "♡";
  if (/pendidikan|sekolah/.test(value)) return "◇";
  if (/sosial|miskin|bantuan/.test(value)) return "♧";
  if (/domisili|penduduk|kk|ktp/.test(value)) return "▣";
  return "▤";
}

export function KatalogLayanan({ layanan }: Props) {
  const [category, setCategory] = useState("Semua Layanan");
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      layanan.filter((item) => {
        const matchesCategory = category === "Semua Layanan" || categoryFor(item) === category;
        const search = (
          item.nama +
          " " +
          (item.kode ?? "") +
          " " +
          (item.klasifikasi ?? "") +
          " " +
          (item.kategori ?? "") +
          " " +
          (item.deskripsi ?? "") +
          " " +
          (item.persyaratan ?? "")
        ).toLocaleLowerCase("id-ID");
        return matchesCategory && search.includes(query.trim().toLocaleLowerCase("id-ID"));
      }),
    [layanan, category, query],
  );
  const availableCategories = categories.map((name) => ({
    name,
    count:
      name === "Semua Layanan"
        ? layanan.length
        : layanan.filter((item) => categoryFor(item) === name).length,
  }));

  return (
    <>
      <section className={styles.catalog} id="daftar-layanan">
        <div className={styles.catalogHead}>
          <div className={styles.sectionTitle}>
            <span>▱</span>
            <div>
              <h2>Daftar Layanan Desa</h2>
              <p>Pilih layanan untuk melihat informasi, persyaratan, dan cara pengajuannya.</p>
            </div>
          </div>
          <label className={styles.search}>
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama layanan..."
              aria-label="Cari layanan"
            />
          </label>
        </div>
        <div className={styles.filters} role="group" aria-label="Filter kategori layanan">
          {availableCategories
            .filter((item) => item.name === "Semua Layanan" || item.count > 0)
            .map((item) => (
              <button
                type="button"
                key={item.name}
                onClick={() => setCategory(item.name)}
                className={category === item.name ? styles.selected : ""}
              >
                {item.name}
                <small>{item.count}</small>
              </button>
            ))}
        </div>
        <div className={styles.catalogLayout}>
          <div className={styles.cards}>
            {filtered.length ? (
              filtered.map((item, index) => (
                <article className={styles.serviceCard} key={item.source + "-" + item.id}>
                  <div className={styles.serviceIcon + " " + styles["tone" + (index % 5)]}>
                    {iconFor(item)}
                  </div>
                  <div className={styles.serviceBody}>
                    <h3>{item.nama}</h3>
                    <span className={styles.category}>
                      {item.source === "desa"
                        ? categoryFor(item)
                        : (item.klasifikasi ?? categoryFor(item))}
                    </span>
                    <p>
                      {item.source === "desa"
                        ? item.deskripsi ||
                          "Informasi layanan yang disediakan oleh pemerintah desa."
                        : item.butuhPenduduk
                          ? "Layanan ini memerlukan data penduduk yang terdaftar di desa."
                          : "Layanan administrasi desa. Periksa persyaratan sebelum mengajukan."}
                    </p>
                    {item.source === "desa" ? (
                      <div className={styles.serviceMeta}>
                        <small>
                          {item.biaya === 0
                            ? "Gratis"
                            : "Biaya Rp " + (item.biaya ?? 0).toLocaleString("id-ID")}
                        </small>
                        <small>Estimasi {item.estimasiHari ?? 0} hari</small>
                        {item.metode ? <small>{item.metode.replaceAll("_", " ")}</small> : null}
                        {item.persyaratan ? <small>Persyaratan: {item.persyaratan}</small> : null}
                      </div>
                    ) : null}
                    <Link href={item.source === "desa" ? "/kontak" : "/layanan/surat"}>
                      {item.source === "desa" ? "Hubungi Kantor Desa" : "Lihat Informasi"}　→
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className={styles.empty}>
                <strong>Layanan tidak ditemukan</strong>
                <p>Coba kata kunci atau kategori lainnya.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory("Semua Layanan");
                  }}
                >
                  Hapus Filter
                </button>
              </div>
            )}
          </div>
          <aside className={styles.sidebar}>
            <section>
              <h3>Jenis Layanan Tersedia</h3>
              <p>Daftar layanan aktif dari pemerintah desa.</p>
              {layanan.slice(0, 6).map((item, index) => (
                <div className={styles.sideItem} key={item.source + "-" + item.id}>
                  <b>{index + 1}</b>
                  <span>{item.nama}</span>
                </div>
              ))}
              {!layanan.length ? <small>Belum ada layanan aktif.</small> : null}
            </section>
            <section className={styles.info}>
              <h3>Informasi Penting</h3>
              <ul>
                <li>Periksa persyaratan sebelum mengajukan layanan.</li>
                <li>Gunakan data yang benar dan sesuai dokumen resmi.</li>
                <li>Pengajuan online dilakukan melalui akun Area Warga.</li>
                <li>Hubungi kantor desa jika membutuhkan bantuan.</li>
              </ul>
            </section>
            <section className={styles.quick}>
              <h3>Ajukan Layanan Online</h3>
              <p>Masuk ke Area Warga untuk mengajukan surat dan memantau prosesnya.</p>
              <Link href="/masuk">Masuk ke Area Warga　→</Link>
            </section>
          </aside>
        </div>
        <div className={styles.resultCount}>
          Menampilkan {filtered.length} dari {layanan.length} layanan aktif
        </div>
      </section>
    </>
  );
}
