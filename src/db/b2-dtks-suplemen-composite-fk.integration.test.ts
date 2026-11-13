import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

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
  deleteLampiranDtks,
  insertLampiranDtks,
  lepasLampiran,
  listLampiranTerpasang,
  tautkanLampiran,
} from "@/features/penduduk/infrastructure/dtks-repository";
import { deletePenduduk } from "@/features/penduduk/infrastructure/penduduk-repository";
import { deleteSuplemen } from "@/features/penduduk/infrastructure/suplemen-repository";
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
});

/**
 * Factory per kebutuhan.
 *
 * Sebelumnya satu fungsi seed membuat ± 40 baris pada tujuh tabel untuk tiap
 * test, termasuk tabel yang tidak disentuh test tersebut. Sekarang setiap test
 * hanya membuat baris yang dipakainya: dua desa dari `beforeEach`, sisanya dari
 * factory yang relevan. Tidak ada test yang mewarisi state test lain, dan biaya
 * seeding turun menjadi beberapa insert saja per test.
 */
let desaA = 0;
let desaB = 0;

async function buatDesa(label: "A" | "B"): Promise<number> {
  const [baris] = await db
    .insert(villages)
    .values({ name: `Desa B2 ${label} ${RUN}`, code: `${label}${RUN}`.slice(0, 10) })
    .$returningId();
  return idDari(baris, `desa ${label}`);
}

async function buatKeluarga(villageId: number, label: string): Promise<number> {
  const [baris] = await db
    .insert(families)
    .values({ villageId, number: `B2KK${label}${RUN}` })
    .$returningId();
  return idDari(baris, `keluarga ${label}`);
}

async function buatRtm(villageId: number, label: string): Promise<number> {
  const [baris] = await db
    .insert(rumahTangga)
    .values({ villageId, number: `B2${label}${RUN}` })
    .$returningId();
  return idDari(baris, `rtm ${label}`);
}

async function buatPenduduk(input: {
  villageId: number;
  label: string;
  gender: "male" | "female";
  familyId?: number | null;
  rtmId?: number | null;
}): Promise<number> {
  const [baris] = await db
    .insert(residents)
    .values({
      villageId: input.villageId,
      name: `Penduduk B2 ${input.label} ${RUN}`,
      gender: input.gender,
      familyId: input.familyId ?? null,
      rtmId: input.rtmId ?? null,
    })
    .$returningId();
  return idDari(baris, `penduduk ${input.label}`);
}

async function buatDtks(input: {
  villageId: number;
  rtmId: number;
  keluargaId?: number | null;
}): Promise<number> {
  const [baris] = await db
    .insert(dtks)
    .values({
      villageId: input.villageId,
      rtmId: input.rtmId,
      keluargaId: input.keluargaId ?? null,
    })
    .$returningId();
  return idDari(baris, "dtks");
}

async function buatAnggota(input: {
  villageId: number;
  dtksId: number;
  pendudukId: number;
}): Promise<number> {
  const [baris] = await db.insert(dtksAnggota).values(input).$returningId();
  return idDari(baris, "anggota dtks");
}

async function buatLampiran(villageId: number, label: string): Promise<number> {
  const [baris] = await db
    .insert(dtksLampiran)
    .values({
      villageId,
      nama: `Lampiran ${label} ${RUN}`,
      berkas: `dtks/${label.toLowerCase()}-${RUN}.pdf`,
    })
    .$returningId();
  return idDari(baris, `lampiran ${label}`);
}

async function buatJunction(input: {
  villageId: number;
  dtksId: number;
  lampiranId: number;
}): Promise<number> {
  const [baris] = await db.insert(dtksRefLampiran).values(input).$returningId();
  return idDari(baris, "junction lampiran");
}

async function buatSuplemen(villageId: number, label: string, sasaran = 1): Promise<number> {
  const [baris] = await db
    .insert(suplemen)
    .values({
      villageId,
      nama: `Suplemen ${label} ${RUN}`,
      slug: `suplemen-${label.toLowerCase()}-${RUN}`,
      sasaran,
    })
    .$returningId();
  return idDari(baris, `suplemen ${label}`);
}

async function buatTerdata(input: {
  villageId: number;
  suplemenId: number;
  pendudukId?: number | null;
  keluargaId?: number | null;
}): Promise<number> {
  const [baris] = await db
    .insert(suplemenTerdata)
    .values({
      villageId: input.villageId,
      suplemenId: input.suplemenId,
      pendudukId: input.pendudukId ?? null,
      keluargaId: input.keluargaId ?? null,
    })
    .$returningId();
  return idDari(baris, "terdata suplemen");
}

/**
 * Hapus seluruh baris pada desa test. Urutan anak→parent wajib: referensi
 * opsional DTKS/Suplemen memakai RESTRICT, jadi menghapus `residents` atau
 * `families` lebih dulu akan ditolak database.
 */
async function bersihkanFixture(desaIds: number[]): Promise<void> {
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
}

beforeEach(async () => {
  desaA = await buatDesa("A");
  desaB = await buatDesa("B");
});

afterEach(async () => {
  await bersihkanFixture([desaA, desaB]);
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
    const rtm = await buatRtm(desaA, "RTMKolom");
    const dtksId = await buatDtks({ villageId: desaA, rtmId: rtm });
    const lampiran = await buatLampiran(desaA, "Kolom");
    const junction = await buatJunction({ villageId: desaA, dtksId, lampiranId: lampiran });

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

    // Baris yang dibuat test ini harus terisi desa pemilik DTKS, bukan NULL.
    const [barisJunction] = await db
      .select({ villageId: dtksRefLampiran.villageId })
      .from(dtksRefLampiran)
      .where(eq(dtksRefLampiran.id, junction))
      .limit(1);
    expect(barisJunction).toEqual({ villageId: desaA });
  });

  it("menolak insert lintas tenant pada seluruh relasi DTKS dan junction lampiran", async () => {
    const rtmA = await buatRtm(desaA, "RTMA");
    const rtmA2 = await buatRtm(desaA, "RTMA2");
    const rtmB = await buatRtm(desaB, "RTMB");
    const rtmB2 = await buatRtm(desaB, "RTMB2");
    const rtmB3 = await buatRtm(desaB, "RTMB3");
    const familyA = await buatKeluarga(desaA, "A");
    const familyB = await buatKeluarga(desaB, "B");
    const residentA = await buatPenduduk({ villageId: desaA, label: "A", gender: "male" });
    const residentB = await buatPenduduk({ villageId: desaB, label: "B", gender: "female" });
    const dtksA = await buatDtks({ villageId: desaA, rtmId: rtmA });
    const dtksB = await buatDtks({ villageId: desaB, rtmId: rtmB });
    const dtksB2 = await buatDtks({ villageId: desaB, rtmId: rtmB2 });
    const lampiranA = await buatLampiran(desaA, "A");
    const lampiranB = await buatLampiran(desaB, "B");
    const suplemenA = await buatSuplemen(desaA, "A");
    const suplemenB = await buatSuplemen(desaB, "B");

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
          db.insert(dtks).values({ villageId: desaB, rtmId: rtmB3, keluargaId: familyA }),
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
            .values({ villageId: desaB, suplemenId: suplemenA, pendudukId: residentB }),
      },
      {
        nama: "suplemen_terdata.penduduk_id",
        jalankan: () =>
          db
            .insert(suplemenTerdata)
            .values({ villageId: desaB, suplemenId: suplemenB, pendudukId: residentA }),
      },
      {
        nama: "suplemen_terdata.keluarga_id",
        jalankan: () =>
          db
            .insert(suplemenTerdata)
            .values({ villageId: desaB, suplemenId: suplemenB, keluargaId: familyA }),
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
            rtmId: rtmA2,
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
    const rtmA = await buatRtm(desaA, "RTMA");
    const rtmB = await buatRtm(desaB, "RTMB");
    const familyA = await buatKeluarga(desaA, "A");
    const familyB = await buatKeluarga(desaB, "B");
    const familyC = await buatKeluarga(desaA, "C");
    const residentA = await buatPenduduk({ villageId: desaA, label: "A", gender: "male" });
    const residentB = await buatPenduduk({ villageId: desaB, label: "B", gender: "female" });
    const dtksA = await buatDtks({ villageId: desaA, rtmId: rtmA, keluargaId: familyA });
    const lampiranA = await buatLampiran(desaA, "A");
    const lampiranB = await buatLampiran(desaB, "B");
    const anggotaA = await buatAnggota({ villageId: desaA, dtksId: dtksA, pendudukId: residentA });
    const junctionA = await buatJunction({
      villageId: desaA,
      dtksId: dtksA,
      lampiranId: lampiranA,
    });
    const suplemenA = await buatSuplemen(desaA, "A");
    const suplemenKeluarga = await buatSuplemen(desaA, "K", 2);
    const terdataA = await buatTerdata({
      villageId: desaA,
      suplemenId: suplemenA,
      pendudukId: residentA,
    });
    const terdataC = await buatTerdata({
      villageId: desaA,
      suplemenId: suplemenKeluarga,
      keluargaId: familyC,
    });

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
      villageId: desaA,
      rtmId: rtmA,
      keluargaId: familyA,
    });
  });

  it("menerima referensi NULL tanpa mengubah village_id", async () => {
    const rtm = await buatRtm(desaA, "RTMNull");
    const dtksNullA = await buatDtks({ villageId: desaA, rtmId: rtm });
    const familyA = await buatKeluarga(desaA, "A");
    const residentA = await buatPenduduk({
      villageId: desaA,
      label: "A",
      gender: "male",
      familyId: familyA,
    });
    const suplemenA = await buatSuplemen(desaA, "A");
    const terdataA = await buatTerdata({
      villageId: desaA,
      suplemenId: suplemenA,
      pendudukId: residentA,
    });

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
    const rtmA = await buatRtm(desaA, "RTMA");
    const rtmB2 = await buatRtm(desaB, "RTMB2");
    const familyA = await buatKeluarga(desaA, "A");
    const familyB = await buatKeluarga(desaB, "B");
    const residentA = await buatPenduduk({
      villageId: desaA,
      label: "A",
      gender: "male",
      familyId: familyA,
    });
    const residentB = await buatPenduduk({
      villageId: desaB,
      label: "B",
      gender: "female",
      familyId: familyB,
    });
    const dtksA = await buatDtks({ villageId: desaA, rtmId: rtmA, keluargaId: familyA });
    const dtksB2 = await buatDtks({ villageId: desaB, rtmId: rtmB2 });
    const lampiranA = await buatLampiran(desaA, "A");
    const lampiranB = await buatLampiran(desaB, "B");
    const anggotaA = await buatAnggota({ villageId: desaA, dtksId: dtksA, pendudukId: residentA });
    const anggotaB2 = await buatAnggota({
      villageId: desaB,
      dtksId: dtksB2,
      pendudukId: residentB,
    });
    const junctionA = await buatJunction({
      villageId: desaA,
      dtksId: dtksA,
      lampiranId: lampiranA,
    });
    const junctionB2 = await buatJunction({
      villageId: desaB,
      dtksId: dtksB2,
      lampiranId: lampiranB,
    });

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
    const residentA = await buatPenduduk({ villageId: desaA, label: "A", gender: "male" });
    const residentB = await buatPenduduk({ villageId: desaB, label: "B", gender: "female" });
    const suplemenA = await buatSuplemen(desaA, "A");
    const suplemenB = await buatSuplemen(desaB, "B");
    const terdataA = await buatTerdata({
      villageId: desaA,
      suplemenId: suplemenA,
      pendudukId: residentA,
    });
    const terdataB = await buatTerdata({
      villageId: desaB,
      suplemenId: suplemenB,
      pendudukId: residentB,
    });

    await db.delete(suplemen).where(eq(suplemen.id, suplemenA));

    const tersisa = await db
      .select({ id: suplemenTerdata.id })
      .from(suplemenTerdata)
      .where(inArray(suplemenTerdata.id, [terdataA, terdataB]));
    expect(tersisa.map((row) => row.id)).toEqual([terdataB]);
  });

  it("hanya menautkan dan melepas lampiran untuk desa pemilik DTKS", async () => {
    const rtmB2 = await buatRtm(desaB, "RTMB2");
    const dtksB2 = await buatDtks({ villageId: desaB, rtmId: rtmB2 });
    const lampiranA = await buatLampiran(desaA, "A");
    const lampiranB = await buatLampiran(desaB, "B");
    await buatJunction({ villageId: desaB, dtksId: dtksB2, lampiranId: lampiranB });

    // Lampiran desa A tidak boleh ditautkan ke DTKS desa B lewat repository.
    await expect(tautkanLampiran(desaA, dtksB2, lampiranA)).rejects.toThrow(
      /Data DTKS tidak ditemukan/,
    );
    // Junction hasil seed tetap utuh; penolakan tidak menyisipkan baris baru.
    expect((await listLampiranTerpasang(desaB, dtksB2)).map((row) => row.id)).toEqual([lampiranB]);

    await tautkanLampiran(desaB, dtksB2, lampiranB);
    await tautkanLampiran(desaB, dtksB2, lampiranB); // idempoten
    expect((await listLampiranTerpasang(desaB, dtksB2)).map((row) => row.id)).toEqual([lampiranB]);

    // Desa lain tidak melihat junction tersebut dan tidak dapat melepasnya.
    expect(await listLampiranTerpasang(desaA, dtksB2)).toEqual([]);
    await expect(lepasLampiran(desaA, dtksB2, lampiranB)).rejects.toThrow(
      /Data DTKS tidak ditemukan/,
    );
    expect(await listLampiranTerpasang(desaB, dtksB2)).toHaveLength(1);

    await lepasLampiran(desaB, dtksB2, lampiranB);
    expect(await listLampiranTerpasang(desaB, dtksB2)).toEqual([]);
  });

  it("melepas referensi DTKS dan Suplemen saat keluarga dihapus lewat repository", async () => {
    const rtmC = await buatRtm(desaA, "RTMC");
    const familyC = await buatKeluarga(desaA, "C");
    // Penduduk dalam KK ini harus tetap punya family_id NULL setelah KK dihapus.
    await buatPenduduk({ villageId: desaA, label: "C", gender: "male", familyId: familyC });
    const dtksC = await buatDtks({ villageId: desaA, rtmId: rtmC, keluargaId: familyC });
    const suplemenKeluarga = await buatSuplemen(desaA, "K", 2);
    const terdataC = await buatTerdata({
      villageId: desaA,
      suplemenId: suplemenKeluarga,
      keluargaId: familyC,
    });

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
    const residentD = await buatPenduduk({ villageId: desaA, label: "D", gender: "female" });
    const suplemenD = await buatSuplemen(desaA, "D");
    const terdataD = await buatTerdata({
      villageId: desaA,
      suplemenId: suplemenD,
      pendudukId: residentD,
    });

    await deletePenduduk(desaA, residentD);

    const [terdataTersimpan] = await db
      .select({ villageId: suplemenTerdata.villageId, pendudukId: suplemenTerdata.pendudukId })
      .from(suplemenTerdata)
      .where(eq(suplemenTerdata.id, terdataD))
      .limit(1);
    expect(terdataTersimpan).toEqual({ villageId: desaA, pendudukId: null });
  });

  it("tetap menolak hapus RTM selama DTKS masih merujuknya, lalu berhasil setelah DTKS dihapus", async () => {
    const rtmC = await buatRtm(desaA, "RTMC");
    const dtksC = await buatDtks({ villageId: desaA, rtmId: rtmC });

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

  it("men-cascade junction saat lampiran DTKS dihapus lewat repository", async () => {
    const rtm = await buatRtm(desaA, "RTMNull");
    const dtksNullA = await buatDtks({ villageId: desaA, rtmId: rtm });

    const lampiranId = await insertLampiranDtks({
      villageId: desaA,
      nama: `Lampiran hapus ${RUN}`,
      berkas: `dtks/hapus-${RUN}.pdf`,
      keterangan: null,
    });
    await tautkanLampiran(desaA, dtksNullA, lampiranId);
    expect((await listLampiranTerpasang(desaA, dtksNullA)).map((row) => row.id)).toEqual([
      lampiranId,
    ]);

    await deleteLampiranDtks(desaA, lampiranId);

    // Junction ikut terhapus lewat cascade; kalau aturan cascade berubah menjadi
    // RESTRICT, delete di atas gagal dan test ini menangkapnya.
    const junction = await db
      .select({ id: dtksRefLampiran.id })
      .from(dtksRefLampiran)
      .where(eq(dtksRefLampiran.lampiranId, lampiranId));
    const sisaLampiran = await db
      .select({ id: dtksLampiran.id })
      .from(dtksLampiran)
      .where(eq(dtksLampiran.id, lampiranId));
    expect(junction).toEqual([]);
    expect(sisaLampiran).toEqual([]);
  });

  it("men-cascade terdata saat Suplemen dihapus lewat repository", async () => {
    const residentA = await buatPenduduk({ villageId: desaA, label: "A", gender: "male" });

    const [barisSuplemen] = await db
      .insert(suplemen)
      .values({
        villageId: desaA,
        nama: `Suplemen hapus ${RUN}`,
        slug: `suplemen-hapus-${RUN}`,
        sasaran: 1,
        keterangan: null,
      })
      .$returningId();
    const suplemenId = idDari(barisSuplemen, "suplemen hapus");
    const [barisTerdata] = await db
      .insert(suplemenTerdata)
      .values({ villageId: desaA, suplemenId, pendudukId: residentA })
      .$returningId();
    const terdataId = idDari(barisTerdata, "terdata suplemen hapus");

    await deleteSuplemen(desaA, suplemenId);

    const sisaSuplemen = await db
      .select({ id: suplemen.id })
      .from(suplemen)
      .where(eq(suplemen.id, suplemenId));
    const sisaTerdata = await db
      .select({ id: suplemenTerdata.id })
      .from(suplemenTerdata)
      .where(eq(suplemenTerdata.id, terdataId));
    expect(sisaSuplemen).toEqual([]);
    expect(sisaTerdata).toEqual([]);
  });
});
