import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getPetaPublik } from "@/features/gis/application/use-cases";
import type { AreaDTO, PolygonDTO } from "@/features/gis/domain/gis";
import {
  parseGeoJsonRings,
  proyeksikanKelompokRings,
  type KoordinatPeta,
} from "@/features/gis/domain/peta-cetak";
import { daftarWilayahPublik } from "@/features/wilayah/application/wilayah-publik";

import styles from "./wilayah.module.css";

export const dynamic = "force-dynamic";

type AreaShape = {
  id: number;
  name: string;
  description: string | null;
  color: string;
  rings: KoordinatPeta[][];
};

function buildAreaShapes(areas: AreaDTO[], polygons: PolygonDTO[]): AreaShape[] {
  const colors = new Map(polygons.map((polygon) => [polygon.id, polygon.color]));
  return areas
    .map((area) => ({
      id: area.id,
      name: area.nama,
      description: area.desk,
      color: /^#[0-9a-fA-F]{6}$/.test(colors.get(area.refPolygon ?? -1) ?? "")
        ? (colors.get(area.refPolygon ?? -1) as string)
        : "#7c3aed",
      rings: parseGeoJsonRings(area.path),
    }))
    .filter((area) => area.rings.length > 0);
}

export default async function WilayahPage() {
  const desa = await getIdentitasFromRequest();
  const [rows, mapData] = await Promise.all([daftarWilayahPublik(desa.id), getPetaPublik()]);
  const dusun = [...new Set(rows.map((row) => row.dusun).filter(Boolean))];
  const rw = [...new Set(rows.filter((row) => row.rw).map((row) => `${row.dusun}::${row.rw}`))];
  const rt = [
    ...new Set(rows.filter((row) => row.rt).map((row) => `${row.dusun}::${row.rw}::${row.rt}`)),
  ];
  const grouped = dusun.map((name) => ({ name, items: rows.filter((row) => row.dusun === name) }));
  const shapes = buildAreaShapes(mapData.areas, mapData.polygons);
  const projectedRings = proyeksikanKelompokRings(
    shapes.map((shape) => shape.rings),
    { lebar: 1000, tinggi: 600, padding: 30 },
  );

  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.mark}>D</span>
            <span>
              <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
              <small>Wilayah Administratif</small>
            </span>
          </Link>
          <nav aria-label="Navigasi utama">
            <Link href="/">Beranda</Link>
            <Link href="/profil">Profil Desa</Link>
            <Link href="/berita">Berita</Link>
            <Link href="/agenda">Agenda</Link>
          </nav>
          <Link href="/masuk" className={styles.login}>
            Masuk ↗
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}>
            <Link href="/">Beranda</Link>
            <span>/</span>
            <span>Wilayah Desa</span>
          </div>
          <p className={styles.kicker}>PEMBAGIAN WILAYAH</p>
          <h1>Wilayah {desa.namaDesa ?? "Desa"}</h1>
          <p>
            Informasi batas wilayah, peta administrasi, dan pembagian dusun di lingkungan{" "}
            {desa.namaDesa ?? "desa"}.
          </p>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.container}>
          <nav className={styles.sectionTabs} aria-label="Informasi profil desa">
            <Link href="/sejarah">Sejarah Desa</Link>
            <Link href="/visi-misi">Visi &amp; Misi</Link>
            <span aria-current="page">Wilayah Desa</span>
            <Link href="/potensi">Potensi Desa</Link>
          </nav>

          <div className={styles.overview}>
            <section className={styles.mapPanel}>
              <div className={styles.panelHeading}>
                <span aria-hidden="true">⌖</span>
                <div>
                  <h2>Peta Wilayah {desa.namaDesa ?? "Desa"}</h2>
                  <p>Batas area yang telah dipublikasikan oleh pemerintah desa.</p>
                </div>
              </div>
              {shapes.length ? (
                <svg
                  className={styles.mapCanvas}
                  viewBox="0 0 1000 600"
                  role="img"
                  aria-label={`Peta batas wilayah ${desa.namaDesa ?? "desa"} berdasarkan data GIS`}
                >
                  <defs>
                    <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#dce7f5" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="1000" height="600" fill="#f1f6ff" />
                  <rect width="1000" height="600" fill="url(#map-grid)" />
                  {shapes.map((shape, shapeIndex) =>
                    (projectedRings[shapeIndex] ?? []).map((ring, index) => (
                      <polygon
                        key={`${shape.id}-${index}`}
                        points={ring
                          .map((titik) => `${titik.x.toFixed(2)},${titik.y.toFixed(2)}`)
                          .join(" ")}
                        fill={shape.color}
                        fillOpacity="0.42"
                        stroke={shape.color}
                        strokeWidth="5"
                        strokeLinejoin="round"
                      />
                    )),
                  )}
                </svg>
              ) : (
                <div className={styles.mapEmpty}>
                  <span aria-hidden="true">⌖</span>
                  <h3>Peta wilayah belum tersedia</h3>
                  <p>
                    Batas wilayah belum dipublikasikan. Peta akan tampil otomatis setelah data
                    polygon atau area GIS desa tersedia.
                  </p>
                </div>
              )}
              {shapes.length ? (
                <ul className={styles.mapLegend}>
                  {shapes.map((shape) => (
                    <li key={shape.id}>
                      <span style={{ backgroundColor: shape.color }} />
                      {shape.name}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <aside className={styles.infoColumn}>
              <section className={styles.infoPanel}>
                <div className={styles.panelHeading}>
                  <span aria-hidden="true">ⓘ</span>
                  <div>
                    <h2>Informasi Wilayah</h2>
                    <p>Data administratif yang tersedia.</p>
                  </div>
                </div>
                <dl className={styles.infoList}>
                  <div>
                    <dt>Jumlah Dusun</dt>
                    <dd>{dusun.length || "—"}</dd>
                  </div>
                  <div>
                    <dt>Jumlah RW</dt>
                    <dd>{rw.length || "—"}</dd>
                  </div>
                  <div>
                    <dt>Jumlah RT</dt>
                    <dd>{rt.length || "—"}</dd>
                  </div>
                  <div>
                    <dt>Area GIS</dt>
                    <dd>{shapes.length || "Belum tersedia"}</dd>
                  </div>
                </dl>
              </section>

              <section className={styles.infoPanel}>
                <div className={styles.panelHeading}>
                  <span aria-hidden="true">⇄</span>
                  <div>
                    <h2>Data Pembagian Wilayah</h2>
                    <p>Jumlah wilayah berdasarkan data yang tercatat.</p>
                  </div>
                </div>
                <div className={styles.boundaryList}>
                  {grouped.length ? (
                    grouped.map((group) => (
                      <div key={group.name}>
                        <strong>{group.name}</strong>
                        <span>{group.items.length} data RT/RW</span>
                      </div>
                    ))
                  ) : (
                    <p>Belum ada data pembagian dusun, RW, dan RT.</p>
                  )}
                </div>
              </section>
            </aside>
          </div>

          <section className={styles.sectionBlock}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.kicker}>STRUKTUR LINGKUNGAN</p>
                <h2>Pembagian Wilayah Dusun</h2>
                <p>Daftar dusun, RW, dan RT berdasarkan data administrasi desa.</p>
              </div>
              <span>{rows.length} data wilayah</span>
            </div>
            {grouped.length ? (
              <div className={styles.groups}>
                {grouped.map((group) => (
                  <article className={styles.group} key={group.name}>
                    <div className={styles.groupHead}>
                      <span className={styles.pin}>⌖</span>
                      <div>
                        <h3>{group.name}</h3>
                        <p>{group.items.length} data RT/RW</p>
                      </div>
                    </div>
                    <div className={styles.tags}>
                      {group.items.map((item) => (
                        <div className={styles.tag} key={item.id}>
                          <strong>{item.rw ? `RW ${item.rw}` : "RW —"}</strong>
                          <span>{item.rt ? `RT ${item.rt}` : "RT —"}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <span>⌖</span>
                <h3>Data wilayah belum tersedia</h3>
                <p>
                  Pembagian wilayah akan ditampilkan setelah data dilengkapi oleh pemerintah desa.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
          <span>© {new Date().getFullYear()} · Didukung FlexiDesa</span>
        </div>
      </footer>
    </main>
  );
}
