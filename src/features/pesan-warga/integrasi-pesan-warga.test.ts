import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { residents, villages } from "@/db/schema";
import { wargaPesan } from "@/db/schema/warga-pesan";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

import {
  findPendudukPercakapan,
  hitungPesanBelumDibacaWarga,
  listPesanPercakapan,
  listPesanWarga,
  tandaiDibacaOperator,
  tandaiDibacaWarga,
} from "./infrastructure/pesan-warga-repository";

/**
 * Integrasi percakapan warga ↔ operator.
 *
 * Membuktikan isolasi tenant dan per-warga di lapisan data: pesan desa lain
 * tidak pernah terbaca, penduduk desa lain tidak dapat dipakai sebagai
 * percakapan, dan penanda dibaca tidak menyeberang percakapan.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);
/** NIK 16 digit unik per desa; RUN tetap dipakai untuk nama agar mudah dibersihkan. */
const NIK_A1 = `${Date.now()}`.slice(-13) + "001";
const NIK_A2 = `${Date.now()}`.slice(-13) + "002";
const NIK_B1 = `${Date.now()}`.slice(-13) + "003";

let fixture: {
  villageA: number;
  villageB: number;
  residentA1: number;
  residentA2: number;
  residentB1: number;
} | null = null;

function pastiId(row: { id: number | undefined } | undefined, label: string): number {
  if (row?.id === undefined) throw new Error(`Seed uji gagal: ${label}`);
  return row.id;
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [villageARow] = await db
    .insert(villages)
    .values({ name: `Desa Pesan A ${RUN}`, code: `PA${RUN}` })
    .$returningId();
  const [villageBRow] = await db
    .insert(villages)
    .values({ name: `Desa Pesan B ${RUN}`, code: `PB${RUN}` })
    .$returningId();
  const villageA = pastiId(villageARow, "village A");
  const villageB = pastiId(villageBRow, "village B");

  const [residentA1Row] = await db
    .insert(residents)
    .values({ villageId: villageA, name: `Warga A1 ${RUN}`, gender: "female", nationalId: NIK_A1 })
    .$returningId();
  const [residentA2Row] = await db
    .insert(residents)
    .values({ villageId: villageA, name: `Warga A2 ${RUN}`, gender: "male", nationalId: NIK_A2 })
    .$returningId();
  const [residentB1Row] = await db
    .insert(residents)
    .values({ villageId: villageB, name: `Warga B1 ${RUN}`, gender: "female", nationalId: NIK_B1 })
    .$returningId();

  const residentA1 = pastiId(residentA1Row, "resident A1");
  const residentA2 = pastiId(residentA2Row, "resident A2");
  const residentB1 = pastiId(residentB1Row, "resident B1");

  await db.insert(wargaPesan).values([
    { villageId: villageA, residentId: residentA1, pengirim: "warga", isi: `Halo operator ${RUN}` },
    {
      villageId: villageA,
      residentId: residentA1,
      pengirim: "operator",
      isi: `Balasan operator ${RUN}`,
    },
    { villageId: villageA, residentId: residentA2, pengirim: "warga", isi: `Warga lain ${RUN}` },
    { villageId: villageB, residentId: residentB1, pengirim: "warga", isi: `Desa B ${RUN}` },
  ]);

  fixture = { villageA, villageB, residentA1, residentA2, residentB1 };
});

afterAll(async () => {
  if (!fixture) return;
  await db.delete(villages).where(inArray(villages.id, [fixture.villageA, fixture.villageB]));
});

describe("percakapan warga (integrasi)", () => {
  it("hanya mengembalikan pesan milik warga itu di desanya", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    const pesanA1 = await listPesanWarga(fixture.villageA, fixture.residentA1);
    const pesanA2 = await listPesanWarga(fixture.villageA, fixture.residentA2);

    expect(pesanA1.map((item) => item.isi)).toEqual([
      `Halo operator ${RUN}`,
      `Balasan operator ${RUN}`,
    ]);
    expect(pesanA2.map((item) => item.isi)).toEqual([`Warga lain ${RUN}`]);
  });

  it("menolak penduduk desa lain sebagai percakapan", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    expect(await findPendudukPercakapan(fixture.villageA, fixture.residentB1)).toBeNull();
    expect(await findPendudukPercakapan(fixture.villageB, fixture.residentA1)).toBeNull();
    expect(await findPendudukPercakapan(fixture.villageA, fixture.residentA1)).toMatchObject({
      residentId: fixture.residentA1,
    });
  });

  it("daftar percakapan operator tidak memuat pesan desa lain", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    const { villageA, residentB1 } = fixture;
    const rows = await listPesanPercakapan(villageA);

    expect(rows.map((row) => row.residentId)).not.toContain(residentB1);
    expect(rows.some((row) => row.isi === `Desa B ${RUN}`)).toBe(false);
  });

  it("menghitung dan menandai dibaca hanya untuk sisi yang dituju", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    expect(await hitungPesanBelumDibacaWarga(fixture.villageA, fixture.residentA1)).toBe(1);

    await tandaiDibacaWarga(fixture.villageA, fixture.residentA1);
    expect(await hitungPesanBelumDibacaWarga(fixture.villageA, fixture.residentA1)).toBe(0);

    await tandaiDibacaOperator(fixture.villageA, fixture.residentA1);
    const { villageA, residentA1, residentA2 } = fixture;
    const rows = await listPesanPercakapan(villageA);
    const milikA1 = rows.filter((row) => row.residentId === residentA1);
    const milikA2 = rows.filter((row) => row.residentId === residentA2);

    expect(
      milikA1.every((row) => row.pengirim !== "warga" || row.dibacaOperatorPada !== null),
    ).toBe(true);
    expect(milikA2.every((row) => row.dibacaOperatorPada === null)).toBe(true);
  });
});
