import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { count, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { families, residents, suplemen, suplemenTerdata, villages } from "@/db/schema";
import { SASARAN_PENDUDUK, type ListSuplemenParams } from "@/features/penduduk/domain/suplemen";
import {
  getSuplemenPublikBySlug,
  listSuplemenPublik,
} from "@/features/penduduk/infrastructure/suplemen-publik-repository";
import {
  addSuplemenTerdata,
  addSuplemenTerdataImpor,
  deleteSuplemen,
  listSuplemen,
  listSuplemenRekap,
  listSuplemenTerdata,
  removeSuplemenTerdata,
} from "@/features/penduduk/infrastructure/suplemen-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * B2 — isolasi tenant query Suplemen.
 *
 * Desa A dan B memiliki suplemen, sasaran, dan data terdata sendiri. Fixture
 * menambahkan relasi legacy: data terdata desa B yang menunjuk suplemen desa A,
 * data terdata desa A yang menunjuk penduduk/KK desa B. Jumlah, daftar, rekap,
 * detail publik, dan jalur impor tidak boleh membaca identitas atau data desa
 * lain.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  desaA: number;
  desaB: number;
  keluargaA: number;
  keluargaB: number;
  pendudukA: number;
  pendudukA2: number;
  pendudukB: number;
  suplemenA: number;
  suplemenB: number;
  terdataB: number;
  slugA: string;
  slugB: string;
  namaPendudukB: string;
  nikPendudukB: string;
  nomorKeluargaB: string;
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

function params(overrides: Partial<ListSuplemenParams> = {}): ListSuplemenParams {
  return { page: 1, perPage: 50, ...overrides };
}

async function hitungTerdata(villageId: number): Promise<number> {
  const [row] = await db
    .select({ nilai: count() })
    .from(suplemenTerdata)
    .where(eq(suplemenTerdata.villageId, villageId));
  return Number(row?.nilai ?? 0);
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [rowA] = await db
    .insert(villages)
    .values({ name: `Desa B2 Suplemen A ${RUN}`, code: `SA${RUN}`.slice(0, 10) })
    .$returningId();
  const [rowB] = await db
    .insert(villages)
    .values({ name: `Desa B2 Suplemen B ${RUN}`, code: `SB${RUN}`.slice(0, 10) })
    .$returningId();
  const desaA = pastiId(rowA, "desa A");
  const desaB = pastiId(rowB, "desa B");

  const [keluargaARow] = await db
    .insert(families)
    .values({ villageId: desaA, number: `KA${RUN}` })
    .$returningId();
  const [keluargaBRow] = await db
    .insert(families)
    .values({ villageId: desaB, number: `KB${RUN}` })
    .$returningId();
  const keluargaA = pastiId(keluargaARow, "keluarga A");
  const keluargaB = pastiId(keluargaBRow, "keluarga B");

  const namaPendudukB = `Warga B ${RUN}`;
  const nikPendudukB = `3172${String(Date.now()).slice(-12)}`;
  await db.insert(residents).values([
    {
      villageId: desaA,
      name: `Warga A ${RUN}`,
      gender: "male",
      birthDate: "1990-01-01",
      nationalId: `3171${String(Date.now()).slice(-12)}`,
    },
    {
      villageId: desaA,
      name: `Warga A2 ${RUN}`,
      gender: "female",
      birthDate: "1991-01-01",
      nationalId: `3173${String(Date.now()).slice(-12)}`,
    },
    {
      villageId: desaB,
      name: namaPendudukB,
      gender: "male",
      birthDate: "1990-01-02",
      nationalId: nikPendudukB,
    },
  ]);

  const [pendudukARow] = await db
    .select({ id: residents.id })
    .from(residents)
    .where(eq(residents.name, `Warga A ${RUN}`))
    .limit(1);
  const [pendudukA2Row] = await db
    .select({ id: residents.id })
    .from(residents)
    .where(eq(residents.name, `Warga A2 ${RUN}`))
    .limit(1);
  const [pendudukBRow] = await db
    .select({ id: residents.id })
    .from(residents)
    .where(eq(residents.name, namaPendudukB))
    .limit(1);
  const pendudukA = pastiId(pendudukARow, "penduduk A");
  const pendudukA2 = pastiId(pendudukA2Row, "penduduk A2");
  const pendudukB = pastiId(pendudukBRow, "penduduk B");

  const slugA = `b2-suplemen-a-${RUN}`;
  const slugB = `b2-suplemen-b-${RUN}`;
  const [suplemenARow] = await db
    .insert(suplemen)
    .values({
      villageId: desaA,
      nama: `Suplemen A ${RUN}`,
      slug: slugA,
      sasaran: SASARAN_PENDUDUK,
    })
    .$returningId();
  const [suplemenBRow] = await db
    .insert(suplemen)
    .values({
      villageId: desaB,
      nama: `Suplemen B ${RUN}`,
      slug: slugB,
      sasaran: SASARAN_PENDUDUK,
    })
    .$returningId();
  const suplemenA = pastiId(suplemenARow, "suplemen A");
  const suplemenB = pastiId(suplemenBRow, "suplemen B");

  const [terdataBRow] = await db
    .insert(suplemenTerdata)
    .values({
      villageId: desaB,
      suplemenId: suplemenB,
      pendudukId: pendudukB,
      dataFormIsian: { rahasiaB: "milik B" },
    })
    .$returningId();
  const terdataB = pastiId(terdataBRow, "terdata B");

  await db.insert(suplemenTerdata).values([
    {
      villageId: desaA,
      suplemenId: suplemenA,
      pendudukId: pendudukA,
      dataFormIsian: { kesehatan: "ya" },
    },
    // Data terdata desa B yang menunjuk suplemen desa A.
    {
      villageId: desaB,
      suplemenId: suplemenA,
      pendudukId: pendudukB,
      dataFormIsian: { rahasiaB: "bocor" },
    },
    // Data terdata desa A yang menunjuk penduduk desa B.
    {
      villageId: desaA,
      suplemenId: suplemenA,
      pendudukId: pendudukB,
      dataFormIsian: { catatan: "lintas" },
    },
    // Data terdata desa A yang menunjuk keluarga desa B.
    {
      villageId: desaA,
      suplemenId: suplemenA,
      keluargaId: keluargaB,
      dataFormIsian: { kk: "lintas" },
    },
  ]);

  fixture = {
    desaA,
    desaB,
    keluargaA,
    keluargaB,
    pendudukA,
    pendudukA2,
    pendudukB,
    suplemenA,
    suplemenB,
    terdataB,
    slugA,
    slugB,
    namaPendudukB,
    nikPendudukB,
    nomorKeluargaB: `KB${RUN}`,
  };
});

afterAll(async () => {
  if (fixture === null) return;
  const desaIds = [fixture.desaA, fixture.desaB];

  await db.delete(suplemenTerdata).where(inArray(suplemenTerdata.villageId, desaIds));
  await db.delete(suplemen).where(inArray(suplemen.villageId, desaIds));
  await db.delete(residents).where(inArray(residents.villageId, desaIds));
  await db.delete(families).where(inArray(families.villageId, desaIds));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("B2 Suplemen daftar dan jumlah", () => {
  it("hanya menghitung terdata milik desa sendiri pada daftar suplemen", async () => {
    const { desaA, desaB, suplemenA, suplemenB } = dataUji();

    const hasilA = await listSuplemen(desaA, params());
    const hasilB = await listSuplemen(desaB, params());

    expect(hasilA.total).toBe(1);
    expect(hasilA.rows[0]?.id).toBe(suplemenA);
    expect(hasilA.rows[0]?.terdataCount).toBe(3);

    expect(hasilB.total).toBe(1);
    expect(hasilB.rows[0]?.id).toBe(suplemenB);
    expect(hasilB.rows[0]?.terdataCount).toBe(1);
  });

  it("tidak menampilkan identitas penduduk/KK desa lain pada daftar terdata", async () => {
    const { desaA, suplemenA, suplemenB, namaPendudukB, nikPendudukB, nomorKeluargaB } = dataUji();

    const rows = await listSuplemenTerdata(desaA, suplemenA);

    expect(rows).toHaveLength(3);
    expect(rows.some((row) => row.label.includes(namaPendudukB))).toBe(false);
    expect(rows.some((row) => row.label.includes(nikPendudukB))).toBe(false);
    expect(rows.some((row) => row.label.includes(nomorKeluargaB))).toBe(false);
    expect(rows.every((row) => !row.label.includes("bocor"))).toBe(true);

    const referensiPendudukLintasDesa = rows.find((row) => row.pendudukId === null && row.label === "Penduduk tidak tersedia");
    const referensiKeluargaLintasDesa = rows.find((row) => row.keluargaId === null && row.label === "KK tidak tersedia");
    expect(referensiPendudukLintasDesa).toBeDefined();
    expect(referensiPendudukLintasDesa?.pendudukId).toBeNull();
    expect(referensiKeluargaLintasDesa).toBeDefined();
    expect(referensiKeluargaLintasDesa?.keluargaId).toBeNull();

    await expect(listSuplemenTerdata(desaA, suplemenB)).resolves.toEqual([]);
  });

  it("rekap tidak menghitung terdata dengan parent suplemen desa lain", async () => {
    const { desaA, suplemenA, suplemenB } = dataUji();

    const rows = await listSuplemenRekap(desaA);

    expect(rows.map((row) => row.id)).toEqual([suplemenA]);
    expect(rows[0]?.jumlahTerdata).toBe(3);
    expect(rows.some((row) => row.id === suplemenB)).toBe(false);
  });
});

describe("B2 Suplemen publik", () => {
  it("daftar publik hanya memuat suplemen dan jumlah desa sendiri", async () => {
    const { desaA, desaB, suplemenA, suplemenB } = dataUji();

    const publikA = await listSuplemenPublik(desaA);
    const publikB = await listSuplemenPublik(desaB);

    expect(publikA.map((row) => row.id)).toEqual([suplemenA]);
    expect(publikA[0]?.jumlahTerdata).toBe(3);
    expect(publikB.map((row) => row.id)).toEqual([suplemenB]);
    expect(publikB[0]?.jumlahTerdata).toBe(1);
  });

  it("detail publik tidak membaca nilai isian terdata desa lain", async () => {
    const { desaA, desaB, slugA, slugB } = dataUji();

    const detail = await getSuplemenPublikBySlug(desaA, slugA);

    expect(detail?.jumlahTerdata).toBe(3);
    expect(detail?.kolomIsian).toEqual(["catatan", "kesehatan", "kk"]);
    expect(detail?.kolomIsian).not.toContain("rahasiaB");

    await expect(getSuplemenPublikBySlug(desaA, slugB)).resolves.toBeNull();
    await expect(getSuplemenPublikBySlug(desaB, slugA)).resolves.toBeNull();
  });
});

describe("B2 Suplemen jalur tulis dan impor", () => {
  it("menolak impor dengan parent suplemen atau sasaran desa lain", async () => {
    const { desaA, suplemenA, suplemenB, pendudukA, pendudukB, keluargaB } = dataUji();
    const sebelum = await hitungTerdata(desaA);

    await expect(
      addSuplemenTerdataImpor(desaA, suplemenB, { pendudukId: pendudukA, keluargaId: null }, {}),
    ).rejects.toThrow("Suplemen");

    await expect(
      addSuplemenTerdataImpor(desaA, suplemenA, { pendudukId: pendudukB, keluargaId: null }, {}),
    ).rejects.toThrow("Penduduk");

    await expect(
      addSuplemenTerdataImpor(desaA, suplemenA, { pendudukId: null, keluargaId: keluargaB }, {}),
    ).rejects.toThrow("Keluarga");

    await expect(
      addSuplemenTerdataImpor(desaA, suplemenA, { pendudukId: null, keluargaId: null }, {}),
    ).rejects.toThrow("Sasaran");

    expect(await hitungTerdata(desaA)).toBe(sebelum);
  });

  it("menolak tambah terdata yang menunjuk suplemen desa lain", async () => {
    const { desaA, suplemenB, pendudukA } = dataUji();

    await expect(
      addSuplemenTerdata(desaA, {
        suplemenId: suplemenB,
        pendudukId: pendudukA,
        keluargaId: null,
        isian: {},
      }),
    ).rejects.toThrow("Suplemen");
  });

  it("impor sasaran desa sendiri berhasil dan idempoten", async () => {
    const { desaA, suplemenA, pendudukA2 } = dataUji();
    const sebelum = await hitungTerdata(desaA);

    await expect(
      addSuplemenTerdataImpor(
        desaA,
        suplemenA,
        { pendudukId: pendudukA2, keluargaId: null },
        { kesehatan: "tidak" },
      ),
    ).resolves.toBe(true);
    await expect(
      addSuplemenTerdataImpor(
        desaA,
        suplemenA,
        { pendudukId: pendudukA2, keluargaId: null },
        { kesehatan: "tidak" },
      ),
    ).resolves.toBe(false);

    expect(await hitungTerdata(desaA)).toBe(sebelum + 1);
  });

  it("tidak dapat menghapus terdata atau suplemen milik desa lain", async () => {
    const { desaA, desaB, suplemenB, terdataB } = dataUji();

    await removeSuplemenTerdata(desaA, terdataB);
    await deleteSuplemen(desaA, suplemenB);

    const [terdata] = await db
      .select({ id: suplemenTerdata.id })
      .from(suplemenTerdata)
      .where(eq(suplemenTerdata.id, terdataB))
      .limit(1);
    const [parent] = await db
      .select({ id: suplemen.id })
      .from(suplemen)
      .where(eq(suplemen.id, suplemenB))
      .limit(1);
    const [villageB] = await db
      .select({ id: villages.id })
      .from(villages)
      .where(eq(villages.id, desaB))
      .limit(1);

    expect(terdata?.id).toBe(terdataB);
    expect(parent?.id).toBe(suplemenB);
    expect(villageB?.id).toBe(desaB);
  });
});
