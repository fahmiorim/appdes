import "server-only";

import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db";
import { jabatanPerangkat, perangkatDesa } from "@/db/schema/content";
import {
  kehadiranPerangkat,
  type KehadiranPerangkat,
  type NewKehadiranPerangkat,
} from "@/db/schema/kehadiran";
import { kehadiranIzin } from "@/db/schema/kehadiran-izin";
import { residents } from "@/db/schema/resident";

function tanggalUtc(tahun: number, bulan: number, hari: number): Date {
  return new Date(Date.UTC(tahun, bulan, hari));
}

export async function listKehadiran(
  villageId: number,
  opts?: { bulan?: number; tahun?: number; perangkatId?: number },
): Promise<KehadiranPerangkat[]> {
  const conditions = [eq(kehadiranPerangkat.villageId, villageId)];

  if (opts?.tahun && opts.bulan) {
    conditions.push(
      gte(kehadiranPerangkat.tanggal, tanggalUtc(opts.tahun, opts.bulan - 1, 1)),
      lte(kehadiranPerangkat.tanggal, tanggalUtc(opts.tahun, opts.bulan, 0)),
    );
  } else if (opts?.tahun) {
    conditions.push(
      gte(kehadiranPerangkat.tanggal, tanggalUtc(opts.tahun, 0, 1)),
      lte(kehadiranPerangkat.tanggal, tanggalUtc(opts.tahun, 11, 31)),
    );
  }

  if (opts?.perangkatId) {
    conditions.push(eq(kehadiranPerangkat.perangkatId, opts.perangkatId));
  }

  return db
    .select()
    .from(kehadiranPerangkat)
    .where(and(...conditions))
    .orderBy(desc(kehadiranPerangkat.tanggal));
}

export async function listPerangkatDesa(villageId: number) {
  return db
    .select({
      id: perangkatDesa.id,
      nama: perangkatDesa.nama,
      jabatanId: perangkatDesa.jabatanId,
      /** Nama jabatan untuk ditampilkan; `jabatanId` tetap dipakai formulir. */
      jabatanNama: jabatanPerangkat.nama,
      nik: perangkatDesa.nik,
    })
    .from(perangkatDesa)
    .leftJoin(jabatanPerangkat, eq(perangkatDesa.jabatanId, jabatanPerangkat.id))
    .where(eq(perangkatDesa.villageId, villageId));
}

export async function createKehadiran(data: NewKehadiranPerangkat): Promise<number> {
  const result = await db.insert(kehadiranPerangkat).values(data);
  const insertId = result[0].insertId;
  return typeof insertId === "bigint" ? Number(insertId) : insertId;
}

export async function updateKehadiran(
  id: number,
  villageId: number,
  data: Partial<NewKehadiranPerangkat>,
): Promise<void> {
  await db
    .update(kehadiranPerangkat)
    .set(data)
    .where(and(eq(kehadiranPerangkat.id, id), eq(kehadiranPerangkat.villageId, villageId)));
}

export async function deleteKehadiran(id: number, villageId: number): Promise<void> {
  await db
    .delete(kehadiranPerangkat)
    .where(and(eq(kehadiranPerangkat.id, id), eq(kehadiranPerangkat.villageId, villageId)));
}

interface RekapBaris {
  perangkatId: number;
  nama: string;
  jabatan: string;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
}

/**
 * Tambahkan hari izin/sakit/cuti yang **disetujui** ke rekap perangkat.
 *
 * Izin warga ditautkan ke perangkat lewat NIK (keduanya berasal dari penduduk
 * desa). Hari yang sudah punya catatan kehadiran tidak dihitung dua kali.
 * Cuti dihitung sebagai izin agar bentuk rekap lama tetap kompatibel.
 */
async function tambahkanIzinDisetujui(
  villageId: number,
  tahun: number,
  bulan: number | undefined,
  daftarPerangkat: { id: number; nama: string; jabatanNama: string | null; nik: string | null }[],
  hasil: Map<number, RekapBaris>,
  catatan: { perangkatId: number | null; tanggal: Date }[],
): Promise<void> {
  const izinRows = await db
    .select({
      jenis: kehadiranIzin.jenis,
      tanggalMulai: kehadiranIzin.tanggalMulai,
      tanggalSelesai: kehadiranIzin.tanggalSelesai,
      nik: residents.nationalId,
    })
    .from(kehadiranIzin)
    .innerJoin(residents, eq(residents.id, kehadiranIzin.residentId))
    .where(and(eq(kehadiranIzin.villageId, villageId), eq(kehadiranIzin.status, "disetujui")));

  if (izinRows.length === 0) return;

  const perangkatPerNik = new Map(
    daftarPerangkat.filter((item) => item.nik).map((item) => [item.nik as string, item.id]),
  );
  const sudahDicatat = new Set(
    catatan
      .filter((item) => item.perangkatId !== null)
      .map((item) => `${item.perangkatId}:${item.tanggal.toISOString().slice(0, 10)}`),
  );

  const awal = bulan ? new Date(Date.UTC(tahun, bulan - 1, 1)) : new Date(Date.UTC(tahun, 0, 1));
  const akhir = bulan ? new Date(Date.UTC(tahun, bulan, 0)) : new Date(Date.UTC(tahun, 11, 31));

  for (const izin of izinRows) {
    const perangkatId = izin.nik ? perangkatPerNik.get(izin.nik) : undefined;
    if (!perangkatId) continue;

    let baris = hasil.get(perangkatId);
    if (!baris) {
      const perangkat = daftarPerangkat.find((item) => item.id === perangkatId);
      baris = {
        perangkatId,
        nama: perangkat?.nama ?? "-",
        jabatan: perangkat?.jabatanNama ?? "-",
        hadir: 0,
        izin: 0,
        sakit: 0,
        alpa: 0,
      };
      hasil.set(perangkatId, baris);
    }

    const mulai = new Date(`${izin.tanggalMulai}T00:00:00.000Z`);
    const selesai = new Date(`${izin.tanggalSelesai}T00:00:00.000Z`);
    for (
      let hari = new Date(Math.max(mulai.getTime(), awal.getTime()));
      hari <= selesai && hari <= akhir;
      hari.setUTCDate(hari.getUTCDate() + 1)
    ) {
      const kunci = hari.toISOString().slice(0, 10);
      if (sudahDicatat.has(`${perangkatId}:${kunci}`)) continue;
      if (izin.jenis === "sakit") baris.sakit += 1;
      else baris.izin += 1;
    }
  }
}

export async function getRekapKehadiran(
  villageId: number,
  tahun: number,
  bulan?: number,
): Promise<RekapBaris[]> {
  const conditions = [eq(kehadiranPerangkat.villageId, villageId)];
  if (tahun) {
    conditions.push(
      gte(
        kehadiranPerangkat.tanggal,
        bulan ? tanggalUtc(tahun, bulan - 1, 1) : tanggalUtc(tahun, 0, 1),
      ),
      lte(
        kehadiranPerangkat.tanggal,
        bulan ? tanggalUtc(tahun, bulan, 0) : tanggalUtc(tahun, 11, 31),
      ),
    );
  }

  const perangkatList = await listPerangkatDesa(villageId);
  const perangkatMap = new Map(perangkatList.map((perangkat) => [perangkat.id, perangkat]));
  const rows = await db
    .select({
      perangkatId: kehadiranPerangkat.perangkatId,
      status: kehadiranPerangkat.status,
      tanggal: kehadiranPerangkat.tanggal,
    })
    .from(kehadiranPerangkat)
    .where(and(...conditions));

  const result = new Map<number, RekapBaris>();

  for (const row of rows) {
    if (!row.perangkatId) continue;
    let current = result.get(row.perangkatId);
    if (!current) {
      const perangkat = perangkatMap.get(row.perangkatId);
      current = {
        perangkatId: row.perangkatId,
        nama: perangkat?.nama ?? "-",
        jabatan: perangkat?.jabatanNama ?? "-",
        hadir: 0,
        izin: 0,
        sakit: 0,
        alpa: 0,
      };
      result.set(row.perangkatId, current);
    }

    if (row.status === "hadir") current.hadir += 1;
    else if (row.status === "izin") current.izin += 1;
    else if (row.status === "sakit") current.sakit += 1;
    else if (row.status === "alpa") current.alpa += 1;
  }

  await tambahkanIzinDisetujui(villageId, tahun, bulan, perangkatList, result, rows);

  return [...result.values()].sort((a, b) => b.hadir - a.hadir);
}

/** Apakah perangkat dengan id tersebut terdaftar pada desa ini. */
export async function adaPerangkat(villageId: number, perangkatId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: perangkatDesa.id })
    .from(perangkatDesa)
    .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.id, perangkatId)))
    .limit(1);

  return Boolean(row);
}
