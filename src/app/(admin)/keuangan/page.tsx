import Link from "next/link";
import type { Metadata } from "next";

import { listKeuangan } from "@/features/keuangan/application/keuangan-use-cases";
import { formatRupiah, toMinor } from "@/features/keuangan/domain/keuangan";
import { listPembangunan } from "@/features/pembangunan/application/use-cases";
import { statusPembangunanLabel } from "@/features/pembangunan/domain/pembangunan";

import styles from "./keuangan.module.css";

export const metadata: Metadata = { title: "Keuangan & Pembangunan" };

const rupiah = (value: bigint) => formatRupiah((Number(value) / 100).toFixed(2));
const pct = (realisasi: string, pagu: string) => {
  const total = toMinor(pagu);
  return total > 0n ? Math.min(100, Number((toMinor(realisasi) * 10000n) / total) / 100) : 0;
};

export default async function KeuanganPage() {
  const tahun = new Date().getFullYear();
  const [keuangan, pembangunan] = await Promise.all([
    listKeuangan(tahun),
    listPembangunan({ search: "", tahun, status: "", page: 1, pageSize: 1000 }).catch(() => ({
      rows: [], total: 0, page: 1, pageSize: 5, pageCount: 1,
    })),
  ]);
  const akun = new Map(keuangan.rows.map((row) => [row.templateUuid, row]));
  const pendapatan = akun.get("4");
  const belanja = akun.get("5");
  const pembiayaan = akun.get("6");
  const pagu = toMinor(pendapatan?.anggaran ?? "0") + toMinor(belanja?.anggaran ?? "0") + toMinor(pembiayaan?.anggaran ?? "0");
  const realisasi = toMinor(pendapatan?.realisasi ?? "0") + toMinor(belanja?.realisasi ?? "0") + toMinor(pembiayaan?.realisasi ?? "0");
  const sisa = pagu - realisasi;
  const selesai = pembangunan.rows.filter((row) => row.status === "selesai").length;
  const berjalan = pembangunan.rows.filter((row) => row.status === "berjalan").length;
  const persiapan = pembangunan.rows.filter((row) => row.status === "rencana").length;
  const tertunda = pembangunan.rows.filter((row) => row.status === "dibatalkan").length;

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.headingIcon}>▤</div>
        <div><p className={styles.eyebrow}>PENGELOLAAN DESA</p><h1>Keuangan &amp; Pembangunan</h1><p>Kelola APBDes, realisasi anggaran, kegiatan, dan pembangunan desa secara transparan.</p></div>
      </header>

      <section className={styles.metrics}>
        <article className={styles.metricPrimary}><span>Pagu APBDes {keuangan.tahun}</span><strong>{formatRupiah((pendapatan?.anggaran ?? "0"))}</strong><small>Tahun anggaran berjalan</small></article>
        <article className={styles.metric}><span>Realisasi Pendapatan</span><strong>{formatRupiah(pendapatan?.realisasi ?? "0")}</strong><small>{pct(pendapatan?.realisasi ?? "0", pendapatan?.anggaran ?? "0").toFixed(1)}% dari pagu</small></article>
        <article className={styles.metric}><span>Realisasi Belanja</span><strong>{formatRupiah(belanja?.realisasi ?? "0")}</strong><small>{pct(belanja?.realisasi ?? "0", belanja?.anggaran ?? "0").toFixed(1)}% dari pagu</small></article>
        <article className={styles.metric}><span>Sisa Anggaran</span><strong>{rupiah(sisa)}</strong><small>Dari total akun APBDes</small></article>
        <article className={styles.metric}><span>Total Kegiatan</span><strong>{pembangunan.total} kegiatan</strong><small>{selesai} selesai · {berjalan} berjalan</small></article>
      </section>

      <nav className={styles.tabs} aria-label="Navigasi keuangan dan pembangunan">
        <Link className={styles.activeTab} href="/keuangan">◫ Dashboard</Link>
        <Link href="/keuangan/apbdes">▤ APBDes</Link>
        <Link href="/keuangan/realisasi">▥ Realisasi Anggaran</Link>
        <Link href="/keuangan/kegiatan">⚒ Kegiatan &amp; Pembangunan</Link>
        <Link href="/keuangan/laporan">▧ Laporan Keuangan</Link>
      </nav>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeading}><div><h2>Ringkasan APBDes {keuangan.tahun}</h2><p>Ikhtisar pagu dan realisasi per akun utama</p></div><Link href="/keuangan/apbdes">Kelola APBDes →</Link></div>
          <div className={styles.accountRows}>
            {[["Pendapatan Desa", pendapatan], ["Belanja Desa", belanja], ["Pembiayaan Desa", pembiayaan]].map(([label, row]) => {
              const item = row as (typeof keuangan.rows)[number] | undefined;
              const progress = pct(item?.realisasi ?? "0", item?.anggaran ?? "0");
              return <div className={styles.accountRow} key={String(label)}><div><strong>{String(label)}</strong><span>{formatRupiah(item?.realisasi ?? "0")} / {formatRupiah(item?.anggaran ?? "0")}</span></div><div className={styles.progress}><i style={{ width: progress + "%" }} /></div><b>{progress.toFixed(1)}%</b></div>;
            })}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeading}><div><h2>Status Kegiatan Pembangunan</h2><p>Ringkasan kegiatan tahun anggaran {tahun}</p></div><Link href="/keuangan/kegiatan">Lihat semua →</Link></div>
          <div className={styles.statusGrid}>
            <div><strong>{selesai}</strong><span>Selesai</span></div><div><strong>{berjalan}</strong><span>Berjalan</span></div><div><strong>{persiapan}</strong><span>Persiapan</span></div><div><strong>{tertunda}</strong><span>Tertunda</span></div>
          </div>
          <p className={styles.note}>Angka status dihitung dari kegiatan yang ditampilkan pada daftar terbaru.</p>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeading}><div><h2>Kegiatan &amp; Pembangunan Terbaru</h2><p>Proyek yang tercatat pada tahun {tahun}</p></div><Link href="/keuangan/kegiatan">Kelola kegiatan →</Link></div>
          {pembangunan.rows.length ? <div className={styles.projectList}>{pembangunan.rows.map((row) => <div className={styles.project} key={row.id}><div><strong>{row.judul}</strong><span>{row.lokasi || "Lokasi belum diisi"} · {row.tahunAnggaran}</span></div><div className={styles.projectMeta}><b>{statusPembangunanLabel(row.status)}</b><span>{row.progres}%</span></div><div className={styles.progress}><i style={{ width: row.progres + "%" }} /></div></div>)}</div> : <p className={styles.empty}>Belum ada kegiatan pembangunan untuk tahun ini. Tambahkan kegiatan pertama melalui menu Kegiatan &amp; Pembangunan.</p>}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeading}><div><h2>Akses Cepat</h2><p>Operasional pengelolaan keuangan desa</p></div></div>
          <div className={styles.quickLinks}><Link href="/keuangan/apbdes">＋ Susun / perbarui APBDes</Link><Link href="/keuangan/realisasi">↗ Catat realisasi anggaran</Link><Link href="/keuangan/kegiatan">⚒ Tambah kegiatan pembangunan</Link><Link href="/keuangan/laporan">▧ Lihat &amp; ekspor laporan</Link><Link href="/keuangan/dokumen">▤ Arsip dokumen keuangan</Link></div>
        </article>
      </section>
    </main>
  );
}
