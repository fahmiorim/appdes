import Link from "next/link";

import { agendaMendatang } from "@/features/agenda/application/agenda-use-cases";
import { getPemerintahanDashboard } from "@/features/pemerintahan/application/use-cases";
import { requirePermission } from "@/lib/dal";
import { resolveVillageId } from "@/features/desa/application/resolve-village";

export const metadata = { title: "Dashboard Pemerintahan Desa" };

const money = (value: number) => value.toLocaleString("id-ID");

export default async function PemerintahanDashboardPage() {
  const [data, user] = await Promise.all([
    getPemerintahanDashboard(),
    requirePermission("pemerintahan-dashboard", "read"),
  ]);
  const villageId = await resolveVillageId(user);
  const agenda = await agendaMendatang(villageId, 4);
  const kepala = data.perangkat.find((item) => (item.jabatan ?? "").toLowerCase().includes("kepala desa"));
  const sekretaris = data.perangkat.find((item) => (item.jabatan ?? "").toLowerCase().includes("sekretaris"));
  const children = data.perangkat.filter((item) => item.id !== kepala?.id && item.id !== sekretaris?.id);
  const stats = [
    ["Perangkat Desa", money(data.totalPerangkat), "👥", "perangkat"],
    ["Lembaga Desa", money(data.totalLembaga), "🏛️", "lembaga"],
    ["Anggota BPD", money(data.totalBpd), "👥", "lembaga"],
    ["Wilayah / Dusun", money(data.totalDusun), "📍", "wilayah"],
    ["RT / RW", `${data.totalRt} / ${data.totalRw}`, "▱", "wilayah"],
  ];
  return (
    <div className="modul-page pemerintahan-page">
      <header className="page-heading">
        <div><span className="eyebrow">PEMERINTAHAN DESA</span><h1>Dashboard Pemerintahan Desa</h1><p>Ringkasan pemerintahan, perangkat desa, lembaga desa, dan wilayah administrasi.</p></div>
      </header>
      <section className="pemerintahan-metrics">
        <article className="pemerintahan-metric pemerintahan-metric-primary"><span>Total Perangkat Desa</span><strong>{data.totalPerangkat} orang</strong><small>Data perangkat aktif</small></article>
        {stats.slice(1).map(([label,value,icon]) => <article className="pemerintahan-metric" key={label}><span>{icon} {label}</span><strong>{value}</strong></article>)}
      </section>
      <nav className="pemerintahan-tabs">
        <Link className="active" href="/pemerintahan-desa">▥ Dashboard Pemerintahan</Link>
        <Link href="/pemerintahan-desa/perangkat">♙ Perangkat Desa</Link>
        <Link href="/pemerintahan-desa/lembaga">♧ Lembaga & BPD</Link>
        <Link href="/pemerintahan-desa/wilayah">⌖ Wilayah & Organisasi</Link>
      </nav>
      <div className="pemerintahan-dashboard-grid">
        <section className="modul-card pemerintahan-org-card">
          <div className="pemerintahan-card-heading"><div><h2>Struktur Organisasi Pemerintahan Desa</h2><p>Disusun dari relasi atasan dan perangkat aktif.</p></div><Link href="/pemerintahan-desa/perangkat">Kelola Perangkat ↗</Link></div>
          {kepala ? <div className="pemerintahan-org">
            <article className="pemerintahan-org-node root"><strong>{[kepala.nama].join(" ")}</strong><span>{kepala.jabatan ?? "Kepala Desa"}</span></article>
            {sekretaris ? <><div className="pemerintahan-org-connector"/><article className="pemerintahan-org-node secretary"><strong>{sekretaris.nama}</strong><span>{sekretaris.jabatan}</span></article></> : null}
            <div className="pemerintahan-org-children">{children.map(item => <article className="pemerintahan-org-node" key={item.id}><strong>{item.nama}</strong><span>{item.jabatan ?? "Perangkat Desa"}</span></article>)}</div>
          </div> : <p className="modul-empty">Belum ada perangkat aktif. Tambahkan perangkat dan atur hierarki organisasi.</p>}
        </section>
        <section className="modul-card">
          <div className="pemerintahan-card-heading"><div><h2>Lembaga & BPD</h2><p>Ringkasan kelembagaan desa.</p></div><Link href="/pemerintahan-desa/lembaga">Kelola ↗</Link></div>
          {data.lembaga.length ? <div className="pemerintahan-list">{data.lembaga.slice(0,7).map(item=><div key={item.id}><strong>{item.nama}</strong><span>{item.jenis.toUpperCase()}</span><small>{item.status}</small></div>)}</div> : <p className="modul-empty">Belum ada lembaga yang didaftarkan.</p>}
        </section>
        <section className="modul-card">
          <div className="pemerintahan-card-heading"><div><h2>Agenda Pemerintahan Desa</h2><p>Kegiatan yang telah dipublikasikan.</p></div><Link href="/agenda">Lihat Semua →</Link></div>
          {agenda.length ? <div className="pemerintahan-agenda">{agenda.map(item=><article key={item.id}><strong>{item.judul}</strong><span>{item.mulai} · {item.jamMulai ?? "Waktu belum ditentukan"}</span><small>{item.lokasi ?? "Lokasi belum ditentukan"}</small></article>)}</div> : <p className="modul-empty">Belum ada agenda yang ditayangkan.</p>}
        </section>
        <section className="modul-card">
          <div className="pemerintahan-card-heading"><div><h2>Wilayah & Organisasi</h2><p>Data wilayah administratif desa.</p></div><Link href="/pemerintahan-desa/wilayah">Kelola ↗</Link></div>
          <div className="pemerintahan-region-stats"><div><strong>{data.wilayah.dusun}</strong><span>Dusun</span></div><div><strong>{data.wilayah.rt}</strong><span>RT</span></div><div><strong>{data.wilayah.rw}</strong><span>RW</span></div><div><strong>{data.totalArea}</strong><span>Area GIS</span></div></div>
        </section>
      </div>
      <section className="modul-card pemerintahan-shortcuts"><h2>Akses Cepat</h2><div><Link href="/pemerintahan-desa/perangkat">＋ Data Perangkat Desa</Link><Link href="/pemerintahan-desa/lembaga">＋ Lembaga Desa</Link><Link href="/pemerintahan-desa/wilayah">＋ Data Wilayah</Link><Link href="/pemerintahan-desa/wilayah#peta">⌖ Peta Wilayah</Link></div></section>
    </div>
  );
}
