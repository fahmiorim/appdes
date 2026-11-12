import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
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
  suplemen,
  suplemenTerdata,
  villages,
} from "@/db/schema";
import { deleteKeluarga } from "@/features/keluarga/infrastructure/keluarga-repository";
import {
  deleteDtks,
  lepasLampiran,
  listLampiranTerpasang,
  tautkanLampiran,
} from "@/features/penduduk/infrastructure/dtks-repository";
import { deletePenduduk } from "@/features/penduduk/infrastructure/penduduk-repository";
import { deleteRumahTangga } from "@/features/rumah-tangga/infrastructure/rumah-tangga-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * B2 — bukti bahwa relasi DTKS/Suplemen dilindungi database, bukan hanya filter
 * `villageId` di repository.
 *
 * Test memakai `db.insert`/`db.update` langsung: bila seseorang menghapus
 * composite foreign key dari schema, test gagal walau semua jalur aplikasi
 * masih memfilter desa.
 *
 * Database target wajib disposable: `TEST_DATABASE_URL` + `TEST_DATABASE_ACK=1`
 * divalidasi `siapkanDatabaseUji` sebelum operasi tulis pertama.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

/** Nama constraint + aturan delete yang wajib terpasang. */
const FK_DIWAJIBKAN = {
  dtks_rtm_tenant_fk: {
    tabel: "dtks",
    kolom: ["village_id", "rtm_id"],
    referensi: ["village_id", "id"],
    aturan: "RESTRICT",
  },
  dtks_keluarga_tenant_fk: {
    tabel: "dtks",
    kolom: ["village_id", "keluarga_id"],
    referensi: ["village_id", "id"],
    aturan: "RESTRICT",
  },
  dtks_anggota_dtks_tenant_fk: {
    tabel: "dtks_anggota",
    kolom: ["village_id", "dtks_id"],
    referensi: ["village_id", "id"],
    aturan: "CASCADE",
  },
  dtks_anggota_penduduk_tenant_fk: {
    tabel: "dtks_anggota",
    kolom: ["village_id", "penduduk_id"],
    referensi: ["village_id", "id"],
    aturan: "RESTRICT",
  },
  dtks_ref_lampiran_dtks_tenant_fk: {
    tabel: "dtks_ref_lampiran",
    kolom: ["village_id", "dtks_id"],
    referensi: ["village_id", "id"],
    aturan: "CASCADE",
  },
  dtks_ref_lampiran_lampiran_tenant_fk: {
    tabel: "dtks_ref_lampiran",
    kolom: ["village_id", "lampiran_id"],
    referensi: ["village_id", "id"],
    aturan: "CASCADE",
  },
  suplemen_terdata_suplemen_tenant_fk: {
    tabel: "suplemen_terdata",
    kolom: ["village_id", "id_suplemen"],
    referensi: ["village_id", "id"],
    aturan: "CASCADE",
  },
  suplemen_terdata_penduduk_tenant_fk: {
    tabel: "suplemen_terdata",
    kolom: ["village_id", "penduduk_id"],
    referensi: ["village_id", "id"],
    aturan: "RESTRICT",
  },
  suplemen_terdata_keluarga_tenant_fk: {
    tabel: "suplemen_terdata",
    kolom: ["village_id", "keluarga_id"],
    referensi: ["village_id", "id"],
    aturan: "RESTRICT",
  },
} as const;

/** Nama FK single-column baseline yang harus sudah diganti composite FK. */
const FK_LAMA = [
  "dtks_rtm_id_rtm_id_fk",
  "dtks_keluarga_id_families_id_fk",
  "dtks_anggota_dtks_id_dtks_id_fk",
  "dtks_anggota_penduduk_id_residents_id_fk",
  "dtks_ref_lampiran_dtks_id_dtks_id_fk",
  "dtks_ref_lampiran_lampiran_id_dtks_lampiran_id_fk",
  "suplemen_terdata_id_suplemen_suplemen_id_fk",
  "suplemen_terdata_penduduk_id_residents_id_fk",
  "suplemen_terdata_keluarga_id_families_id_fk",
] as const;

interface Fixture {
  desaA: number;
  desaB: number;
  familyA: number;
  familyB: number;
  rtmA: number;
  rtmA2: number;
  rtmB: number;
  rtmB2: number;
  rtmB3: number;
  rtmNullA: number;
  rtmC: number;
  residentA: number;
  residentB: number;
  residentD: number;
  dtksA: number;
  dtksB: number;
  dtksB2: number;
  dtksNullA: number;
  dtksC: number;
  anggotaA: number;
  anggotaB2: number;
  lampiranA: number;
  lampiranB: number;
  junctionA: number;
  junctionB2: number;
  suplemenA: number;
  suplemenB: number;
  suplemenD: number;
  suplemenKeluarga: number;
  terdataA: number;
  terdataB: number;
  terdataC: number;
  terdataD: number;
  familyC: number;
  residentC: number;
}

let fixture: Fixture | null = null;

function idDari(baris: { id: number } | undefined, label: string): number {
  const id = baris?.id;
  if (id === undefined) throw new Error(`Seed uji gagal: ${label} tidak terbentuk.`);
  return id;
}

/** Ambil `code`/`errno` dari error Drizzle maupun error mysql2 di `cause`. */
function kodeGalat(error: unknown): string | number | undefined {
  let current: unknown = error;
  for (let i = 0; i < 5 && current !== null && typeof current === "object"; i += 1) {
    const obj = current as { code?: unknown; errno?: unknown; cause?: unknown };
    if (typeof obj.code === "string") return obj.code;
    if (typeof obj.errno === "number") return obj.errno;
    current = obj.cause;
  }
  return undefined;
}

/** `insert`/`update` lintas tenant harus ditolak FK (1452), bukan error lain. */
function harusMenolakFk(error: unknown): void {
  expect(error, "referensi lintas tenant seharusnya ditolak database").toBeDefined();
  expect([1452, "ER_NO_REFERENCED_ROW_2"]).toContain(kodeGalat(error));
}

async function jalankanDanTangkap(aksi: () => Promise<unknown>): Promise<unknown> {
  try {
    await aksi();
    return null;
  } catch (error) {
    return error;
  }
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa B2 A ${RUN}`, code: `A${RUN}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa B2 B ${RUN}`, code: `B${RUN}` })
    .$returningId();
  const desaA = idDari(desaARow, "desa A");
  const desaB = idDari(desaBRow, "desa B");

  const [regionARow] = await db
    .insert(regions)
    .values({ villageId: desaA, dusun: `Dusun B2 A ${RUN}`, rw: "001", rt: "001" })
    .$returningId();
  const [regionBRow] = await db
    .insert(regions)
    .values({ villageId: desaB, dusun: `Dusun B2 B ${RUN}`, rw: "001", rt: "001" })
    .$returningId();
  const regionA = idDari(regionARow, "region A");
  const regionB = idDari(regionBRow, "region B");

  const [familyARow] = await db
    .insert(families)
    .values({ villageId: desaA, number: `B2KK${RUN}A`, regionId: regionA })
    .$returningId();
  const [familyBRow] = await db
    .insert(families)
    .values({ villageId: desaB, number: `B2KK${RUN}B`, regionId: regionB })
    .$returningId();
  const [familyCRow] = await db
    .insert(families)
    .values({ villageId: desaA, number: `B2KK${RUN}C`, regionId: regionA })
    .$returningId();
  const familyA = idDari(familyARow, "family A");
  const familyB = idDari(familyBRow, "family B");
  const familyC = idDari(familyCRow, "family C");

  const buatRtm = async (villageId: number, regionId: number, label: string) => {
    const [row] = await db
      .insert(rumahTangga)
      .values({ villageId, number: `B2${label}${RUN}`, regionId })
      .$returningId();
    return idDari(row, `rtm ${label}`);
  };

  const rtmA = await buatRtm(desaA, regionA, "RTMA");
  const rtmA2 = await buatRtm(desaA, regionA, "RTMA2");
  const rtmB = await buatRtm(desaB, regionB, "RTMB");
  const rtmB2 = await buatRtm(desaB, regionB, "RTMB2");
  const rtmB3 = await buatRtm(desaB, regionB, "RTMB3");
  const rtmNullA = await buatRtm(desaA, regionA, "RTMN");
  const rtmC = await buatRtm(desaA, regionA, "RTMC");

  const buatPenduduk = async (input: {
    villageId: number;
    label: string;
    gender: "male" | "female";
    familyId?: number | null;
    rtmId?: number | null;
  }) => {
    const [row] = await db
      .insert(residents)
      .values({
        villageId: input.villageId,
        name: `Penduduk B2 ${input.label} ${RUN}`,
        gender: input.gender,
        familyId: input.familyId ?? null,
        rtmId: input.rtmId ?? null,
      })
      .$returningId();
    return idDari(row, `penduduk ${input.label}`);
  };

  const residentA = await buatPenduduk({
    villageId: desaA,
    label: "A",
    gender: "male",
    familyId: familyA,
    rtmId: rtmA,
  });
  const residentB = await buatPenduduk({
    villageId: desaB,
    label: "B",
    gender: "female",
    familyId: familyB,
    rtmId: rtmB,
  });
  const residentD = await buatPenduduk({ villageId: desaA, label: "D", gender: "female" });
  const residentC = await buatPenduduk({
    villageId: desaA,
    label: "C",
    gender: "male",
    familyId: familyC,
  });

  const buatDtks = async (input: {
    villageId: number;
    rtmId: number;
    keluargaId?: number | null;
  }) => {
    const [row] = await db
      .insert(dtks)
      .values({
        villageId: input.villageId,
        rtmId: input.rtmId,
        keluargaId: input.keluargaId ?? null,
      })
      .$returningId();
    return idDari(row, `dtks ${input.villageId}`);
  };

  const dtksA = await buatDtks({ villageId: desaA, rtmId: rtmA, keluargaId: familyA });
  const dtksB = await buatDtks({ villageId: desaB, rtmId: rtmB, keluargaId: familyB });
  const dtksB2 = await buatDtks({ villageId: desaB, rtmId: rtmB2 });
  const dtksNullA = await buatDtks({ villageId: desaA, rtmId: rtmNullA, keluargaId: null });
  const dtksC = await buatDtks({ villageId: desaA, rtmId: rtmC, keluargaId: familyC });

  const [anggotaARow] = await db
    .insert(dtksAnggota)
    .values({ villageId: desaA, dtksId: dtksA, pendudukId: residentA })
    .$returningId();
  const [anggotaB2Row] = await db
    .insert(dtksAnggota)
    .values({ villageId: desaB, dtksId: dtksB2, pendudukId: residentB })
    .$returningId();

  const [lampiranARow] = await db
    .insert(dtksLampiran)
    .values({ villageId: desaA, nama: `Lampiran A ${RUN}`, berkas: `dtks/a-${RUN}.pdf` })
    .$returningId();
  const [lampiranBRow] = await db
    .insert(dtksLampiran)
    .values({ villageId: desaB, nama: `Lampiran B ${RUN}`, berkas: `dtks/b-${RUN}.pdf` })
    .$returningId();
  const lampiranA = idDari(lampiranARow, "lampiran A");
  const lampiranB = idDari(lampiranBRow, "lampiran B");

  const [junctionARow] = await db
    .insert(dtksRefLampiran)
    .values({ villageId: desaA, dtksId: dtksA, lampiranId: lampiranA })
    .$returningId();
  const [junctionB2Row] = await db
    .insert(dtksRefLampiran)
    .values({ villageId: desaB, dtksId: dtksB2, lampiranId: lampiranB })
    .$returningId();

  const buatSuplemen = async (villageId: number, label: string, sasaran: number) => {
    const [row] = await db
      .insert(suplemen)
      .values({
        villageId,
        nama: `Suplemen ${label} ${RUN}`,
        slug: `suplemen-${label.toLowerCase()}-${RUN}`,
        sasaran,
      })
      .$returningId();
    return idDari(row, `suplemen ${label}`);
  };

  const suplemenA = await buatSuplemen(desaA, "A", 1);
  const suplemenB = await buatSuplemen(desaB, "B", 1);
  const suplemenD = await buatSuplemen(desaA, "D", 1);
  const suplemenKeluarga = await buatSuplemen(desaA, "K", 2);

  const [terdataARow] = await db
    .insert(suplemenTerdata)
    .values({ villageId: desaA, suplemenId: suplemenA, pendudukId: residentA })
    .$returningId();
  const [terdataBRow] = await db
    .insert(suplemenTerdata)
    .values({ villageId: desaB, suplemenId: suplemenB, pendudukId: residentB })
    .$returningId();
  const [terdataCRow] = await db
    .insert(suplemenTerdata)
    .values({ villageId: desaA, suplemenId: suplemenKeluarga, keluargaId: familyC })
    .$returningId();
  const [terdataDRow] = await db
    .insert(suplemenTerdata)
    .values({ villageId: desaA, suplemenId: suplemenD, pendudukId: residentD })
    .$returningId();

  fixture = {
    desaA,
    desaB,
    familyA,
    familyB,
    rtmA,
    rtmA2,
    rtmB,
    rtmB2,
    rtmB3,
    rtmNullA,
    rtmC,
    residentA,
    residentB,
    residentD,
    dtksA,
    dtksB,
    dtksB2,
    dtksNullA,
    dtksC,
    anggotaA: idDari(anggotaARow, "anggota A"),
    anggotaB2: idDari(anggotaB2Row, "anggota B2"),
    lampiranA,
    lampiranB,
    junctionA: idDari(junctionARow, "junction A"),
    junctionB2: idDari(junctionB2Row, "junction B2"),
    suplemenA,
    suplemenB,
    suplemenD,
    suplemenKeluarga,
    terdataA: idDari(terdataARow, "terdata A"),
    terdataB: idDari(terdataBRow, "terdata B"),
    terdataC: idDari(terdataCRow, "terdata C"),
    terdataD: idDari(terdataDRow, "terdata D"),
    familyC,
    residentC,
  };
});

afterAll(async () => {
  if (fixture === null) return;
  const desaIds = [fixture.desaA, fixture.desaB];

  // Anak lebih dahulu; DTKS/Suplemen memakai RESTRICT pada referensi opsional.
  await db.delete(dtksAnggota).where(inArray(dtksAnggota.villageId, desaIds));
  await db.delete(dtksRefLampiran).where(inArray(dtksRefLampiran.villageId, desaIds));
  await db.delete(dtks).where(inArray(dtks.villageId, desaIds));
  await db.delete(dtksLampiran).where(inArray(dtksLampiran.villageId, desaIds));
  await db.delete(suplemenTerdata).where(inArray(suplemenTerdata.villageId, desaIds));
  await db.delete(suplemen).where(inArray(suplemen.villageId, desaIds));
  await db.delete(residents).where(inArray(residents.villageId, desaIds));
  await db.delete(families).where(inArray(families.villageId, desaIds));
  await db.delete(rumahTangga).where(inArray(rumahTangga.villageId, desaIds));
  await db.delete(regions).where(inArray(regions.villageId, desaIds));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("B2 composite tenant foreign keys DTKS dan Suplemen", () => {
  it("memasang sembilan composite FK dan mengganti seluruh FK single-column lama", async () => {
    const hasil = (await db.execute(sql`
      SELECT kcu.CONSTRAINT_NAME AS nama,
             kcu.TABLE_NAME AS tabel,
             GROUP_CONCAT(kcu.COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) AS kolom,
             GROUP_CONCAT(kcu.REFERENCED_COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) AS referensi,
             MAX(rc.DELETE_RULE) AS aturan
      FROM information_schema.KEY_COLUMN_USAGE AS kcu
      JOIN information_schema.REFERENTIAL_CONSTRAINTS AS rc
        ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
       AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
       AND rc.TABLE_NAME = kcu.TABLE_NAME
      WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
        AND kcu.CONSTRAINT_NAME IN (${sql.join(
          Object.keys(FK_DIWAJIBKAN).map((nama) => sql`${nama}`),
          sql`, `,
        )})
      GROUP BY kcu.TABLE_NAME, kcu.CONSTRAINT_NAME
      ORDER BY kcu.CONSTRAINT_NAME
    `)) as unknown as [
      Array<{ nama: string; tabel: string; kolom: string; referensi: string; aturan: string }>,
      unknown,
    ];

    expect(hasil[0].map((baris) => baris.nama).sort()).toEqual(Object.keys(FK_DIWAJIBKAN).sort());

    for (const baris of hasil[0]) {
      const diharapkan = FK_DIWAJIBKAN[baris.nama as keyof typeof FK_DIWAJIBKAN];
      expect(baris.tabel, baris.nama).toBe(diharapkan.tabel);
      expect(baris.kolom, baris.nama).toBe(diharapkan.kolom.join(","));
      expect(baris.referensi, baris.nama).toBe(diharapkan.referensi.join(","));
      expect(baris.aturan, baris.nama).toBe(diharapkan.aturan);
    }

    const lama = (await db.execute(sql`
      SELECT CONSTRAINT_NAME AS nama
      FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND CONSTRAINT_NAME IN (${sql.join(
          FK_LAMA.map((nama) => sql`${nama}`),
          sql`, `,
        )})
    `)) as unknown as [Array<{ nama: string }>, unknown];

    expect(lama[0]).toEqual([]);
  });

  it("menjadikan village_id pada dtks_ref_lampiran wajib dan konsisten dengan parent DTKS", async () => {
    const kolom = (await db.execute(sql`
      SELECT IS_NULLABLE AS nullable
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'dtks_ref_lampiran'
        AND COLUMN_NAME = 'village_id'
    `)) as unknown as [Array<{ nullable: string }>, unknown];
    expect(kolom[0]).toEqual([{ nullable: "NO" }]);

    const menyimpang = (await db.execute(sql`
      SELECT COUNT(*) AS jumlah
      FROM dtks_ref_lampiran AS r
      LEFT JOIN dtks AS d ON d.id = r.dtks_id
      WHERE d.id IS NULL OR d.village_id <> r.village_id
    `)) as unknown as [Array<{ jumlah: number | string }>, unknown];
    expect(Number(menyimpang[0][0]?.jumlah)).toBe(0);
  });

  it("menolak insert lintas tenant pada seluruh relasi DTKS dan junction lampiran", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const {
      desaA,
      desaB,
      rtmA,
      familyA,
      familyB,
      residentA,
      residentB,
      dtksA,
      dtksB,
      dtksB2,
      lampiranA,
      lampiranB,
    } = fixture;

    const kasus: Array<{ nama: string; jalankan: () => Promise<unknown> }> = [
      {
        nama: "dtks.rtm_id",
        jalankan: () =>
          db
            .insert(dtks)
            .values({ villageId: desaB, rtmId: rtmA, versiKuisioner: "regsos_ek2022_k" }),
      },
      {
        nama: "dtks.keluarga_id",
        jalankan: () =>
          db.insert(dtks).values({ villageId: desaB, rtmId: fixture!.rtmB3, keluargaId: familyA }),
      },
      {
        nama: "dtks_anggota.dtks_id",
        jalankan: () =>
          db.insert(dtksAnggota).values({ villageId: desaB, dtksId: dtksA, pendudukId: residentB }),
      },
      {
        nama: "dtks_anggota.penduduk_id",
        jalankan: () =>
          db.insert(dtksAnggota).values({ villageId: desaB, dtksId: dtksB, pendudukId: residentA }),
      },
      {
        nama: "dtks_ref_lampiran.dtks_id",
        jalankan: () =>
          db
            .insert(dtksRefLampiran)
            .values({ villageId: desaB, dtksId: dtksA, lampiranId: lampiranB }),
      },
      {
        nama: "dtks_ref_lampiran.lampiran_id",
        jalankan: () =>
          db
            .insert(dtksRefLampiran)
            .values({ villageId: desaA, dtksId: dtksB2, lampiranId: lampiranA }),
      },
      {
        nama: "suplemen_terdata.suplemen_id",
        jalankan: () =>
          db
            .insert(suplemenTerdata)
            .values({ villageId: desaB, suplemenId: fixture!.suplemenA, pendudukId: residentB }),
      },
      {
        nama: "suplemen_terdata.penduduk_id",
        jalankan: () =>
          db
            .insert(suplemenTerdata)
            .values({ villageId: desaB, suplemenId: fixture!.suplemenB, pendudukId: residentA }),
      },
      {
        nama: "suplemen_terdata.keluarga_id",
        jalankan: () =>
          db
            .insert(suplemenTerdata)
            .values({ villageId: desaB, suplemenId: fixture!.suplemenB, keluargaId: familyA }),
      },
      {
        nama: "dtks_ref_lampiran lintas desa dengan village_id child yang sama",
        jalankan: () =>
          db.insert(dtksRefLampiran).values({
            villageId: desaB,
            dtksId: dtksB2,
            lampiranId: lampiranA,
          }),
      },
      {
        nama: "dtks.keluarga_id lintas tenant dengan rtm sendiri",
        jalankan: () =>
          db.insert(dtks).values({
            villageId: desaA,
            rtmId: fixture!.rtmA2,
            keluargaId: familyB,
            versiKuisioner: "regsos_ek2022_k",
          }),
      },
    ];

    for (const { nama, jalankan } of kasus) {
      const error = await jalankanDanTangkap(jalankan);
      try {
        harusMenolakFk(error);
      } catch (gagal) {
        throw new Error(`${nama} tidak ditolak database: ${String(gagal)}`);
      }
    }

    // Tidak ada baris yang lolos dari percobaan di atas.
    const sisa = await db.select({ id: dtks.id }).from(dtks).where(eq(dtks.villageId, desaB));
    expect(sisa).toHaveLength(2);
  });

  it("menolak update yang memindahkan referensi ke tenant lain, termasuk perubahan village_id", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const {
      desaB,
      rtmB,
      familyB,
      residentB,
      dtksA,
      anggotaA,
      junctionA,
      lampiranB,
      terdataA,
      terdataC,
    } = fixture;

    const percobaan: Array<{ nama: string; jalankan: () => Promise<unknown> }> = [
      {
        nama: "dtks.rtm_id",
        jalankan: () => db.update(dtks).set({ rtmId: rtmB }).where(eq(dtks.id, dtksA)),
      },
      {
        nama: "dtks.keluarga_id",
        jalankan: () => db.update(dtks).set({ keluargaId: familyB }).where(eq(dtks.id, dtksA)),
      },
      {
        nama: "dtks.village_id",
        jalankan: () => db.update(dtks).set({ villageId: desaB }).where(eq(dtks.id, dtksA)),
      },
      {
        nama: "dtks_anggota.penduduk_id",
        jalankan: () =>
          db.update(dtksAnggota).set({ pendudukId: residentB }).where(eq(dtksAnggota.id, anggotaA)),
      },
      {
        nama: "dtks_ref_lampiran.lampiran_id",
        jalankan: () =>
          db
            .update(dtksRefLampiran)
            .set({ lampiranId: lampiranB })
            .where(eq(dtksRefLampiran.id, junctionA)),
      },
      {
        nama: "suplemen_terdata.penduduk_id",
        jalankan: () =>
          db
            .update(suplemenTerdata)
            .set({ pendudukId: residentB })
            .where(eq(suplemenTerdata.id, terdataA)),
      },
      {
        nama: "suplemen_terdata.keluarga_id",
        jalankan: () =>
          db
            .update(suplemenTerdata)
            .set({ keluargaId: familyB })
            .where(eq(suplemenTerdata.id, terdataC)),
      },
    ];

    for (const { nama, jalankan } of percobaan) {
      const error = await jalankanDanTangkap(jalankan);
      try {
        harusMenolakFk(error);
      } catch (gagal) {
        throw new Error(`${nama} tidak ditolak saat update: ${String(gagal)}`);
      }
    }

    const [tersimpan] = await db
      .select({ villageId: dtks.villageId, rtmId: dtks.rtmId, keluargaId: dtks.keluargaId })
      .from(dtks)
      .where(eq(dtks.id, dtksA))
      .limit(1);
    expect(tersimpan).toEqual({
      villageId: fixture.desaA,
      rtmId: fixture.rtmA,
      keluargaId: fixture.familyA,
    });
  });

  it("menerima referensi NULL tanpa mengubah village_id", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const { desaA, dtksNullA, terdataA } = fixture;

    const [dtksTersimpan] = await db
      .select({ villageId: dtks.villageId, keluargaId: dtks.keluargaId })
      .from(dtks)
      .where(eq(dtks.id, dtksNullA))
      .limit(1);
    expect(dtksTersimpan).toEqual({ villageId: desaA, keluargaId: null });

    await db
      .update(suplemenTerdata)
      .set({ pendudukId: null })
      .where(eq(suplemenTerdata.id, terdataA));

    const [terdataTersimpan] = await db
      .select({
        villageId: suplemenTerdata.villageId,
        pendudukId: suplemenTerdata.pendudukId,
        keluargaId: suplemenTerdata.keluargaId,
      })
      .from(suplemenTerdata)
      .where(eq(suplemenTerdata.id, terdataA))
      .limit(1);
    expect(terdataTersimpan).toEqual({ villageId: desaA, pendudukId: null, keluargaId: null });
  });

  it("men-cascade hanya anggota dan junction lampiran milik tenant yang sama", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const { desaA, dtksA, anggotaA, junctionA, anggotaB2, junctionB2 } = fixture;

    await db.delete(dtks).where(eq(dtks.id, dtksA));

    const anggotaTersisa = await db
      .select({ id: dtksAnggota.id })
      .from(dtksAnggota)
      .where(eq(dtksAnggota.villageId, desaA));
    const junctionTersisa = await db
      .select({ id: dtksRefLampiran.id })
      .from(dtksRefLampiran)
      .where(eq(dtksRefLampiran.villageId, desaA));
    expect(anggotaTersisa.map((row) => row.id)).not.toContain(anggotaA);
    expect(junctionTersisa.map((row) => row.id)).not.toContain(junctionA);

    const anakTenantLain = await db
      .select({ id: dtksAnggota.id })
      .from(dtksAnggota)
      .where(eq(dtksAnggota.id, anggotaB2));
    const junctionTenantLain = await db
      .select({ id: dtksRefLampiran.id })
      .from(dtksRefLampiran)
      .where(eq(dtksRefLampiran.id, junctionB2));
    expect(anakTenantLain).toHaveLength(1);
    expect(junctionTenantLain).toHaveLength(1);
  });

  it("men-cascade hanya terdata milik Suplemen yang sama", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const { suplemenA, terdataA, terdataB } = fixture;

    await db.delete(suplemen).where(eq(suplemen.id, suplemenA));

    const tersisa = await db
      .select({ id: suplemenTerdata.id })
      .from(suplemenTerdata)
      .where(inArray(suplemenTerdata.id, [terdataA, terdataB]));
    expect(tersisa.map((row) => row.id)).toEqual([terdataB]);
  });

  it("hanya menautkan dan melepas lampiran untuk desa pemilik DTKS", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const { desaA, desaB, dtksB2, lampiranA, lampiranB } = fixture;

    // Lampiran desa A tidak boleh ditautkan ke DTKS desa B lewat repository.
    await expect(tautkanLampiran(desaA, dtksB2, lampiranA)).rejects.toThrow(
      /DTKS atau lampiran tidak ditemukan/,
    );
    // Junction hasil seed tetap utuh; penolakan tidak menyisipkan baris baru.
    expect((await listLampiranTerpasang(desaB, dtksB2)).map((row) => row.id)).toEqual([lampiranB]);

    await tautkanLampiran(desaB, dtksB2, lampiranB);
    await tautkanLampiran(desaB, dtksB2, lampiranB); // idempoten
    expect((await listLampiranTerpasang(desaB, dtksB2)).map((row) => row.id)).toEqual([lampiranB]);

    // Desa lain tidak melihat junction tersebut dan tidak dapat melepasnya.
    expect(await listLampiranTerpasang(desaA, dtksB2)).toEqual([]);
    await lepasLampiran(desaA, dtksB2, lampiranB);
    expect(await listLampiranTerpasang(desaB, dtksB2)).toHaveLength(1);

    await lepasLampiran(desaB, dtksB2, lampiranB);
    expect(await listLampiranTerpasang(desaB, dtksB2)).toEqual([]);
  });

  it("melepas referensi DTKS dan Suplemen saat keluarga dihapus lewat repository", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const { desaA, familyC, dtksC, terdataC } = fixture;

    await deleteKeluarga(desaA, familyC);

    const [dtksTersimpan] = await db
      .select({ villageId: dtks.villageId, keluargaId: dtks.keluargaId })
      .from(dtks)
      .where(eq(dtks.id, dtksC))
      .limit(1);
    const [terdataTersimpan] = await db
      .select({ villageId: suplemenTerdata.villageId, keluargaId: suplemenTerdata.keluargaId })
      .from(suplemenTerdata)
      .where(eq(suplemenTerdata.id, terdataC))
      .limit(1);

    expect(dtksTersimpan).toEqual({ villageId: desaA, keluargaId: null });
    expect(terdataTersimpan).toEqual({ villageId: desaA, keluargaId: null });
  });

  it("melepas referensi Suplemen saat penduduk dihapus lewat repository", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const { desaA, residentD, terdataD } = fixture;

    await deletePenduduk(desaA, residentD);

    const [terdataTersimpan] = await db
      .select({ villageId: suplemenTerdata.villageId, pendudukId: suplemenTerdata.pendudukId })
      .from(suplemenTerdata)
      .where(eq(suplemenTerdata.id, terdataD))
      .limit(1);
    expect(terdataTersimpan).toEqual({ villageId: desaA, pendudukId: null });
  });

  it("tetap menolak hapus RTM selama DTKS masih merujuknya, lalu berhasil setelah DTKS dihapus", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const { desaA, rtmC, dtksC } = fixture;

    const error = await jalankanDanTangkap(() =>
      db.delete(rumahTangga).where(eq(rumahTangga.id, rtmC)),
    );
    expect(error, "RTM yang masih dirujuk DTKS seharusnya ditolak").toBeDefined();
    expect([1451, "ER_ROW_IS_REFERENCED_2"]).toContain(kodeGalat(error));

    await deleteDtks(desaA, dtksC);
    await deleteRumahTangga(desaA, rtmC);

    const sisa = await db
      .select({ id: rumahTangga.id })
      .from(rumahTangga)
      .where(eq(rumahTangga.id, rtmC));
    expect(sisa).toHaveLength(0);
  });
});
