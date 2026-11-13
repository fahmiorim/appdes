import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { inArray } from "drizzle-orm";
import mysql, { type ResultSetHeader } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { jabatanPerangkat, perangkatDesa } from "@/db/schema/content";
import { kehadiranIzin } from "@/db/schema/kehadiran-izin";
import { residents } from "@/db/schema/resident";
import { villages } from "@/db/schema/village";
import { getRekapKehadiran } from "@/features/kehadiran/infrastructure/kehadiran-repository";
import { validasiDatabaseUji } from "@/testing/db-test-guard";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * AUD-034 Batch 2 — rekap kehadiran tidak boleh meminjam identitas desa lain.
 *
 * Rekap mencocokkan izin warga ke perangkat lewat NIK. NIK hanya unik *per
 * desa*, jadi dua desa dapat memiliki NIK yang sama. Test ini menyiapkan satu
 * baris izin legacy desa A yang menunjuk penduduk desa B dengan NIK sama:
 * join ke `residents` wajib disaring `village_id` agar izin tersebut tidak
 * menambah rekap perangkat desa A.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);
const NIK_SAMA = `32${String(Date.now()).slice(-14)}`;

interface Fixture {
  desaA: number;
  desaB: number;
  perangkatA: number;
}

let fixture: Fixture | null = null;

function pastiId(row: { id: number | undefined } | undefined, label: string): number {
  const id = row?.id;
  if (id === undefined) throw new Error(`Seed uji gagal: ${label}`);
  return id;
}

function dataUji(): Fixture {
  if (fixture === null) throw new Error("Fixture integrasi tidak siap.");
  return fixture;
}

/**
 * Sisipkan satu baris izin legacy lintas desa.
 *
 * Batch 1 memasang composite FK `(village_id, resident_id)` sehingga jalur
 * normal sudah menolak pasangan ini. Baris dibuat lewat koneksi terpisah
 * dengan pengecekan FK dimatikan untuk mereproduksi data yang dibuat sebelum
 * constraint terpasang; pengecualian selalu dikembalikan di blok `finally`.
 */
async function sisipkanIzinLegacy(params: {
  villageId: number;
  residentId: number;
  jenis: string;
  mulai: string;
  selesai: string;
}): Promise<number> {
  const koneksi = await mysql.createConnection(validasiDatabaseUji(process.env).opsiKoneksi);
  try {
    await koneksi.query("SET FOREIGN_KEY_CHECKS = 0");
    const [hasil] = await koneksi.query<ResultSetHeader>(
      "INSERT INTO kehadiran_izin (village_id, resident_id, jenis, tanggal_mulai, tanggal_selesai, alasan, status) VALUES (?, ?, ?, ?, ?, ?, 'disetujui')",
      [
        params.villageId,
        params.residentId,
        params.jenis,
        params.mulai,
        params.selesai,
        `Legacy ${RUN}`,
      ],
    );
    return hasil.insertId;
  } finally {
    await koneksi.query("SET FOREIGN_KEY_CHECKS = 1");
    await koneksi.end();
  }
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa Rekap A ${RUN}`, code: `RA${RUN}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa Rekap B ${RUN}`, code: `RB${RUN}` })
    .$returningId();
  const desaA = pastiId(desaARow, "desa A");
  const desaB = pastiId(desaBRow, "desa B");

  const [jabatanARow] = await db
    .insert(jabatanPerangkat)
    .values({ villageId: desaA, nama: `Sekretaris A ${RUN}`, slug: `sekretaris-a-${RUN}` })
    .$returningId();
  const jabatanA = pastiId(jabatanARow, "jabatan A");

  const [perangkatARow] = await db
    .insert(perangkatDesa)
    .values({
      villageId: desaA,
      jabatanId: jabatanA,
      nama: `Perangkat A ${RUN}`,
      nik: NIK_SAMA,
    })
    .$returningId();
  const perangkatA = pastiId(perangkatARow, "perangkat A");

  const [pendudukARow] = await db
    .insert(residents)
    .values({
      villageId: desaA,
      name: `Penduduk Rekap A ${RUN}`,
      gender: "male",
      birthDate: "1990-01-01",
      nationalId: NIK_SAMA,
    })
    .$returningId();
  const pendudukA = pastiId(pendudukARow, "penduduk A");

  const [pendudukBRow] = await db
    .insert(residents)
    .values({
      villageId: desaB,
      name: `Penduduk Rekap B ${RUN}`,
      gender: "female",
      birthDate: "1991-02-02",
      nationalId: NIK_SAMA,
    })
    .$returningId();
  const pendudukB = pastiId(pendudukBRow, "penduduk B");

  // Izin sah desa sendiri: 2 hari izin pada Maret 2026.
  await db.insert(kehadiranIzin).values({
    villageId: desaA,
    residentId: pendudukA,
    jenis: "izin",
    tanggalMulai: "2026-03-02",
    tanggalSelesai: "2026-03-03",
    alasan: `Izin sah ${RUN}`,
    status: "disetujui",
  });

  // Izin legacy desa A yang menunjuk penduduk desa B dengan NIK sama.
  await sisipkanIzinLegacy({
    villageId: desaA,
    residentId: pendudukB,
    jenis: "sakit",
    mulai: "2026-03-10",
    selesai: "2026-03-11",
  });

  fixture = { desaA, desaB, perangkatA };
});

afterAll(async () => {
  if (fixture === null) return;
  const desaIds = [fixture.desaA, fixture.desaB];

  await db.delete(kehadiranIzin).where(inArray(kehadiranIzin.villageId, desaIds));
  await db.delete(perangkatDesa).where(inArray(perangkatDesa.villageId, desaIds));
  await db.delete(jabatanPerangkat).where(inArray(jabatanPerangkat.villageId, desaIds));
  await db.delete(residents).where(inArray(residents.villageId, desaIds));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("rekap kehadiran — join penduduk dibatasi desa", () => {
  it("menghitung izin sah milik penduduk desa sendiri", async () => {
    const { desaA, perangkatA } = dataUji();

    const rows = await getRekapKehadiran(desaA, 2026, 3);
    const baris = rows.find((row) => row.perangkatId === perangkatA);

    expect(baris).toMatchObject({ hadir: 0, izin: 2, sakit: 0, alpa: 0 });
  });

  it("tidak menghitung izin yang menunjuk penduduk desa lain meski NIK sama", async () => {
    const { desaA, perangkatA } = dataUji();

    const rows = await getRekapKehadiran(desaA, 2026, 3);
    const baris = rows.find((row) => row.perangkatId === perangkatA);

    // Sebelum perbaikan, join `residents` tanpa predicate desa menemukan
    // penduduk desa B (NIK sama) sehingga dua hari sakit ikut terhitung.
    expect(baris?.sakit).toBe(0);
  });

  it("desa lain tidak melihat perangkat desa ini", async () => {
    const { desaB } = dataUji();

    const rows = await getRekapKehadiran(desaB, 2026, 3);
    expect(rows).toHaveLength(0);
  });
});
