import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { bantuanPeserta, bantuanProgram, families, kelompok, residents, rumahTangga, villages } from "@/db/schema";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../migrations", import.meta.url));
let desaA = 0;
let desaB = 0;
let programA = 0;
let residentA = 0;
let residentB = 0;

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });
  const [a] = await db.insert(villages).values({ name: "Bantuan Tenant A", code: "BTA" }).$returningId();
  const [b] = await db.insert(villages).values({ name: "Bantuan Tenant B", code: "BTB" }).$returningId();
  desaA = a.id;
  desaB = b.id;

  const [program] = await db.insert(bantuanProgram).values({
    villageId: desaA,
    name: "Program A",
    slug: "program-a",
    sasaran: 1,
  }).$returningId();
  programA = program.id;

  const [ra] = await db.insert(residents).values({
    villageId: desaA,
    name: "Penduduk A",
    gender: "male",
  }).$returningId();
  const [rb] = await db.insert(residents).values({
    villageId: desaB,
    name: "Penduduk B",
    gender: "male",
  }).$returningId();
  residentA = ra.id;
  residentB = rb.id;
});

afterAll(async () => {
  if (desaA) await db.delete(villages).where(eq(villages.id, desaA));
  if (desaB) await db.delete(villages).where(eq(villages.id, desaB));
});

describe("B2 Bantuan composite tenant FK", () => {
  it("memasang lima composite FK dengan pasangan kolom dan aksi delete yang benar", async () => {
    const result = (await db.execute(sql`
      SELECT CONSTRAINT_NAME AS nama,
             TABLE_NAME AS tabel,
             GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) AS kolom,
             GROUP_CONCAT(REFERENCED_COLUMN_NAME ORDER BY ORDINAL_POSITION) AS referensi,
             DELETE_RULE AS aturan
      FROM information_schema.KEY_COLUMN_USAGE k
      JOIN information_schema.REFERENTIAL_CONSTRAINTS r
        ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
       AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
       AND r.TABLE_NAME = k.TABLE_NAME
      WHERE k.CONSTRAINT_SCHEMA = DATABASE()
        AND k.CONSTRAINT_NAME IN (
          'bantuan_peserta_program_tenant_fk',
          'bantuan_peserta_resident_tenant_fk',
          'bantuan_peserta_family_tenant_fk',
          'bantuan_peserta_rtm_tenant_fk',
          'bantuan_peserta_kelompok_tenant_fk'
        )
      GROUP BY CONSTRAINT_NAME, TABLE_NAME, DELETE_RULE
    `)) as unknown as [Array<{nama:string;tabel:string;kolom:string;referensi:string;aturan:string}>,unknown>;
    expect(result[0]).toHaveLength(5);
    for (const row of result[0]) {
      expect(row.tabel).toBe("bantuan_peserta");
      expect(row.kolom.startsWith("village_id,")).toBe(true);
      expect(row.referensi).toBe("village_id,id");
      expect(row.aturan).toBe("CASCADE");
    }
  });

  it("menolak peserta yang menghubungkan program desa A ke penduduk desa B", async () => {
    await expect(db.insert(bantuanPeserta).values({
      villageId: desaA,
      programId: programA,
      residentId: residentB,
    })).rejects.toMatchObject({ code: "ER_NO_REFERENCED_ROW_2" });
  });

  it("menerima peserta sah dan tetap mengizinkan target nullable", async () => {
    const [inserted] = await db.insert(bantuanPeserta).values({
      villageId: desaA,
      programId: programA,
      residentId: residentA,
      familyId: null,
      rtmId: null,
      kelompokId: null,
    }).$returningId();
    expect(inserted.id).toBeGreaterThan(0);
  });
});
