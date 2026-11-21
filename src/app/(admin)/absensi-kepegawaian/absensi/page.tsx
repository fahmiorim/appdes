import type { Metadata } from "next";

import { daftarAbsensi, daftarKehadiranBulanan, getPengaturanKehadiran } from "@/features/kepegawaian/application/use-cases";

import { absensiManualAction, simpanPengaturanKehadiranAction } from "../actions";
import { AbsensiKepegawaianNav } from "../nav";
import styles from "../absensi-kepegawaian.module.css";
import { hasPermission } from "@/features/rbac/application/authorization";
import { verifySession } from "@/lib/dal";

export const metadata: Metadata = { title: "Absensi Pegawai" };

export default async function AbsensiPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  const raw=Array.isArray(params.tanggal)?params.tanggal[0]:params.tanggal;
  const tanggal=raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date());
  const tahun=Number(tanggal.slice(0,4));
  const bulan=Number(tanggal.slice(5,7));
  const [rows,setting,calendarRows,user]=await Promise.all([daftarAbsensi(tanggal),getPengaturanKehadiran(),daftarKehadiranBulanan(tahun,bulan),verifySession()]);
  const canManage=hasPermission(user.permissions,"kehadiran","update");
  let hariLibur:number[]=[0,6];
  try { const parsed=JSON.parse(setting.hariLibur); if(Array.isArray(parsed)) hariLibur=parsed; } catch { /* fallback akhir pekan */ }
  const statusLabel:Record<string,string>={hadir:"Hadir",izin:"Izin",cuti:"Cuti",tidak_hadir:"Tidak Hadir"};
  const monthStart=new Date(Date.UTC(tahun,bulan-1,1)).getUTCDay();
  const daysInMonth=new Date(Date.UTC(tahun,bulan,0)).getUTCDate();
  const calendarMap=new Map<string,string[]>();
  for(const row of calendarRows){const key=row.tanggal;const list=calendarMap.get(key)??[];list.push(row.status??"hadir");calendarMap.set(key,list);}
  const monthLabel=new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date(Date.UTC(tahun,bulan-1,1)));

  const counts={hadir:rows.filter(x=>x.status==="hadir").length,izin:rows.filter(x=>x.status==="izin").length,cuti:rows.filter(x=>x.status==="cuti").length,tidak:rows.filter(x=>!x.status||x.status==="tidak_hadir").length};
  const tingkatKehadiran=rows.length?Math.round(counts.hadir/rows.length*1000)/10:0;
  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">ABSENSI & KEPEGAWAIAN</span><h1>Absensi Pegawai</h1><p>Kelola dan pantau kehadiran perangkat desa serta staf secara terpusat.</p></div></div>
    <AbsensiKepegawaianNav active="/absensi-kepegawaian/absensi"/>
    <section className={styles["ak-kpi-grid"]}>
      <article className={`${styles["ak-kpi"]} ${styles.primary}`}><span>Kehadiran Hari Ini</span><strong>{counts.hadir} orang</strong><span>{tingkatKehadiran.toLocaleString("id-ID")}% tingkat kehadiran</span></article>
      <article className={styles["ak-kpi"]}><span>Hadir</span><strong>{counts.hadir} orang</strong></article>
      <article className={styles["ak-kpi"]}><span>Izin</span><strong>{counts.izin} orang</strong></article>
      <article className={styles["ak-kpi"]}><span>Cuti</span><strong>{counts.cuti} orang</strong></article>
      <article className={styles["ak-kpi"]}><span>Tidak Hadir</span><strong>{counts.tidak} orang</strong></article>
    </section>
    <div className={styles["ak-grid"]}>
      <section className={styles["ak-card"]}>
        <div className={styles["ak-card-heading-row"]}><div><h2>Rekap Absensi Pegawai</h2><p>Daftar kehadiran pegawai untuk tanggal yang dipilih.</p></div><a className={styles["ak-button"]} href={"/absensi-kepegawaian/absensi/ekspor?tanggal="+tanggal}>↓ Export</a></div>
        <form className={styles["ak-filter"]} method="get">
          <label>Tanggal<input type="date" name="tanggal" defaultValue={tanggal}/></label>
          <button className={styles["ak-button"]} type="submit">Tampilkan</button>
        </form>
        <div className={styles["ak-table-wrap"]}><table className={styles["ak-table"]}><thead><tr><th>No.</th><th>Nama Pegawai</th><th>Jabatan</th><th>Jam Masuk</th><th>Jam Pulang</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
          {rows.map((row,i)=><tr key={row.pegawaiId}><td>{i+1}</td><td><span className={styles["ak-person"]}><span>{row.nama.split(" ").slice(0,2).map((part)=>part[0]).join("").toUpperCase()}</span><b>{row.nama}</b></span></td><td>{row.jabatan??"—"}</td><td>{row.jamMasuk??"—"}</td><td>{row.jamKeluar??"—"}</td><td><span className={`${styles["ak-badge"]} ${styles[row.status??"tidak_hadir"]??""}`}>{statusLabel[row.status??"tidak_hadir"]??"Tidak Hadir"}</span></td><td>{canManage?<details><summary>Ubah</summary>
            <form action={absensiManualAction} className={styles["ak-form"]}>
              <input type="hidden" name="pegawaiId" value={row.pegawaiId}/><input type="hidden" name="tanggal" value={tanggal}/>
              <label>Jam Masuk<input type="time" name="jamMasuk" defaultValue={row.jamMasuk??""}/></label>
              <label>Jam Pulang<input type="time" name="jamKeluar" defaultValue={row.jamKeluar??""}/></label>
              <label>Status<select name="status" defaultValue={row.status??"tidak_hadir"}><option value="hadir">Hadir</option><option value="izin">Izin</option><option value="cuti">Cuti</option><option value="tidak_hadir">Tidak Hadir</option></select></label>
              <label>Catatan<input name="catatan" defaultValue={row.catatan??""}/></label>
              <button className={styles["ak-button"]} type="submit">Simpan Absensi</button>
            </form>
          </details>:<span>—</span>}</td></tr>)}
        </tbody></table></div>
        {!rows.length?<div className={styles["ak-empty"]}>Belum ada pegawai aktif. Tambahkan pegawai terlebih dahulu.</div>:null}
      </section>
      <div className={styles["ak-side-stack"]}>
        <section className={styles["ak-card"]}><h2>Kalender Kehadiran</h2><p>{monthLabel}</p>
          <div className={styles["ak-calendar"]}>
            {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(day=><span className={styles["ak-calendar-head"]} key={day}>{day}</span>)}
            {Array.from({length:monthStart},(_,i)=><span key={"blank-"+i}/>)}
            {Array.from({length:daysInMonth},(_,i)=>{const day=i+1;const key=tahun+"-"+String(bulan).padStart(2,"0")+"-"+String(day).padStart(2,"0");const statuses=calendarMap.get(key)??[];const selectedDay=key===tanggal;return <div key={key} className={styles["ak-calendar-day"]+" "+(statuses.length?styles["has-data"]:"")+" "+(selectedDay?styles["selected-day"]:"")}><strong>{day}</strong>{statuses.length?<small>{statuses.length} catatan</small>:null}</div>;})}
          </div>
          <div className={styles["ak-calendar-legend"]}><span><i className={styles.green}/>Hadir</span><span><i className={styles.amber}/>Izin</span><span><i className={styles.purple}/>Cuti</span><span><i className={styles.red}/>Tidak Hadir</span></div>
        </section>
        <section className={styles["ak-card"]}><h2>Ringkasan Periode</h2><p>{tanggal}</p>
          <dl><div><dt>Total Pegawai Aktif</dt><dd>{rows.length}</dd></div><div><dt>Hadir</dt><dd>{counts.hadir}</dd></div><div><dt>Izin</dt><dd>{counts.izin}</dd></div><div><dt>Cuti</dt><dd>{counts.cuti}</dd></div><div><dt>Tidak Hadir</dt><dd>{counts.tidak}</dd></div></dl>
        </section>
      </div>
    </div>
    <section className={styles["ak-card"]} style={{marginTop:16}}><h2>Pengaturan Absensi</h2><p>Atur jam kerja dan hari libur mingguan desa.</p>
      {canManage?<form action={simpanPengaturanKehadiranAction} className={styles["ak-form"]}>
        <label>Jam Masuk<input type="time" name="jamMasuk" defaultValue={setting.jamMasuk}/></label>
        <label>Jam Pulang<input type="time" name="jamKeluar" defaultValue={setting.jamKeluar}/></label>
        <div className={styles.wide}><strong>Hari Libur</strong><div className={styles["ak-filter"]}>
          {["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"].map((day,index)=><label key={day}><input type="checkbox" name="hariLibur" value={index} defaultChecked={hariLibur.includes(index)}/> {day}</label>)}
        </div></div>
        <button className={styles["ak-button"]} type="submit">Simpan Pengaturan</button>
      </form>:<p>Akun ini hanya memiliki akses baca pengaturan absensi.</p>}
    </section>
  </div>;
}
