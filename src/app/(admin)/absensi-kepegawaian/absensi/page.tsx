import type { Metadata } from "next";

import { daftarAbsensi } from "@/features/kepegawaian/application/use-cases";

import { absensiManualAction } from "../actions";
import { AbsensiKepegawaianNav } from "../nav";
import styles from "../absensi-kepegawaian.module.css";

export const metadata: Metadata = { title: "Absensi Pegawai" };

export default async function AbsensiPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  const raw=Array.isArray(params.tanggal)?params.tanggal[0]:params.tanggal;
  const tanggal=raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date());
  const rows=await daftarAbsensi(tanggal);
  const statusLabel:Record<string,string>={hadir:"Hadir",izin:"Izin",cuti:"Cuti",tidak_hadir:"Tidak Hadir"};
  const counts={hadir:rows.filter(x=>x.status==="hadir").length,izin:rows.filter(x=>x.status==="izin").length,cuti:rows.filter(x=>x.status==="cuti").length,tidak:rows.filter(x=>!x.status||x.status==="tidak_hadir").length};
  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">ABSENSI & KEPEGAWAIAN</span><h1>Absensi Pegawai</h1><p>Kelola dan pantau kehadiran perangkat desa serta staf secara terpusat.</p></div></div>
    <AbsensiKepegawaianNav active="/absensi-kepegawaian/absensi"/>
    <section className={styles["ak-kpi-grid"]}>
      <article className={styles["ak-kpi"]}><span>Hadir</span><strong>{counts.hadir} orang</strong></article>
      <article className={styles["ak-kpi"]}><span>Izin</span><strong>{counts.izin} orang</strong></article>
      <article className={styles["ak-kpi"]}><span>Cuti</span><strong>{counts.cuti} orang</strong></article>
      <article className={styles["ak-kpi"]}><span>Tidak Hadir</span><strong>{counts.tidak} orang</strong></article>
    </section>
    <section className={styles["ak-card"]}>
      <h2>Rekap Absensi Pegawai</h2><p>Atur tanggal untuk melihat catatan kehadiran dan melakukan koreksi manual.</p>
      <form className={styles["ak-filter"]} method="get"><label>Tanggal <input type="date" name="tanggal" defaultValue={tanggal}/></label><button className={styles["ak-button"]} type="submit">Tampilkan</button></form>
      <div className={styles["ak-table-wrap"]}><table className={styles["ak-table"]}><thead><tr><th>No.</th><th>Nama Pegawai</th><th>Jabatan</th><th>Jam Masuk</th><th>Jam Pulang</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
        {rows.map((row,i)=><tr key={row.pegawaiId}><td>{i+1}</td><td>{row.nama}</td><td>{row.jabatan??"—"}</td><td>{row.jamMasuk??"—"}</td><td>{row.jamKeluar??"—"}</td><td><span className={`${styles["ak-badge"]} ${styles[row.status??"tidak_hadir"]??""}`}>{statusLabel[row.status??"tidak_hadir"]??"Tidak Hadir"}</span></td><td><details><summary>Ubah</summary>
          <form action={absensiManualAction} className={styles["ak-form"]}>
            <input type="hidden" name="pegawaiId" value={row.pegawaiId}/><input type="hidden" name="tanggal" value={tanggal}/>
            <label>Jam Masuk<input type="time" name="jamMasuk" defaultValue={row.jamMasuk??""}/></label>
            <label>Jam Pulang<input type="time" name="jamKeluar" defaultValue={row.jamKeluar??""}/></label>
            <label>Status<select name="status" defaultValue={row.status??"tidak_hadir"}><option value="hadir">Hadir</option><option value="izin">Izin</option><option value="cuti">Cuti</option><option value="tidak_hadir">Tidak Hadir</option></select></label>
            <label>Catatan<input name="catatan" defaultValue={row.catatan??""}/></label>
            <button className={styles["ak-button"]} type="submit">Simpan Absensi</button>
          </form>
        </details></td></tr>)}
      </tbody></table></div>
      {!rows.length?<div className={styles["ak-empty"]}>Belum ada pegawai aktif. Tambahkan pegawai terlebih dahulu.</div>:null}
    </section>
    <section className={styles["ak-card"]} style={{marginTop:16}}><h2>Pengaturan Absensi</h2><p>Jam kerja default 08.00–16.00. Pengaturan jadwal mingguan dan hari libur akan tersedia pada panel pengaturan absensi.</p></section>
  </div>;
}
