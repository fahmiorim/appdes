/**
 * Linimasa dokumentasi publik proyek pembangunan.
 *
 * Menggabungkan tanggal mulai/selesai proyek dan waktu unggah foto dokumentasi
 * menjadi satu urutan kronologis. Fungsi murni (tanpa I/O) agar dapat diuji
 * tanpa basis data.
 */

export type JenisLinimasa = "mulai" | "dokumentasi" | "selesai";

export interface DokumentasiLinimasa {
  id: number;
  gambar: string | null;
  judul: string | null;
  keterangan: string | null;
  createdAt: Date | null;
}

export interface ProyekLinimasa {
  mulai: string | null;
  selesai: string | null;
  status: string;
  progres: number;
  dokumentasi: readonly DokumentasiLinimasa[];
}

export interface LinimasaEvent {
  /** Kunci stabil untuk React (bukan id basis data lintas jenis). */
  id: string;
  jenis: JenisLinimasa;
  /** Tanggal ISO `YYYY-MM-DD`, atau `null` bila tidak diketahui. */
  tanggal: string | null;
  judul: string;
  keterangan: string | null;
  gambar: string | null;
}

function tanggalDokumentasi(value: Date | null): string | null {
  if (!value) return null;
  const tanggal = new Date(value);
  if (Number.isNaN(tanggal.getTime())) return null;
  return tanggal.toISOString().slice(0, 10);
}

function urutanTanggal(a: LinimasaEvent, b: LinimasaEvent): number {
  if (a.tanggal === null && b.tanggal === null) return 0;
  if (a.tanggal === null) return 1;
  if (b.tanggal === null) return -1;
  return a.tanggal.localeCompare(b.tanggal);
}

/**
 * Susun event linimasa proyek.
 *
 * Event "selesai" hanya muncul bila proyek berstatus selesai atau punya tanggal
 * selesai. Progres ikut dicantumkan pada keterangan agar pembaca melihat
 * konteks kapan dokumentasi diunggah.
 */
export function susunLinimasa(proyek: ProyekLinimasa): LinimasaEvent[] {
  const events: LinimasaEvent[] = [];

  if (proyek.mulai) {
    events.push({
      id: "mulai",
      jenis: "mulai",
      tanggal: proyek.mulai,
      judul: "Proyek dimulai",
      keterangan: null,
      gambar: null,
    });
  }

  for (const item of proyek.dokumentasi) {
    events.push({
      id: `dokumentasi-${item.id}`,
      jenis: "dokumentasi",
      tanggal: tanggalDokumentasi(item.createdAt),
      judul: item.judul?.trim() || "Dokumentasi proyek",
      keterangan: item.keterangan ?? null,
      gambar: item.gambar,
    });
  }

  if (proyek.selesai || proyek.status === "selesai") {
    events.push({
      id: "selesai",
      jenis: "selesai",
      tanggal: proyek.selesai,
      judul: "Proyek selesai",
      keterangan: `Progres fisik ${Math.min(100, Math.max(0, proyek.progres))}%.`,
      gambar: null,
    });
  }

  return events.sort(urutanTanggal);
}
