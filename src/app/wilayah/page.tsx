import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getStatistikDesa } from "@/features/desa/application/statistik-desa";
import { getPetaPublik } from "@/features/gis/application/use-cases";
import type { AreaDTO, PolygonDTO } from "@/features/gis/domain/gis";
import {
  parseGeoJsonRings,
  proyeksikanKelompokRings,
  type KoordinatPeta,
} from "@/features/gis/domain/peta-cetak";
import { daftarWilayahPublik } from "@/features/wilayah/application/wilayah-publik";
import { profilDesaPublik } from "@/features/publik/application/konten-publik";

import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";
import styles from "./wilayah.module.css";

export const dynamic = "force-dynamic";

type AreaShape = {
  id: number;
  name: string;
  description: string | null;
  color: string;
  rings: KoordinatPeta[][];
};

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes("..")))
    return null;
  const path = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return `/api/publik/media/${path.map(encodeURIComponent).join("/")}`;
}
function buildAreaShapes(areas: AreaDTO[], polygons: PolygonDTO[]): AreaShape[] {
  const colors = new Map(polygons.map((polygon) => [polygon.id, polygon.color]));
  return areas
    .map((area) => ({
      id: area.id,
      name: area.nama,
      description: area.desk,
      color: /^#[0-9a-fA-F]{6}$/.test(colors.get(area.refPolygon ?? -1) ?? "")
        ? colors.get(area.refPolygon ?? -1)!
        : "#7c3aed",
      rings: parseGeoJsonRings(area.path),
    }))
    .filter((area) => area.rings.length > 0);
}
const palette = ["#12bf56", "#f4b900", "#1689f5", "#a832ed"];
function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export default async function WilayahPage() {
  const desa = await getIdentitasFromRequest();
  const [rows, mapData, statistik, profil] = await Promise.all([
    daftarWilayahPublik(desa.id),
    getPetaPublik(),
    getStatistikDesa(desa.id),
    profilDesaPublik(desa.id),
  ]);
  const location = [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi]
    .filter(Boolean)
    .join(", ");
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const dusun = [...new Set(rows.map((row) => row.dusun).filter(Boolean))];
  const rw = [...new Set(rows.filter((row) => row.rw).map((row) => `${row.dusun}::${row.rw}`))];
  const rt = [
    ...new Set(rows.filter((row) => row.rt).map((row) => `${row.dusun}::${row.rw}::${row.rt}`)),
  ];
  const grouped = dusun.map((name) => ({ name, items: rows.filter((row) => row.dusun === name) }));
  const shapes = buildAreaShapes(mapData.areas, mapData.polygons);
  const projected = proyeksikanKelompokRings(
    shapes.map((shape) => shape.rings),
    { lebar: 1000, tinggi: 650, padding: 36 },
  );
  const mapPhoto = mapData.areas.map((area) => mediaUrl(area.foto, desa.id)).find(Boolean) ?? null;
  const profileStats = statistik.perDusun.filter((item) => item.label !== "Belum diisi");
  const residentsByDusun = new Map(profileStats.map((item) => [item.label, item.total]));
  const totalResidents = statistik.total;
  const totalFamilies = statistik.keluarga;
  const boundaryRows = [
    ["Kecamatan", desa.namaKecamatan],
    ["Kabupaten", desa.namaKabupaten],
    ["Provinsi", desa.namaPropinsi],
    ["Utara", profil?.batasUtara],
    ["Selatan", profil?.batasSelatan],
    ["Timur", profil?.batasTimur],
    ["Barat", profil?.batasBarat],
  ].filter((row) => row[1]);
  const geographyDetails = [
    ["Ketinggian", profil?.ketinggian],
    ["Suhu rata-rata", profil?.suhuRataRata],
    ["Curah hujan", profil?.curahHujan],
    ["Topografi", profil?.topografi],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/wilayah" />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <nav aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span>›</span>
            <Link href="/profil">Profil Desa</Link>
            <span>›</span>
            <span>Wilayah Desa</span>
          </nav>
          <h1>Wilayah Desa</h1>
          <p>
            Informasi batas wilayah, pembagian dusun, luas wilayah, dan kondisi geografis{" "}
            {desa.namaDesa ?? "desa"}.
          </p>
          <div className={styles.heroMap} aria-hidden="true">
            <span>⌖</span>
          </div>
        </div>
      </section>
      <div className={styles.container}>
        <nav className={styles.sectionNav} aria-label="Navigasi profil desa">
          <Link href="/sejarah">
            <span>▱</span>Sejarah Desa
          </Link>
          <Link href="/visi-misi">
            <span>◎</span>Visi &amp; Misi
          </Link>
          <Link className={styles.selected} href="/wilayah">
            <span>⌖</span>Wilayah Desa
          </Link>
          <Link href="/potensi">
            <span>♧</span>Potensi Desa
          </Link>
        </nav>

        <div className={styles.topGrid}>
          <section className={styles.mapCard}>
            <h2>
              <span>◫</span> Peta Wilayah {desa.namaDesa ?? "Desa"}
            </h2>
            <p className={styles.subtitle}>
              Peta batas wilayah dan pembagian dusun yang telah dipublikasikan.
            </p>
            <div className={styles.mapFrame} id="peta-wilayah">
              {mapPhoto ? (
                <Image
                  className={styles.mapBackdrop}
                  src={mapPhoto}
                  alt="Citra wilayah desa"
                  fill
                  unoptimized
                  sizes="(max-width: 900px) 100vw, 60vw"
                />
              ) : null}
              {shapes.length ? (
                <svg
                  className={styles.mapSvg}
                  viewBox="0 0 1000 650"
                  role="img"
                  aria-label={`Peta GIS batas wilayah ${desa.namaDesa ?? "desa"}`}
                >
                  <defs>
                    <pattern id="terrain" width="100" height="100" patternUnits="userSpaceOnUse">
                      <rect width="100" height="100" fill="#dce8d0" />
                      <path
                        d="M0 12L30 0 58 18 100 8M-8 62L25 45 51 60 88 43 110 55M8 100L33 78 65 92 100 70"
                        fill="none"
                        stroke="#a8bd93"
                        strokeWidth="3"
                        opacity=".65"
                      />
                    </pattern>
                  </defs>
                  {!mapPhoto ? <rect width="1000" height="650" fill="url(#terrain)" /> : null}
                  {shapes.map((shape, i) =>
                    (projected[i] ?? []).map((ring, j) => (
                      <polygon
                        key={`${shape.id}-${j}`}
                        points={ring
                          .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
                          .join(" ")}
                        fill={shape.color}
                        fillOpacity=".78"
                        stroke="#fff"
                        strokeWidth="9"
                        strokeLinejoin="round"
                      />
                    )),
                  )}
                  <path
                    d="M500 285c-20-27-48-14-48 10 0 29 48 67 48 67s48-38 48-67c0-24-28-37-48-10z"
                    fill="#ed174c"
                    stroke="#fff"
                    strokeWidth="8"
                  />
                  <circle cx="500" cy="295" r="13" fill="#fff" />
                </svg>
              ) : (
                <div className={styles.mapEmpty}>
                  <span>⌖</span>
                  <strong>Peta wilayah belum tersedia</strong>
                  <p>
                    Tambahkan dan publikasikan polygon serta area GIS agar peta batas desa dapat
                    ditampilkan.
                  </p>
                </div>
              )}
              <div className={styles.north}>
                N<br />↑
              </div>
              <div className={styles.mapNote}>{shapes.length} area GIS terpublikasi</div>
            </div>
            <div className={styles.mapActions}>
              <a className={styles.mapActionActive} href="#peta-wilayah">
                ▧ Peta Wilayah
              </a>
              <a href="#peta-wilayah">▧ Satelit</a>
              <a href="#batas-administratif">▱ Batas Administratif</a>
              <span className={styles.mapActionDisabled}>⇩ Unduh Peta (PDF)</span>
            </div>
            <div className={styles.mapLegend}>
              {shapes.length ? (
                shapes.map((shape) => (
                  <span key={shape.id}>
                    <i style={{ background: shape.color }} />
                    <span className={styles.legendCopy}>
                      {shape.name}
                      {shape.description ? <small>{shape.description}</small> : null}
                    </span>
                  </span>
                ))
              ) : (
                <span>Belum ada batas area yang dipublikasikan</span>
              )}
            </div>
          </section>

          <aside className={styles.sideStack}>
            <section className={styles.infoCard}>
              <h2>
                <span>ⓘ</span> Informasi Wilayah
              </h2>
              <dl>
                <div>
                  <dt>⌖ Luas Wilayah</dt>
                  <dd>{profil?.luasWilayah ? `${formatNumber(Number(profil.luasWilayah))} Ha` : "Belum tersedia"}</dd>
                </div>
                <div>
                  <dt>▧ Jumlah Dusun</dt>
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
                  <dt>♧ Jumlah Penduduk</dt>
                  <dd>{formatNumber(totalResidents)} jiwa</dd>
                </div>
                <div>
                  <dt>⌂ Jumlah KK</dt>
                  <dd>{formatNumber(totalFamilies)} KK</dd>
                </div>
                <div>
                  <dt>⌁ Ketinggian</dt>
                  <dd>{profil?.ketinggian ?? "Belum tersedia"}</dd>
                </div>
                <div>
                  <dt>♨ Suhu Rata-rata</dt>
                  <dd>{profil?.suhuRataRata ?? "Belum tersedia"}</dd>
                </div>
                <div>
                  <dt>≋ Curah Hujan</dt>
                  <dd>{profil?.curahHujan ?? "Belum tersedia"}</dd>
                </div>
                <div>
                  <dt>▱ Topografi</dt>
                  <dd>{profil?.topografi ?? "Belum tersedia"}</dd>
                </div>
              </dl>
            </section>
            <section className={styles.infoCard} id="batas-administratif">
              <h2>
                <span>⇄</span> Batas Wilayah Administratif
              </h2>
              {boundaryRows.length ? (
                <dl className={styles.boundaries}>
                  {boundaryRows.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className={styles.emptySmall}>Informasi batas administratif belum dilengkapi.</p>
              )}
            </section>
          </aside>
        </div>

        <div className={styles.lowerGrid}>
          <section className={styles.tableCard}>
            <h2>
              <span>♙</span> Pembagian Wilayah Dusun
            </h2>
            <p className={styles.subtitle}>
              Daftar dusun, luas wilayah, dan jumlah penduduk di {desa.namaDesa ?? "desa"}.
            </p>
            {grouped.length ? (
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Dusun</th>
                      <th>Luas Wilayah</th>
                      <th>Jumlah RT</th>
                      <th>Jumlah KK</th>
                      <th>Jumlah Penduduk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map((group, i) => (
                      <tr key={group.name}>
                        <td>{i + 1}</td>
                        <td>
                          <i style={{ background: palette[i % palette.length] }} />
                          {group.name}
                        </td>
                        <td>—</td>
                        <td>{new Set(group.items.filter((r) => r.rt).map((r) => `${r.rw ?? ""}::${r.rt}`)).size || "—"}</td>
                        <td>—</td>
                        <td>
                          {residentsByDusun.get(group.name) !== undefined
                            ? `${formatNumber(residentsByDusun.get(group.name)!)} jiwa`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptySmall}>Data dusun belum tersedia.</div>
            )}
            <div className={styles.tableFoot}>
              <span>Total</span>
              <span>Luas: —</span>
              <span>{rt.length} RT</span>
              <span>{formatNumber(totalFamilies)} KK</span>
              <span>{formatNumber(totalResidents)} jiwa</span>
            </div>
            <p className={styles.note}>
              Luas per dusun, jumlah KK, dan jumlah penduduk per dusun belum tersedia dari sumber
              data wilayah yang digunakan.
            </p>
          </section>
          <section className={styles.geoCard}>
            <h2>
              <span>⌁</span> Kondisi Geografis
            </h2>
            <p>
              {geographyDetails.length
                ? `Kondisi geografis ${desa.namaDesa ?? "desa"} berdasarkan informasi yang dikelola pemerintah desa.`
                : `Informasi kondisi geografis ${desa.namaDesa ?? "desa"} belum dilengkapi oleh pemerintah desa.`}
            </p>
            {geographyDetails.length ? (
              <dl className={styles.boundaries}>
                {geographyDetails.map(([label, value]) => (
                  <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                ))}
              </dl>
            ) : null}
            {mapPhoto ? (
              <div className={styles.geoPhoto}>
                <Image
                  src={mapPhoto}
                  alt="Dokumentasi area wilayah desa"
                  fill
                  unoptimized
                  sizes="(max-width: 700px) 100vw, 30vw"
                />
              </div>
            ) : (
              <div className={styles.geoPlaceholder}>Foto kondisi geografis belum tersedia</div>
            )}
          </section>
        </div>

        <section className={styles.downloadCard}>
          <span className={styles.folder}>▱</span>
          <div>
            <h2>Download Dokumen Wilayah</h2>
            <p>Unduh peta, data wilayah, dan dokumen terkait administrasi wilayah desa.</p>
          </div>
          <div className={styles.downloadActions}>
            <span>Peta Wilayah (PDF) · Belum tersedia</span>
            <span>Batas Wilayah (PDF) · Belum tersedia</span>
            <span>Data Dusun (PDF) · Belum tersedia</span>
          </div>
        </section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl} />
    </main>
  );
}
