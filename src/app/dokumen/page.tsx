import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { daftarDokumenPublik } from "@/features/publik/application/dokumen-publik";
import {
  DOKUMEN_KATEGORI_FILTERS,
  isSafeDocumentLink,
  parseDokumenKategoriFilter,
} from "@/features/publik/domain/dokumen";

import styles from "../informasi-publik.module.css";
import { PublicShell } from "../public-shell";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ q?: string; kategori?: string; page?: string }> };

function mediaUrl(value: string | null, villageId: number): string | null {
  if (!value) return null;
  const segments = value.split(/[\\/]/).filter(Boolean);
  if (
    !segments.length ||
    segments.some((part) => part === "." || part === ".." || part.includes(".."))
  )
    return null;
  const path = segments[0] === String(villageId) ? segments : [String(villageId), ...segments];
  return `/api/publik/media/${path.map(encodeURIComponent).join("/")}`;
}

export default async function DokumenPage({ searchParams }: Props) {
  const [desa, params] = await Promise.all([getIdentitasFromRequest(), searchParams]);
  const q = (params.q ?? "").trim().slice(0, 100);
  const kategori = parseDokumenKategoriFilter(params.kategori);
  const requestedPage = Number(params.page ?? "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const data = await daftarDokumenPublik(desa.id, {
    search: q,
    category: kategori,
    page,
    pageSize: 20,
  });
  const query = (nextPage: number) => {
    const values = new URLSearchParams();
    if (q) values.set("q", q);
    if (kategori !== "semua") values.set("kategori", kategori);
    values.set("page", String(nextPage));
    return `/dokumen?${values.toString()}`;
  };
  return (
    <PublicShell
      villageName={desa.namaDesa ?? "Pemerintah Desa"}
      brandLabel="Dokumen & Informasi Publik"
      navigation={[
        { href: "/", label: "Beranda" },
        { href: "/profil", label: "Profil Desa" },
        { href: "/berita", label: "Berita" },
        { href: "/kontak", label: "Kontak" },
      ]}
    >
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.crumb}>
            <Link href="/">Beranda</Link>
            <span>/</span>
            <span>Dokumen Publik</span>
          </div>
          <p className={styles.kicker}>TRANSPARANSI INFORMASI</p>
          <h1>Dokumen Publik {desa.namaDesa ?? "Desa"}</h1>
          <p>Akses dokumen dan informasi resmi yang telah dipublikasikan oleh pemerintah desa.</p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container}>
          <form className={styles.filter} action="/dokumen" method="get">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Cari nama atau nomor dokumen"
              aria-label="Cari dokumen"
            />
            <select name="kategori" defaultValue={kategori} aria-label="Kategori dokumen">
              {DOKUMEN_KATEGORI_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button type="submit">Cari dokumen</button>
          </form>
          <div className={styles.docList}>
            {data.rows.length ? (
              data.rows.map((doc) => {
                const file = mediaUrl(doc.berkas, desa.id);
                const link = doc.tautan && isSafeDocumentLink(doc.tautan) ? doc.tautan : file;
                return (
                  <article className={styles.doc} key={doc.id}>
                    <div>
                      <h3>{doc.nama}</h3>
                      <p>
                        {[
                          doc.jenis,
                          doc.nomor,
                          doc.tahun ? String(doc.tahun) : null,
                          doc.keterangan,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Dokumen informasi publik"}
                      </p>
                    </div>
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer">
                        Buka dokumen ↗
                      </a>
                    ) : (
                      <span className={styles.muted}>Berkas belum tersedia</span>
                    )}
                  </article>
                );
              })
            ) : (
              <div className={styles.empty}>
                <strong>Dokumen belum tersedia</strong>
                <p>Belum ada dokumen aktif yang sesuai dengan pencarian ini.</p>
              </div>
            )}
          </div>
          <div className={styles.pager}>
            <span>
              {data.total} dokumen · Halaman {data.page}
            </span>
            <span>
              {data.page > 1 ? <Link href={query(data.page - 1)}>← Sebelumnya</Link> : null}{" "}
              {data.page * data.pageSize < data.total ? (
                <Link href={query(data.page + 1)}>Berikutnya →</Link>
              ) : null}
            </span>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
