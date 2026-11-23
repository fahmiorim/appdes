import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { agendaMendatang } from "@/features/agenda/application/agenda-use-cases";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { bacaPengaturan } from "@/features/pengaturan/application/pengaturan-use-cases";
import {
  catatKunjunganBerita,
  daftarBerita,
  daftarKategoriBerita,
  daftarPerangkatPublik,
  detailBerita,
} from "@/features/publik/application/konten-publik";
import { sanitasiHtml, teksPolos } from "@/lib/sanitize";

import { PublicSiteFooter, PublicSiteHeader } from "../../public-site-layout";
import styles from "../berita.module.css";
import { KomentarBerita } from "./komentar-berita";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes("..")))
    return null;
  const safe = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return `/api/publik/media/${safe.map(encodeURIComponent).join("/")}`;
}
function tanggal(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}
function tanggalJam(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}
function angka(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}
function excerpt(value: string | null, limit = 100) {
  return teksPolos(value ?? "").slice(0, limit);
}
function judulOrang(nama: string, belakang: string | null) {
  return [nama, belakang].filter(Boolean).join(" ");
}

export async function generateMetadata({ params }: Props) {
  const [{ slug }, desa] = await Promise.all([params, getIdentitasFromRequest()]);
  const berita = await detailBerita(desa.id, slug);
  if (!berita) return { title: "Berita tidak ditemukan" };
  return {
    title: `${berita.judul} | ${desa.namaDesa ?? "Berita Desa"}`,
    description: excerpt(berita.ringkasan || berita.isi, 160),
  };
}

export default async function DetailBeritaPage({ params }: Props) {
  const [{ slug }, desa] = await Promise.all([params, getIdentitasFromRequest()]);
  const berita = await detailBerita(desa.id, slug);
  if (!berita) notFound();
  await catatKunjunganBerita(berita.id);

  const [pengaturan, semuaBerita, kategoriBerita, agenda, perangkat] = await Promise.all([
    bacaPengaturan(desa.id),
    daftarBerita(desa.id, { limit: 30 }),
    daftarKategoriBerita(desa.id),
    agendaMendatang(desa.id, 3),
    daftarPerangkatPublik(desa.id),
  ]);
  const image = mediaUrl(berita.gambar, desa.id);
  const date = berita.terbitPada ?? berita.createdAt;
  const location = [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi]
    .filter(Boolean)
    .join(", ");
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const related = semuaBerita.filter((item) => item.id !== berita.id).slice(0, 3);
  const popular = [...semuaBerita]
    .filter((item) => item.id !== berita.id)
    .sort((a, b) => b.hit - a.hit)
    .slice(0, 3);
  const kepalaDesa = perangkat.find((item) =>
    (item.jabatan ?? "").toLocaleLowerCase("id-ID").includes("kepala desa"),
  );
  const authorName = kepalaDesa
    ? judulOrang(kepalaDesa.nama, kepalaDesa.gelarBelakang)
    : "Admin Desa";
  const authorImage = kepalaDesa ? mediaUrl(kepalaDesa.foto, desa.id) : null;
  const shareUrl = encodeURIComponent(`/berita/${encodeURIComponent(berita.slug)}`);
  const shareText = encodeURIComponent(berita.judul);

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/berita" />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <nav aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span>›</span>
            <Link href="/berita">Informasi</Link>
            <span>›</span>
            <Link href="/berita">Berita Desa</Link>
            <span>›</span>
            <span>Detail Berita</span>
          </nav>
          <h1>Berita Desa</h1>
          <p>
            Informasi terbaru seputar kegiatan, program, dan pembangunan di{" "}
            {desa.namaDesa ?? "desa"}.
          </p>
        </div>
      </section>

      <div className={styles.container}>
        <div className={styles.detailLayout}>
          <div className={styles.detailMain}>
            <article className={styles.articlePanel}>
              <span className={styles.detailCategory}>{berita.kategori ?? "Informasi"}</span>
              <h2 className={styles.detailTitle}>{berita.judul}</h2>
              <div className={styles.detailMeta}>
                <span>▣ {tanggalJam(date)} WIB</span>
                <i />
                <span>◉ {angka(berita.hit + 1)} kali dibaca</span>
                <i />
                <span>♙ Admin Desa</span>
              </div>
              {image ? (
                <div className={styles.detailCover}>
                  <Image
                    src={image}
                    alt={berita.judul}
                    fill
                    priority
                    unoptimized
                    sizes="(max-width: 850px) 100vw, 65vw"
                  />
                </div>
              ) : (
                <div className={styles.detailCoverFallback}>BERITA DESA</div>
              )}
              <div
                className={styles.articleBody}
                dangerouslySetInnerHTML={{ __html: sanitasiHtml(berita.isi) }}
              />
              {berita.dokumen ? (
                <a
                  className={styles.documentLink}
                  href={mediaUrl(berita.dokumen, desa.id) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Unduh dokumen pendukung ↗
                </a>
              ) : null}
              <div className={styles.articleActions}>
                <div className={styles.tags}>
                  <strong>♡ Tag:</strong>
                  <span>{berita.kategori ?? "Berita Desa"}</span>
                </div>
                <div className={styles.share}>
                  <strong>Bagikan:</strong>
                  <a
                    href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Bagikan ke WhatsApp"
                  >
                    ◉
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Bagikan ke Facebook"
                  >
                    f
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Bagikan ke X"
                  >
                    𝕏
                  </a>
                  <a
                    href={`mailto:?subject=${shareText}&body=${shareUrl}`}
                    aria-label="Bagikan melalui email"
                  >
                    ↗
                  </a>
                </div>
              </div>
            </article>

            <section className={styles.relatedPanel}>
              <h2>
                <span>♧</span> Berita Terkait
              </h2>
              {related.length ? (
                <div className={styles.relatedGrid}>
                  {related.map((item) => (
                    <Link
                      className={styles.relatedCard}
                      key={item.id}
                      href={`/berita/${encodeURIComponent(item.slug)}`}
                    >
                      <span className={styles.relatedImage}>
                        {mediaUrl(item.gambar, desa.id) ? (
                          <Image
                            src={mediaUrl(item.gambar, desa.id)!}
                            alt=""
                            fill
                            unoptimized
                            sizes="100px"
                          />
                        ) : null}
                      </span>
                      <span className={styles.relatedText}>
                        <small>{item.kategori ?? "Informasi"}</small>
                        <strong>{item.judul}</strong>
                        <em>
                          ▣ {tanggal(item.terbitPada ?? item.createdAt)}　◉ {angka(item.hit)}
                        </em>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className={styles.emptySmall}>Belum ada berita terkait.</p>
              )}
            </section>

            <KomentarBerita
              slug={berita.slug}
              enabled={berita.bolehKomentar && pengaturan.komentarAktif}
            />
          </div>

          <aside className={styles.detailSidebar}>
            <section className={styles.sideCard}>
              <h2>
                <span className={styles.sideBlue}>♟</span> Tentang Penulis
              </h2>
              <div className={styles.authorBox}>
                <span className={styles.authorPhoto}>
                  {authorImage ? (
                    <Image src={authorImage} alt="" fill unoptimized sizes="60px" />
                  ) : logoUrl ? (
                    <Image src={logoUrl} alt="" fill unoptimized sizes="60px" />
                  ) : (
                    "♟"
                  )}
                </span>
                <span>
                  <strong>{authorName}</strong>
                  <small>{kepalaDesa ? "Kepala Desa" : "Pengelola Sistem Informasi Desa"}</small>
                  <small>{desa.namaDesa ?? "Pemerintah Desa"}.</small>
                </span>
              </div>
            </section>
            <section className={styles.sideCard}>
              <h2>
                <span className={styles.sidePurple}>♨</span> Berita Populer
              </h2>
              <div className={styles.popularList}>
                {popular.length ? (
                  popular.map((item) => (
                    <Link
                      key={item.id}
                      href={`/berita/${encodeURIComponent(item.slug)}`}
                      className={styles.popularItem}
                    >
                      <span className={styles.popularImage}>
                        {mediaUrl(item.gambar, desa.id) ? (
                          <Image
                            src={mediaUrl(item.gambar, desa.id)!}
                            alt=""
                            fill
                            unoptimized
                            sizes="100px"
                          />
                        ) : null}
                      </span>
                      <span className={styles.popularCopy}>
                        <strong>{item.judul}</strong>
                        <small>
                          ▣ {tanggal(item.terbitPada ?? item.createdAt)}　◉ {angka(item.hit)}
                        </small>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className={styles.emptySmall}>Belum ada berita populer.</p>
                )}
              </div>
            </section>
            <section className={styles.sideCard}>
              <h2>
                <span className={styles.sideBlue}>▣</span> Kategori Berita
              </h2>
              <div className={styles.categoryList}>
                <Link href="/berita">
                  <span className={styles.categoryIcon}>▤</span>
                  <strong>Semua Berita</strong>
                </Link>
                {kategoriBerita.map((item, i) => (
                  <Link href={`/berita?kategori=${encodeURIComponent(item.slug)}`} key={item.id}>
                    <span className={styles.categoryIcon}>
                      {["♧", "▱", "♙", "♡", "♧", "♻"][i % 6]}
                    </span>
                    <strong>{item.nama}</strong>
                  </Link>
                ))}
              </div>
            </section>
            <section className={styles.sideCard}>
              <div className={styles.agendaHead}>
                <h2>
                  <span className={styles.sideBlue}>▦</span> Agenda Kegiatan
                </h2>
                <Link href="/agenda">Lihat Semua →</Link>
              </div>
              <div className={styles.agendaList}>
                {agenda.length ? (
                  agenda.map((item) => {
                    const d = new Date(`${item.mulai}T00:00:00`);
                    return (
                      <div className={styles.agendaItem} key={item.id}>
                        <span className={styles.agendaDate}>
                          <b>{new Intl.DateTimeFormat("id-ID", { day: "2-digit" }).format(d)}</b>
                          <small>
                            {new Intl.DateTimeFormat("id-ID", { month: "short" }).format(d)}
                          </small>
                        </span>
                        <span>
                          <strong>{item.judul}</strong>
                          <small>{item.deskripsi ?? item.kategori}</small>
                          <small>
                            ◷ {item.jamMulai ? item.jamMulai + " WIB" : "Waktu belum ditentukan"}
                            {item.lokasi ? " – " + item.lokasi : ""}
                          </small>
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className={styles.emptySmall}>Belum ada agenda mendatang.</p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl} />
    </main>
  );
}
