import type { Metadata } from "next";
import { ajukanCutiAction, putuskanCutiAction, simpanKuotaCutiAction } from "../actions";
import { AbsensiKepegawaianNav } from "../nav";
import { daftarCuti, daftarPegawai, ringkasanKuotaCuti } from "@/features/kepegawaian/application/use-cases";
import styles from "../absensi-kepegawaian.module.css";
import { hasPermission } from "@/features/rbac/application/authorization";
import { verifySession } from "@/lib/dal";

export const metadata: Metadata = { title: "Cuti & Izin" };

export default async function CutiIzinPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  const query=Array.isArray(params.q)?params.q[0]??"":params.q??"";
  const jenisFilter=Array.isArray(params.jenis)?params.jenis[0]??"":params.jenis??"";
  const statusFilter=Array.isArray(params.status)?params.status[0]??"":params.status??"";
  const [rows, pegawai, kuota, user] = await Promise.all([daftarCuti(), daftarPegawai(), ringkasanKuotaCuti(), verifySession()]);
  const canManage = hasPermission(user.permissions, "cuti-izin", "update");
  const pegawaiAkun = pegawai.find((x) => x.status === "aktif" && x.email?.toLowerCase() === user.email.toLowerCase());
  const canRequest = canManage || Boolean(pegawaiAkun);
  const disetujui = rows.filter((x) => x.status === "disetujui").length;
  const menunggu = rows.filter((x) => x.status === "menunggu").length;
  const ditolak = rows.filter((x) => x.status === "ditolak").length;
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const tahun = Number(hariIni.slice(0, 4));
  const bulan = Number(hariIni.slice(5, 7));
  const cutiAktif = rows.filter((x) => x.status === "disetujui" && x.mulai <= hariIni && x.selesai >= hariIni).length;
  const sisaPegawai = kuota.filter((x) => x.total - x.terpakai > 0).length;
  const monthStart = new Date(Date.UTC(tahun, bulan - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
  const calendarMap = new Map<number, string[]>();
  const monthFirst = Date.UTC(tahun, bulan - 1, 1);
  const monthLast = Date.UTC(tahun, bulan, 0);
  for (const item of rows) {
    const start = Date.UTC(Number(item.mulai.slice(0, 4)), Number(item.mulai.slice(5, 7)) - 1, Number(item.mulai.slice(8, 10)));
    const end = Date.UTC(Number(item.selesai.slice(0, 4)), Number(item.selesai.slice(5, 7)) - 1, Number(item.selesai.slice(8, 10)));
    for (let day = Math.max(monthFirst, start); day <= Math.min(monthLast, end); day += 86400000) {
      const date = new Date(day).getUTCDate();
      const list = calendarMap.get(date) ?? [];
      list.push(item.status);
      calendarMap.set(date, list);
    }
  }
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(Date.UTC(tahun, bulan - 1, 1)));
  const jenisLabel: Record<string, string> = { cuti_tahunan: "Cuti Tahunan", cuti_sakit: "Cuti Sakit", izin: "Izin", cuti_penting: "Cuti Penting" };
  const statusClass: Record<string, string> = { disetujui: styles.hadir, menunggu: styles.menunggu, ditolak: styles.ditolak };
  const filteredRows=rows.filter((x)=>
    (!query||x.nama.toLocaleLowerCase("id-ID").includes(query.toLocaleLowerCase("id-ID"))) &&
    (!jenisFilter||x.jenis===jenisFilter) &&
    (!statusFilter||x.status===statusFilter)
  );

  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">ABSENSI & KEPEGAWAIAN</span><h1>Cuti & Izin</h1><p>Kelola pengajuan, persetujuan, dan riwayat cuti serta izin perangkat desa.</p></div></div>
    <AbsensiKepegawaianNav active="/absensi-kepegawaian/cuti-izin"/>
    <nav className={styles["ak-subnav"]} aria-label="Navigasi cuti dan izin"><a className={styles["selected"]} href="#daftar">☷ Daftar Pengajuan</a><a href="#ajukan">＋ Ajukan Cuti / Izin</a><a href="#kalender-cuti">◷ Riwayat & Rekap</a><a href="#kuota">⚙ Pengaturan Kuota</a></nav>
    <section className={styles["ak-kpi-grid"]}>
      <article className={styles["ak-kpi"] + " " + styles.primary}><span>Total Pengajuan</span><strong>{rows.length} pengajuan</strong></article>
      <article className={styles["ak-kpi"]}><span>Disetujui</span><strong>{disetujui} pengajuan</strong></article>
      <article className={styles["ak-kpi"]}><span>Menunggu</span><strong>{menunggu} pengajuan</strong></article>
      <article className={styles["ak-kpi"]}><span>Ditolak</span><strong>{ditolak} pengajuan</strong></article>
      <article className={styles["ak-kpi"]}><span>Cuti Aktif Hari Ini</span><strong>{cutiAktif} pegawai</strong></article>
      <article className={styles["ak-kpi"]}><span>Sisa Kuota Pegawai</span><strong>{sisaPegawai} pegawai</strong></article>
    </section>

    <div className={styles["ak-grid"]}>
      <section id="daftar" className={styles["ak-card"]}>
        <div className={styles["ak-card-heading-row"]}><div><h2>Daftar Pengajuan Cuti & Izin</h2><p>Riwayat dan status seluruh pengajuan pegawai.</p></div><span className={styles["ak-badge"]}>{rows.length} pengajuan</span></div>
        {canRequest ? <details id="ajukan" className={styles["ak-add-panel"]}>
          <summary>＋ Ajukan Cuti / Izin</summary>
          <p>Pengajuan baru akan tercatat dengan status menunggu persetujuan.</p>
          <form action={ajukanCutiAction} className={styles["ak-form"]}>
            <label className={styles.wide}>Nama Pegawai{canManage?<select name="pegawaiId" required>{pegawai.filter((x) => x.status === "aktif").map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}</select>:<><input type="hidden" name="pegawaiId" value={pegawaiAkun?.id}/><span>{pegawaiAkun?.nama}</span></>}</label>
            <label>Jenis<select name="jenis"><option value="cuti_tahunan">Cuti Tahunan</option><option value="cuti_sakit">Cuti Sakit</option><option value="izin">Izin</option><option value="cuti_penting">Cuti Penting</option></select></label>
            <label>Tanggal Mulai<input type="date" name="mulai" min={hariIni} required/></label>
            <label>Tanggal Selesai<input type="date" name="selesai" min={hariIni} required/></label>
            <label className={styles.wide}>Alasan<textarea name="alasan" rows={3} required/></label>
            <label className={styles.wide}>Lampiran Pendukung<input type="file" name="lampiran" accept=".pdf,image/jpeg,image/png,image/webp"/></label>
            <button className={styles["ak-button"]}>Ajukan Cuti / Izin</button>
          </form>
        </details> : null}
        <form className={styles["ak-filter"]} method="get">
          <label>Cari pegawai<input type="search" name="q" placeholder="Cari nama pegawai..." defaultValue={query}/></label>
          <label>Jenis<select name="jenis" defaultValue={jenisFilter}><option value="">Semua Jenis</option><option value="cuti_tahunan">Cuti Tahunan</option><option value="cuti_sakit">Cuti Sakit</option><option value="izin">Izin</option><option value="cuti_penting">Cuti Penting</option></select></label>
          <label>Status<select name="status" defaultValue={statusFilter}><option value="">Semua Status</option><option value="disetujui">Disetujui</option><option value="menunggu">Menunggu</option><option value="ditolak">Ditolak</option></select></label>
          <button className={styles["ak-button"]} type="submit">⌕ Filter</button>
        </form>
        <div className={styles["ak-table-wrap"]}><table className={styles["ak-table"]}>
          <thead><tr><th>Nama Pegawai</th><th>Jenis</th><th>Tanggal / Durasi</th><th>Alasan</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>{filteredRows.map((x) => <tr key={x.id}>
            <td><strong>{x.nama}</strong><br/><small>{x.jabatan ?? "—"}</small></td>
            <td>{jenisLabel[x.jenis] ?? x.jenis}</td>
            <td>{x.mulai} – {x.selesai}<br/><small>{x.durasi} hari kerja</small></td>
            <td>{x.alasan}{x.lampiran ? <><br/><a href={"/api/kepegawaian/cuti/" + x.id + "/lampiran"}>Lihat lampiran</a></> : null}</td>
            <td><span className={styles["ak-badge"] + " " + (statusClass[x.status] ?? "")}>{x.status}</span></td>
            <td>{x.status === "menunggu" && canManage ? <details><summary>Putuskan</summary><form action={putuskanCutiAction} className={styles["ak-form"]}>
              <input type="hidden" name="id" value={x.id}/>
              <label>Catatan<input name="catatan"/></label>
              <label>Keputusan<select name="status"><option value="disetujui">Setujui</option><option value="ditolak">Tolak</option></select></label>
              <button className={styles["ak-button"]}>Simpan Keputusan</button>
            </form></details> : "—"}</td>
          </tr>)}</tbody>
        </table></div>
        {!filteredRows.length ? <div className={styles["ak-empty"]}>{rows.length?"Tidak ada pengajuan yang sesuai filter.":"Belum ada pengajuan cuti atau izin."}</div> : null}
      </section>

      <div className={styles["ak-side-stack"]}>
        <section id="kalender-cuti" className={styles["ak-card"]}>
          <div className={styles["ak-card-heading-row"]}><div><h2>Kalender Cuti & Izin</h2><p>{monthLabel}</p></div><span className={styles["ak-calendar-month-icon"]}>▦</span></div>
          <div className={styles["ak-calendar"]}>
            {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map((day) => <span className={styles["ak-calendar-head"]} key={day}>{day}</span>)}
            {Array.from({ length: monthStart }, (_, i) => <span key={"blank-" + i}/>)}
            {Array.from({ length: daysInMonth }, (_, i) => { const day = i + 1; const types = calendarMap.get(day) ?? []; return <div key={day} className={styles["ak-calendar-day"] + " " + (types.includes("disetujui") ? styles.hadir : types.includes("menunggu") ? styles.menunggu : types.includes("ditolak") ? styles.ditolak : "")}><strong>{day}</strong>{types.length ? <small>{types.length} agenda</small> : null}</div>; })}
          </div>
          <div className={styles["ak-calendar-legend"]}><span><i className={styles.green}/>Cuti disetujui</span><span><i className={styles.amber}/>Menunggu</span><span><i className={styles.red}/>Ditolak</span></div>
        </section>
        <section id="kuota" className={styles["ak-card"]}>
          <h2>Kuota Cuti Tahunan ({tahun})</h2><p>Default 12 hari per tahun. Kuota dapat disesuaikan per pegawai.</p>
          <div className={styles["ak-table-wrap"]}><table className={styles["ak-table"]}>
            <thead><tr><th>Pegawai</th><th>Terpakai</th><th>Sisa</th><th>Kuota</th></tr></thead>
            <tbody>{kuota.map((x) => <tr key={x.id}><td>{x.nama}</td><td>{x.terpakai}</td><td><strong>{x.total - x.terpakai}</strong></td><td>{canManage ? <form action={simpanKuotaCutiAction} className={styles["ak-inline-form"]}><input type="hidden" name="pegawaiId" value={x.id}/><input type="hidden" name="tahun" value={tahun}/><input aria-label={"Kuota cuti " + x.nama} type="number" name="total" min="0" max="365" defaultValue={x.total}/><button className={styles["ak-icon-button"]} title="Simpan kuota">✓</button></form> : x.total}</td></tr>)}</tbody>
          </table></div>
        </section>
      </div>
    </div>
    <section className={styles["ak-card"]} style={{marginTop:16}}><h2>Informasi Singkat</h2><ul><li>Pengajuan cuti diproses melalui persetujuan pejabat berwenang.</li><li>Cuti tahunan memiliki kuota default 12 hari per tahun.</li><li>Durasi pengajuan dihitung berdasarkan hari kerja dan konfigurasi hari libur desa.</li><li>Status persetujuan dan catatan keputusan tersimpan pada sistem.</li></ul></section>
  </div>;
}
