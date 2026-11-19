"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./layanan-surat.module.css";

type Service = { id: number; nama: string; kode: string; klasifikasi: string | null; butuhPenduduk: boolean; masaBerlakuBulan: number };
type Props = { desa: string; jenisSurat: Service[] };

const categories = ["Semua Surat", "Kependudukan", "Keterangan", "Usaha", "Sosial", "Lainnya"];
const faqs = [
  { q: "Bagaimana cara mengajukan surat secara online?", a: "Masuk atau buat akun Area Warga, pilih layanan surat yang dibutuhkan, lalu ikuti formulir dan instruksi yang tersedia." },
  { q: "Apakah saya harus memiliki akun warga?", a: "Ya. Pengajuan surat dilakukan melalui Area Warga agar data pemohon dan status permohonan dapat dikelola dengan aman." },
  { q: "Bagaimana mengetahui status pengajuan?", a: "Masuk ke akun Area Warga dan periksa bagian permohonan atau layanan surat untuk melihat informasi status yang tersedia." },
  { q: "Apa yang harus dilakukan jika permohonan perlu diperbaiki?", a: "Periksa catatan dari petugas pada akun Anda. Lengkapi atau perbaiki data sesuai arahan, kemudian ikuti kembali proses pengajuan." },
  { q: "Bagaimana jika saya membutuhkan bantuan?", a: "Hubungi pemerintah desa melalui halaman Kontak untuk memperoleh bantuan mengenai layanan surat." },
];

function categoryFor(item: Service) {
  const text = (item.klasifikasi ?? "") + " " + item.nama;
  if (/usaha|ekonomi/i.test(text)) return "Usaha";
  if (/sosial|miskin|bantuan/i.test(text)) return "Sosial";
  if (/kependudukan|domisili|ktp|kk|kelahiran|kematian|nikah|kawin/i.test(text)) return "Kependudukan";
  if (/keterangan|pendidikan|pengantar/i.test(text)) return "Keterangan";
  return "Lainnya";
}

function iconFor(item: Service) {
  const text = item.nama.toLowerCase();
  if (/usaha/.test(text)) return "♙";
  if (/nikah|kawin/.test(text)) return "♡";
  if (/pendidikan/.test(text)) return "◇";
  if (/kelahiran/.test(text)) return "♧";
  if (/domisili|ktp|kk/.test(text)) return "▣";
  return "▤";
}

export function LayananSuratOnline({ desa, jenisSurat }: Props) {
  const [category, setCategory] = useState("Semua Surat");
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState(0);
  const filtered = useMemo(() => jenisSurat.filter((item) => {
    const text = (item.nama + " " + item.kode + " " + (item.klasifikasi ?? "")).toLocaleLowerCase("id-ID");
    return (category === "Semua Surat" || categoryFor(item) === category) && text.includes(query.trim().toLocaleLowerCase("id-ID"));
  }), [jenisSurat, category, query]);

  return <>
    <div className={styles.mainGrid}>
      <section className={styles.catalog} id="pilih-surat">
        <div className={styles.sectionHead}><div className={styles.headingIcon}>▤</div><div><h2>Pilih Jenis Surat</h2><p>Silakan pilih layanan surat yang Anda butuhkan.</p></div></div>
        <label className={styles.search}><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari jenis surat..." aria-label="Cari jenis surat"/></label>
        <div className={styles.filters} role="group" aria-label="Filter kategori surat">{categories.filter((name) => name === "Semua Surat" || jenisSurat.some((item) => categoryFor(item) === name)).map((name) => <button type="button" key={name} className={category === name ? styles.activeFilter : ""} onClick={() => setCategory(name)}>{name}</button>)}</div>
        <div className={styles.cards}>
          {filtered.length ? filtered.map((item,index) => <article className={styles.card} key={item.id}>
            <div className={styles.cardTop}><span className={styles.serviceIcon + " " + styles["tone"+(index%5)]}>{iconFor(item)}</span><div><h3>{item.nama}</h3><span className={styles.category}>{item.klasifikasi ?? categoryFor(item)}</span></div></div>
            <p>{item.butuhPenduduk ? "Layanan ini memerlukan data penduduk yang terdaftar di desa." : "Layanan administrasi desa. Periksa persyaratan yang ditampilkan saat pengajuan."}</p>
            <div className={styles.cardMeta}><span>Kode: {item.kode}</span><span>Masa berlaku: {item.masaBerlakuBulan} bln</span></div>
            <Link href="/masuk" className={styles.apply}>Ajukan Surat　→</Link>
          </article>) : <div className={styles.empty}><strong>Jenis surat tidak ditemukan</strong><p>Coba kata kunci atau kategori lainnya.</p><button type="button" onClick={() => {setQuery("");setCategory("Semua Surat");}}>Hapus filter</button></div>}
        </div>
        <p className={styles.count}>Menampilkan {filtered.length} dari {jenisSurat.length} jenis surat aktif</p>
      </section>

      <aside className={styles.sidebar}>
        <section className={styles.loginPanel}><div className={styles.sideTitle}><span>♙</span><div><h2>Masuk / Daftar Akun</h2><p>Untuk mengajukan surat, silakan masuk ke akun Area Warga terlebih dahulu.</p></div></div><Link href="/masuk" className={styles.loginButton}>↪　Masuk ke Akun</Link><Link href="/daftar" className={styles.registerButton}>＋　Daftar Akun Baru</Link></section>
        <section className={styles.requirements}><div className={styles.sideTitle}><span>▤</span><div><h2>Syarat Umum Pengajuan</h2><p>Siapkan hal berikut sebelum memulai.</p></div></div><ul><li>Memiliki akun Area Warga.</li><li>Memilih jenis surat yang sesuai kebutuhan.</li><li>Mengisi data dengan benar dan lengkap.</li><li>Menyiapkan dokumen pendukung jika diminta.</li></ul></section>
        <section className={styles.notice}><h2>ⓘ　Informasi</h2><p>Jenis surat yang tampil merupakan layanan aktif yang disediakan {desa}. Persyaratan khusus dan tahapan berikutnya akan ditampilkan pada proses pengajuan setelah Anda masuk.</p><Link href="/kontak">Butuh bantuan? Hubungi desa　→</Link></section>
      </aside>
    </div>

    <section className={styles.process}>
      <div className={styles.sectionHead}><div className={styles.headingIcon}>⌘</div><div><h2>Alur Pengajuan Surat Online</h2><p>Proses pengajuan surat secara bertahap melalui Area Warga.</p></div></div>
      <div className={styles.steps}>
        {[
          ["♙","1. Login / Daftar","Masuk ke akun atau buat akun warga."],
          ["▤","2. Pilih Jenis Surat","Pilih layanan sesuai kebutuhan Anda."],
          ["✎","3. Isi Formulir","Lengkapi data dan dokumen yang diminta."],
          ["⚙","4. Proses Verifikasi","Petugas desa memeriksa permohonan."],
          ["✓","5. Surat Selesai","Ikuti instruksi untuk melihat atau mengambil surat."],
        ].map(([icon,title,description]) => <article key={title}><span>{icon}</span><b>{title}</b><p>{description}</p></article>)}
      </div>
    </section>

    <div className={styles.lowerGrid}>
      <section className={styles.faq}>
        <div className={styles.sectionHead}><div className={styles.headingIcon}>☏</div><div><h2>Pertanyaan yang Sering Diajukan</h2><p>Informasi umum tentang layanan surat online.</p></div></div>
        {faqs.map((faq,index) => <div className={styles.faqItem} key={faq.q}><button type="button" aria-expanded={openFaq===index} onClick={() => setOpenFaq(openFaq===index ? -1 : index)}>{faq.q}<span>{openFaq===index ? "⌃" : "⌄"}</span></button>{openFaq===index ? <p>{faq.a}</p> : null}</div>)}
      </section>
      <section className={styles.help}><div className={styles.helpArt}>▤　✓</div><div><h2>Ingin Mengajukan Surat?</h2><p>Masuk ke Area Warga untuk memulai pengajuan, melengkapi data, dan memantau proses layanan surat Anda.</p><Link href="/masuk">Masuk ke Area Warga　→</Link><Link href="/kontak">Hubungi Pemerintah Desa</Link></div></section>
    </div>
  </>;
}
