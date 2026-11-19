"use client";

import { useId, useState } from "react";

export interface SegmenStatistik {
  label: string;
  total: number;
}

interface Props {
  lakiLaki: number;
  perempuan: number;
  perDusun: SegmenStatistik[];
  perUmur: SegmenStatistik[];
}

type TabId = "gender" | "dusun" | "umur";

const TABS: { id: TabId; label: string }[] = [
  { id: "gender", label: "Per Gender" },
  { id: "dusun", label: "Per Dusun" },
  { id: "umur", label: "Per Umur" },
];

/** Warna segmen mengikuti palet aksi desa; biru tetap untuk pembeda gender. */
const PALET = ["#7a20f0", "#0b65f5", "#0f9d8a", "#f5a524", "#ec4899", "#64748b", "#94a3b8"];

const MAKS_SEGMEN = 6;

function angka(nilai: number): string {
  return nilai.toLocaleString("id-ID");
}

function persen(bagian: number, total: number): string {
  if (total === 0) return "0";
  const nilai = Math.round((bagian / total) * 1000) / 10;
  return nilai.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

/** Gabungkan kelompok kecil menjadi "Lainnya" agar donut tetap terbaca. */
function batasiSegmen(data: SegmenStatistik[]): SegmenStatistik[] {
  if (data.length <= MAKS_SEGMEN) return data;
  const utama = data.slice(0, MAKS_SEGMEN - 1);
  const sisa = data.slice(MAKS_SEGMEN - 1).reduce((jumlah, item) => jumlah + item.total, 0);
  return [...utama, { label: "Lainnya", total: sisa }];
}

function gradientDonut(segmen: SegmenStatistik[], total: number, warna: string[]): string {
  if (total === 0) return "conic-gradient(#e6e9f4 0deg 360deg)";

  let derajat = 0;
  const potongan = segmen.map((item, index) => {
    const mulai = derajat;
    derajat += (item.total / total) * 360;
    return `${warna[index % warna.length]} ${mulai}deg ${derajat}deg`;
  });

  // Segmen terakhir ditutup tepat di 360 derajat agar tidak ada celah pembulatan.
  return `conic-gradient(${potongan.join(", ")})`;
}

export function StatistikPenduduk({ lakiLaki, perempuan, perDusun, perUmur }: Props) {
  const [tab, setTab] = useState<TabId>("gender");
  const panelId = useId();

  const segmen: SegmenStatistik[] =
    tab === "gender"
      ? [
          { label: "Laki-laki", total: lakiLaki },
          { label: "Perempuan", total: perempuan },
        ]
      : tab === "dusun"
        ? batasiSegmen(perDusun)
        : perUmur;

  // Mockup memakai biru untuk laki-laki dan ungu untuk perempuan.
  const warna = tab === "gender" ? ["#0b65f5", "#7a20f0"] : PALET;
  const jumlah = segmen.reduce((hasil, item) => hasil + item.total, 0);
  const adaData = jumlah > 0;

  return (
    <section className="beranda-card" aria-labelledby={`${panelId}-judul`}>
      <div className="beranda-card-head">
        <h2 className="beranda-card-title" id={`${panelId}-judul`}>
          <span className="beranda-title-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="9" cy="8" r="3.1" />
              <path d="M3.4 19.5a5.8 5.8 0 0 1 11.2 0" />
              <path d="M16.2 5.4a3.1 3.1 0 0 1 0 5.2" />
              <path d="M18.1 14.3a5.8 5.8 0 0 1 3 5.2" />
            </svg>
          </span>
          Statistik Penduduk
        </h2>

        <div className="beranda-tabs" role="tablist" aria-label="Kelompok statistik penduduk">
          {TABS.map((item) => (
            <button
              className="beranda-tab"
              key={item.id}
              type="button"
              role="tab"
              id={`${panelId}-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={panelId}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="beranda-stat-body"
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${panelId}-${tab}`}
      >
        <div className="beranda-donut-wrap">
          <div
            className="beranda-donut"
            style={{ background: gradientDonut(segmen, jumlah, warna) }}
            role="img"
            aria-label={
              adaData
                ? segmen
                    .map((item) => `${item.label} ${persen(item.total, jumlah)} persen`)
                    .join(", ")
                : "Belum ada data penduduk"
            }
          >
            <span className="beranda-donut-center">
              <strong>{adaData ? angka(jumlah) : "—"}</strong>
              <span>Jiwa</span>
            </span>
          </div>

          {adaData ? (
            <ul className="beranda-legend">
              {segmen.map((item, index) => (
                <li key={`${item.label}-${index}`}>
                  <span
                    className="beranda-legend-swatch"
                    style={{ background: warna[index % warna.length] }}
                    aria-hidden="true"
                  />
                  <span className="beranda-legend-label">{item.label}</span>
                  <span className="beranda-legend-value">
                    {angka(item.total)} jiwa ({persen(item.total, jumlah)}%)
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="beranda-empty">Belum ada data penduduk pada kelompok ini.</p>
          )}
        </div>
      </div>
    </section>
  );
}
