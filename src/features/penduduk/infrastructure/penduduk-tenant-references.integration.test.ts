import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { and, count, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import {
  bloodTypes,
  citizenships,
  educations,
  elections,
  families,
  familyRelations,
  maritalStatuses,
  occupations,
  regions,
  religions,
  residents,
  villages,
} from "@/db/schema";
import {
  catatDatang,
  catatKelahiran,
} from "@/features/penduduk/application/riwayat-penduduk-use-cases";
import { createPenduduk, updatePenduduk } from "@/features/penduduk/application/use-cases";
import type { PendudukFilter, PendudukFormInput } from "@/features/penduduk/domain/penduduk";
import {
  listDpt,
  listDptExport,
  listDptRingkas,
} from "@/features/penduduk/infrastructure/dpt-repository";
import { listPendudukStatistik } from "@/features/penduduk/infrastructure/laporan-penduduk-repository";
import {
  getPendudukDetailById,
  getPendudukSuratData,
  listPenduduk,
} from "@/features/penduduk/infrastructure/penduduk-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * AUD-003 — foreign reference penduduk harus terikat tenant.
 *
 * Dua desa sintetis (A dan B) dipakai untuk membuktikan penolakan referensi
 * lintas desa pada create/update. Desa C menyimpan relasi legacy lintas desa
 * yang dimasukkan langsung ke database untuk membuktikan join daftar, detail,
 * surat, laporan, dan DPT tidak lagi menampilkan label milik desa lain.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

const sesi = vi.hoisted(() => ({ villageId: 0, actorId: "uji-aud003" }));

vi.mock("@/lib/dal", () => ({
  requirePermission: vi.fn(async () => ({
    id: sesi.actorId,
    villageId: sesi.villageId,
  })),
}));

vi.mock("@/features/desa/application/resolve-village", () => ({
  resolveVillageId: vi.fn(async (user: { villageId: number }) => user.villageId),
}));

// AUD-003 tidak menguji audit; hindari baris audit dengan actor fixture sintetis.
vi.mock("@/features/audit/application/audit-use-cases", () => ({
  recordAuditEvent: vi.fn(async () => undefined),
}));

interface Fixture {
  desaA: number;
  desaB: number;
  desaC: number;
  keluargaA: number;
  keluargaB: number;
  keluargaC: number;
  wilayahA: number;
  wilayahB: number;
  wilayahC: number;
  pendudukA: number;
  pendudukB: number;
  pendudukC: number;
  pendudukLegacyC: number;
}

let fixture: Fixture | null = null;

function pastiId(row: { id: number | undefined } | undefined, label: string): number {
  const id = row?.id;
  if (id === undefined) throw new Error(`Seed uji gagal: ${label}`);
  return id;
}

function inputPenduduk(overrides: Partial<PendudukFormInput> = {}): PendudukFormInput {
  return {
    nationalId: null,
    familyId: null,
    name: `Penduduk Uji ${RUN}`,
    gender: "male",
    birthPlace: "",
    birthDate: "1990-01-01",
    religionId: null,
    educationId: null,
    educationSedangId: null,
    occupationId: null,
    maritalStatusId: null,
    familyRelationId: null,
    bloodTypeId: null,
    citizenshipId: null,
    residenceStatus: "permanent",
    lifeStatus: "alive",
    regionId: null,
    address: "",
    phone: "",
    fatherName: "",
    motherName: "",
    fatherNationalId: null,
    motherNationalId: null,
    ...overrides,
  };
}

function filterKosong(): PendudukFilter {
  return {
    search: "",
    lifeStatus: null,
    gender: null,
    religionId: null,
    educationId: null,
    occupationId: null,
    maritalStatusId: null,
    dusun: "",
    rw: "",
    rt: "",
    umurMin: null,
    umurMax: null,
  };
}

function dataUji(): Fixture {
  if (fixture === null) throw new Error("Fixture integrasi tidak siap.");
  return fixture;
}

async function hitungPendudukBernama(villageId: number, name: string): Promise<number> {
  const [row] = await db
    .select({ nilai: count() })
    .from(residents)
    .where(and(eq(residents.villageId, villageId), eq(residents.name, name)));
  return Number(row?.nilai ?? 0);
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [rowA] = await db
    .insert(villages)
    .values({ name: `Desa AUD003 A ${RUN}`, code: `A3${RUN}` })
    .$returningId();
  const [rowB] = await db
    .insert(villages)
    .values({ name: `Desa AUD003 B ${RUN}`, code: `B3${RUN}` })
    .$returningId();
  const [rowC] = await db
    .insert(villages)
    .values({ name: `Desa AUD003 C ${RUN}`, code: `C3${RUN}` })
    .$returningId();
  const desaA = pastiId(rowA, "desa A");
  const desaB = pastiId(rowB, "desa B");
  const desaC = pastiId(rowC, "desa C");

  const [keluargaARow] = await db
    .insert(families)
    .values({ villageId: desaA, number: `KA${RUN}` })
    .$returningId();
  const [keluargaBRow] = await db
    .insert(families)
    .values({ villageId: desaB, number: `KB${RUN}` })
    .$returningId();
  const [keluargaCRow] = await db
    .insert(families)
    .values({ villageId: desaC, number: `KC${RUN}` })
    .$returningId();
  const keluargaA = pastiId(keluargaARow, "keluarga A");
  const keluargaB = pastiId(keluargaBRow, "keluarga B");
  const keluargaC = pastiId(keluargaCRow, "keluarga C");

  const [wilayahARow] = await db
    .insert(regions)
    .values({ villageId: desaA, dusun: `Dusun A ${RUN}` })
    .$returningId();
  const [wilayahBRow] = await db
    .insert(regions)
    .values({ villageId: desaB, dusun: `Dusun B ${RUN}` })
    .$returningId();
  const [wilayahCRow] = await db
    .insert(regions)
    .values({ villageId: desaC, dusun: `Dusun C ${RUN}` })
    .$returningId();
  const wilayahA = pastiId(wilayahARow, "wilayah A");
  const wilayahB = pastiId(wilayahBRow, "wilayah B");
  const wilayahC = pastiId(wilayahCRow, "wilayah C");

  const [pendudukARow] = await db
    .insert(residents)
    .values({
      villageId: desaA,
      name: `Target A ${RUN}`,
      gender: "male",
      birthDate: "1990-01-01",
    })
    .$returningId();
  const [pendudukBRow] = await db
    .insert(residents)
    .values({
      villageId: desaB,
      name: `Target B ${RUN}`,
      gender: "male",
      birthDate: "1990-01-01",
    })
    .$returningId();
  const [pendudukCRow] = await db
    .insert(residents)
    .values({
      villageId: desaC,
      name: `Penduduk C ${RUN}`,
      gender: "male",
      birthDate: "1990-01-01",
      familyId: keluargaC,
      regionId: wilayahC,
    })
    .$returningId();
  // Relasi legacy lintas desa: dimasukkan langsung untuk menguji join read-only.
  const [pendudukLegacyCRow] = await db
    .insert(residents)
    .values({
      villageId: desaC,
      name: `Legacy C ${RUN}`,
      gender: "female",
      birthDate: "1990-01-01",
      familyId: keluargaB,
      regionId: wilayahB,
    })
    .$returningId();

  await db.insert(elections).values({
    villageId: desaC,
    judul: `Pemilihan C ${RUN}`,
    status: "aktif",
    tanggal: "2026-01-01",
  });

  fixture = {
    desaA,
    desaB,
    desaC,
    keluargaA,
    keluargaB,
    keluargaC,
    wilayahA,
    wilayahB,
    wilayahC,
    pendudukA: pastiId(pendudukARow, "penduduk A"),
    pendudukB: pastiId(pendudukBRow, "penduduk B"),
    pendudukC: pastiId(pendudukCRow, "penduduk C"),
    pendudukLegacyC: pastiId(pendudukLegacyCRow, "penduduk legacy C"),
  };
});

afterAll(async () => {
  if (fixture === null) return;
  await db
    .delete(villages)
    .where(inArray(villages.id, [fixture.desaA, fixture.desaB, fixture.desaC]));
});

describe("AUD-003 create penduduk: foreign reference tenant", () => {
  it("menolak familyId milik desa lain tanpa menyimpan penduduk", async () => {
    const { desaA, keluargaB } = dataUji();
    sesi.villageId = desaA;
    const name = `Tolak KK Lintas ${RUN}`;

    await expect(
      createPenduduk(inputPenduduk({ name, familyId: keluargaB })),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    expect(await hitungPendudukBernama(desaA, name)).toBe(0);
  });

  it("menolak regionId milik desa lain tanpa menyimpan penduduk", async () => {
    const { desaA, wilayahB } = dataUji();
    sesi.villageId = desaA;
    const name = `Tolak Wilayah Lintas ${RUN}`;

    await expect(createPenduduk(inputPenduduk({ name, regionId: wilayahB }))).rejects.toMatchObject(
      { code: "VALIDATION" },
    );

    expect(await hitungPendudukBernama(desaA, name)).toBe(0);
  });

  it("menerima familyId dan regionId milik desa sendiri", async () => {
    const { desaA, keluargaA, wilayahA } = dataUji();
    sesi.villageId = desaA;
    const name = `Terima Referensi Sendiri ${RUN}`;

    const { id } = await createPenduduk(
      inputPenduduk({ name, familyId: keluargaA, regionId: wilayahA }),
    );

    const [row] = await db.select().from(residents).where(eq(residents.id, id));
    expect(row?.villageId).toBe(desaA);
    expect(row?.familyId).toBe(keluargaA);
    expect(row?.regionId).toBe(wilayahA);
  });
});

describe("AUD-003 jalur create kelahiran dan kedatangan", () => {
  it("menolak familyId desa lain pada catatKelahiran", async () => {
    const { desaA, keluargaB } = dataUji();
    sesi.villageId = desaA;
    const name = `Bayi Lintas KK ${RUN}`;

    await expect(
      catatKelahiran({
        eventDate: "2026-01-01",
        name,
        nationalId: null,
        familyId: keluargaB,
        regionId: null,
        address: "",
        fatherName: "",
        motherName: "",
        reason: "",
        notes: "",
        referenceNo: "",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    expect(await hitungPendudukBernama(desaA, name)).toBe(0);
  });

  it("menolak regionId desa lain pada catatDatang", async () => {
    const { desaA, wilayahB } = dataUji();
    sesi.villageId = desaA;
    const name = `Pendatang Lintas Wilayah ${RUN}`;

    await expect(
      catatDatang({
        eventDate: "2026-01-01",
        name,
        nationalId: null,
        birthDate: null,
        birthPlace: "",
        familyId: null,
        regionId: wilayahB,
        address: "",
        fromAddress: "",
        reason: "",
        notes: "",
        referenceNo: "",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    expect(await hitungPendudukBernama(desaA, name)).toBe(0);
  });
});

describe("AUD-003 update penduduk: foreign reference dan target tenant", () => {
  it("menolak familyId lintas desa dan tidak mengubah data lama", async () => {
    const { desaA, keluargaB, pendudukA } = dataUji();
    sesi.villageId = desaA;

    await expect(
      updatePenduduk(pendudukA, inputPenduduk({ name: `Target A ${RUN}`, familyId: keluargaB })),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    const [row] = await db.select().from(residents).where(eq(residents.id, pendudukA));
    expect(row?.familyId).toBeNull();
    expect(row?.name).toBe(`Target A ${RUN}`);
  });

  it("menolak regionId lintas desa dan tidak mengubah data lama", async () => {
    const { desaA, wilayahB, pendudukA } = dataUji();
    sesi.villageId = desaA;

    await expect(
      updatePenduduk(pendudukA, inputPenduduk({ name: `Target A ${RUN}`, regionId: wilayahB })),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    const [row] = await db.select().from(residents).where(eq(residents.id, pendudukA));
    expect(row?.regionId).toBeNull();
  });

  it("menolak ID penduduk milik desa lain sebelum mutasi", async () => {
    const { desaA, pendudukB } = dataUji();
    sesi.villageId = desaA;

    await expect(
      updatePenduduk(pendudukB, inputPenduduk({ name: `Diambil Alih ${RUN}` })),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const [row] = await db.select().from(residents).where(eq(residents.id, pendudukB));
    expect(row?.name).toBe(`Target B ${RUN}`);
  });

  it("menerima referensi desa sendiri dan menulis dengan predicate id + villageId", async () => {
    const { desaA, keluargaA, wilayahA, pendudukA } = dataUji();
    sesi.villageId = desaA;

    await updatePenduduk(
      pendudukA,
      inputPenduduk({
        name: `Target A Diperbarui ${RUN}`,
        familyId: keluargaA,
        regionId: wilayahA,
      }),
    );

    const [row] = await db.select().from(residents).where(eq(residents.id, pendudukA));
    expect(row?.villageId).toBe(desaA);
    expect(row?.familyId).toBe(keluargaA);
    expect(row?.regionId).toBe(wilayahA);
  });
});

describe("AUD-003 join keluarga/wilayah tidak membaca tenant lain", () => {
  it("daftar penduduk tidak menampilkan nomor KK atau label wilayah desa lain", async () => {
    const { desaC, pendudukC, pendudukLegacyC } = dataUji();
    const hasil = await listPenduduk({
      villageId: desaC,
      filter: filterKosong(),
      page: 1,
      pageSize: 20,
    });

    expect(hasil.total).toBe(2);
    const sendiri = hasil.rows.find((row) => row.id === pendudukC);
    const legacy = hasil.rows.find((row) => row.id === pendudukLegacyC);
    expect(sendiri?.familyNumber).toBe(`KC${RUN}`);
    expect(sendiri?.regionLabel).toContain(`Dusun C ${RUN}`);
    expect(legacy?.familyNumber).toBeNull();
    expect(legacy?.regionLabel).toBeNull();
  });

  it("pencarian nomor KK tidak menemukan keluarga desa lain", async () => {
    const { desaC } = dataUji();
    const hasil = await listPenduduk({
      villageId: desaC,
      filter: { ...filterKosong(), search: `KB${RUN}` },
      page: 1,
      pageSize: 20,
    });

    expect(hasil.rows).toHaveLength(0);
  });

  it("detail dan data surat tidak membawa keluarga/wilayah desa lain", async () => {
    const { desaC, pendudukLegacyC } = dataUji();

    const detail = await getPendudukDetailById(desaC, pendudukLegacyC);
    expect(detail?.resident.id).toBe(pendudukLegacyC);
    expect(detail?.family).toBeNull();
    expect(detail?.region).toBeNull();

    const surat = await getPendudukSuratData(desaC, pendudukLegacyC);
    expect(surat?.id).toBe(pendudukLegacyC);
    expect(surat?.familyNumber).toBeNull();
  });

  it("laporan kependudukan tidak memberi label wilayah desa lain", async () => {
    const { desaC } = dataUji();
    const rows = await listPendudukStatistik(desaC);

    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.wilayah === null)).toHaveLength(1);
    expect(rows.some((row) => row.wilayah?.includes(`Dusun B ${RUN}`))).toBe(false);
  });

  it("DPT daftar, ekspor, dan rekap tidak memakai wilayah desa lain", async () => {
    const { desaC } = dataUji();
    const params = { page: 1, perPage: 20 };

    const daftar = await listDpt(desaC, params);
    expect(daftar.rows).toHaveLength(2);
    expect(daftar.rows.some((row) => row.dusun === `Dusun B ${RUN}`)).toBe(false);
    expect(daftar.rows.filter((row) => row.dusun === null)).toHaveLength(1);

    const ekspor = await listDptExport(desaC, params);
    expect(ekspor.some((row) => row.dusun === `Dusun B ${RUN}`)).toBe(false);

    const ringkas = await listDptRingkas(desaC);
    expect(ringkas.some((row) => row.dusun === `Dusun B ${RUN}`)).toBe(false);
  });
});

describe("AUD-003 katalog kependudukan", () => {
  it("katalog referensi formulir bersifat global tanpa villageId", () => {
    for (const katalog of [
      religions,
      educations,
      occupations,
      maritalStatuses,
      familyRelations,
      bloodTypes,
      citizenships,
    ]) {
      expect("villageId" in katalog).toBe(false);
    }
  });
});
