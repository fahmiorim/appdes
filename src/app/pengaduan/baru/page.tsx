import Link from "next/link";
import type { Metadata } from "next";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { KATEGORI_PENGADUAN } from "@/features/pengaduan/domain/pengaduan";
import { getNavPublik } from "@/features/publik/application/nav-publik";

import styles from "../../informasi-publik.module.css";
import { PublicShell } from "../../public-shell";
import { kirimPengaduanAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kirim Pengaduan" };

export default async function BuatPengaduanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [desa, params] = await Promise.all([getIdentitasFromRequest(), searchParams]);
  return (
    <PublicShell
      villageName={desa.namaDesa ?? "Pemerintah Desa"}
      brandLabel="Pengaduan Masyarakat"
      navigation={await getNavPublik(desa.id)}
    >
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.crumb}><Link href="/">Beranda</Link><span>/</span><Link href="/pengaduan">Pengaduan</Link><span>/</span><span>Kirim</span></div>
          <p className={styles.kicker}>ASPIRASI WARGA</p>
          <h1>Sampaikan Pengaduan</h1>
          <p>Isi informasi dengan benar. Nomor tiket akan diberikan setelah laporan berhasil disimpan.</p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container}>
          <div className={styles.panel}>
            {params.error ? <p role="alert" className={styles.empty}>{params.error}</p> : null}
            <form action={kirimPengaduanAction} className="modul-form-grid" encType="multipart/form-data">
              <label className="modul-field">Nama lengkap<input name="namaPelapor" required maxLength={100} autoComplete="name" /></label>
              <label className="modul-field">NIK (opsional)<input name="nik" inputMode="numeric" maxLength={16} pattern="[0-9]{0,16}" /></label>
              <label className="modul-field">Nomor WhatsApp/telepon<input name="telepon" type="tel" maxLength={30} autoComplete="tel" /></label>
              <label className="modul-field">Email (opsional)<input name="email" type="email" maxLength={100} autoComplete="email" /></label>
              <label className="modul-field">Alamat<input name="alamat" maxLength={255} autoComplete="street-address" /></label>
              <label className="modul-field">Kategori<select name="kategori" required defaultValue="umum">{KATEGORI_PENGADUAN.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="modul-field">Judul pengaduan<input name="judul" required minLength={5} maxLength={200} /></label>
              <label className="modul-field">Uraian pengaduan<textarea name="isi" required minLength={20} maxLength={4000} rows={6} /></label>
              <label className="modul-field">Lampiran bukti (opsional)<input name="lampiran" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf" /><small>Gambar maksimal 5 MB atau PDF maksimal 20 MB.</small></label>
              <div className="modul-form-actions">
                <button className="button button-primary" type="submit">Kirim Pengaduan</button>
                <Link className="button button-secondary" href="/pengaduan">Kembali</Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
