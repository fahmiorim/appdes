import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPermohonanAdminDetailData } from "@/features/layanan-mandiri/application/admin-use-cases";
import {
  labelPermohonanStatus,
  PERMOHONAN_STATUS_LABELS,
} from "@/features/layanan-mandiri/domain/layanan-mandiri";
import {
  batalkanPermohonanAction,
  buatKonsepSuratPermohonanAction,
  kembalikanPermohonanAction,
  mulaiPemeriksaanPermohonanAction,
} from "../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ berhasil?: string }>;

export const metadata: Metadata = { title: "Detail Permohonan Surat" };

const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeStyle: "short",
});

function statusTone(status: number): string {
  if (status === 3 || status === 4) return "hijau";
  if (status === 5) return "merah";
  if (status === 0) return "netral";
  return "ungu";
}

function tanggal(value: Date | null): string {
  return value ? FORMAT_TANGGAL.format(value) : "—";
}

const PESAN_BERHASIL: Record<string, string> = {
  diperiksa: "Permohonan berhasil masuk tahap pemeriksaan.",
  dikembalikan: "Permohonan dikembalikan kepada warga dengan alasan.",
  dibatalkan: "Permohonan berhasil dibatalkan.",
  konsep: "Konsep surat berhasil dibuat dan diteruskan ke alur verifikasi.",
};

export default async function DetailPermohonanSuratPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();

  const [{ permohonan, berkas, canManage }, query] = await Promise.all([
    getPermohonanAdminDetailData(id),
    searchParams,
  ]);
  const { status } = permohonan;
  const pesan = query.berhasil ? PESAN_BERHASIL[query.berhasil] : undefined;
  const isian: Record<string, unknown> = (() => {
    if (!permohonan.isianForm) return {};
    try {
      const parsed: unknown = JSON.parse(permohonan.isianForm);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  })();

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administrasi Surat / Permohonan</span>
          <h1>Detail Permohonan</h1>
          <p>Periksa identitas pemohon, isian layanan, dan dokumen persyaratan sebelum memproses permohonan.</p>
        </div>
        <Link href="/permohonan-surat" className="button button-secondary">← Kembali ke daftar</Link>
      </div>

      {pesan ? <div className="alert alert-info" role="status" style={{ marginBottom: 16 }}>{pesan}</div> : null}

      <section className="modul-card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="beranda-card-head">
          <div>
            <p className="modul-muted" style={{ margin: "0 0 5px" }}>Nomor antrean</p>
            <h2 className="beranda-card-title" style={{ fontSize: 20 }}>{permohonan.noAntrian ?? `#${permohonan.id}`}</h2>
          </div>
          <span className="beranda-chip" data-tone={statusTone(status)}>{labelPermohonanStatus(status)}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 18 }}>
          <div><span className="modul-muted">Tanggal pengajuan</span><strong style={{ display: "block", marginTop: 5 }}>{tanggal(permohonan.createdAt)}</strong></div>
          <div><span className="modul-muted">Jenis surat</span><strong style={{ display: "block", marginTop: 5 }}>{permohonan.namaSurat ?? "Jenis surat tidak tersedia"}</strong></div>
          <div><span className="modul-muted">Nomor surat</span><strong style={{ display: "block", marginTop: 5 }}>{permohonan.letterNumber ?? "Belum diterbitkan"}</strong></div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: 16, alignItems: "start" }}>
        <section className="modul-card" style={{ padding: 20 }}>
          <h2 className="beranda-card-title" style={{ marginBottom: 16 }}>Data Pemohon</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "minmax(110px,0.7fr) minmax(0,1.3fr)", gap: "12px 16px", margin: 0, fontSize: 13 }}>
            <dt className="modul-muted">Nama lengkap</dt><dd style={{ margin: 0, fontWeight: 700 }}>{permohonan.namaPemohon ?? "—"}</dd>
            <dt className="modul-muted">NIK</dt><dd className="modul-mono" style={{ margin: 0 }}>{permohonan.nikPemohon ?? "—"}</dd>
            <dt className="modul-muted">Nomor HP aktif</dt><dd style={{ margin: 0 }}>{permohonan.noHpAktif ?? "—"}</dd>
            <dt className="modul-muted">Keterangan</dt><dd style={{ margin: 0, whiteSpace: "pre-wrap" }}>{permohonan.keterangan ?? "Tidak ada keterangan."}</dd>
          </dl>
        </section>

        <section className="modul-card" style={{ padding: 20 }}>
          <h2 className="beranda-card-title" style={{ marginBottom: 16 }}>Dokumen Persyaratan</h2>
          {berkas.length === 0 ? (
            <p className="modul-empty">Tidak ada dokumen persyaratan yang tercatat pada permohonan ini.</p>
          ) : (
            <ul style={{ display: "grid", gap: 10, margin: 0, padding: 0, listStyle: "none" }}>
              {berkas.map((item) => (
                <li key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: 13 }}>{item.nama}</strong>
                    <span className="modul-muted">{item.namaAsli}</span>
                  </div>
                  <a className="button button-secondary" href={`/permohonan-surat/${id}/syarat/${item.id}`}>Unduh</a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="modul-card" style={{ padding: 20 }}>
          <h2 className="beranda-card-title" style={{ marginBottom: 16 }}>Isian Permohonan</h2>
          {Object.keys(isian).length === 0 ? (
            <p className="modul-empty">Tidak ada isian tambahan.</p>
          ) : (
            <dl style={{ display: "grid", gridTemplateColumns: "minmax(120px,0.8fr) minmax(0,1.2fr)", gap: "10px 14px", margin: 0, fontSize: 12 }}>
              {Object.entries(isian).map(([key, value]) => (
                <div key={key} style={{ display: "contents" }}>
                  <dt className="modul-muted">{key.replace(/[_-]/g, " ")}</dt>
                  <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{typeof value === "string" || typeof value === "number" ? String(value) : "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className="modul-card" style={{ padding: 20 }}>
          <h2 className="beranda-card-title" style={{ marginBottom: 16 }}>Riwayat & Alasan</h2>
          <p style={{ margin: "0 0 8px", fontSize: 13 }}><strong>Status saat ini:</strong> {PERMOHONAN_STATUS_LABELS[String(status) as keyof typeof PERMOHONAN_STATUS_LABELS] ?? "Tidak diketahui"}</p>
          <p className="modul-muted" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{permohonan.alasan ?? "Belum ada catatan alasan."}</p>
        </section>
      </div>

      {canManage ? (
        <section className="modul-card" style={{ padding: 20, marginTop: 16 }}>
          <h2 className="beranda-card-title" style={{ marginBottom: 8 }}>Tindakan Petugas</h2>
          <p className="modul-muted" style={{ marginTop: 0, marginBottom: 16 }}>Tindakan mengikuti transisi status layanan. Pembuatan konsep surat meneruskan dokumen ke proses verifikasi dan tanda tangan.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "start" }}>
            {status === 0 ? (
              <form action={mulaiPemeriksaanPermohonanAction}>
                <input type="hidden" name="id" value={id} />
                <button type="submit" className="button button-primary">Mulai Pemeriksaan</button>
              </form>
            ) : null}
            {status === 1 && permohonan.letterId === null ? (
              <form action={buatKonsepSuratPermohonanAction}>
                <input type="hidden" name="id" value={id} />
                <button type="submit" className="button button-primary">Buat Konsep & Ajukan Verifikasi</button>
              </form>
            ) : null}
            {status !== 4 && status !== 5 ? (
              <>
                <form action={kembalikanPermohonanAction} style={{ display: "grid", gap: 8, minWidth: "min(100%,260px)" }}>
                  <input type="hidden" name="id" value={id} />
                  <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
                    Alasan pengembalian
                    <textarea name="alasan" required minLength={3} maxLength={1000} rows={3} placeholder="Jelaskan dokumen atau data yang perlu diperbaiki." />
                  </label>
                  <button type="submit" className="button button-secondary">Kembalikan ke Warga</button>
                </form>
                <form action={batalkanPermohonanAction} style={{ display: "grid", gap: 8, minWidth: "min(100%,260px)" }}>
                  <input type="hidden" name="id" value={id} />
                  <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
                    Alasan pembatalan
                    <textarea name="alasan" required minLength={3} maxLength={1000} rows={3} placeholder="Tuliskan alasan pembatalan permohonan." />
                  </label>
                  <button type="submit" className="button button-danger-ghost">Batalkan Permohonan</button>
                </form>
              </>
            ) : null}
          </div>
        </section>
      ) : (
        <div className="alert alert-info" style={{ marginTop: 16 }}>Akun ini memiliki akses baca. Tindakan pemrosesan hanya tersedia bagi petugas dengan izin pembaruan.</div>
      )}
    </div>
  );
}
