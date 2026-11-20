import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { hasPermission } from "@/features/rbac/application/authorization";
import { findRoleById } from "@/features/rbac/infrastructure/rbac-repository";
import { getSuratPrintData } from "@/features/surat/application/surat-use-cases";
import {
  LETTER_STATUS_LABELS,
  SURAT_RESOURCE,
  VERIFICATION_STEP_LABELS,
  nextVerificationStep,
  roleCanVerifyStep,
  type VerificationStep,
} from "@/features/surat/domain/surat";
import { parseSyaratIds } from "@/features/surat/domain/isian";
import { getCurrentUser } from "@/lib/dal";

import {
  ajukanVerifikasiSuratAction,
  hapusKonsepSuratAction,
  tolakSuratAction,
  verifikasiSuratAction,
} from "../actions";

export const metadata: Metadata = { title: "Detail Surat" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ berhasil?: string }>;

const PESAN: Record<string, string> = {
  dibuat: "Konsep surat berhasil disimpan.",
  diajukan: "Surat berhasil diajukan ke antrean verifikasi.",
  diverifikasi: "Tahap verifikasi berhasil disetujui.",
  ditolak: "Surat dikembalikan ke konsep dengan catatan penolakan.",
  dihapus: "Konsep surat berhasil dihapus.",
  diperbarui: "Konsep surat berhasil diperbarui.",
};

function toneStatus(status: string): string {
  if (status === "issued") return "hijau";
  if (status === "verifikasi") return "ungu";
  if (status === "cancelled") return "merah";
  return "netral";
}

function langkahSelesai(value: boolean | null): string {
  return value === true ? "Disetujui" : value === false ? "Ditolak" : "Menunggu";
}

export default async function DetailSuratPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();

  const data = await getSuratPrintData(id);
  const { surat, jenis, content } = data;
  const user = await getCurrentUser();
  if (!user) notFound();
  const role = user.roleId === null ? null : await findRoleById(user.roleId, user.villageId);
  const step = nextVerificationStep(surat);
  const canVerify = step !== null && roleCanVerifyStep(step, role?.slug ?? null, user.permissions.isSuperadmin);
  const canDelete = hasPermission(user.permissions, SURAT_RESOURCE, "delete");
  const syarat = parseSyaratIds(jenis.syaratSurat);
  const pesan = query.berhasil ? PESAN[query.berhasil] : undefined;

  const steps: { key: VerificationStep; value: boolean | null }[] = [
    { key: "operator", value: surat.verifikasiOperator },
    { key: "sekdes", value: surat.verifikasiSekdes },
    { key: "kades", value: surat.verifikasiKades },
  ];

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administrasi Surat / Detail</span>
          <h1>Detail & Proses Surat</h1>
          <p>Periksa isi surat, pantau persetujuan berjenjang, dan kelola penerbitan dokumen.</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {surat.status === "draft" ? <Link href={"/persuratan/surat/" + id + "/edit"} className="button button-secondary">Ubah Konsep</Link> : null}
          <Link href="/persuratan/surat" className="button button-secondary">← Daftar Surat</Link>
          <a href={`/persuratan/surat/${id}/pdf`} target="_blank" rel="noreferrer" className="button button-secondary">Pratinjau / Cetak PDF</a>
        </div>
      </div>

      {pesan ? <div className="alert alert-info" role="status" style={{ marginBottom: 16 }}>{pesan}</div> : null}

      <section className="modul-card" style={{ padding: 22, marginBottom: 16 }}>
        <div className="beranda-card-head">
          <div>
            <span className="modul-muted">Nomor surat</span>
            <h2 className="beranda-card-title" style={{ fontSize: 21, marginTop: 5 }}>{surat.number ?? "Belum diberikan"}</h2>
            <p className="modul-muted">{jenis.name} · {jenis.code}</p>
          </div>
          <span className="beranda-chip" data-tone={toneStatus(surat.status)}>{LETTER_STATUS_LABELS[surat.status]}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 18 }}>
          <div><span className="modul-muted">Pemohon / penduduk</span><strong style={{ display: "block", marginTop: 5 }}>{surat.residentName ?? "Tidak terkait penduduk"}</strong></div>
          <div><span className="modul-muted">Tanggal surat</span><strong style={{ display: "block", marginTop: 5 }}>{new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${surat.letterDate}T00:00:00`))}</strong></div>
          <div><span className="modul-muted">Keperluan</span><strong style={{ display: "block", marginTop: 5 }}>{surat.purpose || "—"}</strong></div>
          <div><span className="modul-muted">Tanda tangan elektronik</span><strong style={{ display: "block", marginTop: 5 }}>{surat.tte ? "Sudah ditandatangani" : surat.status === "issued" ? "Belum menggunakan TTE" : "Menunggu penerbitan"}</strong></div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 16, alignItems: "start" }}>
        <section className="modul-card" style={{ padding: 20 }}>
          <h2 className="beranda-card-title" style={{ marginBottom: 16 }}>Alur Verifikasi</h2>
          <ol style={{ display: "grid", gap: 14, listStyle: "none", padding: 0, margin: 0 }}>
            {steps.map((item, index) => (
              <li key={item.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", flex: "0 0 auto", background: item.value === true ? "#e4f6ec" : item.value === false ? "#fde7ec" : "#f1f4fa", color: item.value === true ? "#147a4f" : item.value === false ? "#b02a4c" : "#5b6785", fontWeight: 800 }}>{item.value === true ? "✓" : index + 1}</span>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: "block", fontSize: 13 }}>{VERIFICATION_STEP_LABELS[item.key]}</strong>
                  <span className="modul-muted">{langkahSelesai(item.value)}</span>
                </div>
                {step === item.key && surat.status === "verifikasi" ? <span className="beranda-chip" data-tone="ungu">Tahap aktif</span> : null}
              </li>
            ))}
          </ol>
          {surat.catatanVerifikasi ? <p className="modul-muted" style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>Catatan: {surat.catatanVerifikasi}</p> : null}
        </section>

        <section className="modul-card" style={{ padding: 20 }}>
          <h2 className="beranda-card-title" style={{ marginBottom: 8 }}>Tindakan Petugas</h2>
          <p className="modul-muted" style={{ marginTop: 0, marginBottom: 16 }}>Aksi mengikuti status surat dan kewenangan role. Nomor resmi dibuat pada persetujuan Kepala Desa sebagai tahap akhir.</p>

          {surat.status === "draft" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <form action={ajukanVerifikasiSuratAction} style={{ display: "grid", gap: 10 }}>
                <input type="hidden" name="id" value={id} />
                {syarat.length > 0 ? (
                  <label style={{ display: "flex", alignItems: "start", gap: 9, fontSize: 12 }}>
                    <input type="checkbox" name="konfirmasiSyarat" required />
                    Saya sudah memeriksa kelengkapan {syarat.length} persyaratan surat.
                  </label>
                ) : null}
                <button type="submit" className="button button-primary">Ajukan Verifikasi</button>
              </form>
              {canDelete ? (
                <form action={hapusKonsepSuratAction}>
                  <input type="hidden" name="id" value={id} />
                  <button type="submit" className="button button-danger-ghost">Hapus Konsep</button>
                </form>
              ) : null}
            </div>
          ) : surat.status === "verifikasi" ? (
            <div style={{ display: "grid", gap: 14 }}>
              {canVerify && step ? (
                <form action={verifikasiSuratAction}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="step" value={step} />
                  <button type="submit" className="button button-primary">Setujui Tahap {VERIFICATION_STEP_LABELS[step]}</button>
                </form>
              ) : (
                <p className="modul-muted">Surat sedang menunggu {step ? VERIFICATION_STEP_LABELS[step] : "tahap verifikasi berikutnya"}. Akun Anda tidak memiliki kewenangan pada tahap ini.</p>
              )}
              {canVerify ? (
                <form action={tolakSuratAction} style={{ display: "grid", gap: 8 }}>
                  <input type="hidden" name="id" value={id} />
                  <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>
                    Catatan penolakan
                    <textarea name="alasan" required minLength={3} maxLength={1000} rows={3} placeholder="Jelaskan alasan surat perlu diperbaiki." />
                  </label>
                  <button type="submit" className="button button-danger-ghost">Tolak & Kembalikan ke Konsep</button>
                </form>
              ) : null}
            </div>
          ) : surat.status === "issued" ? (
            <div style={{ display: "grid", gap: 10 }}>
              <span className="beranda-chip" data-tone="hijau">Surat telah diterbitkan</span>
              <p className="modul-muted">Nomor surat sudah diarsipkan. Dokumen dapat dipratinjau, dicetak, atau diunduh sebagai PDF.</p>
              <a href={`/persuratan/surat/${id}/pdf`} target="_blank" rel="noreferrer" className="button button-primary">Buka Dokumen PDF</a>
            </div>
          ) : (
            <p className="modul-muted">Surat ini telah dibatalkan dan tidak dapat diproses lebih lanjut.</p>
          )}
        </section>
      </div>

      <section className="modul-card" style={{ padding: 20, marginTop: 16 }}>
        <div className="beranda-card-head">
          <div>
            <h2 className="beranda-card-title">Pratinjau Isi Surat</h2>
            <p className="modul-muted">Isi surat hasil render template dan data desa/pemohon.</p>
          </div>
          <a href={`/persuratan/surat/${id}/pdf`} target="_blank" rel="noreferrer" className="button button-secondary">Cetak / Unduh PDF</a>
        </div>
        <pre style={{ margin: 0, padding: 20, borderRadius: 12, background: "var(--color-surface-muted,#f7f8fc)", color: "var(--color-text,#20263a)", fontFamily: "Georgia,serif", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{content}</pre>
      </section>
    </div>
  );
}
