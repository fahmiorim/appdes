import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { daftarPerangkatPublik } from "@/features/publik/application/konten-publik";

import styles from "./detail-perangkat.module.css";
import { PublicSiteFooter, PublicSiteHeader } from "../../public-site-layout";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function mediaUrl(value: string | null, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes(".."))) return null;
  const safe = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return `/api/publik/media/${safe.map(encodeURIComponent).join("/")}`;
}

function fullName(item: { gelarDepan: string | null; nama: string; gelarBelakang: string | null }) {
  return [item.gelarDepan, item.nama, item.gelarBelakang].filter(Boolean).join(" ");
}

function dateLabel(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function roleDescription(role: string | null) {
  const name = (role ?? "").toLocaleLowerCase("id-ID");
  if (name.includes("kepala desa")) return "Memimpin penyelenggaraan pemerintahan desa, pembangunan, pembinaan kemasyarakatan, dan pemberdayaan masyarakat.";
  if (name.includes("sekretaris")) return "Mengoordinasikan administrasi pemerintahan desa, tata usaha, perencanaan, dan pelaporan.";
  if (name.includes("keuangan")) return "Membantu pengelolaan administrasi keuangan dan penatausahaan keuangan desa.";
  if (name.includes("perencanaan")) return "Mendukung penyusunan rencana program dan kegiatan pembangunan desa.";
  if (name.includes("pemerintahan")) return "Membantu pelaksanaan administrasi pemerintahan dan urusan kewilayahan desa.";
  if (name.includes("kesejahteraan")) return "Mendukung pelaksanaan kegiatan pembangunan dan pemberdayaan masyarakat.";
  if (name.includes("pelayanan")) return "Mendukung pelayanan administrasi dan pemenuhan kebutuhan masyarakat.";
  if (name.includes("umum") || name.includes("tata usaha")) return "Mendukung administrasi umum, persuratan, tata usaha, dan kearsipan.";
  return "Melaksanakan tugas sesuai jabatan dan ketentuan penyelenggaraan pemerintahan desa.";
}

export async function generateMetadata({ params }: Props) {
  const [{ id }, desa] = await Promise.all([params, getIdentitasFromRequest()]);
  const perangkat = await daftarPerangkatPublik(desa.id);
  const item = perangkat.find((entry) => entry.id === Number(id));
  return { title: item ? `${fullName(item)} | ${desa.namaDesa ?? "Perangkat Desa"}` : "Perangkat desa tidak ditemukan" };
}

export default async function DetailPerangkatPage({ params }: Props) {
  const [{ id }, desa] = await Promise.all([params, getIdentitasFromRequest()]);
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) notFound();
  const perangkat = await daftarPerangkatPublik(desa.id);
  const item = perangkat.find((entry) => entry.id === numericId);
  if (!item) notFound();

  const location = [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const photo = mediaUrl(item.foto, desa.id);
  const name = fullName(item);
  const others = perangkat.filter((entry) => entry.id !== item.id).slice(0, 6);
  const birthPlace = [item.tempatLahir, dateLabel(item.tanggalLahir)].filter(Boolean).join(", ");

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/pemerintahan" />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <nav aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>›</span><Link href="/pemerintahan">Pemerintahan Desa</Link><span>›</span><Link href="/pemerintahan#perangkat">Perangkat Desa</Link><span>›</span><span>Detail Perangkat</span></nav>
          <h1>Detail Perangkat Desa</h1>
          <p>Informasi perangkat Pemerintah {desa.namaDesa ?? "Desa"}, tugas, fungsi, dan informasi jabatan yang dipublikasikan.</p>
        </div>
      </section>

      <div className={styles.container}>
        <nav className={styles.sectionNav} aria-label="Navigasi pemerintahan">
          <Link href="/profil">♧ <span>Profil Desa</span></Link>
          <Link href="/pemerintahan#struktur">⌘ <span>Struktur Organisasi</span></Link>
          <Link className={styles.navActive} href="/pemerintahan#perangkat">♙ <span>Perangkat Desa</span></Link>
          <Link href="/pemerintahan#bpd">▧ <span>Lembaga Desa</span></Link>
          <Link href="/statistik">♧ <span>Demografi</span></Link>
        </nav>

        <div className={styles.mainGrid}>
          <aside className={styles.directory}>
            <h2><span>♧</span> Daftar Perangkat Desa</h2>
            <div className={styles.searchHint}>⌕ <span>Daftar perangkat aktif</span></div>
            <div className={styles.peopleList}>
              {perangkat.map((entry) => <Link key={entry.id} href={`/perangkat/${entry.id}`} className={entry.id === item.id ? styles.personActive : styles.person}>
                <span className={styles.avatar}>{mediaUrl(entry.foto, desa.id) ? <Image src={mediaUrl(entry.foto, desa.id)!} alt="" fill unoptimized sizes="52px" /> : entry.nama.slice(0,1).toUpperCase()}</span>
                <span className={styles.personCopy}><strong>{fullName(entry)}</strong><small>{entry.jabatan ?? "Perangkat Desa"}</small></span>
                <b>›</b>
              </Link>)}
            </div>
          </aside>

          <div className={styles.detailColumn}>
            <section className={styles.profileCard}>
              <div className={styles.portrait}>{photo ? <Image src={photo} alt={`Foto ${name}`} fill priority unoptimized sizes="220px" /> : <span>{item.nama.slice(0,1).toUpperCase()}</span>}</div>
              <div className={styles.profileInfo}>
                <h2>{name}</h2>
                <span className={styles.role}>{item.jabatan ?? "Perangkat Desa"}</span>
                <blockquote><span>“</span>{roleDescription(item.jabatan)}</blockquote>
                <div className={styles.metaGrid}>
                  <div><b>▦</b><span><small>Periode Jabatan</small><strong>{item.periode || "Belum dicantumkan"}</strong></span></div>
                  <div><b>♙</b><span><small>Status</small><strong className={styles.activeStatus}>● Aktif</strong></span></div>
                </div>
              </div>
            </section>

            <div className={styles.infoGrid}>
              <section className={styles.infoCard}>
                <h2>♙ Biodata Perangkat</h2>
                <dl>
                  <div><dt>Nama Lengkap</dt><dd>{name}</dd></div>
                  <div><dt>Jabatan</dt><dd>{item.jabatan ?? "—"}</dd></div>
                  <div><dt>Tempat, Tanggal Lahir</dt><dd>{birthPlace || "Belum dicantumkan"}</dd></div>
                  <div><dt>Jenis Kelamin</dt><dd>{item.jenisKelamin === "male" ? "Laki-laki" : item.jenisKelamin === "female" ? "Perempuan" : "Belum dicantumkan"}</dd></div>
                  <div><dt>NIP</dt><dd>{item.nip || "Belum dicantumkan"}</dd></div>
                  <div><dt>Periode Jabatan</dt><dd>{item.periode || "Belum dicantumkan"}</dd></div>
                </dl>
              </section>
              <section className={styles.infoCard}>
                <h2>▤ Tugas dan Wewenang</h2>
                <p className={styles.taskIntro}>Ruang lingkup tugas sesuai jabatan yang diemban.</p>
                <ul className={styles.taskList}><li>{roleDescription(item.jabatan)}</li><li>Melaksanakan tugas sesuai ketentuan peraturan yang berlaku.</li><li>Berkoordinasi dengan unsur pemerintahan desa dan masyarakat sesuai bidang tugas.</li></ul>
              </section>
              <section className={styles.infoCard}>
                <h2>☎ Kontak Desa</h2>
                <div className={styles.contactRow}><b>☎</b><span><small>Telepon kantor desa</small><strong>{desa.telepon || "Belum tersedia"}</strong></span></div>
                <div className={styles.contactRow}><b>✉</b><span><small>Email desa</small><strong>{desa.emailDesa || "Belum tersedia"}</strong></span></div>
                <div className={styles.contactRow}><b>⌖</b><span><small>Alamat kantor</small><strong>{desa.alamatKantor || location || "Belum tersedia"}</strong></span></div>
              </section>
              <section className={styles.infoCard}>
                <h2>▣ Dokumen Terkait</h2>
                <div className={styles.documentEmpty}>Belum ada dokumen jabatan yang dipublikasikan.</div>
              </section>
            </div>
          </div>
        </div>

        <section className={styles.otherSection}>
          <div className={styles.otherHeading}><div><h2>♧ Perangkat Desa Lainnya</h2><p>Kenali perangkat desa lainnya yang turut mendukung penyelenggaraan pemerintahan.</p></div><Link href="/pemerintahan#perangkat">Lihat Semua Perangkat →</Link></div>
          {others.length ? <div className={styles.otherGrid}>{others.map((entry) => <Link href={`/perangkat/${entry.id}`} className={styles.otherCard} key={entry.id}>
            <span className={styles.otherPhoto}>{mediaUrl(entry.foto, desa.id) ? <Image src={mediaUrl(entry.foto, desa.id)!} alt="" fill unoptimized sizes="150px" /> : entry.nama.slice(0,1).toUpperCase()}</span><strong>{fullName(entry)}</strong><small>{entry.jabatan ?? "Perangkat Desa"}</small><b>Lihat Profil →</b>
          </Link>)}</div> : <div className={styles.documentEmpty}>Belum ada perangkat desa lain yang dipublikasikan.</div>}
        </section>

        <section className={styles.callout}><span>♧</span><div><h2>Kenali Seluruh Perangkat Desa</h2><p>Lihat susunan organisasi dan informasi perangkat Pemerintah {desa.namaDesa ?? "Desa"}.</p></div><Link href="/pemerintahan">Lihat Struktur Organisasi →</Link></section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl} />
    </main>
  );
}
