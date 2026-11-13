import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  dokumenWarga,
  kehadiranIzin,
  kelompok,
  kelompokAnggota,
  residents,
  verifikasiKontak,
  villages,
  wargaPesan,
} from "@/db/schema";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
let desaA = 0;
let desaB = 0;
let residentA = 0;
let residentB = 0;
let kelompokA = 0;
let kelompokB = 0;

function idDari(baris: { id: number } | undefined, label: string): number {
  if (baris?.id === undefined) {
    throw new Error(`Seed uji gagal: ${label} tidak terbentuk.`);
  }
  return baris.id;
}

const RELASI = [
  "dokumen_warga_resident_tenant_fk",
  "kehadiran_izin_resident_tenant_fk",
  "kelompok_anggota_resident_tenant_fk",
  "verifikasi_kontak_resident_tenant_fk",
  "warga_pesan_resident_tenant_fk",
] as const;

/** Sisipan sah untuk setiap tabel child; dipakai ulang untuk uji cross-tenant. */
async function barisChild(
  tabel: (typeof RELASI)[number],
  villageId: number,
  residentId: number,
): Promise<void> {
  switch (tabel) {
    case "dokumen_warga_resident_tenant_fk":
      await db.insert(dokumenWarga).values({
        villageId,
        residentId,
        jenis: "ktp",
        nama: "KTP Uji",
        berkas: "uji/ktp.pdf",
        mime: "application/pdf",
        namaAsli: "ktp.pdf",
      });
      return;
    case "kehadiran_izin_resident_tenant_fk":
      await db.insert(kehadiranIzin).values({
        villageId,
        residentId,
        tanggalMulai: "2026-11-01",
        tanggalSelesai: "2026-11-02",
        alasan: "Uji composite FK",
      });
      return;
    case "kelompok_anggota_resident_tenant_fk":
      await db.insert(kelompokAnggota).values({
        villageId,
        kelompokId: villageId === desaA ? kelompokA : kelompokB,
        residentId,
        position: 1,
      });
      return;
    case "verifikasi_kontak_resident_tenant_fk":
      await db.insert(verifikasiKontak).values({
        villageId,
        residentId,
        target: "081200000000",
        kodeHash: "a".repeat(64),
        kedaluwarsa: new Date("2026-12-01T00:00:00Z"),
      });
      return;
    case "warga_pesan_resident_tenant_fk":
      await db.insert(wargaPesan).values({
        villageId,
        residentId,
        pengirim: "warga",
        isi: "Pesan uji",
      });
  }
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });
  const [a] = await db
    .insert(villages)
    .values({ name: "Resident FK A", code: "RFKA" })
    .$returningId();
  const [b] = await db
    .insert(villages)
    .values({ name: "Resident FK B", code: "RFKB" })
    .$returningId();
  desaA = idDari(a, "desa A");
  desaB = idDari(b, "desa B");

  const [ra] = await db
    .insert(residents)
    .values({ villageId: desaA, name: "Penduduk A", gender: "male" })
    .$returningId();
  const [rb] = await db
    .insert(residents)
    .values({ villageId: desaB, name: "Penduduk B", gender: "female" })
    .$returningId();
  residentA = idDari(ra, "resident A");
  residentB = idDari(rb, "resident B");

  const [ka] = await db
    .insert(kelompok)
    .values({
      villageId: desaA,
      name: "Kelompok A",
      slug: "kelompok-a-resident-fk",
      type: "kelompok",
    })
    .$returningId();
  const [kb] = await db
    .insert(kelompok)
    .values({
      villageId: desaB,
      name: "Kelompok B",
      slug: "kelompok-b-resident-fk",
      type: "kelompok",
    })
    .$returningId();
  kelompokA = idDari(ka, "kelompok A");
  kelompokB = idDari(kb, "kelompok B");
});

afterAll(async () => {
  if (desaA) await db.delete(villages).where(eq(villages.id, desaA));
  if (desaB) await db.delete(villages).where(eq(villages.id, desaB));
});

async function kodeGalat(upaya: () => Promise<unknown>): Promise<unknown> {
  let error: unknown;
  try {
    await upaya();
  } catch (caught) {
    error = caught;
  }
  let current = error;
  let kode: unknown;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const nilai = current as { code?: unknown; errno?: unknown; cause?: unknown };
    kode = nilai.code ?? nilai.errno;
    if (kode !== undefined) break;
    current = nilai.cause;
  }
  return kode;
}

describe("B2 composite FK resident_id", () => {
  it("berjalan pada MySQL 8", async () => {
    const versi = (await db.execute(sql`SELECT VERSION() AS versi`)) as unknown as [
      Array<{ versi: string }>,
      unknown,
    ];
    expect(versi[0][0]?.versi).toMatch(/^8\./);
  });

  it("memasang lima composite FK dengan aturan cascade", async () => {
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
        AND k.CONSTRAINT_NAME IN ${sql.raw(`(${RELASI.map((nama) => `'${nama}'`).join(", ")})`)}
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
      expect(row.kolom).toBe("village_id,resident_id");
      expect(row.referensi).toBe("village_id,id");
      expect(row.aturan).toBe("CASCADE");
    }

    const sisa = (await db.execute(sql`
      SELECT CONSTRAINT_NAME AS nama
      FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND CONSTRAINT_NAME IN (
          'dokumen_warga_resident_id_residents_id_fk',
          'kehadiran_izin_resident_id_residents_id_fk',
          'kelompok_anggota_resident_id_residents_id_fk',
          'verifikasi_kontak_resident_id_residents_id_fk',
          'warga_pesan_resident_id_residents_id_fk'
        )
    `)) as unknown as [Array<{ nama: string }>, unknown];
    expect(sisa[0]).toHaveLength(0);
  });

  it("menolak referensi penduduk lintas desa pada semua tabel child", async () => {
    for (const relasi of RELASI) {
      expect([1452, "ER_NO_REFERENCED_ROW_2"]).toContain(
        await kodeGalat(() => barisChild(relasi, desaA, residentB)),
      );
    }
  });

  it("menolak resident_id yang tidak ada walaupun desanya cocok", async () => {
    for (const relasi of RELASI) {
      // kelompok_anggota memakai kelompok desa B; desa A tetap tidak memiliki
      // resident 999999 sehingga FK composite harus menolak.
      expect([1452, "ER_NO_REFERENCED_ROW_2"]).toContain(
        await kodeGalat(() => barisChild(relasi, desaA, 999_999_999)),
      );
    }
  });

  it("menerima pasangan desa-penduduk yang sah", async () => {
    for (const relasi of RELASI) {
      await barisChild(relasi, desaA, residentA);
    }
  });

  it("menghapus penduduk ikut menghapus baris child (ON DELETE CASCADE)", async () => {
    await db.delete(residents).where(eq(residents.id, residentA));
    const hitungan = await Promise.all([
      db.select().from(dokumenWarga).where(eq(dokumenWarga.residentId, residentA)),
      db.select().from(kehadiranIzin).where(eq(kehadiranIzin.residentId, residentA)),
      db.select().from(kelompokAnggota).where(eq(kelompokAnggota.residentId, residentA)),
      db.select().from(verifikasiKontak).where(eq(verifikasiKontak.residentId, residentA)),
      db.select().from(wargaPesan).where(eq(wargaPesan.residentId, residentA)),
    ]);
    for (const baris of hitungan) {
      expect(baris).toHaveLength(0);
    }
  });
});
