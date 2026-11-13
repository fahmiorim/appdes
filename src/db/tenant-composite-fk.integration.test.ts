import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
import mysql, { type ResultSetHeader } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  bulananAnak,
  families,
  ibuHamil,
  kia,
  letters,
  letterTypes,
  permohonanSurat,
  posyandu,
  regions,
  residentMutations,
  residents,
  rumahTangga,
  villages,
} from "@/db/schema";
import { deleteKeluarga } from "@/features/keluarga/infrastructure/keluarga-repository";
import { deletePenduduk } from "@/features/penduduk/infrastructure/penduduk-repository";
import { deleteRumahTangga } from "@/features/rumah-tangga/infrastructure/rumah-tangga-repository";
import { deleteSurat } from "@/features/surat/infrastructure/surat-repository";
import { deleteWilayah } from "@/features/wilayah/infrastructure/wilayah-repository";
import { validasiDatabaseUji } from "@/testing/db-test-guard";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * AUD-002 — bukti bahwa integritas tenant ditegakkan oleh database, bukan hanya
 * oleh use case/repository.
 *
 * Test ini sengaja memakai `db.insert`/`db.update` langsung. Bila seseorang
 * menghapus composite foreign key dari schema, test akan gagal meskipun seluruh
 * jalur aplikasi masih memfilter `villageId`.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const PREFLIGHT_SQL = fileURLToPath(
  new URL("../../docs/reports/01-security/AUD-002-preflight.sql", import.meta.url),
);
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  desaA: number;
  desaB: number;
  regionA: number;
  regionB: number;
  familyA: number;
  familyB: number;
  rtmA: number;
  rtmB: number;
  residentA: number;
  residentB: number;
  letterTypeA: number;
  letterTypeB: number;
  letterA: number;
  letterB: number;
  permohonanA: number;
  posyanduA: number;
  posyanduB: number;
  kiaA: number;
  kiaB: number;
  ibuHamilA: number;
  bulananA: number;
  mutationA: number;
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

function harusMenolakFk(error: unknown, jenis: "insert" | "delete"): void {
  const kode = kodeGalat(error);
  if (jenis === "insert") {
    expect(error, "insert lintas tenant seharusnya ditolak database").toBeDefined();
    expect([1452, "ER_NO_REFERENCED_ROW_2"]).toContain(kode);
  } else {
    expect(error, "delete parent yang masih direferensikan seharusnya ditolak").toBeDefined();
    expect([1451, "ER_ROW_IS_REFERENCED_2"]).toContain(kode);
  }
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa FK A ${RUN}`, code: `A${RUN}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa FK B ${RUN}`, code: `B${RUN}` })
    .$returningId();
  const desaA = idDari(desaARow, "desa A");
  const desaB = idDari(desaBRow, "desa B");

  const [regionARow] = await db
    .insert(regions)
    .values({ villageId: desaA, dusun: `Dusun A ${RUN}`, rw: "001", rt: "001" })
    .$returningId();
  const [regionBRow] = await db
    .insert(regions)
    .values({ villageId: desaB, dusun: `Dusun B ${RUN}`, rw: "001", rt: "001" })
    .$returningId();
  const regionA = idDari(regionARow, "region A");
  const regionB = idDari(regionBRow, "region B");

  const [familyARow] = await db
    .insert(families)
    .values({ villageId: desaA, number: `KK${RUN}A`, regionId: regionA })
    .$returningId();
  const [familyBRow] = await db
    .insert(families)
    .values({ villageId: desaB, number: `KK${RUN}B`, regionId: regionB })
    .$returningId();
  const familyA = idDari(familyARow, "family A");
  const familyB = idDari(familyBRow, "family B");

  const [rtmARow] = await db
    .insert(rumahTangga)
    .values({ villageId: desaA, number: `RTM${RUN}A`, regionId: regionA })
    .$returningId();
  const [rtmBRow] = await db
    .insert(rumahTangga)
    .values({ villageId: desaB, number: `RTM${RUN}B`, regionId: regionB })
    .$returningId();
  const rtmA = idDari(rtmARow, "rtm A");
  const rtmB = idDari(rtmBRow, "rtm B");

  const [residentARow] = await db
    .insert(residents)
    .values({
      villageId: desaA,
      name: `Penduduk A ${RUN}`,
      gender: "male",
      familyId: familyA,
      rtmId: rtmA,
      rtmLevel: 1,
      regionId: regionA,
    })
    .$returningId();
  const [residentBRow] = await db
    .insert(residents)
    .values({
      villageId: desaB,
      name: `Penduduk B ${RUN}`,
      gender: "female",
      familyId: familyB,
      rtmId: rtmB,
      rtmLevel: 1,
      regionId: regionB,
    })
    .$returningId();
  const residentA = idDari(residentARow, "resident A");
  const residentB = idDari(residentBRow, "resident B");

  const [letterTypeARow] = await db
    .insert(letterTypes)
    .values({
      villageId: desaA,
      code: `LT${RUN}A`,
      name: `Jenis Surat A ${RUN}`,
      templateBody: "Isi surat A",
    })
    .$returningId();
  const [letterTypeBRow] = await db
    .insert(letterTypes)
    .values({
      villageId: desaB,
      code: `LT${RUN}B`,
      name: `Jenis Surat B ${RUN}`,
      templateBody: "Isi surat B",
    })
    .$returningId();
  const letterTypeA = idDari(letterTypeARow, "letter type A");
  const letterTypeB = idDari(letterTypeBRow, "letter type B");

  const [letterARow] = await db
    .insert(letters)
    .values({
      villageId: desaA,
      typeId: letterTypeA,
      residentId: residentA,
      typeName: `Jenis Surat A ${RUN}`,
      letterDate: "2026-01-01",
      year: 2026,
    })
    .$returningId();
  const [letterBRow] = await db
    .insert(letters)
    .values({
      villageId: desaB,
      typeId: letterTypeB,
      residentId: residentB,
      typeName: `Jenis Surat B ${RUN}`,
      letterDate: "2026-01-01",
      year: 2026,
    })
    .$returningId();
  const letterA = idDari(letterARow, "letter A");
  const letterB = idDari(letterBRow, "letter B");

  const [permohonanARow] = await db
    .insert(permohonanSurat)
    .values({
      villageId: desaA,
      residentId: residentA,
      letterTypeId: letterTypeA,
      letterId: letterA,
    })
    .$returningId();
  const permohonanA = idDari(permohonanARow, "permohonan A");

  const [posyanduARow] = await db
    .insert(posyandu)
    .values({ villageId: desaA, nama: `Posyandu A ${RUN}` })
    .$returningId();
  const [posyanduBRow] = await db
    .insert(posyandu)
    .values({ villageId: desaB, nama: `Posyandu B ${RUN}` })
    .$returningId();
  const posyanduA = idDari(posyanduARow, "posyandu A");
  const posyanduB = idDari(posyanduBRow, "posyandu B");

  const [kiaARow] = await db
    .insert(kia)
    .values({
      villageId: desaA,
      noKia: `KIA${RUN}A`,
      ibuId: residentA,
      anakId: residentA,
    })
    .$returningId();
  const [kiaBRow] = await db
    .insert(kia)
    .values({
      villageId: desaB,
      noKia: `KIA${RUN}B`,
      ibuId: residentB,
      anakId: residentB,
    })
    .$returningId();
  const kiaA = idDari(kiaARow, "kia A");
  const kiaB = idDari(kiaBRow, "kia B");

  const [ibuHamilARow] = await db
    .insert(ibuHamil)
    .values({ villageId: desaA, posyanduId: posyanduA, kiaId: kiaA })
    .$returningId();
  const ibuHamilA = idDari(ibuHamilARow, "ibu hamil A");

  const [bulananARow] = await db
    .insert(bulananAnak)
    .values({
      villageId: desaA,
      posyanduId: posyanduA,
      kiaId: kiaA,
      statusGizi: 1,
      umurBulan: 1,
      statusTikar: 1,
    })
    .$returningId();
  const bulananA = idDari(bulananARow, "bulanan anak A");

  const [mutationARow] = await db
    .insert(residentMutations)
    .values({
      villageId: desaA,
      residentId: residentA,
      type: "move_in",
      eventDate: "2026-01-01",
      fromRegionId: regionA,
      toRegionId: regionA,
    })
    .$returningId();
  const mutationA = idDari(mutationARow, "resident mutation A");

  fixture = {
    desaA,
    desaB,
    regionA,
    regionB,
    familyA,
    familyB,
    rtmA,
    rtmB,
    residentA,
    residentB,
    letterTypeA,
    letterTypeB,
    letterA,
    letterB,
    permohonanA,
    posyanduA,
    posyanduB,
    kiaA,
    kiaB,
    ibuHamilA,
    bulananA,
    mutationA,
  };
});

afterAll(async () => {
  if (fixture === null) return;
  const desaIds = [fixture.desaA, fixture.desaB];

  // Hapus anak sebelum parent: composite FK sengaja RESTRICT, sehingga urutan
  // cleanup berbeda dari cascade baseline.
  await db.delete(bulananAnak).where(inArray(bulananAnak.villageId, desaIds));
  await db.delete(ibuHamil).where(inArray(ibuHamil.villageId, desaIds));
  await db.delete(kia).where(inArray(kia.villageId, desaIds));
  await db.delete(posyandu).where(inArray(posyandu.villageId, desaIds));
  await db.delete(permohonanSurat).where(inArray(permohonanSurat.villageId, desaIds));
  await db.delete(letters).where(inArray(letters.villageId, desaIds));
  await db.delete(letterTypes).where(inArray(letterTypes.villageId, desaIds));
  await db.delete(residentMutations).where(inArray(residentMutations.villageId, desaIds));
  await db.delete(residents).where(inArray(residents.villageId, desaIds));
  await db.delete(families).where(inArray(families.villageId, desaIds));
  await db.delete(rumahTangga).where(inArray(rumahTangga.villageId, desaIds));
  await db.delete(regions).where(inArray(regions.villageId, desaIds));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("AUD-002 composite tenant foreign keys", () => {
  it("memasang seluruh constraint composite inti pada database uji", async () => {
    const hasil = (await db.execute(sql`
      SELECT DISTINCT CONSTRAINT_NAME AS nama
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND CONSTRAINT_NAME LIKE '%_tenant_fk'
      ORDER BY CONSTRAINT_NAME
    `)) as unknown as [Array<{ nama: string }>, unknown];

    const nama = hasil[0].map((baris) => baris.nama);
    expect(nama).toEqual([
      "bantuan_peserta_family_tenant_fk",
      "bantuan_peserta_kelompok_tenant_fk",
      "bantuan_peserta_program_tenant_fk",
      "bantuan_peserta_resident_tenant_fk",
      "bantuan_peserta_rtm_tenant_fk",
      "bulanan_anak_kia_tenant_fk",
      "bulanan_anak_posyandu_tenant_fk",
      "bumindes_item_buku_tenant_fk",
      "dokumen_warga_resident_tenant_fk",
      "dtks_anggota_dtks_tenant_fk",
      "dtks_anggota_penduduk_tenant_fk",
      "dtks_keluarga_tenant_fk",
      "dtks_ref_lampiran_dtks_tenant_fk",
      "dtks_ref_lampiran_lampiran_tenant_fk",
      "dtks_rtm_tenant_fk",
      "families_region_tenant_fk",
      "ibu_hamil_kia_tenant_fk",
      "ibu_hamil_posyandu_tenant_fk",
      "inventaris_mutasi_inventaris_tenant_fk",
      "kehadiran_izin_resident_tenant_fk",
      "kelompok_anggota_resident_tenant_fk",
      "kia_anak_tenant_fk",
      "kia_ibu_tenant_fk",
      "letters_resident_tenant_fk",
      "letters_type_tenant_fk",
      "permohonan_surat_letter_tenant_fk",
      "permohonan_surat_resident_tenant_fk",
      "permohonan_surat_type_tenant_fk",
      "resident_mutations_from_region_tenant_fk",
      "resident_mutations_resident_tenant_fk",
      "resident_mutations_to_region_tenant_fk",
      "residents_family_tenant_fk",
      "residents_region_tenant_fk",
      "residents_rtm_tenant_fk",
      "rtm_region_tenant_fk",
      "suplemen_terdata_keluarga_tenant_fk",
      "suplemen_terdata_penduduk_tenant_fk",
      "suplemen_terdata_suplemen_tenant_fk",
      "verifikasi_kontak_resident_tenant_fk",
      "warga_pesan_resident_tenant_fk",
    ]);
  });

  it("menerima referensi NULL tanpa mengubah village_id", async () => {
    const desaId = fixture?.desaA;
    if (desaId === undefined) throw new Error("Fixture tidak tersedia.");

    const [residentRow] = await db
      .insert(residents)
      .values({ villageId: desaId, name: `Penduduk NULL ${RUN}`, gender: "female" })
      .$returningId();
    const residentId = idDari(residentRow, "resident NULL");

    const [letterRow] = await db
      .insert(letters)
      .values({
        villageId: desaId,
        typeId: fixture!.letterTypeA,
        residentId: null,
        typeName: `Surat NULL ${RUN}`,
        letterDate: "2026-01-01",
        year: 2026,
      })
      .$returningId();
    const letterId = idDari(letterRow, "letter NULL");

    const [mutationRow] = await db
      .insert(residentMutations)
      .values({
        villageId: desaId,
        residentId: null,
        type: "change",
        eventDate: "2026-01-01",
        fromRegionId: null,
        toRegionId: null,
      })
      .$returningId();

    expect(residentId).toBeGreaterThan(0);
    expect(letterId).toBeGreaterThan(0);
    expect(idDari(mutationRow, "mutation NULL")).toBeGreaterThan(0);

    const [tersimpan] = await db
      .select({
        villageId: residents.villageId,
        familyId: residents.familyId,
        rtmId: residents.rtmId,
        regionId: residents.regionId,
      })
      .from(residents)
      .where(eq(residents.id, residentId))
      .limit(1);

    expect(tersimpan).toEqual({
      villageId: desaId,
      familyId: null,
      rtmId: null,
      regionId: null,
    });
  });

  it("menolak insert langsung lintas tenant pada seluruh relasi inti", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const { desaB, regionA, familyA, rtmA, residentA, residentB } = fixture;
    const { letterTypeA, letterTypeB, letterA, posyanduA, posyanduB, kiaA, kiaB } = fixture;
    const unik = (awalan: string) => `${awalan}${RUN}`;

    const kasus: Array<{ nama: string; jalankan: () => Promise<unknown> }> = [
      {
        nama: "families.region_id",
        jalankan: () =>
          db.insert(families).values({
            villageId: desaB,
            number: unik("XKF"),
            regionId: regionA,
          }),
      },
      {
        nama: "residents.family_id",
        jalankan: () =>
          db
            .insert(residents)
            .values({ villageId: desaB, name: unik("XRF"), gender: "male", familyId: familyA }),
      },
      {
        nama: "residents.rtm_id",
        jalankan: () =>
          db
            .insert(residents)
            .values({ villageId: desaB, name: unik("XRR"), gender: "male", rtmId: rtmA }),
      },
      {
        nama: "residents.region_id",
        jalankan: () =>
          db
            .insert(residents)
            .values({ villageId: desaB, name: unik("XRW"), gender: "male", regionId: regionA }),
      },
      {
        nama: "rtm.region_id",
        jalankan: () =>
          db.insert(rumahTangga).values({
            villageId: desaB,
            number: unik("XRT"),
            regionId: regionA,
          }),
      },
      {
        nama: "resident_mutations.resident_id",
        jalankan: () =>
          db.insert(residentMutations).values({
            villageId: desaB,
            residentId: residentA,
            type: "change",
            eventDate: "2026-01-01",
          }),
      },
      {
        nama: "resident_mutations.from_region_id",
        jalankan: () =>
          db.insert(residentMutations).values({
            villageId: desaB,
            residentId: residentB,
            type: "move_in",
            eventDate: "2026-01-01",
            fromRegionId: regionA,
          }),
      },
      {
        nama: "resident_mutations.to_region_id",
        jalankan: () =>
          db.insert(residentMutations).values({
            villageId: desaB,
            residentId: residentB,
            type: "move_in",
            eventDate: "2026-01-01",
            toRegionId: regionA,
          }),
      },
      {
        nama: "letters.type_id",
        jalankan: () =>
          db.insert(letters).values({
            villageId: desaB,
            typeId: letterTypeA,
            residentId: residentB,
            typeName: unik("XSL"),
            letterDate: "2026-01-01",
            year: 2026,
          }),
      },
      {
        nama: "letters.resident_id",
        jalankan: () =>
          db.insert(letters).values({
            villageId: desaB,
            typeId: letterTypeB,
            residentId: residentA,
            typeName: unik("XSP"),
            letterDate: "2026-01-01",
            year: 2026,
          }),
      },
      {
        nama: "permohonan_surat.resident_id",
        jalankan: () =>
          db.insert(permohonanSurat).values({
            villageId: desaB,
            residentId: residentA,
            letterTypeId: letterTypeB,
          }),
      },
      {
        nama: "permohonan_surat.letter_type_id",
        jalankan: () =>
          db.insert(permohonanSurat).values({
            villageId: desaB,
            residentId: residentB,
            letterTypeId: letterTypeA,
          }),
      },
      {
        nama: "permohonan_surat.letter_id",
        jalankan: () =>
          db.insert(permohonanSurat).values({
            villageId: desaB,
            residentId: residentB,
            letterTypeId: letterTypeB,
            letterId: letterA,
          }),
      },
      {
        nama: "kia.ibu_id",
        jalankan: () =>
          db.insert(kia).values({
            villageId: desaB,
            noKia: unik("XKI"),
            ibuId: residentA,
          }),
      },
      {
        nama: "kia.anak_id",
        jalankan: () =>
          db.insert(kia).values({
            villageId: desaB,
            noKia: unik("XKA"),
            ibuId: residentB,
            anakId: residentA,
          }),
      },
      {
        nama: "ibu_hamil.posyandu_id",
        jalankan: () =>
          db.insert(ibuHamil).values({
            villageId: desaB,
            posyanduId: posyanduA,
            kiaId: kiaB,
          }),
      },
      {
        nama: "ibu_hamil.kia_id",
        jalankan: () =>
          db.insert(ibuHamil).values({
            villageId: desaB,
            posyanduId: posyanduB,
            kiaId: kiaA,
          }),
      },
      {
        nama: "bulanan_anak.posyandu_id",
        jalankan: () =>
          db.insert(bulananAnak).values({
            villageId: desaB,
            posyanduId: posyanduA,
            kiaId: kiaB,
            statusGizi: 1,
            umurBulan: 1,
            statusTikar: 1,
          }),
      },
      {
        nama: "bulanan_anak.kia_id",
        jalankan: () =>
          db.insert(bulananAnak).values({
            villageId: desaB,
            posyanduId: posyanduB,
            kiaId: kiaA,
            statusGizi: 1,
            umurBulan: 1,
            statusTikar: 1,
          }),
      },
    ];

    for (const { nama, jalankan } of kasus) {
      let error: unknown;
      try {
        await jalankan();
      } catch (caught) {
        error = caught;
      }
      try {
        harusMenolakFk(error, "insert");
      } catch (gagal) {
        throw new Error(`${nama} tidak ditolak oleh database: ${String(gagal)}`);
      }
    }
  });

  it("menolak update yang memindahkan referensi ke tenant lain", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const { familyA, familyB, regionA, regionB } = fixture;
    const { residentA, letterA, letterTypeB, mutationA, residentB } = fixture;

    const percobaan: Array<{ nama: string; jalankan: () => Promise<unknown> }> = [
      {
        nama: "residents.family_id",
        jalankan: () =>
          db.update(residents).set({ familyId: familyB }).where(eq(residents.id, residentA)),
      },
      {
        nama: "families.region_id",
        jalankan: () =>
          db.update(families).set({ regionId: regionB }).where(eq(families.id, familyA)),
      },
      {
        nama: "letters.type_id",
        jalankan: () =>
          db.update(letters).set({ typeId: letterTypeB }).where(eq(letters.id, letterA)),
      },
      {
        nama: "resident_mutations.resident_id",
        jalankan: () =>
          db
            .update(residentMutations)
            .set({ residentId: residentB })
            .where(eq(residentMutations.id, mutationA)),
      },
    ];

    for (const { nama, jalankan } of percobaan) {
      let error: unknown;
      try {
        await jalankan();
      } catch (caught) {
        error = caught;
      }
      try {
        harusMenolakFk(error, "insert");
      } catch (gagal) {
        throw new Error(`${nama} tidak ditolak saat update: ${String(gagal)}`);
      }
    }

    const [resident] = await db
      .select({ familyId: residents.familyId, regionId: residents.regionId })
      .from(residents)
      .where(eq(residents.id, residentA))
      .limit(1);
    expect(resident).toEqual({ familyId: familyA, regionId: regionA });
  });

  it("mendeteksi cross-tenant legacy dengan preflight read-only", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const koneksi = await mysql.createConnection({
      ...validasiDatabaseUji(process.env).opsiKoneksi,
      multipleStatements: true,
    });
    let residentId: number | null = null;

    try {
      // Simulasikan data legacy yang dibuat sebelum constraint. Ini hanya
      // diperbolehkan pada database uji disposable dan langsung dibersihkan.
      await koneksi.query("SET FOREIGN_KEY_CHECKS = 0");
      const [hasil] = await koneksi.query<ResultSetHeader>(
        "INSERT INTO residents (village_id, name, gender, family_id) VALUES (?, ?, 'male', ?)",
        [fixture.desaB, `Legacy cross tenant ${RUN}`, fixture.familyA],
      );
      residentId = hasil.insertId;
      await koneksi.query("SET FOREIGN_KEY_CHECKS = 1");

      const sqlPreflight = fs.readFileSync(PREFLIGHT_SQL, "utf8");
      const [hasilPreflight] = await koneksi.query(sqlPreflight);
      const rows = Array.isArray(hasilPreflight)
        ? ((hasilPreflight.find(Array.isArray) as
            Array<{ relasi: string; jenis: string; child_id: number }> | undefined) ?? [])
        : [];
      const temuan = rows.find(
        (row) =>
          row.relasi === "residents.family_id" &&
          row.jenis === "cross-tenant" &&
          row.child_id === residentId,
      );
      expect(temuan).toBeDefined();
    } finally {
      if (residentId !== null) {
        await koneksi.query("SET FOREIGN_KEY_CHECKS = 0");
        await koneksi.query("DELETE FROM residents WHERE id = ?", [residentId]);
        await koneksi.query("SET FOREIGN_KEY_CHECKS = 1");
      }
      await koneksi.end();
    }
  });

  it("me-rollback transaksi ketika composite FK menolak insert", async () => {
    const f = fixture;
    if (f === null) throw new Error("Fixture tidak tersedia.");
    const nomor = `TX${RUN}`;

    await expect(
      db.transaction(async (tx) => {
        const [family] = await tx
          .insert(families)
          .values({ villageId: f.desaA, number: nomor })
          .$returningId();
        if (!family) throw new Error("Gagal membuat family transaksi.");

        await tx.insert(residents).values({
          villageId: f.desaB,
          name: `Rollback ${RUN}`,
          gender: "male",
          familyId: family.id,
        });
      }),
    ).rejects.toBeDefined();

    const sisa = await db
      .select({ id: families.id })
      .from(families)
      .where(eq(families.number, nomor));
    expect(sisa).toHaveLength(0);
  });

  it("menolak delete parent yang masih direferensikan, lalu membersihkan lewat repository", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const { desaA, familyA, rtmA, residentA } = fixture;

    let errorFamily: unknown;
    try {
      await db.delete(families).where(eq(families.id, familyA));
    } catch (caught) {
      errorFamily = caught;
    }
    harusMenolakFk(errorFamily, "delete");

    await deleteKeluarga(desaA, familyA);
    const [residentSetelahKk] = await db
      .select({ familyId: residents.familyId })
      .from(residents)
      .where(eq(residents.id, residentA))
      .limit(1);
    expect(residentSetelahKk).toEqual({ familyId: null });

    let errorRtm: unknown;
    try {
      await db.delete(rumahTangga).where(eq(rumahTangga.id, rtmA));
    } catch (caught) {
      errorRtm = caught;
    }
    harusMenolakFk(errorRtm, "delete");

    await deleteRumahTangga(desaA, rtmA);
    const [residentSetelahRtm] = await db
      .select({ rtmId: residents.rtmId, rtmLevel: residents.rtmLevel })
      .from(residents)
      .where(eq(residents.id, residentA))
      .limit(1);
    expect(residentSetelahRtm).toEqual({ rtmId: null, rtmLevel: null });
  });

  it("membersihkan referensi wilayah dan mutasi sebelum menghapus region", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const { desaA, regionA, residentA, mutationA } = fixture;

    let errorRegion: unknown;
    try {
      await db.delete(regions).where(eq(regions.id, regionA));
    } catch (caught) {
      errorRegion = caught;
    }
    harusMenolakFk(errorRegion, "delete");

    await deleteWilayah(desaA, regionA);

    const [resident] = await db
      .select({ regionId: residents.regionId })
      .from(residents)
      .where(eq(residents.id, residentA))
      .limit(1);
    const [mutation] = await db
      .select({
        fromRegionId: residentMutations.fromRegionId,
        toRegionId: residentMutations.toRegionId,
      })
      .from(residentMutations)
      .where(eq(residentMutations.id, mutationA))
      .limit(1);

    expect(resident).toEqual({ regionId: null });
    expect(mutation).toEqual({ fromRegionId: null, toRegionId: null });
  });

  it("menerapkan cascade KIA dan permohonan tanpa melewati database", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const { desaA, kiaA, ibuHamilA, bulananA, letterTypeA } = fixture;

    await db.delete(kia).where(eq(kia.id, kiaA));
    const anakKia = await db
      .select({ id: ibuHamil.id })
      .from(ibuHamil)
      .where(eq(ibuHamil.id, ibuHamilA));
    const catatanKia = await db
      .select({ id: bulananAnak.id })
      .from(bulananAnak)
      .where(eq(bulananAnak.id, bulananA));
    expect(anakKia).toHaveLength(0);
    expect(catatanKia).toHaveLength(0);

    const [residentRow] = await db
      .insert(residents)
      .values({ villageId: desaA, name: `Penduduk cascade ${RUN}`, gender: "female" })
      .$returningId();
    const residentId = idDari(residentRow, "resident cascade");
    const [permohonanRow] = await db
      .insert(permohonanSurat)
      .values({ villageId: desaA, residentId, letterTypeId: letterTypeA })
      .$returningId();
    const permohonanId = idDari(permohonanRow, "permohonan cascade");

    await db.delete(residents).where(eq(residents.id, residentId));
    const sisaPermohonan = await db
      .select({ id: permohonanSurat.id })
      .from(permohonanSurat)
      .where(eq(permohonanSurat.id, permohonanId));
    expect(sisaPermohonan).toHaveLength(0);
  });

  it("melepas referensi surat dan mutasi sebelum menghapus resident/surat", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const { desaA, letterA, letterTypeA, permohonanA } = fixture;

    let errorLetter: unknown;
    try {
      await db.delete(letters).where(eq(letters.id, letterA));
    } catch (caught) {
      errorLetter = caught;
    }
    harusMenolakFk(errorLetter, "delete");

    await deleteSurat(desaA, letterA);
    const [permohonan] = await db
      .select({ letterId: permohonanSurat.letterId })
      .from(permohonanSurat)
      .where(eq(permohonanSurat.id, permohonanA))
      .limit(1);
    expect(permohonan).toEqual({ letterId: null });

    const [residentRow] = await db
      .insert(residents)
      .values({ villageId: desaA, name: `Penduduk surat ${RUN}`, gender: "male" })
      .$returningId();
    const residentId = idDari(residentRow, "resident surat");
    const [letterRow] = await db
      .insert(letters)
      .values({
        villageId: desaA,
        typeId: letterTypeA,
        residentId,
        typeName: `Surat resident ${RUN}`,
        letterDate: "2026-01-01",
        year: 2026,
      })
      .$returningId();
    const letterId = idDari(letterRow, "letter resident");
    const [mutationRow] = await db
      .insert(residentMutations)
      .values({
        villageId: desaA,
        residentId,
        type: "change",
        eventDate: "2026-01-01",
      })
      .$returningId();
    const mutationId = idDari(mutationRow, "mutation resident");

    await deletePenduduk(desaA, residentId);

    const [suratTersisa] = await db
      .select({ residentId: letters.residentId })
      .from(letters)
      .where(eq(letters.id, letterId))
      .limit(1);
    const [mutasiTersisa] = await db
      .select({ residentId: residentMutations.residentId })
      .from(residentMutations)
      .where(eq(residentMutations.id, mutationId))
      .limit(1);
    expect(suratTersisa).toEqual({ residentId: null });
    expect(mutasiTersisa).toEqual({ residentId: null });
  });
});
