import type { Metadata } from "next";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { daftarPotensiDesa } from "@/features/publik/application/konten-publik";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { requirePermission } from "@/lib/dal";

import { hapusPotensi, simpanPotensi } from "./actions";

export const metadata: Metadata = { title: "Potensi Desa" };
const categories = [
  ["pertanian", "Pertanian"],
  ["perkebunan", "Perkebunan"],
  ["peternakan", "Peternakan"],
  ["perikanan", "Perikanan"],
  ["umkm", "UMKM"],
  ["wisata", "Wisata Desa"],
] as const;

export default async function PotensiAdminPage() {
  const user = await requirePermission(RESOURCES.profilDesa, "read");
  const villageId = await resolveVillageId(user);
  const rows = await daftarPotensiDesa(villageId, true);
  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Konten Website Desa</span>
          <h1>Potensi Desa</h1>
          <p>Kelola sektor, potensi unggulan, indikator, dan publikasi untuk website desa.</p>
        </div>
      </div>
      <section className="modul-card">
        <h2>Tambah potensi baru</h2>
        <form action={simpanPotensi} className="potensi-admin-form">
          <label>
            Kategori
            <select name="kategori" required defaultValue="pertanian">
              {categories.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nama potensi
            <input name="judul" required maxLength={160} placeholder="Contoh: Pertanian Padi" />
          </label>
          <label>
            Slug (opsional)
            <input name="slug" maxLength={170} placeholder="Dibuat otomatis dari nama potensi" />
          </label>
          <label>
            Ringkasan
            <textarea name="ringkasan" rows={2} maxLength={500} />
          </label>
          <label>
            Deskripsi
            <textarea name="deskripsi" rows={4} maxLength={10000} />
          </label>
          <label>
            Path gambar media
            <input name="gambar" maxLength={255} placeholder="Folder/file-gambar.jpg" />
          </label>
          <label>
            Lokasi
            <input name="lokasi" maxLength={200} />
          </label>
          <label>
            Kontak pengelola
            <input name="kontak" maxLength={150} />
          </label>
          <label>
            Indikator (satu per baris: Label | Nilai)
            <textarea
              name="indikator"
              rows={3}
              placeholder={"Luas lahan | 250 Ha\nProduktivitas | 6,5 Ton/Ha"}
            />
          </label>
          <div className="potensi-checks">
            <label>
              <input type="checkbox" name="unggulan" /> Tampilkan sebagai potensi unggulan
            </label>
            <label>
              <input type="checkbox" name="aktif" /> Publikasikan di website
            </label>
          </div>
          <button type="submit">Simpan Potensi</button>
        </form>
      </section>
      <section className="modul-card">
        <h2>Daftar potensi ({rows.length})</h2>
        {rows.length ? (
          <div className="modul-scroll">
            <table className="modul-table">
              <thead>
                <tr>
                  <th>Potensi</th>
                  <th>Kategori</th>
                  <th>Indikator</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.judul}</strong>
                      <br />
                      <small>{row.slug}</small>
                    </td>
                    <td>{categories.find(([id]) => id === row.kategori)?.[1] ?? row.kategori}</td>
                    <td>{row.indikator.map((m) => m.label + ": " + m.nilai).join(" · ") || "—"}</td>
                    <td>
                      {row.aktif ? "Dipublikasikan" : "Draft"}
                      {row.unggulan ? " · Unggulan" : ""}
                    </td>
                    <td>
                      <details>
                        <summary>Edit</summary>
                        <form action={simpanPotensi} className="potensi-admin-form">
                          <input type="hidden" name="id" value={row.id} />
                          <label>
                            Kategori
                            <select name="kategori" defaultValue={row.kategori}>
                              {categories.map(([id, label]) => (
                                <option key={id} value={id}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Nama potensi
                            <input name="judul" defaultValue={row.judul} required />
                          </label>
                          <label>
                            Slug
                            <input name="slug" defaultValue={row.slug} />
                          </label>
                          <label>
                            Ringkasan
                            <textarea name="ringkasan" defaultValue={row.ringkasan ?? ""} />
                          </label>
                          <label>
                            Deskripsi
                            <textarea name="deskripsi" defaultValue={row.deskripsi ?? ""} />
                          </label>
                          <label>
                            Path gambar
                            <input name="gambar" defaultValue={row.gambar ?? ""} />
                          </label>
                          <label>
                            Lokasi
                            <input name="lokasi" defaultValue={row.lokasi ?? ""} />
                          </label>
                          <label>
                            Kontak
                            <input name="kontak" defaultValue={row.kontak ?? ""} />
                          </label>
                          <label>
                            Indikator
                            <textarea
                              name="indikator"
                              defaultValue={row.indikator
                                .map((m) => m.label + " | " + m.nilai)
                                .join("\n")}
                            />
                          </label>
                          <div className="potensi-checks">
                            <label>
                              <input
                                type="checkbox"
                                name="unggulan"
                                defaultChecked={row.unggulan}
                              />{" "}
                              Unggulan
                            </label>
                            <label>
                              <input type="checkbox" name="aktif" defaultChecked={row.aktif} />{" "}
                              Publikasikan
                            </label>
                          </div>
                          <button type="submit">Simpan Perubahan</button>
                        </form>
                        <form action={hapusPotensi}>
                          <input type="hidden" name="id" value={row.id} />
                          <button type="submit">Hapus Potensi</button>
                        </form>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="modul-empty">
            Belum ada data potensi. Tambahkan data menggunakan formulir di atas.
          </p>
        )}
      </section>
      <style>{`.potensi-admin-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.potensi-admin-form label{display:grid;gap:5px;font-size:13px;font-weight:700}.potensi-admin-form input,.potensi-admin-form select,.potensi-admin-form textarea{width:100%;padding:9px;border:1px solid #d7dfed;border-radius:8px;font:inherit}.potensi-admin-form button,.modul-card details button{justify-self:start;padding:9px 15px;border:0;border-radius:8px;background:#6423e8;color:white;font-weight:800}.potensi-checks{display:flex;gap:18px;align-items:center}.potensi-checks label{display:flex;align-items:center;gap:6px}.potensi-checks input{width:auto}.potensi-admin-form>button{grid-column:1/-1}@media(max-width:700px){.potensi-admin-form{grid-template-columns:1fr}}`}</style>
    </div>
  );
}
