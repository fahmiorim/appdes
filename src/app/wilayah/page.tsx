import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getStatistikDesa } from "@/features/desa/application/statistik-desa";
import { getPetaPublik } from "@/features/gis/application/use-cases";
import type { AreaDTO, PolygonDTO } from "@/features/gis/domain/gis";
import { parseGeoJsonRings, proyeksikanKelompokRings, type KoordinatPeta } from "@/features/gis/domain/peta-cetak";
import { daftarWilayahPublik } from "@/features/wilayah/application/wilayah-publik";

import styles from "./wilayah.module.css";
import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";

export const dynamic = "force-dynamic";

type AreaShape = { id: number; name: string; description: string | null; color: string; rings: KoordinatPeta[][] };

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes(".."))) return null;
  const path = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return `/api/publik/media/${path.map(encodeURIComponent).join("/")}`;
}
function buildAreaShapes(areas: AreaDTO[], polygons: PolygonDTO[]): AreaShape[] {
  const colors = new Map(polygons.map((polygon) => [polygon.id, polygon.color]));
  return areas.map((area) => ({
    id: area.id, name: area.nama, description: area.desk,
    color: /^#[0-9a-fA-F]{6}$/.test(colors.get(area.refPolygon ?? -1) ?? "") ? colors.get(area.refPolygon ?? -1)! : "#7c3aed",
    rings: parseGeoJsonRings(area.path),
  })).filter((area) => area.rings.length > 0);
}
const palette = ["#12bf56", "#f4b900", "#1689f5", "#a832ed"];
function formatNumber(value: number) { return new Intl.NumberFormat("id-ID").format(value); }

export default async function WilayahPage() {
  const desa = await getIdentitasFromRequest();
  const [rows, mapData, statistik] = await Promise.all([
    daftarWilayahPublik(desa.id), getPetaPublik(), getStatistikDesa(desa.id),
  ]);
  const location = [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const dusun = [...new Set(rows.map((row) => row.dusun).filter(Boolean))];
  const rw = [...new Set(rows.filter((row) => row.rw).map((row) => `${row.dusun}::${row.rw}`))];
  const rt = [...new Set(rows.filter((row) => row.rt).map((row) => `${row.dusun}::${row.rw}::${row.rt}`))];
  const grouped = dusun.map((name) => ({ name, items: rows.filter((row) => row.dusun === name) }));
  const shapes = buildAreaShapes(mapData.areas, mapData.polygons);
  const projected = proyeksikanKelompokRings(shapes.map((shape) => shape.rings), { lebar: 1000, tinggi: 650, padding: 36 });
  const mapPhoto = mapData.areas.map((area) => mediaUrl(area.foto, desa.id)).find(Boolean) ?? null;
  const profileStats = statistik.perDusun.filter((item) => item.label !== "Belum diisi");
  const totalResidents = statistik.total;
  const totalFamilies = statistik.keluarga;
  const boundaryRows = [
    ["Kecamatan", desa.namaKecamatan], ["Kabupaten", desa.namaKabupaten], ["Provinsi", desa.namaPropinsi],
  ].filter((row) => row[1]);

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/wilayah" />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <nav aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>›</span><Link href="/profil">Profil Desa</Link><span>›</span><span>Wilayah Desa</span></nav>
          <h1>Wilayah Desa</h1>
          <p>Informasi batas wilayah, pembagian dusun, luas wilayah, dan kondisi geografis {desa.namaDesa ?? "desa"}.</p>
          <div className={styles.heroMap} aria-hidden="true"><span>⌖</span></div>
        </div>
      </section>
      <div className={styles.container}>
        <nav className={styles.sectionNav} aria-label="Navigasi profil desa">
          <Link href="/sejarah"><span>▱</span>Sejarah Desa</Link>
          <Link href="/visi-misi"><span>◎</span>Visi &amp; Misi</Link>
          <Link className={styles.selected} href="/wilayah"><span>⌖</span>Wilayah Desa</Link>
          <Link href="/potensi"><span>♧</span>Potensi Desa</Link>
        </nav>

        <div className={styles.topGrid}>
          <section className={styles.mapCard}>
            <h2><span>◫</span> Peta Wilayah {desa.namaDesa ?? "Desa"}</h2>
            <p className={styles.subtitle}>Peta batas wilayah dan pembagian dusun yang telah dipublikasikan.</p>
            <div className={styles.mapFrame}>
              {shapes.length ? (
                <svg className={styles.mapSvg} viewBox="0 0 1000 650" role="img" aria-label={`Peta GIS batas wilayah ${desa.namaDesa ?? "desa"}`}>
                  <defs>
                    <pattern id="terrain" width="100" height="100" patternUnits="userSpaceOnUse">
                      <rect width="100" height="100" fill="#dce8d0"/><path d="M0 12L30 0 58 18 100 8M-8 62L25 45 51 60 88 43 110 55M8 100L33 78 65 92 100 70" fill="none" stroke="#a8bd93" strokeWidth="3" opacity=".65"/>
                    </pattern>
                  </defs>
                  <rect width="1000" height="650" fill={mapPhoto ? "#567b48" : "url(#terrain)"}/>
                  {shapes.map((shape, i) => (projected[i] ?? []).map((ring, j) => <polygon key={`${shape.id}-${j}`} points={ring.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ")} fill={shape.color} fillOpacity=".78" stroke="#fff" strokeWidth="9" strokeLinejoin="round"/>))}
                  <path d="M500 285c-20-27-48-14-48 10 0 29 48 67 48 67s48-38 48-67c0-24-28-37-48-10z" fill="#ed174c" stroke="#fff" strokeWidth="8"/>
                  <circle cx="500" cy="295" r="13" fill="#fff"/>
                </svg>
              ) : (
                <div className={styles.mapEmpty}><span>⌖</span><strong>Peta wilayah belum tersedia</strong><p>Tambahkan dan publikasikan polygon serta area GIS agar peta batas desa dapat ditampilkan.</p></div>
              )}
              <div className={styles.north}>N<br/>↑</div>
              <div className={styles.mapNote}>{shapes.length} area GIS terpublikasi</div>
            </div>
            <div className={styles.mapLegend}>{shapes.length ? shapes.map((shape, i) => <span key={shape.id}><i style={{background:shape.color}}/>{shape.name}</span>) : <span>Belum ada batas area yang dipublikasikan</span>}</div>
          </section>

          <aside className={styles.sideStack}>
            <section className={styles.infoCard}>
              <h2><span>ⓘ</span> Informasi Wilayah</h2>
              <dl>
                <div><dt>Jumlah Dusun</dt><dd>{dusun.length || "—"}</dd></div>
                <div><dt>Jumlah RW</dt><dd>{rw.length || "—"}</dd></div>
                <div><dt>Jumlah RT</dt><dd>{rt.length || "—"}</dd></div>
                <div><dt>Jumlah Penduduk</dt><dd>{formatNumber(totalResidents)} jiwa</dd></div>
                <div><dt>Jumlah KK</dt><dd>{formatNumber(totalFamilies)} KK</dd></div>
                <div><dt>Luas Wilayah</dt><dd>Belum tersedia</dd></div>
                <div><dt>Kondisi Geografis</dt><dd>Belum tersedia</dd></div>
              </dl>
            </section>
            <section className={styles.infoCard}>
              <h2><span>⇄</span> Batas Wilayah Administratif</h2>
              {boundaryRows.length ? <dl className={styles.boundaries}>{boundaryRows.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <p className={styles.emptySmall}>Informasi batas administratif belum dilengkapi.</p>}
            </section>
          </aside>
        </div>

        <div className={styles.lowerGrid}>
          <section className={styles.tableCard}>
            <h2><span>♙</span> Pembagian Wilayah Dusun</h2>
            <p className={styles.subtitle}>Daftar dusun, RW, dan RT berdasarkan data administrasi desa.</p>
            {grouped.length ? <div className={styles.tableWrap}><table><thead><tr><th>No</th><th>Dusun</th><th>Jumlah RW</th><th>Jumlah RT</th></tr></thead><tbody>{grouped.map((group,i) => <tr key={group.name}><td>{i+1}</td><td><i style={{background:palette[i%palette.length]}}/>{group.name}</td><td>{new Set(group.items.map((r)=>r.rw).filter(Boolean)).size || "—"}</td><td>{new Set(group.items.map((r)=>r.rt).filter(Boolean)).size || "—"}</td></tr>)}</tbody></table></div> : <div className={styles.emptySmall}>Data dusun belum tersedia.</div>}
            <div className={styles.tableFoot}><span>Total dusun: {dusun.length}</span><span>Total RW: {rw.length}</span><span>Total RT: {rt.length}</span></div>
            <p className={styles.note}>Luas per dusun, jumlah KK, dan jumlah penduduk per dusun belum tersedia dari sumber data wilayah yang digunakan.</p>
          </section>
          <section className={styles.geoCard}>
            <h2><span>⌁</span> Kondisi Geografis</h2>
            <p>Informasi kondisi geografis {desa.namaDesa ?? "desa"} belum dipublikasikan oleh pemerintah desa.</p>
            {mapPhoto ? <div className={styles.geoPhoto}><Image src={mapPhoto} alt="Dokumentasi area wilayah desa" fill unoptimized sizes="(max-width: 700px) 100vw, 30vw"/></div> : <div className={styles.geoPlaceholder}>Foto kondisi geografis belum tersedia</div>}
          </section>
        </div>

        <section className={styles.downloadCard}>
          <span className={styles.folder}>▱</span><div><h2>Dokumen Wilayah</h2><p>Dokumen peta dan batas wilayah akan tersedia setelah berkas resmi diunggah oleh pemerintah desa.</p></div><span className={styles.pending}>Dokumen PDF belum tersedia</span>
        </section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl}/>
    </main>
  );
}
