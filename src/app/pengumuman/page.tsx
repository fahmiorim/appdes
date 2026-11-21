import Link from "next/link";

import { agendaMendatang } from "@/features/agenda/application/agenda-use-cases";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import {
  daftarBerita,
  daftarKategoriBerita,
  hitungBeritaPublik,
} from "@/features/publik/application/konten-publik";

import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";
import styles from "./pengumuman.module.css";

export const dynamic = "force-dynamic";
const ZONA_WAKTU = "Asia/Jakarta";
type Props = { searchParams: Promise<{ q?: string; kategori?: string }> };

function mediaUrl(value: string | null, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes("..")))
    return null;
  const safe = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return "/api/publik/media/" + safe.map(encodeURIComponent).join("/");
}
function tanggal(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: ZONA_WAKTU,
  }).format(value);
}
function tanggalAgenda(value: string) {
  const [yearValue, monthValue, dayValue] = value.split("-").map(Number);
  const year = yearValue ?? 0;
  const month = monthValue ?? 1;
  const day = dayValue ?? 1;
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    day: new Intl.DateTimeFormat("id-ID", { day: "2-digit", timeZone: "UTC" }).format(date),
    month: new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(date),
    year,
  };
}
function angka(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export async function generateMetadata() {
  const desa = await getIdentitasFromRequest();
  return {
    title: `Pengumuman & Agenda | ${desa.namaDesa ?? "Pemerintah Desa"}`,
    description: `Pengumuman resmi dan agenda kegiatan ${desa.namaDesa ?? "desa"}.`,
  };
}

export default async function PengumumanPage({ searchParams }: Props) {
  const [desa, params] = await Promise.all([getIdentitasFromRequest(), searchParams]);
  const q = (params.q ?? "").trim().slice(0, 100);
  const selectedCategory = (params.kategori ?? "").trim().slice(0, 80);
  const [categories, agenda] = await Promise.all([
    daftarKategoriBerita(desa.id),
    agendaMendatang(desa.id, 3),
  ]);
  const announcementCategory = categories.find((item) => item.slug === "pengumuman");
  const defaultCategory = selectedCategory || announcementCategory?.slug;
  const announcements = defaultCategory
    ? await daftarBerita(desa.id, {
        limit: 60,
        kategoriSlug: defaultCategory,
        cari: q || undefined,
      })
    : await daftarBerita(desa.id, { limit: 60, cari: q || undefined });
  const categoryCounts = await Promise.all(
    categories.map((item) => hitungBeritaPublik(desa.id, item.slug)),
  );
  const counts = new Map(categories.map((item, index) => [item.slug, categoryCounts[index] ?? 0]));
  const shown = announcements;
  const location = [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi]
    .filter(Boolean)
    .join(", ");
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const importantLinks = [
    {
      title: "APBDes & Transparansi",
      description: "Rencana dan realisasi anggaran desa",
      href: "/transparansi/apbdes",
      icon: "▤",
      tone: "purple",
    },
    {
      title: "Layanan Surat Online",
      description: "Ajukan surat melalui Area Warga",
      href: "/layanan/surat",
      icon: "▧",
      tone: "blue",
    },
    {
      title: "Data Statistik Desa",
      description: "Data kependudukan dan wilayah",
      href: "/statistik",
      icon: "▥",
      tone: "green",
    },
    {
      title: "Galeri Kegiatan",
      description: "Dokumentasi kegiatan desa",
      href: "/galeri",
      icon: "▧",
      tone: "pink",
    },
  ];
  return (
    <main className={styles.site}>
      <PublicSiteHeader
        desa={desa}
        location={location}
        logoUrl={logoUrl}
        activePath="/pengumuman"
      />
      <section className={styles.hero}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb}>
            <Link href="/">Beranda</Link>
            <span>›</span>
            <Link href="/berita">Informasi</Link>
            <span>›</span>
            <span>Pengumuman & Agenda</span>
          </nav>
          <div className={styles.heroContent}>
            <div>
              <span className={styles.eyebrow}>PUSAT INFORMASI RESMI</span>
              <h1>Pengumuman & Agenda Kegiatan</h1>
              <p>Informasi penting dan jadwal kegiatan resmi {desa.namaDesa ?? "desa"}.</p>
            </div>
            <div className={styles.heroArt} aria-hidden="true">
              <div className={styles.calendarArt}>
                <b>▦</b>
                <span>✓</span>
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className={styles.megaphone}>◀</div>
            </div>
          </div>
        </div>
      </section>
      <div className={styles.container + " " + styles.content}>
        <nav className={styles.tabs}>
          <Link className={styles.activeTab} href="/pengumuman">
            ⚑　Pengumuman
          </Link>
          <Link href="/agenda">▦　Agenda Kegiatan</Link>
        </nav>
        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <h2>
                    <span>⚑</span> Pengumuman Terbaru
                  </h2>
                  <p>Informasi resmi dari Pemerintah {desa.namaDesa ?? "Desa"}.</p>
                </div>
                <Link href="/pengumuman">Lihat Semua　→</Link>
              </div>
              {shown.length ? (
                <div className={styles.announcementList}>
                  {shown.slice(0, 3).map((item, index) => (
                    <article className={styles.announcement} key={item.id}>
                      <div className={styles.announcementIcon + " " + styles["tone" + (index % 3)]}>
                        {index === 0 ? "⚑" : index === 1 ? "▤" : "ⓘ"}
                      </div>
                      <div className={styles.announcementCopy}>
                        <div className={styles.titleRow}>
                          <h3>
                            <Link href={`/pengumuman/${encodeURIComponent(item.slug)}`}>
                              {item.judul}
                            </Link>
                          </h3>
                          {item.headline ? <span className={styles.important}>Penting</span> : null}
                        </div>
                        <p>
                          {item.ringkasan ||
                            "Buka pengumuman untuk membaca informasi selengkapnya dari pemerintah desa."}
                        </p>
                        <div className={styles.meta}>
                          <span>▣　{tanggal(item.terbitPada ?? item.createdAt)}</span>
                          <span>◉　{angka(item.hit)} kali dibaca</span>
                        </div>
                      </div>
                      <Link
                        className={styles.arrow}
                        href={`/pengumuman/${encodeURIComponent(item.slug)}`}
                        aria-label={`Baca ${item.judul}`}
                      >
                        ›
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.empty}>
                  <b>{q ? "Pengumuman tidak ditemukan" : "Belum ada pengumuman"}</b>
                  <p>
                    {q
                      ? "Coba kata kunci lain."
                      : "Pengumuman resmi akan tampil di sini setelah diterbitkan dengan kategori pengumuman."}
                  </p>
                </div>
              )}
            </section>
            <section className={styles.panel + " " + styles.agendaPanel}>
              <div className={styles.panelHeading}>
                <div>
                  <h2>
                    <span className={styles.blueIcon}>▦</span> Agenda Kegiatan
                  </h2>
                  <p>Jadwal kegiatan dan program Pemerintah {desa.namaDesa ?? "Desa"}.</p>
                </div>
                <Link href="/agenda">Lihat Semua　→</Link>
              </div>
              {agenda.length ? (
                <div className={styles.agendaList}>
                  {agenda.map((item, index) => {
                    const date = tanggalAgenda(item.mulai);
                    return (
                      <article className={styles.agendaItem} key={item.id}>
                        <div className={styles.dateTile}>
                          <b>{date.day}</b>
                          <strong>{date.month}</strong>
                          <small>{date.year}</small>
                        </div>
                        <div className={styles.agendaCopy}>
                          <h3>
                            <Link href={`/agenda/${item.id}`}>{item.judul}</Link>
                          </h3>
                          <p>{item.deskripsi || "Informasi kegiatan resmi pemerintah desa."}</p>
                          <div className={styles.meta}>
                            <span>
                              ◷　
                              {item.jamMulai
                                ? item.jamMulai.slice(0, 5).replace(":", ".") +
                                  (item.jamSelesai
                                    ? " – " + item.jamSelesai.slice(0, 5).replace(":", ".")
                                    : "") +
                                  " WIB"
                                : "Waktu belum ditentukan"}
                            </span>
                            <span>⌖　{item.lokasi || "Lokasi belum ditentukan"}</span>
                          </div>
                        </div>
                        <span className={styles.eventVisual}>
                          {index === 0 ? "▦" : index === 1 ? "♧" : "▤"}
                        </span>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.empty}>
                  <b>Belum ada agenda mendatang</b>
                  <p>Agenda kegiatan yang telah dipublikasikan akan tampil di sini.</p>
                </div>
              )}
            </section>
          </div>
          <aside className={styles.sidebar}>
            <section className={styles.sideCard}>
              <h2>⌕　Cari Informasi</h2>
              <form action="/pengumuman" method="get" className={styles.search}>
                <input
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Ketik kata kunci..."
                  aria-label="Cari informasi"
                />
                <button type="submit">⌕</button>
              </form>
            </section>
            <section className={styles.sideCard}>
              <h2>▤　Kategori Informasi</h2>
              <div className={styles.categoryList}>
                <Link
                  href="/pengumuman"
                  className={!selectedCategory ? styles.categoryActive : undefined}
                >
                  <span>▤</span>
                  <b>Semua Informasi</b>
                  <small>
                    {angka(categories.reduce((sum, item) => sum + (counts.get(item.slug) ?? 0), 0))}
                  </small>
                </Link>
                {categories.map((item, index) => (
                  <Link
                    key={item.id}
                    href={`/pengumuman?kategori=${encodeURIComponent(item.slug)}`}
                    className={selectedCategory === item.slug ? styles.categoryActive : undefined}
                  >
                    <span>{["⚑", "▦", "♧", "ⓘ", "•••"][index % 5]}</span>
                    <b>{item.nama}</b>
                    <small>{angka(counts.get(item.slug) ?? 0)}</small>
                  </Link>
                ))}
              </div>
            </section>
            <section className={styles.sideCard}>
              <h2>ⓘ　Informasi Penting</h2>
              <div className={styles.importantLinks}>
                {importantLinks.map((item) => (
                  <Link href={item.href} key={item.href}>
                    <span className={styles[item.tone]}>{item.icon}</span>
                    <div>
                      <b>{item.title}</b>
                      <small>{item.description}</small>
                    </div>
                    <strong>›</strong>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
        <section className={styles.bottomCta}>
          <div className={styles.ctaArt}>▦　♬</div>
          <div>
            <h2>Jangan Lewatkan Informasi Penting Desa!</h2>
            <p>Dapatkan informasi pengumuman dan agenda kegiatan terbaru dari pemerintah desa.</p>
          </div>
          <Link href="/kontak">Hubungi Pemerintah Desa　→</Link>
        </section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl} />
    </main>
  );
}
