import Link from "next/link";

import type { survey } from "@/db/schema";

import { simpanSurveiAction } from "./actions";

type SurveyRow = typeof survey.$inferSelect;
export function SurveiForm({ row }: { row?: SurveyRow | null }) {
  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Pelayanan Publik / Survei & Kepuasan</span>
          <h1>{row ? "Ubah Survei" : "Buat Survei Baru"}</h1>
          <p>Atur periode, sasaran, dan status survei kepuasan masyarakat.</p>
        </div>
        <Link className="button button-secondary" href="/pelayanan-publik/survei">
          Kembali
        </Link>
      </div>
      <section className="modul-card">
        <form action={simpanSurveiAction} className="modul-form-grid">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          <label className="modul-field">
            <span>Judul survei *</span>
            <input
              name="judul"
              required
              minLength={3}
              maxLength={200}
              defaultValue={row?.judul ?? ""}
            />
          </label>
          <label className="modul-field">
            <span>Sasaran responden</span>
            <input
              name="sasaran"
              maxLength={200}
              defaultValue={row?.sasaran ?? ""}
              placeholder="Contoh: Masyarakat pengguna layanan desa"
            />
          </label>
          <label className="modul-field">
            <span>Tanggal mulai</span>
            <input type="date" name="mulai" defaultValue={row?.mulai ?? ""} />
          </label>
          <label className="modul-field">
            <span>Tanggal selesai</span>
            <input type="date" name="selesai" defaultValue={row?.selesai ?? ""} />
          </label>
          <label className="modul-field" style={{ gridColumn: "1 / -1" }}>
            <span>Deskripsi & petunjuk pengisian</span>
            <textarea
              name="deskripsi"
              rows={4}
              maxLength={5000}
              defaultValue={row?.deskripsi ?? ""}
            />
          </label>
          <label className="modul-field">
            <span>Status publikasi</span>
            <span>
              <input type="checkbox" name="aktif" defaultChecked={row ? row.aktif === 1 : true} />{" "}
              Aktif dan dapat diisi masyarakat
            </span>
          </label>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button className="button button-primary">Simpan Survei</button>
          </div>
        </form>
      </section>
    </div>
  );
}
