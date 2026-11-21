import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { daftarLembagaPublik } from "@/features/pemerintahan/application/publik";
import {
  daftarAlbumGaleri,
  daftarFotoAlbum,
  daftarPerangkatPublik,
  daftarSliderBeranda,
} from "@/features/publik/application/konten-publik";

import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";
import styles from "./pemerintahan.module.css";

export const dynamic = "force-dynamic";

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const segments = value.split(/[\\\\/]/).filter(Boolean);
  if (
    !segments.length ||
    segments.some((part) => part === "." || part === ".." || part.includes(".."))
  )
    return null;
  const path = segments[0] === String(villageId) ? segments : [String(villageId), ...segments];
  return `/api/publik/media/${path.map(encodeURIComponent).join("/")}`;
}

function namaLengkap(item: {
  gelarDepan: string | null;
  nama: string;
  gelarBelakang: string | null;
}): string {
  return [item.gelarDepan, item.nama, item.gelarBelakang].filter(Boolean).join(" ");
}

function tugasJabatan(jabatan: string | null): string {
  const nama = (jabatan ?? "").toLocaleLowerCase("id-ID");
  if (nama.includes("kepala desa"))
    return "Memimpin penyelenggaraan pemerintahan, pembangunan, pembinaan kemasyarakatan, dan pelayanan desa.";
  if (nama.includes("sekretaris"))
    return "Mengoordinasikan administrasi pemerintahan, tata usaha, perencanaan, dan pelaporan desa.";
  if (nama.includes("keuangan"))
    return "Membantu pengelolaan administrasi keuangan desa serta penatausahaan dan pelaporan.";
  if (nama.includes("perencanaan"))
    return "Mendukung penyusunan rencana program dan kegiatan pembangunan desa.";
  if (nama.includes("pemerintahan"))
    return "Membantu pelaksanaan administrasi pemerintahan dan urusan kewilayahan desa.";
  if (nama.includes("kesejahteraan"))
    return "Mendukung pelaksanaan kegiatan pembangunan dan pemberdayaan masyarakat.";
  if (nama.includes("pelayanan"))
    return "Mendukung pelayanan administrasi dan kebutuhan masyarakat desa.";
  if (nama.includes("umum") || nama.includes("tata usaha"))
    return "Mendukung administrasi umum, tata usaha, persuratan, dan kearsipan.";
  return "Menjalankan tugas sesuai jabatan dan ketentuan penyelenggaraan pemerintahan desa.";
}

const fungsiUtama = [
  {
    title: "Kepala Desa",
    icon: "⚑",
    iconClass: styles.functionIcon_purple,
    text: "Memimpin penyelenggaraan pemerintahan desa dan bertanggung jawab atas pelaksanaan pembangunan serta pelayanan masyarakat.",
  },
  {
    title: "Sekretaris Desa",
    icon: "▱",
    iconClass: styles.functionIcon_blue,
    text: "Mengoordinasikan administrasi pemerintahan desa, tata usaha, perencanaan, dan pelaporan.",
  },
  {
    title: "Kaur",
    icon: "♧",
    iconClass: styles.functionIcon_green,
    text: "Membantu urusan administrasi sesuai bidang, termasuk tata usaha, keuangan, dan perencanaan.",
  },
  {
    title: "Kasi",
    icon: "⚙",
    iconClass: styles.functionIcon_orange,
    text: "Membantu pelaksanaan urusan pemerintahan, kesejahteraan, dan pelayanan masyarakat.",
  },
  {
    title: "BPD",
    icon: "♧",
    iconClass: styles.functionIcon_purple,
    text: "Menampung dan menyalurkan aspirasi masyarakat serta menjalankan fungsi permusyawaratan desa.",
  },
];

export default async function PemerintahanPage() {
  const desa = await getIdentitasFromRequest();
  const [perangkat, slides, albums, lembagaPublik] = await Promise.all([
    daftarPerangkatPublik(desa.id),
    daftarSliderBeranda(desa.id),
    daftarAlbumGaleri(desa.id),
    daftarLembagaPublik(desa.id),
  ]);
  const photoGroups = await Promise.all(
    albums
      .filter((album) => album.jumlahFoto > 0)
      .slice(0, 2)
      .map((album) => daftarFotoAlbum(desa.id, album.id)),
  );
  const galleryPhotos = photoGroups.flat();
  const heroImage =
    mediaUrl(slides[0]?.gambar, desa.id) ??
    (galleryPhotos[0] ? mediaUrl(galleryPhotos[0].gambar, desa.id) : null);
  const location = [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi]
    .filter(Boolean)
    .join(", ");
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const kepalaDesa = perangkat.find((item) =>
    item.jabatan?.toLocaleLowerCase("id-ID").includes("kepala desa"),
  );
  const sekretaris = perangkat.find((item) =>
    item.jabatan?.toLocaleLowerCase("id-ID").includes("sekretaris"),
  );
  const lainnya = perangkat.filter(
    (item) => item.id !== kepalaDesa?.id && item.id !== sekretaris?.id,
  );
  const struktur = [kepalaDesa, sekretaris, ...lainnya].filter(
    (item): item is (typeof perangkat)[number] => Boolean(item),
  );

  function fotoPerangkat(item: (typeof perangkat)[number], className: string | undefined) {
    const src = mediaUrl(item.foto, desa.id);
    const name = namaLengkap(item);
    return (
      <div className={className}>
        {src ? (
          <Image
            src={src}
            alt={`Foto ${name}`}
            fill
            unoptimized
            sizes="(max-width:700px) 30vw, 100px"
          />
        ) : (
          <span>{item.nama.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
    );
  }

  return (
    <main className={styles.site}>
      <PublicSiteHeader
        desa={desa}
        location={location}
        logoUrl={logoUrl}
        activePath="/pemerintahan"
      />
      <section
        className={styles.hero}
        style={
          heroImage
            ? {
                backgroundImage: `linear-gradient(90deg,#06396ff2 0%,#07518fc9 48%,#073c6d42 100%),url("${heroImage}")`,
              }
            : undefined
        }
      >
        <div className={styles.heroInner}>
          <nav aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span>›</span>
            <span>Pemerintahan Desa</span>
          </nav>
          <h1>Pemerintahan Desa</h1>
          <p>
            Struktur organisasi, perangkat desa, BPD, serta tugas dan fungsi pemerintahan{" "}
            {desa.namaDesa ?? "desa"}.
          </p>
        </div>
      </section>

      <div className={styles.container}>
        <div className={styles.topGrid}>
          <aside className={styles.sidebar}>
            <h2>
              <span>♙</span> Pemerintahan Desa
            </h2>
            <a className={styles.sideActive} href="#struktur">
              <span>♧</span>Struktur Organisasi
            </a>
            <a href="#perangkat">
              <span>♙</span>Perangkat Desa
            </a>
            <a href="#bpd">
              <span>▣</span>BPD
            </a>
            <a href="#lembaga">
              <span>♧</span>Lembaga Desa
            </a>
            <a href="#tugas">
              <span>ⓘ</span>Tugas &amp; Fungsi
            </a>
          </aside>

          <section className={styles.orgPanel} id="struktur">
            <div className={styles.sectionHeading}>
              <h2>
                <span>♧</span> Struktur Organisasi Pemerintahan Desa
              </h2>
              <span className={styles.sectionHint}>Data aparatur aktif</span>
            </div>
            {struktur.length ? (
              <div className={styles.orgCanvas}>
                {kepalaDesa ? (
                  <div className={styles.orgRoot}>
                    {fotoPerangkat(kepalaDesa, styles.orgPhoto)}
                    <div>
                      <strong>{namaLengkap(kepalaDesa)}</strong>
                      <span>{kepalaDesa.jabatan}</span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.orgEmpty}>
                    Kepala Desa belum tercatat sebagai perangkat aktif.
                  </div>
                )}
                {sekretaris ? (
                  <div className={styles.secretaryNode}>
                    {fotoPerangkat(sekretaris, styles.smallPhoto)}
                    <div>
                      <strong>{sekretaris.jabatan}</strong>
                      <span>{namaLengkap(sekretaris)}</span>
                    </div>
                  </div>
                ) : null}
                {lainnya.length ? <div className={styles.orgLine} aria-hidden="true" /> : null}
                <div className={styles.orgChildren}>
                  {lainnya.map((item) => (
                    <article className={styles.orgChild} key={item.id}>
                      <span className={styles.orgIcon}>♙</span>
                      <strong>{item.jabatan ?? "Perangkat Desa"}</strong>
                      <span>{namaLengkap(item)}</span>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <strong>Struktur organisasi belum tersedia</strong>
                <p>
                  Data perangkat desa yang telah dipublikasikan akan ditampilkan dalam bagan
                  organisasi.
                </p>
              </div>
            )}
          </section>
        </div>

        <section className={styles.sectionCard} id="perangkat">
          <div className={styles.sectionHeading}>
            <div>
              <h2>
                <span>♧</span> Perangkat Desa
              </h2>
              <p>Daftar perangkat desa beserta jabatan dan tugasnya.</p>
            </div>
            <Link href="/perangkat">
              Lihat Detail Perangkat <b>→</b>
            </Link>
          </div>
          {perangkat.length ? (
            <div className={styles.officialGrid}>
              {perangkat.map((item) => (
                <Link href={`/perangkat/${item.id}`} className={styles.officialCard} key={item.id}>
                  {fotoPerangkat(item, styles.officialPhoto)}
                  <div className={styles.officialBody}>
                    <h3>{namaLengkap(item)}</h3>
                    <span className={styles.rolePill}>{item.jabatan ?? "Perangkat Desa"}</span>
                    <p>{tugasJabatan(item.jabatan)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>Data perangkat desa belum dipublikasikan</strong>
              <p>
                Informasi aparatur akan muncul setelah pemerintah desa mempublikasikan data
                perangkat.
              </p>
            </div>
          )}
        </section>

        <section className={styles.sectionCard} id="bpd">
          <div className={styles.sectionHeading}><div><h2><span>♧</span> Badan Permusyawaratan Desa (BPD)</h2><p>Lembaga permusyawaratan desa yang menyalurkan aspirasi masyarakat.</p></div><span className={styles.sectionHint}>Informasi BPD</span></div>
          {lembagaPublik.filter((item) => item.jenis === "bpd").length ? lembagaPublik.filter((item) => item.jenis === "bpd").map((item) => (
            <article className={styles.bpdContent} key={item.id}><div><h3>{item.nama}</h3>{item.deskripsi ? <p className={styles.bpdDescription}>{item.deskripsi}</p> : null}{item.tugasFungsi ? <p>{item.tugasFungsi}</p> : null}{item.dasarHukum ? <small>Dasar hukum: {item.dasarHukum}</small> : null}{item.dokumen.length ? <ul>{item.dokumen.map((doc) => <li key={doc.id}><a href={`/api/pemerintahan/dokumen/${doc.id}`}>{doc.judul}</a></li>)}</ul> : null}<p>Masa bakti: {item.masaBaktiMulai ?? "—"} – {item.masaBaktiSelesai ?? "—"}</p></div>
              {item.anggota.length ? <div className={styles.officialGrid}>{item.anggota.map((person) => <article className={styles.officialCard} key={person.id}><div className={styles.officialPhoto}>{person.foto ? <Image src={mediaUrl(person.foto,desa.id) ?? ""} alt={person.nama} fill unoptimized sizes="100px"/> : <span>{person.nama.slice(0,1)}</span>}</div><div className={styles.officialBody}><h3>{person.nama}</h3><span className={styles.rolePill}>{person.jabatan ?? "Anggota"}</span></div></article>)}</div> : <p className={styles.emptyState}>Susunan anggota belum dipublikasikan.</p>}
            </article>)) : <div className={styles.emptyState}><strong>Data BPD belum dipublikasikan</strong><p>Informasi BPD akan muncul setelah pemerintah desa mengaktifkan publikasi lembaga dan anggotanya.</p></div>}
        </section>
        <section className={styles.sectionCard} id="lembaga">
          <div className={styles.sectionHeading}><div><h2><span>♧</span> Lembaga Desa</h2><p>Informasi kelembagaan yang mendukung penyelenggaraan pemerintahan desa.</p></div></div>
          {lembagaPublik.filter((item) => item.jenis !== "bpd").length ? <div className={styles.officialGrid}>{lembagaPublik.filter((item) => item.jenis !== "bpd").map((item) => <article className={styles.officialCard} key={item.id}><div className={styles.officialBody}><h3>{item.nama}</h3><span className={styles.rolePill}>{item.jenis.toUpperCase()}</span>{item.deskripsi ? <p>{item.deskripsi}</p> : null}{item.tugasFungsi ? <p>{item.tugasFungsi}</p> : null}<small>Masa bakti: {item.masaBaktiMulai ?? "—"} – {item.masaBaktiSelesai ?? "—"}</small>{item.anggota.length ? <ul>{item.anggota.map((person) => <li key={person.id}>{person.nama}{person.jabatan ? ` — ${person.jabatan}` : ""}</li>)}</ul> : null}{item.dokumen.length ? <ul>{item.dokumen.map((doc) => <li key={doc.id}><a href={`/api/pemerintahan/dokumen/${doc.id}`}>{doc.judul}</a></li>)}</ul> : null}</div></article>)}</div> : <div className={styles.emptyState}><strong>Belum ada lembaga yang dipublikasikan</strong><p>Data lembaga akan tampil setelah status publikasi diaktifkan oleh administrator desa.</p></div>}
        </section>

        <section className={styles.sectionCard} id="tugas">
          <div className={styles.sectionHeading}>
            <div>
              <h2>
                <span>▤</span> Tugas &amp; Fungsi Pemerintahan Desa
              </h2>
              <p>Gambaran fungsi utama unsur pemerintahan desa.</p>
            </div>
          </div>
          <div className={styles.functionGrid}>
            {fungsiUtama.map((item) => (
              <article className={styles.functionCard} key={item.title}>
                <span className={item.iconClass}>{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl} />
    </main>
  );
}
