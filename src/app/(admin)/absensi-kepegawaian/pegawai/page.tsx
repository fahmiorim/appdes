import type { Metadata } from "next";
import Link from "next/link";
import { daftarDokumenPegawai, daftarPegawai, daftarRiwayatPegawai, opsiPerangkatBelumTerhubung } from "@/features/kepegawaian/application/use-cases";
import { simpanPegawaiAction, tambahRiwayatPegawaiAction, unggahDokumenPegawaiAction, hapusRiwayatPegawaiAction, hapusDokumenPegawaiAction, ubahRiwayatPegawaiAction } from "../actions";
import { AbsensiKepegawaianNav } from "../nav";
import styles from "../absensi-kepegawaian.module.css";
import { hasPermission } from "@/features/rbac/application/authorization";
import { verifySession } from "@/lib/dal";

export const metadata: Metadata = { title: "Data Pegawai" };

export default async function PegawaiPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  const selectedRaw=Array.isArray(params.id)?params.id[0]:params.id;
  const [pegawai, perangkat, user]=await Promise.all([daftarPegawai(),opsiPerangkatBelumTerhubung(),verifySession()]);
  const canManage=hasPermission(user.permissions,"kepegawaian","update");
  const selected=pegawai.find(x=>x.id===Number(selectedRaw))??pegawai[0]??null;
  const [riwayat,dokumen]=selected?await Promise.all([daftarRiwayatPegawai(selected.id),daftarDokumenPegawai(selected.id)]):[[],[]];
  const tetap=pegawai.filter(x=>x.statusPegawai==="tetap").length;
  const kontrak=pegawai.filter(x=>x.statusPegawai==="kontrak").length;
  const purna=pegawai.filter(x=>x.statusPegawai==="purna_tugas").length;
  const hitungMasaKerja=(mulai:string|null,selesai:string|null)=>{
    if(!mulai) return "—";
    const start=new Date(mulai+"T00:00:00Z");
    const end=selesai?new Date(selesai+"T00:00:00Z"):new Date();
    const months=Math.max(0,(end.getUTCFullYear()-start.getUTCFullYear())*12+end.getUTCMonth()-start.getUTCMonth());
    return `${Math.floor(months/12)} thn ${months%12} bln`;
  };
  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">ABSENSI & KEPEGAWAIAN</span><h1>Data Pegawai</h1><p>Kelola biodata, jabatan, status kepegawaian, dokumen, dan riwayat masa kerja.</p></div></div>
    <AbsensiKepegawaianNav active="/absensi-kepegawaian/pegawai"/>
    <nav className={styles["ak-subnav"]} aria-label="Navigasi data pegawai"><a className={styles["selected"]} href="#daftar-pegawai">☷ Daftar Pegawai</a><a href="#detail-pegawai">♧ Struktur Jabatan</a><a href="#masa-kerja">▦ Masa Kerja</a><a href="#dokumen">▤ Dokumen</a><a href="#riwayat">◷ Riwayat Jabatan</a></nav>
    <section className={styles["ak-kpi-grid"]}>
      <article className={styles["ak-kpi"]}><span>Total Pegawai</span><strong>{pegawai.length} orang</strong></article>
      <article className={styles["ak-kpi"]}><span>Pegawai Tetap</span><strong>{tetap} orang</strong></article>
      <article className={styles["ak-kpi"]}><span>Staf Kontrak</span><strong>{kontrak} orang</strong></article>
      <article className={styles["ak-kpi"]}><span>Purna Tugas</span><strong>{purna} orang</strong></article>
    </section>
    <section className={styles["ak-card"]}>
      <div className={styles["ak-section-heading"]}><div><h2>Data Pegawai</h2><p>Aparatur desa tersinkron otomatis; staf tambahan dapat didaftarkan di sini.</p></div>{canManage?<span className={styles["ak-badge"]}>Master Pegawai</span>:null}</div>
      {canManage?<details className={styles["ak-add-panel"]}><summary>＋ Tambah Pegawai Baru</summary><form action={simpanPegawaiAction} className={styles["ak-form"]}>
        <label>Nama Lengkap<input name="nama" required/></label>
        <label>Hubungkan Perangkat Desa<select name="perangkatId" defaultValue=""><option value="">Pegawai/staf baru</option>{perangkat.map(x=><option key={x.id} value={x.id}>{x.nama} — {x.jabatan??"Perangkat"}</option>)}</select></label>
        <label>NIP<input name="nip"/></label><label>NIK<input name="nik" inputMode="numeric" maxLength={16}/></label>
        <label>Jabatan<input name="jabatan"/></label><label>Jenis Kelamin<select name="jenisKelamin"><option value="">Pilih</option><option value="male">Laki-laki</option><option value="female">Perempuan</option></select></label>
        <label>Tempat Lahir<input name="tempatLahir"/></label><label>Tanggal Lahir<input type="date" name="tanggalLahir"/></label>
        <label>Telepon<input name="telepon"/></label><label>Email<input type="email" name="email"/></label>
        <label>Pendidikan<input name="pendidikan"/></label><label>Status Pegawai<select name="statusPegawai"><option value="tetap">Tetap</option><option value="kontrak">Kontrak</option><option value="purna_tugas">Purna Tugas</option></select></label>
        <label>Tanggal Masuk<input type="date" name="tanggalMasuk"/></label><label>Tanggal Keluar<input type="date" name="tanggalKeluar"/></label>
        <label className={styles.wide}>Alamat<textarea name="alamat" rows={2}/></label><input type="hidden" name="status" value="aktif"/>
        <button className={styles["ak-button"]} type="submit">+ Simpan Pegawai</button>
      </form></details>:<p>Akun ini hanya memiliki akses baca data pegawai.</p>}
    </section>
    <div id="daftar-pegawai" className={styles["ak-grid"]} style={{marginTop:16}}>
      <section className={styles["ak-card"]}><h2>Daftar Data Pegawai</h2><p>{pegawai.length} pegawai terdaftar.</p>
        <div className={styles["ak-table-wrap"]}><table className={styles["ak-table"]}><thead><tr><th>No.</th><th>Nama</th><th>Jabatan</th><th>Status</th><th>Masa Kerja</th><th>Detail</th></tr></thead><tbody>
          {pegawai.map((x,i)=><tr key={x.id}><td>{i+1}</td><td><strong>{x.nama}</strong><br/><small>{x.nip??"NIP belum diisi"}</small></td><td>{x.jabatan??"—"}</td><td><span className={styles["ak-badge"]}>{x.statusPegawai}</span></td><td>{hitungMasaKerja(x.tanggalMasuk,x.tanggalKeluar)}</td><td><Link className={styles["ak-button"]} href={"/absensi-kepegawaian/pegawai?id="+x.id}>Lihat</Link></td></tr>)}
        </tbody></table></div>
      </section>
      <section id="detail-pegawai" className={styles["ak-card"]}>
        {selected?<><div className={styles["ak-profile-head"]}><div className={styles["ak-profile-avatar"]}>{selected.nama.split(" ").slice(0,2).map((part)=>part[0]).join("").toUpperCase()}</div><div><h2>{selected.nama}</h2><p>{selected.jabatan??"Jabatan belum ditentukan"}</p><span className={`${styles["ak-badge"]} ${selected.status==="aktif"?styles.aktif:styles.nonaktif}`}>{selected.status==="aktif"?"Aktif":"Nonaktif"} · {selected.statusPegawai.replaceAll("_"," ")}</span></div></div>
          <nav className={styles["ak-profile-tabs"]}><a href="#biodata">Biodata</a><a href="#jabatan">Jabatan</a><a href="#dokumen">Dokumen</a><a href="#riwayat">Riwayat</a></nav>
          <h3 id="biodata">Informasi Pribadi</h3><dl><div><dt>NIK</dt><dd>{selected.nik??"—"}</dd></div><div><dt>NIP</dt><dd>{selected.nip??"—"}</dd></div><div><dt>Tempat/Tanggal Lahir</dt><dd>{selected.tempatLahir??"—"}, {selected.tanggalLahir??"—"}</dd></div><div><dt>Telepon</dt><dd>{selected.telepon??"—"}</dd></div><div><dt>Email</dt><dd>{selected.email??"—"}</dd></div><div><dt>Pendidikan</dt><dd>{selected.pendidikan??"—"}</dd></div><div id="masa-kerja"><dt>Masa Kerja</dt><dd>{hitungMasaKerja(selected.tanggalMasuk,selected.tanggalKeluar)}</dd></div></dl>
          {canManage?<details><summary>Edit Data Pegawai</summary><form action={simpanPegawaiAction} className={styles["ak-form"]}>
            <input type="hidden" name="id" value={selected.id}/><input type="hidden" name="perangkatId" value={selected.perangkatId??""}/>
            <label>Nama<input name="nama" defaultValue={selected.nama} required/></label><label>NIP<input name="nip" defaultValue={selected.nip??""}/></label><label>NIK<input name="nik" defaultValue={selected.nik??""}/></label><label>Jabatan<input name="jabatan" defaultValue={selected.jabatan??""}/></label>
            <label>Jenis Kelamin<select name="jenisKelamin" defaultValue={selected.jenisKelamin??""}><option value="">Pilih</option><option value="male">Laki-laki</option><option value="female">Perempuan</option></select></label><label>Tempat Lahir<input name="tempatLahir" defaultValue={selected.tempatLahir??""}/></label><label>Tanggal Lahir<input name="tanggalLahir" type="date" defaultValue={selected.tanggalLahir??""}/></label><label>Telepon<input name="telepon" defaultValue={selected.telepon??""}/></label><label>Email<input name="email" type="email" defaultValue={selected.email??""}/></label><label>Pendidikan<input name="pendidikan" defaultValue={selected.pendidikan??""}/></label><label className={styles.wide}>Alamat<textarea name="alamat" rows={2} defaultValue={selected.alamat??""}/></label>
            <label>Status Pegawai<select name="statusPegawai" defaultValue={selected.statusPegawai}><option value="tetap">Tetap</option><option value="kontrak">Kontrak</option><option value="purna_tugas">Purna Tugas</option></select></label><label>Status<select name="status" defaultValue={selected.status}><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select></label>
            <label>Tanggal Masuk<input name="tanggalMasuk" type="date" defaultValue={selected.tanggalMasuk??""}/></label><label>Tanggal Keluar<input name="tanggalKeluar" type="date" defaultValue={selected.tanggalKeluar??""}/></label>
            <button className={styles["ak-button"]} type="submit">Simpan Perubahan</button>
          </form></details>:null}
          <h3 id="jabatan">Riwayat Jabatan</h3><div id="riwayat">{riwayat.length?<ul>{riwayat.map(r=><li key={r.id}>{r.jabatan} · {r.mulai} – {r.selesai??"Sekarang"} {canManage?<><details><summary>Edit</summary><form action={ubahRiwayatPegawaiAction} className={styles["ak-form"]}><input type="hidden" name="id" value={r.id}/><input type="hidden" name="pegawaiId" value={selected.id}/><label>Jabatan<input name="jabatan" defaultValue={r.jabatan} required/></label><label>Unit Kerja<input name="unitKerja" defaultValue={r.unitKerja??""}/></label><label>Nomor SK<input name="nomorSk" defaultValue={r.nomorSk??""}/></label><label>Mulai<input name="mulai" type="date" defaultValue={r.mulai} required/></label><label>Selesai<input name="selesai" type="date" defaultValue={r.selesai??""}/></label><label className={styles.wide}>Keterangan<textarea name="keterangan" defaultValue={r.keterangan??""}/></label><button className={styles["ak-button"]}>Simpan Riwayat</button></form></details><form action={hapusRiwayatPegawaiAction} style={{display:"inline"}}><input type="hidden" name="id" value={r.id}/><button className={styles["ak-button"]} type="submit">Hapus</button></form></>:null}</li>)}</ul>:<p>Belum ada riwayat jabatan.</p>}
          {canManage?<details><summary>Tambah Riwayat Jabatan</summary><form action={tambahRiwayatPegawaiAction} className={styles["ak-form"]}><input type="hidden" name="pegawaiId" value={selected.id}/><label>Jabatan<input name="jabatan" required/></label><label>Unit Kerja<input name="unitKerja"/></label><label>Nomor SK<input name="nomorSk"/></label><label>Mulai<input name="mulai" type="date" required/></label><label>Selesai<input name="selesai" type="date"/></label><label className={styles.wide}>Keterangan<textarea name="keterangan"/></label><button className={styles["ak-button"]}>Tambah Riwayat</button></form></details>:null}
          </div><h3 id="dokumen">Dokumen Pegawai</h3>{dokumen.length?<ul>{dokumen.map(d=><li key={d.id}><a href={"/api/kepegawaian/dokumen/"+d.id}>{d.judul}</a> · {d.kategori} {canManage?<form action={hapusDokumenPegawaiAction} style={{display:"inline"}}><input type="hidden" name="id" value={d.id}/><button className={styles["ak-button"]} type="submit">Hapus</button></form>:null}</li>)}</ul>:<p>Belum ada dokumen.</p>}
          {canManage?<details><summary>Unggah Dokumen</summary><form action={unggahDokumenPegawaiAction} encType="multipart/form-data" className={styles["ak-form"]}><input type="hidden" name="pegawaiId" value={selected.id}/><label>Judul Dokumen<input name="judul" required/></label><label>Kategori<select name="kategori"><option value="sk">SK</option><option value="kontrak">Kontrak</option><option value="ijazah">Ijazah</option><option value="sertifikat">Sertifikat</option><option value="lainnya">Lainnya</option></select></label><label>Nomor<input name="nomor"/></label><label>Tanggal<input type="date" name="tanggal"/></label><label className={styles.wide}>Berkas<input type="file" name="berkas" accept=".pdf,image/jpeg,image/png,image/webp" required/></label><button className={styles["ak-button"]}>Unggah Dokumen</button></form></details>:null}
        </>:<div className={styles["ak-empty"]}>Belum ada data pegawai.</div>}
      </section>
    </div>
  </div>;
}
