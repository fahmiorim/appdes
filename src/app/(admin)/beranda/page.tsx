import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  dashboardAktivitasTerbaru,
  dashboardPermohonanTerbaru,
  dashboardStatistikUmur,
  dashboardStats,
  dashboardTrenPermohonan,
} from "@/features/dashboard/application/dashboard-use-cases";
import { labelAktivitas, toneAktivitas } from "@/features/dashboard/domain/aktivitas";
import { waktuRelatif } from "@/features/dashboard/domain/waktu-relatif";
import { getStatistikDesa } from "@/features/desa/application/statistik-desa";
import { getIdentitasDesaUseCase } from "@/features/desa/application/use-cases";
import { getLaporanKeuangan } from "@/features/keuangan/application/keuangan-use-cases";
import { getBukuPembangunan } from "@/features/pembangunan/application/use-cases";
import { listBeritaAdminData } from "@/features/publik/application/konten-admin";
import { labelPermohonanStatus } from "@/features/layanan-mandiri/domain/layanan-mandiri";
import { isSuperAdminUser } from "@/features/multi-desa/application/provisioning-use-cases";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { verifySession } from "@/lib/dal";

import { StatistikPenduduk } from "./statistik-penduduk";
import { TrenLayananSurat } from "./tren-layanan-surat";

export const metadata: Metadata = {
  title: "Dashboard Admin Desa",
};

const FORMAT_HARI = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Pintasan beranda hanya menautkan halaman yang benar-benar tersedia.
 * Setiap pintasan memakai izin baca modulnya agar tidak menjadi tautan 403.
 */
const AKSES_CEPAT = [
  { label: "Data Penduduk", href: "/penduduk", ikon: "penduduk", resource: RESOURCES.penduduk },
  { label: "Arsip Surat", href: "/persuratan/surat", ikon: "surat", resource: RESOURCES.surat },
  { label: "Berita Desa", href: "/konten/berita", ikon: "berita", resource: RESOURCES.berita },
  { label: "Galeri Desa", href: "/konten/galeri", ikon: "galeri", resource: RESOURCES.galeri },
  { label: "Keuangan Desa", href: "/keuangan", ikon: "apbdes", resource: RESOURCES.keuangan },
  {
    label: "Pengaduan Warga",
    href: "/pengaduan-admin",
    ikon: "pengaduan",
    resource: RESOURCES.pengaduan,
  },
] as const;

function Ikon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.7}
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function ikonKpi(jenis: "penduduk" | "keluarga" | "surat" | "pengaduan") {
  if (jenis === "penduduk") {
    return (
      <Ikon>
        <circle cx="9" cy="8" r="3.1" />
        <path d="M3.4 19.5a5.8 5.8 0 0 1 11.2 0" />
        <path d="M16.2 5.4a3.1 3.1 0 0 1 0 5.2" />
        <path d="M18.1 14.3a5.8 5.8 0 0 1 3 5.2" />
      </Ikon>
    );
  }
  if (jenis === "keluarga") {
    return (
      <Ikon>
        <path d="M4 10.5 12 4l8 6.5" />
        <path d="M6 9.8V20h12V9.8" />
        <path d="M10 20v-4.6h4V20" />
      </Ikon>
    );
  }
  if (jenis === "surat") {
    return (
      <Ikon>
        <path d="M6 3.5h8.2L19 8.3V20.5H6z" />
        <path d="M14 3.5v5h5" />
        <path d="M9 13h6" />
        <path d="M9 16.5h4.5" />
      </Ikon>
    );
  }
  return (
    <Ikon>
      <path d="M4 5.5h16v10H9l-5 4z" />
      <path d="M8 9.5h8" />
      <path d="M8 12.5h5" />
    </Ikon>
  );
}

function ikonAktivitas(event: string) {
  if (event.startsWith("pengguna.") || event.startsWith("penduduk.")) {
    return (
      <Ikon>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
      </Ikon>
    );
  }
  if (event.startsWith("grup-akses.")) {
    return (
      <Ikon>
        <path d="M12 3.5 19 6v5.4c0 4.2-2.9 7.6-7 9.1-4.1-1.5-7-4.9-7-9.1V6z" />
        <path d="m9.3 11.8 1.9 1.9 3.5-3.6" />
      </Ikon>
    );
  }
  if (event.startsWith("auth.")) {
    return (
      <Ikon>
        <circle cx="8" cy="12" r="3.4" />
        <path d="M11.4 12H21" />
        <path d="M18 12v3" />
      </Ikon>
    );
  }
  if (event.startsWith("pengaduan.")) {
    return (
      <Ikon>
        <path d="M4 5.5h16v10H9l-5 4z" />
        <path d="M8 9.5h8" />
      </Ikon>
    );
  }
  if (event.startsWith("surat.") || event.startsWith("permohonan.")) {
    return (
      <Ikon>
        <path d="M6 3.5h8.2L19 8.3V20.5H6z" />
        <path d="M14 3.5v5h5" />
        <path d="M9 13h6" />
      </Ikon>
    );
  }
  return (
    <Ikon>
      <path d="M4.5 7h15" />
      <path d="M4.5 12h15" />
      <path d="M4.5 17h9" />
    </Ikon>
  );
}

function ikonAksesCepat(jenis: string) {
  if (jenis === "penduduk") {
    return (
      <Ikon>
        <circle cx="10" cy="8" r="3" />
        <path d="M4.5 19.5a5.5 5.5 0 0 1 11 0" />
        <path d="M18 8v6" />
        <path d="M15 11h6" />
      </Ikon>
    );
  }
  if (jenis === "surat") {
    return (
      <Ikon>
        <path d="M6 3.5h8.2L19 8.3V20.5H6z" />
        <path d="M14 3.5v5h5" />
        <path d="M12 12v5" />
        <path d="M9.5 14.5h5" />
      </Ikon>
    );
  }
  if (jenis === "berita") {
    return (
      <Ikon>
        <path d="M4 19.5 16.8 6.7l3.5 3.5L7.5 23z" />
        <path d="m14.8 8.7 3.5 3.5" />
        <path d="M4 19.5h4" />
      </Ikon>
    );
  }
  if (jenis === "galeri") {
    return (
      <Ikon>
        <rect height="14" rx="2" width="18" x="3" y="5" />
        <circle cx="8.5" cy="10" r="1.5" />
        <path d="m4.5 17 4.5-4 3 2.6 3-3 4.5 4.4" />
      </Ikon>
    );
  }
  if (jenis === "apbdes") {
    return (
      <Ikon>
        <ellipse cx="12" cy="6.2" rx="7.5" ry="2.7" />
        <path d="M4.5 6.2v5.6c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7V6.2" />
        <path d="M4.5 11.8v5.6c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7v-5.6" />
      </Ikon>
    );
  }
  return (
    <Ikon>
      <path d="M4 5.5h16v10H9l-5 4z" />
      <path d="M8 9.5h8" />
      <path d="M8 12.5h5" />
    </Ikon>
  );
}

export default async function AdminHomePage() {
  const user = await verifySession();

  if (await isSuperAdminUser(user)) {
    redirect("/super-admin");
  }

  const villageId = user.villageId;
  const aksesCepat = AKSES_CEPAT.filter((item) =>
    hasPermission(user.permissions, item.resource, "read"),
  );

  const data =
    villageId === null
      ? null
      : await Promise.all([
          getIdentitasDesaUseCase(villageId),
          dashboardStats(villageId),
          getStatistikDesa(villageId),
          dashboardStatistikUmur(villageId),
          dashboardTrenPermohonan(villageId),
          dashboardPermohonanTerbaru(villageId),
          dashboardAktivitasTerbaru(villageId),
          hasPermission(user.permissions, RESOURCES.laporanKeuangan, "read")
            ? getLaporanKeuangan()
            : Promise.resolve(null),
          hasPermission(user.permissions, RESOURCES.pembangunan, "read")
            ? getBukuPembangunan(new Date().getFullYear())
            : Promise.resolve([]),
          hasPermission(user.permissions, RESOURCES.berita, "read")
            ? listBeritaAdminData(4)
            : Promise.resolve([]),
        ]);

  const identitas = data?.[0] ?? null;
  const stats = data?.[1] ?? null;
  const statistik = data?.[2] ?? null;
  const perUmur = data?.[3] ?? [];
  const tren = data?.[4] ?? [];
  const permohonan = data?.[5] ?? [];
  const aktivitas = data?.[6] ?? [];
  const laporanApbdes = data?.[7] ?? null;
  const programPrioritas = data?.[8] ?? [];
  const pengumuman = data?.[9] ?? [];

  const namaDesa = identitas?.namaDesa ?? "Desa";
  const wilayah = [identitas?.namaKecamatan, identitas?.namaKabupaten]
    .map((bagian) => bagian?.trim())
    .filter((bagian): bagian is string => Boolean(bagian));

  const sekarang = new Date();

  const chipPenduduk =
    stats && stats.residentsBaru > 0
      ? { tone: "hijau", teks: `+${stats.residentsBaru.toLocaleString("id-ID")} jiwa bulan ini` }
      : { tone: "netral", teks: "Tidak ada penambahan bulan ini" };

  const chipKeluarga =
    stats && stats.familiesBaru > 0
      ? { tone: "hijau", teks: `+${stats.familiesBaru.toLocaleString("id-ID")} KK bulan ini` }
      : { tone: "netral", teks: "Tidak ada penambahan bulan ini" };

  return (
    <div className="beranda">
      <div className="beranda-head">
        <div>
          <h1>Dashboard Admin Desa</h1>
          <p>Kelola layanan, data, dan pembangunan {namaDesa} dengan mudah dan terintegrasi.</p>
        </div>
        <span className="beranda-date">
          <Ikon>
            <rect height="15" rx="2.5" width="16" x="4" y="5.5" />
            <path d="M8 3.5v4" />
            <path d="M16 3.5v4" />
            <path d="M4 10.5h16" />
          </Ikon>
          {FORMAT_HARI.format(sekarang)}
        </span>
      </div>

      {stats && statistik ? (
        <>
          <div className="beranda-kpi-grid beranda-kpi-grid-lima">
            <article className="beranda-card beranda-kpi" data-tone="biru">
              <span className="beranda-kpi-icon">{ikonKpi("penduduk")}</span>
              <div className="beranda-kpi-body">
                <span className="beranda-kpi-label">Jumlah Penduduk</span>
                <strong className="beranda-kpi-value">
                  {statistik.total.toLocaleString("id-ID")} <span>jiwa</span>
                </strong>
                <span className="beranda-chip" data-tone={chipPenduduk.tone}>
                  {chipPenduduk.teks}
                </span>
              </div>
            </article>

            <article className="beranda-card beranda-kpi" data-tone="ungu">
              <span className="beranda-kpi-icon">{ikonKpi("keluarga")}</span>
              <div className="beranda-kpi-body">
                <span className="beranda-kpi-label">Jumlah KK</span>
                <strong className="beranda-kpi-value">
                  {stats.families.toLocaleString("id-ID")} <span>KK</span>
                </strong>
                <span className="beranda-chip" data-tone={chipKeluarga.tone}>
                  {chipKeluarga.teks}
                </span>
              </div>
            </article>

            <article className="beranda-card beranda-kpi" data-tone="ungu">
              <span className="beranda-kpi-icon">{ikonKpi("surat")}</span>
              <div className="beranda-kpi-body">
                <span className="beranda-kpi-label">Permohonan Surat</span>
                <strong className="beranda-kpi-value">
                  {stats.permohonan.toLocaleString("id-ID")}
                </strong>
                <span className="beranda-chip" data-tone="ungu">
                  {stats.permohonanMenunggu.toLocaleString("id-ID")} menunggu
                </span>
              </div>
            </article>

            <article className="beranda-card beranda-kpi" data-tone="merah">
              <span className="beranda-kpi-icon">{ikonKpi("pengaduan")}</span>
              <div className="beranda-kpi-body">
                <span className="beranda-kpi-label">Pengaduan</span>
                <strong className="beranda-kpi-value">
                  {stats.complaints.toLocaleString("id-ID")}
                </strong>
                <span
                  className="beranda-chip"
                  data-tone={stats.complaintsBaru > 0 ? "merah" : "hijau"}
                >
                  {stats.complaintsBaru > 0
                    ? `${stats.complaintsBaru.toLocaleString("id-ID")} belum ditindaklanjuti`
                    : "Semua ditindaklanjuti"}
                </span>
              </div>
            </article>
            {laporanApbdes ? (
              <article className="beranda-card beranda-kpi" data-tone="ungu">
                <span className="beranda-kpi-icon">{ikonAksesCepat("apbdes")}</span>
                <div className="beranda-kpi-body">
                  <span className="beranda-kpi-label">Realisasi APBDes {laporanApbdes.tahun}</span>
                  <strong className="beranda-kpi-value">{laporanApbdes.total.anggaran !== "0.00" ? `${Math.round((Number(laporanApbdes.total.realisasi) / Math.max(Number(laporanApbdes.total.anggaran), 1)) * 1000) / 10}%` : "—"}</strong>
                  <span className="beranda-chip" data-tone="ungu">Rp {Number(laporanApbdes.total.realisasi).toLocaleString("id-ID")}</span>
                </div>
              </article>
            ) : null}
          </div>

          <div className="beranda-grid">
            <StatistikPenduduk
              lakiLaki={statistik.lakiLaki}
              perempuan={statistik.perempuan}
              perDusun={statistik.perDusun}
              perUmur={perUmur}
            />
            <section className="beranda-card" aria-labelledby="tren-layanan-surat">
              <div className="beranda-card-head">
                <h2 className="beranda-card-title" id="tren-layanan-surat">
                  <span className="beranda-title-icon" aria-hidden="true">
                    <Ikon><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 14 3.5-3.5 3 2.5L20 7" /></Ikon>
                  </span>
                  Tren Layanan Surat
                </h2>
                <span className="beranda-range">6 Bulan Terakhir</span>
              </div>
              <TrenLayananSurat titik={tren} />
            </section>
          </div>

          <div className="beranda-grid beranda-grid-dashboard-extra">
            {laporanApbdes ? (
              <section className="beranda-card" aria-labelledby="dashboard-apbdes">
                <div className="beranda-card-head">
                  <h2 className="beranda-card-title" id="dashboard-apbdes">Realisasi APBDes Tahun {laporanApbdes.tahun}</h2>
                  <Link href="/keuangan">Detail →</Link>
                </div>
                <div className="beranda-apbdes-summary">
                  <div className="beranda-apbdes-ring" style={{ "--realisasi": `${Math.min(100, Math.max(0, Number(laporanApbdes.total.anggaran) > 0 ? Number(laporanApbdes.total.realisasi) / Number(laporanApbdes.total.anggaran) * 100 : 0))}%` } as React.CSSProperties}>
                    <strong>{Number(laporanApbdes.total.anggaran) > 0 ? `${(Number(laporanApbdes.total.realisasi) / Number(laporanApbdes.total.anggaran) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%` : "—"}</strong>
                    <span>Realisasi</span>
                  </div>
                  <dl>
                    <div><dt>Pagu Anggaran</dt><dd>Rp {Number(laporanApbdes.total.anggaran).toLocaleString("id-ID")}</dd></div>
                    <div><dt>Realisasi</dt><dd>Rp {Number(laporanApbdes.total.realisasi).toLocaleString("id-ID")}</dd></div>
                    <div><dt>Sisa Anggaran</dt><dd>Rp {Number(laporanApbdes.total.selisih).toLocaleString("id-ID")}</dd></div>
                  </dl>
                </div>
              </section>
            ) : null}
            {hasPermission(user.permissions, RESOURCES.pembangunan, "read") ? (
              <section className="beranda-card" aria-labelledby="dashboard-program">
                <div className="beranda-card-head">
                  <h2 className="beranda-card-title" id="dashboard-program">Program & Kegiatan Prioritas</h2>
                  <Link href="/pembangunan">Detail →</Link>
                </div>
                {programPrioritas.length === 0 ? (
                  <p className="beranda-empty">Belum ada program pembangunan untuk tahun berjalan.</p>
                ) : (
                  <ul className="beranda-program-list">
                    {programPrioritas.slice(0, 4).map((item) => (
                      <li key={item.id}>
                        <div><strong>{item.judul}</strong><span>{item.lokasi ?? "Lokasi belum diisi"}</span></div>
                        <div className="beranda-program-progress"><span style={{ width: `${Math.min(100, Math.max(0, item.progres))}%` }} /></div>
                        <strong>{item.progres}%</strong>
                        <span className="beranda-program-status">{item.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </div>

          <div className="beranda-bottom beranda-bottom-dashboard">
            <section className="beranda-card" aria-labelledby="aktivitas-terbaru">
              <div className="beranda-card-head">
                <h2 className="beranda-card-title" id="aktivitas-terbaru">
                  <span className="beranda-title-icon" aria-hidden="true"><Ikon><path d="M3 12h4l2.5-6 4 12 2.5-6h5" /></Ikon></span>
                  Aktivitas Terbaru
                </h2>
              </div>
              {aktivitas.length === 0 ? <p className="beranda-empty">Belum ada aktivitas tercatat.</p> : (
                <ol className="beranda-feed">
                  {aktivitas.slice(0, 5).map((catatan) => (
                    <li key={catatan.id}>
                      <span className="beranda-feed-icon" data-tone={toneAktivitas(catatan.event)} aria-hidden="true">{ikonAktivitas(catatan.event)}</span>
                      <div className="beranda-feed-body">
                        <strong>{labelAktivitas(catatan.event)}</strong>
                        <span>{catatan.actorName ?? "Sistem"} · {waktuRelatif(catatan.createdAt, sekarang)}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="beranda-card" aria-labelledby="pengumuman-informasi">
              <div className="beranda-card-head">
                <h2 className="beranda-card-title" id="pengumuman-informasi">
                  <span className="beranda-title-icon" aria-hidden="true"><Ikon><path d="M4 7h16v13H4z" /><path d="M8 7V4h8v3M8 12h8M8 16h5" /></Ikon></span>
                  Pengumuman & Informasi
                </h2>
                {hasPermission(user.permissions, RESOURCES.berita, "read") ? <Link href="/konten/berita">Lihat Semua →</Link> : null}
              </div>
              {!hasPermission(user.permissions, RESOURCES.berita, "read") ? (
                <p className="beranda-empty">Akun ini tidak memiliki akses membaca berita desa.</p>
              ) : pengumuman.length === 0 ? (
                <p className="beranda-empty">Belum ada berita atau pengumuman yang dipublikasikan.</p>
              ) : (
                <div className="beranda-announcement">
                  {pengumuman[0].gambar ? (
                    <Image alt="" className="beranda-announcement-image" height={150} src={pengumuman[0].gambar} unoptimized width={190} />
                  ) : (
                    <div className="beranda-announcement-placeholder" aria-hidden="true"><Ikon><path d="M4 5h16v14H4z" /><path d="m5 16 5-5 3 3 2-2 4 4" /></Ikon></div>
                  )}
                  <div className="beranda-announcement-copy">
                    {pengumuman[0].kategori ? <span className="beranda-announcement-category">{pengumuman[0].kategori}</span> : null}
                    <strong>{pengumuman[0].judul}</strong>
                    {pengumuman[0].terbitPada ? <time dateTime={pengumuman[0].terbitPada.toISOString()}>{FORMAT_HARI.format(pengumuman[0].terbitPada)}</time> : null}
                    {pengumuman[0].ringkasan ? <p>{pengumuman[0].ringkasan}</p> : null}
                    <Link href="/konten/berita">Kelola informasi desa →</Link>
                  </div>
                </div>
              )}
              {pengumuman.length > 1 ? (
                <ul className="beranda-announcement-list">
                  {pengumuman.slice(1, 4).map((item) => <li key={item.id}><span>{item.kategori ?? "Informasi"}</span><strong>{item.judul}</strong></li>)}
                </ul>
              ) : null}
            </section>
          </div>
        </>
      ) : (
        <section className="beranda-card">
          <h2>Data desa belum tersedia</h2>
          <p className="beranda-empty">Akun ini belum terhubung dengan tenant desa.</p>
        </section>
      )}
    </div>
  );
}
