import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { and, count, eq, inArray } from "drizzle-orm";
import mysql, { type ResultSetHeader } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { residents } from "@/db/schema/resident";
import { residentMutations } from "@/db/schema/resident-mutation";
import { villages } from "@/db/schema/village";
import {
  catatKelahiran,
  catatKematian,
} from "@/features/penduduk/application/riwayat-penduduk-use-cases";
import {
  getRiwayatByResident,
  listRiwayatPenduduk,
  listRiwayatPendudukExport,
  simpanPendudukBaruDanMutasi,
  ubahStatusPendudukDanMutasi,
} from "@/features/penduduk/infrastructure/riwayat-penduduk-repository";
import { validasiDatabaseUji } from "@/testing/db-test-guard";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * AUD-007 — isolasi tenant riwayat mutasi penduduk.
 *
 * Desa A dan B dipakai untuk membuktikan bahwa identitas penduduk hanya
 * dibaca dari `residents` pada desa yang sama dengan `resident_mutations`.
 * Satu baris legacy di desa A sengaja menunjuk penduduk desa B untuk menguji
 * daftar, count, pencarian, pagination, ekspor, dan riwayat per penduduk.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);
const NIK_A = `32${String(Date.now()).slice(-14)}`;
const NIK_B = `33${String(Date.now()).slice(-14)}`;

const sesi = vi.hoisted(() => ({ villageId: 0, actorId: "" }));

vi.mock("@/lib/dal", () => ({
  requirePermission: vi.fn(async () => ({
    id: sesi.actorId,
    villageId: sesi.villageId,
  })),
}));

vi.mock("@/features/desa/application/resolve-village", () => ({
  resolveVillageId: vi.fn(async (user: { villageId: number }) => user.villageId),
}));

interface Fixture {
  desaA: number;
  desaB: number;
  aktorId: string;
  pendudukA: number;
  pendudukB: number;
  mutasiValidA: number;
  mutasiLegacyA: number;
  mutasiValidB: number;
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
 * Sisipkan satu baris legacy lintas desa.
 *
 * AUD-002 memasang composite FK yang menolak relasi seperti ini pada jalur
 * normal. Fixture di bawah sengaja mereproduksi data yang dibuat **sebelum**
 * constraint terpasang, karena migration tidak melakukan backfill dan data
 * legacy tersebut tetap harus aman saat dibaca. Pengecualian FK hanya berlaku
 * pada koneksi terpisah ini dan selalu dikembalikan di blok `finally`.
 */
async function sisipkanLegacy(sql: string, params: unknown[]): Promise<number> {
  const koneksi = await mysql.createConnection(validasiDatabaseUji(process.env).opsiKoneksi);
  try {
    await koneksi.query("SET FOREIGN_KEY_CHECKS = 0");
    const [hasil] = await koneksi.query<ResultSetHeader>(sql, params);
    return hasil.insertId;
  } finally {
    await koneksi.query("SET FOREIGN_KEY_CHECKS = 1");
    await koneksi.end();
  }
}

async function hitungMutasi(referenceNo: string): Promise<number> {
  const [row] = await db
    .select({ nilai: count() })
    .from(residentMutations)
    .where(eq(residentMutations.referenceNo, referenceNo));
  return Number(row?.nilai ?? 0);
}

async function hitungPendudukBernama(villageId: number, name: string): Promise<number> {
  const [row] = await db
    .select({ nilai: count() })
    .from(residents)
    .where(and(eq(residents.villageId, villageId), eq(residents.name, name)));
  return Number(row?.nilai ?? 0);
}

async function statusPenduduk(id: number): Promise<string | null> {
  const [row] = await db
    .select({ lifeStatus: residents.lifeStatus })
    .from(residents)
    .where(eq(residents.id, id));
  return row?.lifeStatus ?? null;
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa AUD007 A ${RUN}`, code: `A7${RUN}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa AUD007 B ${RUN}`, code: `B7${RUN}` })
    .$returningId();
  const desaA = pastiId(desaARow, "desa A");
  const desaB = pastiId(desaBRow, "desa B");

  const aktorId = randomUUID();
  await db.insert(users).values({
    id: aktorId,
    name: `Aktor AUD007 ${RUN}`,
    email: `aud007-${RUN}@contoh.test`,
    villageId: desaA,
  });

  const [pendudukARow] = await db
    .insert(residents)
    .values({
      villageId: desaA,
      name: `Penduduk A ${RUN}`,
      nationalId: NIK_A,
      gender: "male",
      birthDate: "1990-01-01",
    })
    .$returningId();
  const [pendudukBRow] = await db
    .insert(residents)
    .values({
      villageId: desaB,
      name: `Penduduk B ${RUN}`,
      nationalId: NIK_B,
      gender: "female",
      birthDate: "1991-02-02",
    })
    .$returningId();
  const pendudukA = pastiId(pendudukARow, "penduduk A");
  const pendudukB = pastiId(pendudukBRow, "penduduk B");

  const [validARow] = await db
    .insert(residentMutations)
    .values({
      villageId: desaA,
      residentId: pendudukA,
      type: "birth",
      eventDate: "2026-01-01",
      referenceNo: `REF-A-${RUN}`,
    })
    .$returningId();
  // Relasi legacy lintas tenant: mutasi desa A menunjuk penduduk desa B.
  const mutasiLegacyA = await sisipkanLegacy(
    "INSERT INTO resident_mutations (village_id, resident_id, type, event_date, reference_no) VALUES (?, ?, 'move_in', '2026-01-02', ?)",
    [desaA, pendudukB, `LEGACY-A-${RUN}`],
  );
  const [validBRow] = await db
    .insert(residentMutations)
    .values({
      villageId: desaB,
      residentId: pendudukB,
      type: "birth",
      eventDate: "2026-01-03",
      referenceNo: `REF-B-${RUN}`,
    })
    .$returningId();

  sesi.villageId = desaA;
  sesi.actorId = aktorId;

  fixture = {
    desaA,
    desaB,
    aktorId,
    pendudukA,
    pendudukB,
    mutasiValidA: pastiId(validARow, "mutasi valid A"),
    mutasiLegacyA,
    mutasiValidB: pastiId(validBRow, "mutasi valid B"),
  };
});

afterAll(async () => {
  if (fixture === null) return;
  const desaIds = [fixture.desaA, fixture.desaB];

  // AUD-002 membuat FK composite bersifat RESTRICT. Hapus anak lebih dahulu
  // agar cleanup tidak bergantung pada urutan cascade antar-tenant.
  await db.delete(residentMutations).where(inArray(residentMutations.villageId, desaIds));
  await db.delete(residents).where(inArray(residents.villageId, desaIds));
  await db.delete(users).where(inArray(users.id, [fixture.aktorId]));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("AUD-007 daftar dan count riwayat", () => {
  it("menampilkan identitas penduduk desa sendiri dan menyembunyikan identitas lintas desa", async () => {
    const { desaA, mutasiValidA, mutasiLegacyA } = dataUji();

    const hasil = await listRiwayatPenduduk(desaA, { page: 1, perPage: 20 });

    expect(hasil.total).toBe(2);
    const valid = hasil.rows.find((row) => row.id === mutasiValidA);
    const legacy = hasil.rows.find((row) => row.id === mutasiLegacyA);
    expect(valid?.residentName).toBe(`Penduduk A ${RUN}`);
    expect(valid?.residentNationalId).toBe(NIK_A);
    expect(legacy?.residentName).toBeNull();
    expect(legacy?.residentNationalId).toBeNull();
    expect(hasil.rows.some((row) => row.residentName === `Penduduk B ${RUN}`)).toBe(false);
    expect(hasil.rows.some((row) => row.residentNationalId === NIK_B)).toBe(false);
  });

  it("menjaga total count dan pagination tetap konsisten", async () => {
    const { desaA, mutasiValidA, mutasiLegacyA } = dataUji();

    const halaman1 = await listRiwayatPenduduk(desaA, { page: 1, perPage: 1 });
    const halaman2 = await listRiwayatPenduduk(desaA, { page: 2, perPage: 1 });

    expect(halaman1.total).toBe(2);
    expect(halaman2.total).toBe(2);
    expect(halaman1.rows).toHaveLength(1);
    expect(halaman2.rows).toHaveLength(1);
    expect([halaman1.rows[0]?.id, halaman2.rows[0]?.id].sort()).toEqual(
      [mutasiValidA, mutasiLegacyA].sort(),
    );
    expect(
      [...halaman1.rows, ...halaman2.rows].every((row) => row.residentNationalId !== NIK_B),
    ).toBe(true);
  });

  it("pencarian nama/NIK desa lain tidak menemukan baris", async () => {
    const { desaA } = dataUji();

    const nama = await listRiwayatPenduduk(desaA, {
      page: 1,
      perPage: 20,
      q: `Penduduk B ${RUN}`,
    });
    const nik = await listRiwayatPenduduk(desaA, { page: 1, perPage: 20, q: NIK_B });

    expect(nama.total).toBe(0);
    expect(nama.rows).toHaveLength(0);
    expect(nik.total).toBe(0);
    expect(nik.rows).toHaveLength(0);
  });

  it("pencarian nomor referensi legacy tetap menampilkan baris tanpa identitas penduduk", async () => {
    const { desaA, mutasiLegacyA } = dataUji();

    const hasil = await listRiwayatPenduduk(desaA, {
      page: 1,
      perPage: 20,
      q: `LEGACY-A-${RUN}`,
    });

    expect(hasil.total).toBe(1);
    expect(hasil.rows[0]?.id).toBe(mutasiLegacyA);
    expect(hasil.rows[0]?.residentName).toBeNull();
    expect(hasil.rows[0]?.residentNationalId).toBeNull();
  });

  it("desa B tetap dapat membaca identitas penduduknya sendiri", async () => {
    const { desaB, mutasiValidB } = dataUji();

    const hasil = await listRiwayatPenduduk(desaB, { page: 1, perPage: 20 });

    expect(hasil.total).toBe(1);
    expect(hasil.rows[0]?.id).toBe(mutasiValidB);
    expect(hasil.rows[0]?.residentName).toBe(`Penduduk B ${RUN}`);
    expect(hasil.rows[0]?.residentNationalId).toBe(NIK_B);
  });
});

describe("AUD-007 ekspor dan riwayat per penduduk", () => {
  it("ekspor tidak membawa identitas penduduk desa lain", async () => {
    const { desaA, mutasiValidA, mutasiLegacyA } = dataUji();

    const rows = await listRiwayatPendudukExport(desaA, { page: 1, perPage: 20 });

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === mutasiValidA)?.residentNationalId).toBe(NIK_A);
    expect(rows.find((row) => row.id === mutasiLegacyA)?.residentName).toBeNull();
    expect(rows.find((row) => row.id === mutasiLegacyA)?.residentNationalId).toBeNull();
    expect(rows.some((row) => row.residentName === `Penduduk B ${RUN}`)).toBe(false);
    expect(rows.some((row) => row.residentNationalId === NIK_B)).toBe(false);
  });

  it("riwayat per penduduk hanya mengembalikan mutasi penduduk tenant tersebut", async () => {
    const { desaA, desaB, pendudukA, pendudukB, mutasiValidA, mutasiValidB } = dataUji();

    const riwayatA = await getRiwayatByResident(desaA, pendudukA);
    expect(riwayatA).toHaveLength(1);
    expect(riwayatA[0]?.id).toBe(mutasiValidA);
    expect(riwayatA[0]?.residentName).toBe(`Penduduk A ${RUN}`);

    // ID penduduk desa B tidak boleh membuka riwayat mutasi desa A.
    await expect(getRiwayatByResident(desaA, pendudukB)).resolves.toEqual([]);

    const riwayatB = await getRiwayatByResident(desaB, pendudukB);
    expect(riwayatB).toHaveLength(1);
    expect(riwayatB[0]?.id).toBe(mutasiValidB);
    expect(riwayatB[0]?.residentName).toBe(`Penduduk B ${RUN}`);
  });
});

describe("AUD-007 jalur tulis mutasi", () => {
  it("mencatat kelahiran dan kematian dengan villageId penduduk dan mutasi yang sama", async () => {
    const { desaA } = dataUji();
    sesi.villageId = desaA;

    const nama = `Bayi AUD007 ${RUN}`;
    const refLahir = `LAHIR-${RUN}`;
    const { id } = await catatKelahiran({
      eventDate: "2026-02-01",
      name: nama,
      nationalId: null,
      familyId: null,
      regionId: null,
      address: "",
      fatherName: "",
      motherName: "",
      reason: "",
      notes: "",
      referenceNo: refLahir,
    });

    const [penduduk] = await db.select().from(residents).where(eq(residents.id, id));
    const [mutasiLahir] = await db
      .select()
      .from(residentMutations)
      .where(eq(residentMutations.referenceNo, refLahir));
    expect(penduduk?.villageId).toBe(desaA);
    expect(mutasiLahir?.villageId).toBe(penduduk?.villageId);
    expect(mutasiLahir?.residentId).toBe(id);

    const refMati = `MATI-${RUN}`;
    await catatKematian({
      residentId: id,
      eventDate: "2026-02-02",
      reason: "",
      notes: "",
      referenceNo: refMati,
    });

    const [mutasiMati] = await db
      .select()
      .from(residentMutations)
      .where(eq(residentMutations.referenceNo, refMati));
    expect(mutasiMati?.villageId).toBe(penduduk?.villageId);
    expect(mutasiMati?.residentId).toBe(id);
    expect(await statusPenduduk(id)).toBe("deceased");
  });

  it("menolak simpan penduduk + mutasi dengan desa berbeda dan rollback", async () => {
    const { desaA, desaB } = dataUji();
    const nama = `Penduduk Mismatch ${RUN}`;
    const ref = `MISMATCH-SIMPAN-${RUN}`;

    await expect(
      simpanPendudukBaruDanMutasi(
        { villageId: desaA, name: nama, gender: "male" },
        { villageId: desaB, type: "birth", eventDate: "2026-03-01", referenceNo: ref },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    expect(await hitungPendudukBernama(desaA, nama)).toBe(0);
    expect(await hitungMutasi(ref)).toBe(0);
  });

  it("menolak mutasi ke penduduk desa lain tanpa mengubah status atau menyimpan mutasi", async () => {
    const { desaA, pendudukB } = dataUji();
    const ref = `CROSS-UBAH-${RUN}`;

    await expect(
      ubahStatusPendudukDanMutasi(desaA, pendudukB, "deceased", {
        villageId: desaA,
        type: "death",
        eventDate: "2026-03-02",
        referenceNo: ref,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(await statusPenduduk(pendudukB)).toBe("alive");
    expect(await hitungMutasi(ref)).toBe(0);
  });

  it("menolak payload mutasi dengan villageId berbeda dari tenant aktif", async () => {
    const { desaA, desaB, pendudukA } = dataUji();
    const ref = `MISMATCH-UBAH-${RUN}`;

    await expect(
      ubahStatusPendudukDanMutasi(desaA, pendudukA, "moved", {
        villageId: desaB,
        type: "move_out",
        eventDate: "2026-03-03",
        referenceNo: ref,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    expect(await statusPenduduk(pendudukA)).toBe("alive");
    expect(await hitungMutasi(ref)).toBe(0);
  });

  it("use case kematian menolak penduduk desa lain sebelum menulis mutasi", async () => {
    const { desaA, pendudukB } = dataUji();
    sesi.villageId = desaA;
    const ref = `CROSS-USE-CASE-${RUN}`;

    await expect(
      catatKematian({
        residentId: pendudukB,
        eventDate: "2026-03-04",
        reason: "",
        notes: "",
        referenceNo: ref,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(await statusPenduduk(pendudukB)).toBe("alive");
    expect(await hitungMutasi(ref)).toBe(0);
  });
});
