import Link from "next/link";

import type { LayananPublik } from "@/db/schema";

import { simpanLayananAction } from "./actions";

export function LayananForm({ row }: { row?: LayananPublik | null }) {
  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Pelayanan Publik</span>
          <h1>{row ? "Ubah Layanan" : "Tambah Layanan"}</h1>
          <p>Atur informasi dan persyaratan layanan yang tersedia bagi masyarakat.</p>
        </div>
        <Link className="button button-secondary" href="/pelayanan-publik/layanan">
          Kembali
        </Link>
      </div>
      <section className="modul-card">
        <form action={simpanLayananAction} className="modul-form-grid">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          <label className="modul-field">
            <span>Nama layanan *</span>
            <input
              name="nama"
              required
              minLength={3}
              maxLength={180}
              defaultValue={row?.nama ?? ""}
            />
          </label>
          <label className="modul-field">
            <span>Kategori *</span>
            <select name="kategori" defaultValue={row?.kategori ?? "administrasi"}>
              <option value="administrasi">Administrasi</option>
              <option value="kependudukan">Kependudukan</option>
              <option value="sosial">Sosial</option>
              <option value="pemerintahan">Pemerintahan</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </label>
          <label className="modul-field">
            <span>Estimasi (hari kerja) *</span>
            <input
              type="number"
              name="estimasiHari"
              min="0"
              max="365"
              required
              defaultValue={row?.estimasiHari ?? 1}
            />
          </label>
          <label className="modul-field">
            <span>Biaya (rupiah) *</span>
            <input type="number" name="biaya" min="0" required defaultValue={row?.biaya ?? 0} />
          </label>
          <label className="modul-field">
            <span>Metode pengajuan</span>
            <select name="metode" defaultValue={row?.metode ?? "online_dan_langsung"}>
              <option value="online_dan_langsung">Online & datang langsung</option>
              <option value="online">Online</option>
              <option value="langsung">Datang langsung</option>
            </select>
          </label>
          <label className="modul-field">
            <span>Status</span>
            <span>
              <input type="checkbox" name="aktif" defaultChecked={row?.aktif ?? true} /> Aktif
              ditampilkan
            </span>
          </label>
          <label className="modul-field" style={{ gridColumn: "1 / -1" }}>
            <span>Deskripsi</span>
            <textarea
              name="deskripsi"
              rows={4}
              maxLength={4000}
              defaultValue={row?.deskripsi ?? ""}
            />
          </label>
          <label className="modul-field" style={{ gridColumn: "1 / -1" }}>
            <span>Persyaratan (satu persyaratan per baris)</span>
            <textarea
              name="persyaratan"
              rows={5}
              maxLength={4000}
              defaultValue={row?.persyaratan ?? ""}
            />
          </label>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button className="button button-primary">Simpan Layanan</button>
          </div>
        </form>
      </section>
    </div>
  );
}
