import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  bantuanPeserta,
  bantuanProgram,
  families,
  kelompok,
  residents,
  rumahTangga,
  villages,
} from "@/db/schema";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
let desaA = 0;
let desaB = 0;
let programA = 0;
let programB = 0;
let residentA = 0;
let residentB = 0;
let familyB = 0;
let rtmB = 0;
let kelompokB = 0;

function idDari(baris: { id: number } | undefined, label: string): number {
  if (baris?.id === undefined) {
    throw new Error(`Seed uji gagal: ${label} tidak terbentuk.`);
  }
  return baris.id;
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });
  const [a] = await db
    .insert(villages)
    .values({ name: "Bantuan Tenant A", code: "BTA" })
    .$returningId();
  const [b] = await db
    .insert(villages)
    .values({ name: "Bantuan Tenant B", code: "BTB" })
    .$returningId();
  desaA = idDari(a, "desa A");
  desaB = idDari(b, "desa B");

  const [program] = await db
    .insert(bantuanProgram)
    .values({
      villageId: desaA,
      name: "Program A",
      slug: "program-a",
      sasaran: 1,
    })
    .$returningId();
  programA = idDari(program, "program A");
  const [programOther] = await db
    .insert(bantuanProgram)
    .values({
      villageId: desaB,
      name: "Program B",
      slug: "program-b",
      sasaran: 1,
    })
    .$returningId();
  programB = idDari(programOther, "program B");

  const [ra] = await db
    .insert(residents)
    .values({
      villageId: desaA,
      name: "Penduduk A",
      gender: "male",
    })
    .$returningId();
  const [rb] = await db
    .insert(residents)
    .values({
      villageId: desaB,
      name: "Penduduk B",
      gender: "male",
    })
    .$returningId();
  residentA = idDari(ra, "resident A");
  residentB = idDari(rb, "resident B");

  const [family] = await db
    .insert(families)
    .values({ villageId: desaB, number: "1234567890123456" })
    .$returningId();
  familyB = idDari(family, "family B");
  const [rtm] = await db
    .insert(rumahTangga)
    .values({ villageId: desaB, number: "RTM-B2-001" })
    .$returningId();
  rtmB = idDari(rtm, "rtm B");
  const [group] = await db
    .insert(kelompok)
    .values({
      villageId: desaB,
      name: "Kelompok B",
      slug: "kelompok-b",
      type: "kelompok",
    })
    .$returningId();
  kelompokB = idDari(group, "kelompok B");
});

afterAll(async () => {
  if (desaA) {
    await db.delete(villages).where(eq(villages.id, desaA));
  }
  if (desaB) {
    await db.delete(villages).where(eq(villages.id, desaB));
  }
});

describe("B2 Bantuan composite tenant FK", () => {
  it("memasang lima composite FK dengan pasangan kolom dan aksi delete yang benar", async () => {
    const result = (await db.execute(sql`
      SELECT k.CONSTRAINT_NAME AS nama,
             k.TABLE_NAME AS tabel,
             GROUP_CONCAT(k.COLUMN_NAME ORDER BY k.ORDINAL_POSITION) AS kolom,
             GROUP_CONCAT(k.REFERENCED_COLUMN_NAME ORDER BY k.ORDINAL_POSITION) AS referensi,
             r.DELETE_RULE AS aturan
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
      GROUP BY k.CONSTRAINT_NAME, k.TABLE_NAME, r.DELETE_RULE
    `)) as unknown as [
      Array<{
        nama: string;
        tabel: string;
        kolom: string;
        referensi: string;
        aturan: string;
      }>,
      unknown,
    ];
    expect(result[0]).toHaveLength(5);
    for (const row of result[0]) {
      expect(row.tabel).toBe("bantuan_peserta");
      expect(row.kolom.startsWith("village_id,")).toBe(true);
      expect(row.referensi).toBe("village_id,id");
      expect(row.aturan).toBe("CASCADE");
    }
  });

  it("menolak referensi program dan semua jenis sasaran lintas tenant", async () => {
    const attempts = [
      () => db.insert(bantuanPeserta).values({ villageId: desaA, programId: programB }),
      () =>
        db
          .insert(bantuanPeserta)
          .values({ villageId: desaA, programId: programA, residentId: residentB }),
      () =>
        db
          .insert(bantuanPeserta)
          .values({ villageId: desaA, programId: programA, familyId: familyB }),
      () =>
        db.insert(bantuanPeserta).values({ villageId: desaA, programId: programA, rtmId: rtmB }),
      () =>
        db
          .insert(bantuanPeserta)
          .values({ villageId: desaA, programId: programA, kelompokId: kelompokB }),
    ];
    for (const attempt of attempts) {
      let error: unknown;
      try {
        await attempt();
      } catch (caught) {
        error = caught;
      }
      let current = error;
      let code: unknown;
      for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
        const value = current as { code?: unknown; errno?: unknown; cause?: unknown };
        code = value.code ?? value.errno;
        if (code !== undefined) break;
        current = value.cause;
      }
      expect([1452, "ER_NO_REFERENCED_ROW_2"]).toContain(code);
    }
  });

  it("menerima peserta sah dan tetap mengizinkan target nullable", async () => {
    const [inserted] = await db
      .insert(bantuanPeserta)
      .values({
        villageId: desaA,
        programId: programA,
        residentId: residentA,
        familyId: null,
        rtmId: null,
        kelompokId: null,
      })
      .$returningId();
    expect(idDari(inserted, "peserta")).toBeGreaterThan(0);
  });
});
