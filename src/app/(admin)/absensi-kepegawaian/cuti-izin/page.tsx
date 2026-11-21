import type { Metadata } from "next";
import { ajukanCutiAction, putuskanCutiAction, simpanKuotaCutiAction } from "../actions";
import { AbsensiKepegawaianNav } from "../nav";
import { daftarCuti, daftarPegawai, ringkasanKuotaCuti } from "@/features/kepegawaian/application/use-cases";
import styles from "../absensi-kepegawaian.module.css";
import { hasPermission } from "@/features/rbac/application/authorization";
import { verifySession } from "@/lib/dal";

export const metadata: Metadata = { title: "Cuti & Izin" };

export default async function CutiIzinPage() {
  const [rows,pegawai,kuota,user]=await Promise.all([daftarCuti(),daftarPegawai(),ringkasanKuotaCuti(),verifySession()]);
  const canManage=hasPermission(user.permissions,"cuti-izin","update");
  const disetujui=rows.filter(x=>x.status==="disetujui").length;
  const menunggu=rows.filter(x=>x.status==="menunggu").length;
  const ditolak=rows.filter(x=>x.status==="ditolak").length;
  const hariIni=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date());
  const tahun=Number(hariIni.slice(0,4));
  const aktif=kuota.filter(x=>x.total-x.terpakai>0);
  const bulan=Number(hariIni.slice(5,7));
  const monthStart=new Date(Date.UTC(tahun,bulan-1,1)).getUTCDay();
  const daysInMonth=new Date(Date.UTC(tahun,bulan,0)).getUTCDate();
  const calendarMap=new Map<number,string[]>();
  const monthFirst=Date.UTC(tahun,bulan-1,1);
  const monthLast=Date.UTC(tahun,bulan,0);
  for(const item of rows.filter(x=>x.status==="disetujui")) {
    const start=Date.UTC(Number(item.mulai.slice(0,4)),Number(item.mulai.slice(5,7))-1,Number(item.mulai.slice(8,10)));
    const end=Date.UTC(Number(item.selesai.slice(0,4)),Number(item.selesai.slice(5,7))-1,Number(item.selesai.slice(8,10)));
    for(let day=Math.max(monthFirst,start);day<=Math.min(monthLast,end);day+=86400000){
      const number=new Date(day).getUTCDate();const list=calendarMap.get(number)??[];list.push(item.jenis);calendarMap.set(number,list);
    }
  }
  const monthLabel=new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date(Date.UTC(tahun,bulan-1,1)));

  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">ABSENSI & KEPEGAWAIAN</span><h1>Cuti & Izin</h1><p>Kelola pengajuan, persetujuan, dan riwayat cuti serta izin perangkat desa.</p></div></div>
    <AbsensiKepegawaianNav active="/absensi-kepegawaian/cuti-izin"/>
    <section className={styles["ak-kpi-grid"]}>
      <article className={`${styles["ak-kpi"]} ${styles.primary}`}><span>Total Pengajuan</span><strong>{rows.length} pengajuan</strong></article>
      <article className={styles["ak-kpi"]}><span>Disetujui</span><strong>{disetujui} pengajuan</strong></article>
      <article className={styles["ak-kpi"]}><span>Menunggu</span><strong>{menunggu} pengajuan</strong></article>
      <article className={styles["ak-kpi"]}><span>Ditolak</span><strong>{ditolak} pengajuan</strong></article>
      <article className={styles["ak-kpi"]}><span>Cuti Aktif Hari Ini</span><strong>{rows.filter(x=>x.status==="disetujui"&&x.mulai<=hariIni&&x.selesai>=hariIni).length} pegawai</strong></article>
      <article className={styles["ak-kpi"]}><span>Sisa Kuota Pegawai</span><strong>{aktif.length} pegawai</strong></article>
    </section>
    <div className={styles["ak-grid"]}>
      <section className={styles["ak-card"]}>
        <h2>Daftar Pengajuan Cuti & Izin</h2><p>Riwayat dan status seluruh pengajuan pegawai.</p>
        <div className={styles["ak-table-wrap"]}><table className={styles["ak-table"]}><thead><tr><th>Nama Pegawai</th><th>Jenis</th><th>Tanggal / Durasi</th><th>Alasan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
          {rows.map(x=><tr key={x.id}><td>{x.nama}<br/><small>{x.jabatan??"—"}</small></td><td>{x.jenis.replaceAll("_"," ")}</td><td>{x.mulai} – {x.selesai}<br/>({x.durasi} hari)</td><td>{x.alasan}{x.lampiran?<><br/><a href={"/api/kepegawaian/cuti/"+x.id+"/lampiran"}>Lihat lampiran</a></>:null}</td><td><span className={styles["ak-badge"]}>{x.status}</span></td><td>{x.status==="menunggu"&&canManage?<details><summary>Putuskan</summary><form action={putuskanCutiAction} className={styles["ak-form"]}><input type="hidden" name="id" value={x.id}/><label>Catatan<input name="catatan"/></label><label>Keputusan<select name="status"><option value="disetujui">Setujui</option><option value="ditolak">Tolak</option></select></label><button className={styles["ak-button"]}>Simpan Keputusan</button></form></details>:"—"}</td></tr>)}
        </tbody></table></div>
        {!rows.length?<div className={styles["ak-empty"]}>Belum ada pengajuan cuti atau izin.</div>:null}
      </section>
      <section className={styles["ak-card"]}>
        <h2>Ajukan Cuti / Izin</h2><p>Pengajuan dicatat dengan status menunggu persetujuan.</p>
        {canManage?<form action={ajukanCutiAction} className={styles["ak-form"]}>
          <label className={styles.wide}>Nama Pegawai<select name="pegawaiId" required>{pegawai.filter(x=>x.status==="aktif").map(x=><option key={x.id} value={x.id}>{x.nama}</option>)}</select></label>
          <label>Jenis<select name="jenis"><option value="cuti_tahunan">Cuti Tahunan</option><option value="cuti_sakit">Cuti Sakit</option><option value="izin">Izin</option><option value="cuti_penting">Cuti Penting</option></select></label>
          <label>Tanggal Mulai<input type="date" name="mulai" required/></label><label>Tanggal Selesai<input type="date" name="selesai" required/></label>
          <label className={styles.wide}>Alasan<textarea name="alasan" rows={3} required/></label><label className={styles.wide}>Lampiran Pendukung<input type="file" name="lampiran" accept=".pdf,image/jpeg,image/png,image/webp"/></label>
          <button className={styles["ak-button"]}>Ajukan Cuti / Izin</button>
        </form>:<p>Akun ini hanya memiliki akses baca untuk pengajuan cuti/izin.</p>}
      </section>
    </div>
    <div className={styles["ak-grid"]} style={{marginTop:16}}>
      <section className={styles["ak-card"]}><h2>Kalender Cuti & Izin</h2><p>{monthLabel}</p><div className={styles["ak-calendar"]}>
        {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(day=><span className={styles["ak-calendar-head"]} key={day}>{day}</span>)}
        {Array.from({length:monthStart},(_,i)=><span key={"blank-"+i}/>)}
        {Array.from({length:daysInMonth},(_,i)=>{const day=i+1;const types=calendarMap.get(day)??[];return <div key={day} className={styles["ak-calendar-day"]+" "+(types.length?styles["has-data"]:"")}><strong>{day}</strong>{types.length?<small>{types.length} agenda</small>:null}</div>;})}
      </div><p>Kalender menandai tanggal cuti yang sudah disetujui.</p></section>
      <section className={styles["ak-card"]}><h2>Kuota Cuti Tahunan ({tahun})</h2><p>Default 12 hari per tahun. Kuota dapat disesuaikan per pegawai.</p>
        <div className={styles["ak-table-wrap"]}><table className={styles["ak-table"]}><thead><tr><th>Pegawai</th><th>Total</th><th>Terpakai</th><th>Sisa</th><th>Ubah Kuota</th></tr></thead><tbody>
          {kuota.map(x=><tr key={x.id}><td>{x.nama}</td><td>{x.total} hari</td><td>{x.terpakai} hari</td><td>{x.total-x.terpakai} hari</td><td>{canManage?<form action={simpanKuotaCutiAction} className={styles["ak-filter"]}><input type="hidden" name="pegawaiId" value={x.id}/><input type="hidden" name="tahun" value={tahun}/><input type="number" name="total" min="0" max="365" defaultValue={x.total} style={{width:80}}/><button className={styles["ak-button"]}>Simpan</button></form>:<span>—</span>}</td></tr>)}
        </tbody></table></div>
      </section>
      <section className={styles["ak-card"]}><h2>Informasi Singkat</h2><ul><li>Pengajuan cuti diproses melalui persetujuan pejabat berwenang.</li><li>Cuti tahunan memiliki kuota default 12 hari per tahun.</li><li>Durasi pengajuan dihitung berdasarkan hari kerja Senin–Jumat.</li><li>Riwayat keputusan tersimpan pada sistem.</li></ul></section>
    </div>
  </div>;
}
