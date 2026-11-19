import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { galeriVideo } from "@/db/schema";
import { listGaleriAdminData } from "@/features/publik/application/konten-admin";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { GALERI_RESOURCE } from "@/features/konten/domain/galeri";
import { requirePermission } from "@/lib/dal";
import { hapusVideoGaleri, simpanMetadataAlbum, tambahVideoGaleri } from "./actions";

export const metadata: Metadata = { title: "Galeri Desa" };

export default async function GaleriAdminPage() {
  const [rows, user] = await Promise.all([listGaleriAdminData(), requirePermission(GALERI_RESOURCE, "read")]);
  const villageId = await resolveVillageId(user);
  const videos = await db.select({
    id: galeriVideo.id,
    judul: galeriVideo.judul,
    url: galeriVideo.url,
    provider: galeriVideo.provider,
    publishedAt: galeriVideo.publishedAt,
  }).from(galeriVideo).where(eq(galeriVideo.villageId, villageId)).orderBy(desc(galeriVideo.publishedAt), desc(galeriVideo.id));
  const totalFoto = rows.reduce((jumlah, row) => jumlah + row.jumlahFoto, 0);

  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">Publikasi</span><h1>Galeri Desa</h1><p>{rows.length.toLocaleString("id-ID")} album · {totalFoto.toLocaleString("id-ID")} foto · {videos.length} video.</p></div></div>
    <section className="modul-card">
      <h2>Kategori dan tanggal publikasi album</h2>
      <p>Atur kategori yang tampil di situs publik dan tanggal publikasi setiap album.</p>
      {rows.length===0?<p className="modul-empty">Belum ada album galeri. Buat album terlebih dahulu melalui pengelolaan galeri.</p>:<div className="modul-scroll"><table className="modul-table"><thead><tr><th>Album</th><th>Jumlah foto</th><th>Kategori</th><th>Tanggal publikasi</th><th>Aksi</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong>{row.nama}</strong></td><td>{row.jumlahFoto} foto</td><td>{row.kategori??"Belum dikategorikan"}</td><td>{row.publishedAt?new Intl.DateTimeFormat("id-ID",{dateStyle:"medium"}).format(row.publishedAt):"Belum dijadwalkan"}</td><td><form action={simpanMetadataAlbum} className="galeri-admin-form"><input type="hidden" name="albumId" value={row.id}/><input name="kategori" aria-label={"Kategori "+row.nama} placeholder="Kategori, mis. Pembangunan" defaultValue={row.kategori??""} maxLength={80}/><input name="publishedAt" aria-label={"Tanggal publikasi "+row.nama} type="date" defaultValue={row.publishedAt?new Date(row.publishedAt).toISOString().slice(0,10):""}/><button type="submit">Simpan</button></form></td></tr>)}</tbody></table></div>}
    </section>
    <section className="modul-card">
      <h2>Tambah video kegiatan</h2>
      <p>Gunakan tautan video YouTube atau Vimeo. Video akan disematkan dari penyedia; berkas video mentah tidak diunggah ke server desa.</p>
      <form action={tambahVideoGaleri} className="galeri-video-form">
        <label>Judul video<input name="judul" required maxLength={150} placeholder="Contoh: Dokumentasi pembangunan jalan"/></label>
        <label>URL YouTube / Vimeo<input name="url" type="url" required placeholder="https://www.youtube.com/watch?v=..."/></label>
        <label>Keterangan<textarea name="keterangan" rows={3} maxLength={2000}/></label>
        <label>Tanggal publikasi<input name="publishedAt" type="date" defaultValue={new Date().toISOString().slice(0,10)}/></label>
        <button type="submit">Simpan Video</button>
      </form>
      <div className="modul-scroll"><table className="modul-table"><thead><tr><th>Video</th><th>Penyedia</th><th>Publikasi</th><th>Aksi</th></tr></thead><tbody>{videos.map(video=><tr key={video.id}><td><strong>{video.judul}</strong></td><td>{video.provider}</td><td>{video.publishedAt?new Intl.DateTimeFormat("id-ID",{dateStyle:"medium"}).format(video.publishedAt):"Belum dijadwalkan"}</td><td><form action={hapusVideoGaleri}><input type="hidden" name="videoId" value={video.id}/><button type="submit">Hapus</button></form></td></tr>)}{videos.length===0?<tr><td colSpan={4}>Belum ada video yang ditambahkan.</td></tr>:null}</tbody></table></div>
    </section>
    <section className="modul-card"><h2>Album galeri</h2>{rows.length===0?<p className="modul-empty">Belum ada album galeri yang dibuat.</p>:<div className="modul-scroll"><table className="modul-table"><thead><tr><th>Album</th><th>Keterangan</th><th>Foto</th><th>Kategori</th><th>Publikasi</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong>{row.nama}</strong></td><td>{row.keterangan??"—"}</td><td>{row.jumlahFoto} foto</td><td>{row.kategori??"—"}</td><td>{row.publishedAt?new Intl.DateTimeFormat("id-ID",{dateStyle:"medium"}).format(row.publishedAt):"—"}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
