import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  dashboardAktivitasTerbaru,
  dashboardPermohonanTerbaru,
  dashboardStats,
  dashboardTrenPermohonan,
} from "@/features/dashboard/application/dashboard-use-cases";
import { labelAktivitas, toneAktivitas } from "@/features/dashboard/domain/aktivitas";
import { waktuRelatif } from "@/features/dashboard/domain/waktu-relatif";
import { labelPermohonanStatus } from "@/features/layanan-mandiri/domain/layanan-mandiri";
import { SURAT_RESOURCE } from "@/features/surat/domain/surat";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requirePermission } from "@/lib/dal";

export const metadata: Metadata = { title: "Dashboard Administrasi Surat" };

function formatAngka(value: number) {
  return value.toLocaleString("id-ID");
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: { label: string; href: string };
}) {
  return (
    <section className="beranda-card" style={{ minWidth: 0 }}>
      <div className="beranda-card-head">
        <h2 className="beranda-card-title">{title}</h2>
        {action ? <Link href={action.href}>{action.label} →</Link> : null}
      </div>
      {children}
    </section>
  );
}

export default async function DashboardAdministrasiSuratPage() {
  const user = await requirePermission(SURAT_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const [stats, trend, requests, activities] = await Promise.all([
    dashboardStats(villageId),
    dashboardTrenPermohonan(villageId, 12),
    dashboardPermohonanTerbaru(villageId, 5),
    dashboardAktivitasTerbaru(villageId, 6),
  ]);

  const maxTrend = Math.max(1, ...trend.map((item) => item.total));
  const latestTotal = trend.at(-1)?.total ?? 0;
  const pending = stats.permohonanMenunggu;
  const other = Math.max(0, stats.permohonan - pending);
  const now = new Date();

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <h1>Dashboard Administrasi Surat</h1>
          <p>Ringkasan permohonan, penerbitan, dan aktivitas pelayanan surat desa.</p>
        </div>
      </div>

      <div className="beranda-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))" }}>
        <article className="beranda-card beranda-kpi" data-tone="ungu">
          <span className="beranda-kpi-icon" aria-hidden="true">▤</span>
          <div className="beranda-kpi-body">
            <span className="beranda-kpi-label">Total Permohonan</span>
            <strong className="beranda-kpi-value">{formatAngka(stats.permohonan)}</strong>
            <span className="beranda-chip" data-tone="ungu">Seluruh periode</span>
          </div>
        </article>
        <article className="beranda-card beranda-kpi" data-tone="hijau">
          <span className="beranda-kpi-icon" aria-hidden="true">✓</span>
          <div className="beranda-kpi-body">
            <span className="beranda-kpi-label">Menunggu Tindakan</span>
            <strong className="beranda-kpi-value">{formatAngka(pending)}</strong>
            <span className="beranda-chip" data-tone="biru">Perlu ditinjau petugas</span>
          </div>
        </article>
        <article className="beranda-card beranda-kpi" data-tone="biru">
          <span className="beranda-kpi-icon" aria-hidden="true">↗</span>
          <div className="beranda-kpi-body">
            <span className="beranda-kpi-label">Di luar antrean</span>
            <strong className="beranda-kpi-value">{formatAngka(other)}</strong>
            <span className="beranda-chip" data-tone="netral">Status selain menunggu</span>
          </div>
        </article>
        <article className="beranda-card beranda-kpi" data-tone="jingga">
          <span className="beranda-kpi-icon" aria-hidden="true">▥</span>
          <div className="beranda-kpi-body">
            <span className="beranda-kpi-label">Permohonan Bulan Ini</span>
            <strong className="beranda-kpi-value">{formatAngka(latestTotal)}</strong>
            <span className="beranda-chip" data-tone="netral">Bulan berjalan</span>
          </div>
        </article>
      </div>

      <div className="beranda-grid">
        <Panel title="Tren Permohonan Surat (12 Bulan Terakhir)" action={{ label: "Lihat daftar", href: "/permohonan-surat" }}>
          {trend.every((item) => item.total === 0) ? (
            <p className="beranda-empty">Belum ada permohonan surat pada periode ini.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", gap: 8, alignItems: "end", minHeight: 210, padding: "16px 4px 4px" }}>
              {trend.map((item) => (
                <div key={item.bulan} title={`${item.label}: ${formatAngka(item.total)} permohonan`} style={{ display: "grid", gridTemplateRows: "1fr auto auto", gap: 7, height: 190, alignItems: "end", textAlign: "center" }}>
                  <div style={{ height: "100%", display: "flex", alignItems: "end", justifyContent: "center" }}>
                    <div style={{ width: "min(100%,28px)", height: `${Math.max(3, (item.total / maxTrend) * 100)}%`, minHeight: 3, borderRadius: "7px 7px 2px 2px", background: "linear-gradient(180deg,#a855f7,#6d28d9)" }} />
                  </div>
                  <strong style={{ fontSize: 11 }}>{formatAngka(item.total)}</strong>
                  <span className="beranda-muted" style={{ fontSize: 11 }}>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Status Layanan Surat" action={{ label: "Kelola permohonan", href: "/permohonan-surat" }}>
          <div style={{ display: "grid", gap: 16, padding: "12px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>Menunggu tindakan</span><strong>{formatAngka(pending)}</strong>
            </div>
            <div style={{ height: 10, borderRadius: 99, background: "var(--color-background,#f4f8fe)", overflow: "hidden" }}>
              <div style={{ width: `${stats.permohonan ? (pending / stats.permohonan) * 100 : 0}%`, height: "100%", background: "#2563eb", borderRadius: 99 }} />
            </div>
            <p className="beranda-empty">Antrean menunggu mencakup permohonan yang masih berada pada tahap pemeriksaan atau tanda tangan elektronik.</p>
          </div>
        </Panel>

        <Panel title="Permohonan Terbaru" action={{ label: "Lihat semua", href: "/permohonan-surat" }}>
          {requests.length === 0 ? (
            <p className="beranda-empty">Belum ada permohonan surat yang masuk.</p>
          ) : (
            <ul className="beranda-doc-list">
              {requests.map((item) => (
                <li key={item.id}>
                  <span className="beranda-doc-icon" aria-hidden="true">▤</span>
                  <div className="beranda-doc-main">
                    <strong>{item.jenisSurat}</strong>
                    <span>{item.pemohon}</span>
                  </div>
                  <span className="beranda-doc-time">{waktuRelatif(item.diajukanPada, now)}</span>
                  <span className="beranda-chip" data-status={item.status}>{labelPermohonanStatus(item.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Aktivitas Terbaru">
          {activities.length === 0 ? (
            <p className="beranda-empty">Belum ada aktivitas tercatat.</p>
          ) : (
            <ol className="beranda-feed">
              {activities.map((item) => (
                <li key={item.id}>
                  <span className="beranda-feed-icon" data-tone={toneAktivitas(item.event)} aria-hidden="true">•</span>
                  <div className="beranda-feed-body">
                    <strong>{labelAktivitas(item.event)}</strong>
                    <span>{item.actorName ?? "Sistem"} · {waktuRelatif(item.createdAt, now)}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Panel title="Akses Cepat">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Link className="beranda-quick-tile" href="/permohonan-surat">Permohonan Surat</Link>
          <Link className="beranda-quick-tile" href="/persuratan/surat">Pembuatan & Pengelolaan Surat</Link>
          <Link className="beranda-quick-tile" href="/persuratan/jenis-surat">Template & Jenis Surat</Link>
          <Link className="beranda-quick-tile" href="/persuratan/master">Klasifikasi & Persyaratan</Link>
          <Link className="beranda-quick-tile" href="/persuratan/arsip">Arsip & Riwayat Surat</Link>
        </div>
      </Panel>
    </div>
  );
}
