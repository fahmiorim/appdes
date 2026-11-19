import type { TitikTrenBulanan } from "@/features/dashboard/domain/tren-bulanan";

/**
 * Grafik garis-area tren permohonan surat.
 *
 * Dibuat dari SVG murni agar tidak menambah dependency chart. Angka tetap
 * tersedia untuk pembaca layar melalui daftar `sr-only`; SVG sendiri hanya
 * dekoratif dan tidak menjadi satu-satunya sumber informasi.
 */

const LEBAR = 620;
const TINGGI = 240;
const PAD = { kiri: 38, kanan: 14, atas: 20, bawah: 34 };
const PEMBAGI_Y = 4;

/** Batas atas sumbu Y yang membulat agar labelnya mudah dibaca. */
function batasAtas(nilaiMaks: number): number {
  const langkahKasar = Math.max(1, Math.ceil(nilaiMaks / PEMBAGI_Y));
  const skala = 10 ** Math.floor(Math.log10(langkahKasar));
  const sisa = langkahKasar / skala;
  const langkahBulat = sisa <= 1 ? 1 : sisa <= 2 ? 2 : sisa <= 5 ? 5 : 10;
  return langkahBulat * skala * PEMBAGI_Y;
}

/** Kurva halus melalui titik dengan kontrol di tengah antar-titik. */
function jalurHalus(titik: { x: number; y: number }[]): string {
  if (titik.length === 0) return "";
  if (titik.length === 1) return `M ${titik[0]!.x} ${titik[0]!.y}`;

  let jalur = `M ${titik[0]!.x} ${titik[0]!.y}`;
  for (let index = 1; index < titik.length; index += 1) {
    const sebelumnya = titik[index - 1]!;
    const sekarang = titik[index]!;
    const tengahX = (sebelumnya.x + sekarang.x) / 2;
    jalur += ` C ${tengahX} ${sebelumnya.y}, ${tengahX} ${sekarang.y}, ${sekarang.x} ${sekarang.y}`;
  }
  return jalur;
}

export function TrenLayananSurat({ titik }: { titik: TitikTrenBulanan[] }) {
  const total = titik.reduce((jumlah, item) => jumlah + item.total, 0);

  if (total === 0) {
    return <p className="beranda-empty">Belum ada permohonan surat pada enam bulan terakhir.</p>;
  }

  const maks = Math.max(...titik.map((item) => item.total), 1);
  const puncak = batasAtas(maks);
  const lebarPlot = LEBAR - PAD.kiri - PAD.kanan;
  const tinggiPlot = TINGGI - PAD.atas - PAD.bawah;
  const langkahX = lebarPlot / Math.max(titik.length - 1, 1);

  const koordinat = titik.map((item, index) => ({
    x: PAD.kiri + index * langkahX,
    y: PAD.atas + (1 - item.total / puncak) * tinggiPlot,
    ...item,
  }));

  const garis = jalurHalus(koordinat);
  const dasar = PAD.atas + tinggiPlot;
  const area = `${garis} L ${koordinat[koordinat.length - 1]!.x} ${dasar} L ${koordinat[0]!.x} ${dasar} Z`;

  const garisBantu = Array.from({ length: PEMBAGI_Y + 1 }, (_, index) => {
    const nilai = (puncak / PEMBAGI_Y) * index;
    return {
      nilai,
      y: PAD.atas + (1 - nilai / puncak) * tinggiPlot,
    };
  });

  return (
    <figure className="beranda-chart">
      <svg aria-hidden="true" className="beranda-chart-svg" viewBox={`0 0 ${LEBAR} ${TINGGI}`}>
        <defs>
          <linearGradient id="beranda-area-tren" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7a20f0" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#7a20f0" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {garisBantu.map((baris) => (
          <g key={baris.nilai}>
            <line
              stroke="#e8ecf7"
              strokeWidth="1"
              x1={PAD.kiri}
              x2={LEBAR - PAD.kanan}
              y1={baris.y}
              y2={baris.y}
            />
            <text fill="#7c88a6" fontSize="10" textAnchor="end" x={PAD.kiri - 9} y={baris.y + 3.5}>
              {baris.nilai}
            </text>
          </g>
        ))}

        <path d={area} fill="url(#beranda-area-tren)" />
        <path d={garis} fill="none" stroke="#7a20f0" strokeLinecap="round" strokeWidth="2.4" />

        {koordinat.map((item) => (
          <g key={item.bulan}>
            <circle
              cx={item.x}
              cy={item.y}
              fill="#ffffff"
              r="4.2"
              stroke="#7a20f0"
              strokeWidth="2.4"
            />
            <text fill="#7c88a6" fontSize="10.5" textAnchor="middle" x={item.x} y={TINGGI - 12}>
              {item.label}
            </text>
          </g>
        ))}
      </svg>

      <ul className="sr-only">
        {titik.map((item) => (
          <li key={item.bulan}>
            {item.label}: {item.total} permohonan
          </li>
        ))}
      </ul>
    </figure>
  );
}
