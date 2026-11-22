import Link from "next/link";
import { notFound } from "next/navigation";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getPembangunanPublikBySlug } from "@/features/pembangunan/application/use-cases";
import { formatAnggaran, statusPembangunanLabel } from "@/features/pembangunan/domain/pembangunan";

import { PublicSiteFooter, PublicSiteHeader } from "../../public-site-layout";
import styles from "../pembangunan.module.css";

export const dynamic = "force-dynamic";
function mediaUrl(value: string | null | undefined, villageId: number) {
  if (!value) return null;
  const parts = value.split(/[\\\\/]/).filter(Boolean);
  if (!parts.length || parts.some((x) => x === ".." || x.includes(".."))) return null;
  const safe = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return "/api/publik/media/" + safe.map(encodeURIComponent).join("/");
}
export default async function DetailPembangunanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, desa] = await Promise.all([params, getIdentitasFromRequest()]);
  let data;
  try {
    data = await getPembangunanPublikBySlug(slug);
  } catch {
    notFound();
  }
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const p = data.proyek;
  return (
    <main className={styles.site}>
      <PublicSiteHeader
        desa={desa}
        location={[desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi]
          .filter(Boolean)
          .join(", ")}
        logoUrl={logoUrl}
        activePath="/pembangunan"
      />
      <section className={styles.hero}>
        <div className={styles.container}>
          <nav>
            <Link href="/">Beranda</Link>
            <span>›</span>
            <Link href="/pembangunan">Pembangunan Desa</Link>
            <span>›</span>
            <span>{p.judul}</span>
          </nav>
          <span className={styles.eyebrow}>DETAIL PEMBANGUNAN</span>
          <h1>{p.judul}</h1>
          <p>
            {p.lokasi ?? "Lokasi belum dicantumkan"} · Tahun Anggaran {p.tahunAnggaran}
          </p>
        </div>
      </section>
      <div className={styles.container}>
        <article className={styles.detailCard}>
          <div className={styles.detailHeader}>
            <span className={styles.status}>{statusPembangunanLabel(p.status)}</span>
            <strong>{formatAnggaran(p.anggaran)}</strong>
          </div>
          <p>{p.deskripsi ?? "Deskripsi kegiatan belum tersedia."}</p>
          <div className={styles.progressLabel}>
            <span>Progres pekerjaan</span>
            <b>{p.progres}%</b>
          </div>
          <div className={styles.progress}>
            <i style={{ width: p.progres + "%" }} />
          </div>
          <dl className={styles.details}>
            <div>
              <dt>Sumber dana</dt>
              <dd>{p.sumberDana ?? "—"}</dd>
            </div>
            <div>
              <dt>Pelaksana</dt>
              <dd>{p.pelaksana ?? "—"}</dd>
            </div>
            <div>
              <dt>Mulai</dt>
              <dd>{p.mulai ?? "—"}</dd>
            </div>
            <div>
              <dt>Selesai</dt>
              <dd>{p.selesai ?? "—"}</dd>
            </div>
            <div>
              <dt>Volume</dt>
              <dd>
                {p.volume ?? "—"} {p.satuan ?? ""}
              </dd>
            </div>
            <div>
              <dt>Koordinat GPS</dt>
              <dd>
                {p.latitude !== null && p.longitude !== null ? (
                  <a
                    href={
                      "https://www.openstreetmap.org/?mlat=" +
                      p.latitude +
                      "&mlon=" +
                      p.longitude +
                      "#map=16/" +
                      p.latitude +
                      "/" +
                      p.longitude
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Lihat lokasi di peta ↗
                  </a>
                ) : (
                  "Belum tersedia"
                )}
              </dd>
            </div>
          </dl>
          {p.hasil ? (
            <section>
              <h2>Hasil dan Manfaat</h2>
              <p>{p.hasil}</p>
            </section>
          ) : null}
        </article>
        <section className={styles.gallerySection}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.eyebrow}>DOKUMENTASI</span>
              <h2>Foto Pelaksanaan Kegiatan</h2>
            </div>
            <span>{data.dokumentasi.length} foto</span>
          </div>
          {data.dokumentasi.length ? (
            <div className={styles.gallery}>
              {data.dokumentasi.map((x) => {
                const src = mediaUrl(x.gambar, desa.id);
                return src ? (
                  <figure key={x.id}>
                    <img src={src} alt={x.judul ?? p.judul} />
                    <figcaption>
                      <strong>{x.judul ?? "Dokumentasi kegiatan"}</strong>
                      <span>{x.keterangan ?? ""}</span>
                    </figcaption>
                  </figure>
                ) : null;
              })}
            </div>
          ) : (
            <p className={styles.empty}>Dokumentasi foto belum tersedia.</p>
          )}
        </section>
        <Link className={styles.back} href="/pembangunan">
          ← Kembali ke daftar pembangunan
        </Link>
      </div>
      <PublicSiteFooter
        desa={desa}
        location={[desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi]
          .filter(Boolean)
          .join(", ")}
        logoUrl={logoUrl}
      />
    </main>
  );
}
