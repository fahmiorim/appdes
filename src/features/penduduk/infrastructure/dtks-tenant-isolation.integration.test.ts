import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { count, eq, inArray } from "drizzle-orm";
import mysql, { type ResultSetHeader } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  dtks,
  dtksAnggota,
  dtksLampiran,
  dtksRefLampiran,
  families,
  regions,
  residents,
  rumahTangga,
  villages,
} from "@/db/schema";
import type { ListDtksParams } from "@/features/penduduk/domain/dtks";
import {
  deleteDtks,
  lepasLampiran,
  listDtks,
  listDtksAnggota,
  listDtksEkspor,
  listLampiranTerpasang,
  listRumahTanggaDenganKepala,
  tautkanLampiran,
} from "@/features/penduduk/infrastructure/dtks-repository";
import { validasiDatabaseUji } from "@/testing/db-test-guard";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * B2 — isolasi tenant query DTKS.
 *
 * Desa A dan B masing-masing memiliki RTM, KK, penduduk, DTKS, anggota, dan
 * lampiran. Fixture juga menyisipkan relasi legacy lintas desa: DTKS desa A
 * yang menunjuk RTM/KK desa B, anggota desa B yang menunjuk DTKS desa A,
 * penduduk desa B yang menunjuk RTM desa A, serta lampiran desa B yang
 * ditautkan ke DTKS desa A. Query baca dan operasi taut/lepas lampiran harus
 * tetap hanya memakai objek desa yang diminta.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  desaA: number;
  desaB: number;
  rtmA: number;
  rtmB: number;
  keluargaA: number;
  keluargaB: number;
  dusunA: string;
  dusunB: string;
  dtksA: number;
  dtksB: number;
  dtksLegacyA: number;
  anggotaA: number;
  anggotaB: number;
  lampiranA: number;
  lampiranB: number;
  namaKepalaA: string;
  namaKepalaB: string;
  namaPenyusupB: string;
  nikPenyusupB: string;
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

function params(overrides: Partial<ListDtksParams> = {}): ListDtksParams {
  return { page: 1, perPage: 50, ...overrides };
}

/**
 * Sisipkan relasi legacy lintas desa.
 *
 * Composite FK AUD-002 menolak relasi seperti ini pada jalur normal. Data
 * legacy yang dibuat sebelum constraint terpasang tetap harus aman dibaca,
 * jadi insert dilakukan pada koneksi terpisah dan FK check selalu
 * dikembalikan di blok `finally`.
 */
async function sisipkanLegacy(sql: string, paramsLegacy: unknown[]): Promise<number> {
  const koneksi = await mysql.createConnection(validasiDatabaseUji(process.env).opsiKoneksi);
  try {
    await koneksi.query("SET FOREIGN_KEY_CHECKS = 0");
    const [hasil] = await koneksi.query<ResultSetHeader>(sql, paramsLegacy);
    return hasil.insertId;
  } finally {
    await koneksi.query("SET FOREIGN_KEY_CHECKS = 1");
    await koneksi.end();
  }
}

// Dibatasi ke desa uji: suite integration lain berjalan paralel pada database
// yang sama dan juga menulis `dtks_ref_lampiran`, sehingga hitungan global
// membuat assertion bergantung pada jadwal test file lain.
async function hitungTautan(villageId: number): Promise<number> {
  const [row] = await db
    .select({ nilai: count() })
    .from(dtksRefLampiran)
    .where(eq(dtksRefLampiran.villageId, villageId));
  return Number(row?.nilai ?? 0);
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [rowA] = await db
    .insert(villages)
    .values({ name: `Desa B2 DTKS A ${RUN}`, code: `DA${RUN}`.slice(0, 10) })
    .$returningId();
  const [rowB] = await db
    .insert(villages)
    .values({ name: `Desa B2 DTKS B ${RUN}`, code: `DB${RUN}`.slice(0, 10) })
    .$returningId();
  const desaA = pastiId(rowA, "desa A");
  const desaB = pastiId(rowB, "desa B");

  const dusunA = `Dusun A ${RUN}`;
  const dusunB = `Dusun B ${RUN}`;
  const [wilayahARow] = await db
    .insert(regions)
    .values({ villageId: desaA, dusun: dusunA })
    .$returningId();
  const [wilayahBRow] = await db
    .insert(regions)
    .values({ villageId: desaB, dusun: dusunB })
    .$returningId();
  const wilayahA = pastiId(wilayahARow, "wilayah A");
  const wilayahB = pastiId(wilayahBRow, "wilayah B");

  const [keluargaARow] = await db
    .insert(families)
    .values({ villageId: desaA, number: `KA${RUN}`, regionId: wilayahA })
    .$returningId();
  const [keluargaBRow] = await db
    .insert(families)
    .values({ villageId: desaB, number: `KB${RUN}`, regionId: wilayahB })
    .$returningId();
  const keluargaA = pastiId(keluargaARow, "keluarga A");
  const keluargaB = pastiId(keluargaBRow, "keluarga B");

  const [rtmARow] = await db
    .insert(rumahTangga)
    .values({ villageId: desaA, number: `RA${RUN}`, regionId: wilayahA })
    .$returningId();
  const [rtmBRow] = await db
    .insert(rumahTangga)
    .values({ villageId: desaB, number: `RB${RUN}`, regionId: wilayahB })
    .$returningId();
  const rtmA = pastiId(rtmARow, "RTM A");
  const rtmB = pastiId(rtmBRow, "RTM B");

  const namaKepalaA = `Kepala A ${RUN}`;
  const namaKepalaB = `Kepala B ${RUN}`;
  await db.insert(residents).values([
    {
      villageId: desaA,
      rtmId: rtmA,
      rtmLevel: 1,
      name: namaKepalaA,
      gender: "male",
      birthDate: "1980-01-01",
    },
    {
      villageId: desaB,
      rtmId: rtmB,
      rtmLevel: 1,
      name: namaKepalaB,
      gender: "male",
      birthDate: "1980-01-02",
    },
  ]);

  const [anggotaARow] = await db
    .insert(residents)
    .values({
      villageId: desaA,
      rtmId: rtmA,
      rtmLevel: 2,
      name: `Anggota A ${RUN}`,
      gender: "female",
      birthDate: "1990-01-01",
      nationalId: `3171${String(Date.now()).slice(-12)}`,
    })
    .$returningId();
  const [anggotaBRow] = await db
    .insert(residents)
    .values({
      villageId: desaB,
      rtmId: rtmB,
      rtmLevel: 2,
      name: `Anggota B ${RUN}`,
      gender: "female",
      birthDate: "1990-01-02",
      nationalId: `3172${String(Date.now()).slice(-12)}`,
    })
    .$returningId();
  const anggotaA = pastiId(anggotaARow, "anggota A");
  const anggotaB = pastiId(anggotaBRow, "anggota B");

  // Penduduk desa B yang menunjuk RTM desa A: relasi legacy lintas tenant.
  const namaPenyusupB = `Penyusup B ${RUN}`;
  const nikPenyusupB = `3179${String(Date.now()).slice(-12)}`;
  await sisipkanLegacy(
    "INSERT INTO residents (village_id, rtm_id, rtm_level, name, gender, birth_date, national_id) VALUES (?, ?, 1, ?, 'male', '1985-01-01', ?)",
    [desaB, rtmA, namaPenyusupB, nikPenyusupB],
  );

  const [dtksARow] = await db
    .insert(dtks)
    .values({ villageId: desaA, rtmId: rtmA, keluargaId: keluargaA, status: "terverifikasi" })
    .$returningId();
  const [dtksBRow] = await db
    .insert(dtks)
    .values({ villageId: desaB, rtmId: rtmB, keluargaId: keluargaB, status: "draf" })
    .$returningId();
  // Simulasikan DTKS legacy desa A yang merujuk RTM/KK desa B.
  const dtksLegacyA = await sisipkanLegacy(
    "INSERT INTO dtks (village_id, rtm_id, keluarga_id, status) VALUES (?, ?, ?, 'draf')",
    [desaA, rtmB, keluargaB],
  );
  const dtksA = pastiId(dtksARow, "DTKS A");
  const dtksB = pastiId(dtksBRow, "DTKS B");

  await db.insert(dtksAnggota).values([
    { villageId: desaA, dtksId: dtksA, pendudukId: anggotaA, statusAnggota: "aktif" },
    { villageId: desaB, dtksId: dtksB, pendudukId: anggotaB, statusAnggota: "aktif" },
  ]);
  // Baris legacy lintas desa hanya disisipkan pada koneksi fixture disposable.
  await sisipkanLegacy(
    "INSERT INTO dtks_anggota (village_id, dtks_id, penduduk_id, status_anggota) VALUES (?, ?, ?, 'aktif')",
    [desaB, dtksA, anggotaB],
  );

  const [lampiranARow] = await db
    .insert(dtksLampiran)
    .values({ villageId: desaA, nama: `Lampiran A ${RUN}`, berkas: `a-${RUN}.pdf` })
    .$returningId();
  const [lampiranBRow] = await db
    .insert(dtksLampiran)
    .values({ villageId: desaB, nama: `Lampiran B ${RUN}`, berkas: `b-${RUN}.pdf` })
    .$returningId();
  const lampiranA = pastiId(lampiranARow, "lampiran A");
  const lampiranB = pastiId(lampiranBRow, "lampiran B");

  await db
    .insert(dtksRefLampiran)
    .values({ villageId: desaA, dtksId: dtksA, lampiranId: lampiranA });
  // Junction legacy: village/DTKS A menunjuk lampiran milik desa B.
  await sisipkanLegacy(
    "INSERT INTO dtks_ref_lampiran (village_id, dtks_id, lampiran_id) VALUES (?, ?, ?)",
    [desaA, dtksA, lampiranB],
  );

  fixture = {
    desaA,
    desaB,
    rtmA,
    rtmB,
    keluargaA,
    keluargaB,
    dusunA,
    dusunB,
    dtksA,
    dtksB,
    dtksLegacyA,
    anggotaA,
    anggotaB,
    lampiranA,
    lampiranB,
    namaKepalaA,
    namaKepalaB,
    namaPenyusupB,
    nikPenyusupB,
  };
});

afterAll(async () => {
  if (fixture === null) return;
  const desaIds = [fixture.desaA, fixture.desaB];

  // Hapus anak lebih dahulu agar FK RESTRICT AUD-002 tidak memblokir cleanup.
  await db
    .delete(dtksRefLampiran)
    .where(inArray(dtksRefLampiran.lampiranId, [fixture.lampiranA, fixture.lampiranB]));
  await db.delete(dtksAnggota).where(inArray(dtksAnggota.villageId, desaIds));
  await db.delete(dtks).where(inArray(dtks.villageId, desaIds));
  await db.delete(dtksLampiran).where(inArray(dtksLampiran.villageId, desaIds));
  await db.delete(residents).where(inArray(residents.villageId, desaIds));
  await db.delete(families).where(inArray(families.villageId, desaIds));
  await db.delete(rumahTangga).where(inArray(rumahTangga.villageId, desaIds));
  await db.delete(regions).where(inArray(regions.villageId, desaIds));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("B2 DTKS daftar dan count", () => {
  it("hanya menghitung DTKS desa sendiri dan menyembunyikan identitas RTM/KK desa lain", async () => {
    const { desaA, dtksA, dtksLegacyA, dusunB } = dataUji();

    const hasil = await listDtks(desaA, params());

    expect(hasil.total).toBe(2);
    expect(hasil.rows.map((row) => row.id).sort()).toEqual([dtksA, dtksLegacyA].sort());
    expect(hasil.rows.some((row) => row.rtmNumber === `RB${RUN}`)).toBe(false);
    expect(hasil.rows.some((row) => row.keluargaNumber === `KB${RUN}`)).toBe(false);
    expect(hasil.rows.some((row) => row.dusun === dusunB)).toBe(false);
    expect(hasil.rows.every((row) => row.villageId === desaA)).toBe(true);

    const legacy = hasil.rows.find((row) => row.id === dtksLegacyA);
    expect(legacy?.rtmNumber).toBe("-");
    expect(legacy?.keluargaNumber).toBeNull();
    expect(legacy?.dusun).toBeNull();
    expect(legacy?.anggotaCount).toBe(0);
  });

  it("tidak mengembalikan DTKS desa lain saat daftar diminta dari desa B", async () => {
    const { desaB, dtksB } = dataUji();
    const hasil = await listDtks(desaB, params());

    expect(hasil.total).toBe(1);
    expect(hasil.rows).toHaveLength(1);
    expect(hasil.rows[0]?.id).toBe(dtksB);
    expect(hasil.rows[0]?.rtmNumber).toBe(`RB${RUN}`);
  });

  it("tidak membaca nama/NIK anggota desa lain pada pencarian", async () => {
    const { desaA } = dataUji();
    const hasil = await listDtks(desaA, params({ search: `Anggota B ${RUN}` }));

    expect(hasil.total).toBe(0);
    expect(hasil.rows).toHaveLength(0);
  });
});

describe("B2 DTKS anggota", () => {
  it("menyembunyikan anggota yang penduduknya milik desa lain", async () => {
    const { desaA, dtksA, anggotaA } = dataUji();

    const rows = await listDtksAnggota(desaA, dtksA);

    expect(rows.map((row) => row.pendudukId)).toEqual([anggotaA]);
    expect(rows.some((row) => row.name === `Anggota B ${RUN}`)).toBe(false);
    expect(rows.some((row) => row.nationalId?.startsWith("3172"))).toBe(false);
  });

  it("tidak membuka anggota saat DTKS yang diminta milik desa lain", async () => {
    const { desaA, dtksB } = dataUji();

    await expect(listDtksAnggota(desaA, dtksB)).resolves.toEqual([]);
  });

  it("count anggota pada daftar tidak menghitung baris anggota desa lain", async () => {
    const { desaA, desaB, dtksA } = dataUji();

    const hasilA = await listDtks(desaA, params());
    const hasilB = await listDtks(desaB, params());

    expect(hasilA.rows.find((row) => row.id === dtksA)?.anggotaCount).toBe(1);
    expect(hasilB.rows[0]?.anggotaCount).toBe(1);
  });
});

describe("B2 DTKS ekspor", () => {
  it("ekspor tidak membawa identitas RTM, KK, dusun, atau kepala desa lain", async () => {
    const { desaA, dtksA, dtksLegacyA, dusunB } = dataUji();

    const rows = await listDtksEkspor(desaA, params());
    const legacy = rows.find((row) => row.id === dtksLegacyA);
    const normal = rows.find((row) => row.id === dtksA);

    expect(rows.map((row) => row.id).sort()).toEqual([dtksA, dtksLegacyA].sort());
    expect(rows.some((row) => row.noRtm === `RB${RUN}`)).toBe(false);
    expect(rows.some((row) => row.dusun === dusunB)).toBe(false);
    expect(rows.some((row) => row.kepalaRtm === `Kepala B ${RUN}`)).toBe(false);
    expect(legacy?.dusun).toBeNull();
    expect(legacy?.namaKk).toBeNull();
    expect(normal?.jumlahAnggota).toBe(1);
  });

  it("ekspor desa B tidak memuat data desa A", async () => {
    const { desaB, dtksB } = dataUji();
    const rows = await listDtksEkspor(desaB, params());

    expect(rows.map((row) => row.id)).toEqual([dtksB]);
  });
});

describe("B2 DTKS daftar RTM dan lampiran", () => {
  it("kepala RTM desa sendiri tidak tertukar dengan penduduk desa lain", async () => {
    const { desaA, rtmA, namaKepalaA, namaPenyusupB, nikPenyusupB } = dataUji();

    const rows = await listRumahTanggaDenganKepala(desaA);
    const rtm = rows.find((row) => row.id === rtmA);

    expect(rows.every((row) => row.id !== dataUji().rtmB)).toBe(true);
    expect(rtm?.kepalaName).toBe(namaKepalaA);
    expect(rows.some((row) => row.kepalaName === namaPenyusupB)).toBe(false);
    expect(rows.some((row) => row.kepalaNik === nikPenyusupB)).toBe(false);
  });

  it("hanya menampilkan lampiran yang ditautkan dan dimiliki desa yang sama", async () => {
    const { desaA, dtksA, dtksB, lampiranA } = dataUji();

    const terpasang = await listLampiranTerpasang(desaA, dtksA);
    expect(terpasang.map((row) => row.id)).toEqual([lampiranA]);
    expect(terpasang.some((row) => row.nama === `Lampiran B ${RUN}`)).toBe(false);

    await expect(listLampiranTerpasang(desaA, dtksB)).resolves.toEqual([]);
  });

  it("menolak tautan lampiran lintas desa tanpa menulis relasi", async () => {
    const { desaA, desaB, dtksA, dtksB, lampiranA, lampiranB } = dataUji();
    const sebelum = await hitungTautan(desaA);

    await expect(tautkanLampiran(desaA, dtksA, lampiranB)).rejects.toThrow("Lampiran");
    await expect(tautkanLampiran(desaA, dtksB, lampiranA)).rejects.toThrow("DTKS");
    await expect(tautkanLampiran(desaB, dtksA, lampiranB)).rejects.toThrow("DTKS");

    expect(await hitungTautan(desaA)).toBe(sebelum);
  });

  it("menolak pelepasan lampiran lintas desa dan tidak menghapus relasi desa lain", async () => {
    const { desaA, dtksA, lampiranA, lampiranB } = dataUji();

    await expect(lepasLampiran(desaA, dtksA, lampiranB)).rejects.toThrow("Lampiran");
    expect(await hitungTautan(desaA)).toBe(2);

    await lepasLampiran(desaA, dtksA, lampiranA);
    expect(await hitungTautan(desaA)).toBe(1);
  });
});

describe("B2 DTKS operasi hapus", () => {
  it("tidak menghapus DTKS milik desa lain", async () => {
    const { desaA, dtksB } = dataUji();

    await deleteDtks(desaA, dtksB);

    const [row] = await db.select({ id: dtks.id }).from(dtks).where(eq(dtks.id, dtksB)).limit(1);
    expect(row?.id).toBe(dtksB);
  });
});
