import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  families,
  familyMemberLogs,
  kontak,
  lapak,
  letterNumberArchive,
  letters,
  letterTypes,
  notifikasiTerkirim,
  pendapat,
  residents,
  users,
  villages,
} from "@/db/schema";
import { deleteKeluarga } from "@/features/keluarga/infrastructure/keluarga-repository";
import { deletePenduduk } from "@/features/penduduk/infrastructure/penduduk-repository";
import { deleteSurat } from "@/features/surat/infrastructure/surat-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * AUD-034 Batch B1 — database menegakkan tenant untuk delapan relasi
 * `ON DELETE SET NULL` yang sebelumnya hanya dijaga application layer.
 *
 * Test memakai `db.insert`/`db.update` langsung agar kegagalan tidak tertutup
 * oleh filter `villageId` di repository. Efek bisnis `SET NULL` dibuktikan
 * lewat repository (`deletePenduduk`, `deleteKeluarga`, `deleteSurat`).
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

const FK_BARU = [
  "kontak_resident_tenant_fk",
  "lapak_resident_tenant_fk",
  "notifikasi_terkirim_resident_tenant_fk",
  "pendapat_resident_tenant_fk",
  "family_member_logs_family_tenant_fk",
  "family_member_logs_resident_tenant_fk",
  "users_resident_tenant_fk",
  "letter_number_archive_letter_tenant_fk",
] as const;

const FK_LAMA = [
  "kontak_resident_id_residents_id_fk",
  "lapak_resident_id_residents_id_fk",
  "notifikasi_terkirim_resident_id_residents_id_fk",
  "pendapat_resident_id_residents_id_fk",
  "family_member_logs_family_id_families_id_fk",
  "family_member_logs_resident_id_residents_id_fk",
  "users_resident_id_residents_id_fk",
  "letter_number_archive_letter_id_letters_id_fk",
] as const;

interface Fixture {
  desaA: number;
  desaB: number;
  familyA: number;
  familyB: number;
  residentA: number;
  residentB: number;
  letterTypeA: number;
  letterTypeB: number;
  letterA: number;
  /** Surat kedua desa A; satu surat hanya boleh punya satu baris arsip nomor. */
  letterA2: number;
  /** Surat ketiga desa A, dipakai test pembersihan repository. */
  letterA3: number;
  letterB: number;
  /** Akun platform (`village_id` NULL) milik penduduk desa A. */
  akunPlatformId: string;
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

async function tangkapError(jalankan: () => Promise<unknown>): Promise<unknown> {
  try {
    await jalankan();
    return undefined;
  } catch (error) {
    return error;
  }
}

function harusDitolak(error: unknown, jenis: "insert" | "delete"): void {
  const kode = kodeGalat(error);
  if (jenis === "insert") {
    expect(error, "referensi lintas tenant seharusnya ditolak database").toBeDefined();
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
    .values({ name: `Desa B1 A ${RUN}`, code: `A${RUN}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa B1 B ${RUN}`, code: `B${RUN}` })
    .$returningId();
  const desaA = idDari(desaARow, "desa A");
  const desaB = idDari(desaBRow, "desa B");

  const [familyARow] = await db
    .insert(families)
    .values({ villageId: desaA, number: `KK${RUN}A` })
    .$returningId();
  const [familyBRow] = await db
    .insert(families)
    .values({ villageId: desaB, number: `KK${RUN}B` })
    .$returningId();
  const familyA = idDari(familyARow, "family A");
  const familyB = idDari(familyBRow, "family B");

  const [residentARow] = await db
    .insert(residents)
    .values({ villageId: desaA, name: `Penduduk A ${RUN}`, gender: "male", familyId: familyA })
    .$returningId();
  const [residentBRow] = await db
    .insert(residents)
    .values({ villageId: desaB, name: `Penduduk B ${RUN}`, gender: "female", familyId: familyB })
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
  const [letterA2Row] = await db
    .insert(letters)
    .values({
      villageId: desaA,
      typeId: letterTypeA,
      residentId: residentA,
      typeName: `Jenis Surat A ${RUN}`,
      letterDate: "2026-01-02",
      year: 2026,
    })
    .$returningId();
  const [letterA3Row] = await db
    .insert(letters)
    .values({
      villageId: desaA,
      typeId: letterTypeA,
      residentId: residentA,
      typeName: `Jenis Surat A ${RUN}`,
      letterDate: "2026-01-03",
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

  // `users.resident_id` unik, jadi akun platform ini satu-satunya pemilik
  // `residentA`. MySQL melewati composite FK saat `village_id` NULL, sehingga
  // baris platform dapat menunjuk penduduk desa mana pun.
  const akunPlatformId = randomUUID();
  await db.insert(users).values({
    id: akunPlatformId,
    name: `Akun platform ${RUN}`,
    email: `platform-${RUN}@example.test`,
    villageId: null,
    residentId: residentA,
  });

  fixture = {
    desaA,
    desaB,
    familyA,
    familyB,
    residentA,
    residentB,
    letterTypeA,
    letterTypeB,
    letterA: idDari(letterARow, "letter A"),
    letterA2: idDari(letterA2Row, "letter A2"),
    letterA3: idDari(letterA3Row, "letter A3"),
    letterB: idDari(letterBRow, "letter B"),
    akunPlatformId,
  };
});

afterAll(async () => {
  if (fixture === null) return;
  const desaIds = [fixture.desaA, fixture.desaB];

  // Composite FK `RESTRICT` mengharuskan anak dibersihkan lebih dulu.
  await db.delete(familyMemberLogs).where(inArray(familyMemberLogs.villageId, desaIds));
  await db.delete(kontak).where(inArray(kontak.villageId, desaIds));
  await db.delete(lapak).where(inArray(lapak.villageId, desaIds));
  await db.delete(notifikasiTerkirim).where(inArray(notifikasiTerkirim.villageId, desaIds));
  await db.delete(pendapat).where(inArray(pendapat.villageId, desaIds));
  await db.delete(letterNumberArchive).where(inArray(letterNumberArchive.villageId, desaIds));
  await db.delete(users).where(inArray(users.villageId, desaIds));
  await db.delete(letters).where(inArray(letters.villageId, desaIds));
  await db.delete(letterTypes).where(inArray(letterTypes.villageId, desaIds));
  await db.delete(residents).where(inArray(residents.villageId, desaIds));
  await db.delete(families).where(inArray(families.villageId, desaIds));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("AUD-034 B1 composite tenant FK untuk relasi SET NULL", () => {
  it("memasang delapan constraint RESTRICT dan melepas FK single-column lama", async () => {
    const hasil = (await db.execute(
      `SELECT rc.CONSTRAINT_NAME AS nama, rc.DELETE_RULE AS aturan
       FROM information_schema.REFERENTIAL_CONSTRAINTS rc
       WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
         AND rc.CONSTRAINT_NAME IN (${FK_BARU.map((nama) => `'${nama}'`).join(", ")})`,
    )) as unknown as [Array<{ nama: string; aturan: string }>, unknown];

    const ditemukan = new Map(hasil[0].map((baris) => [baris.nama, baris.aturan]));
    for (const nama of FK_BARU) {
      expect(ditemukan.get(nama), `${nama} tidak terpasang`).toBe("RESTRICT");
    }

    const lama = (await db.execute(
      `SELECT CONSTRAINT_NAME AS nama
       FROM information_schema.REFERENTIAL_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE()
         AND CONSTRAINT_NAME IN (${FK_LAMA.map((nama) => `'${nama}'`).join(", ")})`,
    )) as unknown as [Array<{ nama: string }>, unknown];
    expect(lama[0]).toHaveLength(0);
  });

  it("menolak insert lintas tenant pada kedelapan relasi", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const f = fixture;

    const kasus: Array<{ nama: string; jalankan: () => Promise<unknown> }> = [
      {
        nama: "kontak.resident_id",
        jalankan: () =>
          db
            .insert(kontak)
            .values({ villageId: f.desaB, nama: `Kontak lintas ${RUN}`, residentId: f.residentA }),
      },
      {
        nama: "lapak.resident_id",
        jalankan: () =>
          db
            .insert(lapak)
            .values({ villageId: f.desaB, nama: `Lapak lintas ${RUN}`, residentId: f.residentA }),
      },
      {
        nama: "notifikasi_terkirim.resident_id",
        jalankan: () =>
          db.insert(notifikasiTerkirim).values({
            villageId: f.desaB,
            residentId: f.residentA,
            jenis: "uji.lintas",
            kanal: "email",
            target: "uji@example.test",
          }),
      },
      {
        nama: "pendapat.resident_id",
        jalankan: () =>
          db.insert(pendapat).values({ villageId: f.desaB, residentId: f.residentA, pilihan: 1 }),
      },
      {
        nama: "family_member_logs.family_id",
        jalankan: () =>
          db.insert(familyMemberLogs).values({
            villageId: f.desaB,
            familyId: f.familyA,
            residentName: `Log lintas ${RUN}`,
            aksi: "added",
          }),
      },
      {
        nama: "family_member_logs.resident_id",
        jalankan: () =>
          db.insert(familyMemberLogs).values({
            villageId: f.desaB,
            residentId: f.residentA,
            residentName: `Log lintas ${RUN}`,
            aksi: "added",
          }),
      },
      {
        nama: "users.resident_id",
        // `residentB` belum memiliki akun, jadi kegagalan tidak tertutup
        // unique `users_resident_uq`.
        jalankan: () =>
          db.insert(users).values({
            id: randomUUID(),
            name: `User lintas ${RUN}`,
            email: `lintas-${RUN}@example.test`,
            villageId: f.desaA,
            residentId: f.residentB,
          }),
      },
      {
        nama: "letter_number_archive.letter_id",
        jalankan: () =>
          db.insert(letterNumberArchive).values({
            villageId: f.desaB,
            letterId: f.letterA,
            number: `001/LINTAS/${RUN}`,
            sequence: 1,
            year: 2026,
            typeId: f.letterTypeB,
            typeName: `Jenis Surat B ${RUN}`,
            issuedAt: new Date("2026-01-01T00:00:00Z"),
          }),
      },
    ];

    for (const { nama, jalankan } of kasus) {
      const error = await tangkapError(jalankan);
      try {
        harusDitolak(error, "insert");
      } catch (gagal) {
        throw new Error(`${nama} tidak ditolak database: ${String(gagal)}`);
      }
    }
  });

  it("menerima referensi NULL dan referensi sewilayah", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const f = fixture;

    const [kontakRow] = await db
      .insert(kontak)
      .values({ villageId: f.desaA, nama: `Kontak sah ${RUN}`, residentId: f.residentA })
      .$returningId();
    const [kontakTanpaPenduduk] = await db
      .insert(kontak)
      .values({ villageId: f.desaA, nama: `Kontak eksternal ${RUN}` })
      .$returningId();
    const [logRow] = await db
      .insert(familyMemberLogs)
      .values({
        villageId: f.desaA,
        familyId: f.familyA,
        residentId: f.residentA,
        residentName: `Log sah ${RUN}`,
        aksi: "added",
      })
      .$returningId();
    const [arsipRow] = await db
      .insert(letterNumberArchive)
      .values({
        villageId: f.desaA,
        letterId: f.letterA,
        number: `001/SAH/${RUN}`,
        sequence: 1,
        year: 2026,
        typeId: f.letterTypeA,
        typeName: `Jenis Surat A ${RUN}`,
        issuedAt: new Date("2026-01-01T00:00:00Z"),
      })
      .$returningId();
    const [arsipTanpaSurat] = await db
      .insert(letterNumberArchive)
      .values({
        villageId: f.desaA,
        number: `002/SAH/${RUN}`,
        sequence: 2,
        year: 2026,
        typeId: f.letterTypeA,
        typeName: `Jenis Surat A ${RUN}`,
        issuedAt: new Date("2026-01-01T00:00:00Z"),
      })
      .$returningId();
    expect(idDari(kontakRow, "kontak sah")).toBeGreaterThan(0);
    expect(idDari(kontakTanpaPenduduk, "kontak eksternal")).toBeGreaterThan(0);
    expect(idDari(logRow, "log sah")).toBeGreaterThan(0);
    expect(idDari(arsipRow, "arsip sah")).toBeGreaterThan(0);
    expect(idDari(arsipTanpaSurat, "arsip tanpa surat")).toBeGreaterThan(0);
    // Akun platform dibuat di `beforeAll`: `village_id` NULL membuat MySQL
    // melewati composite FK, sehingga baris ini sah meski menunjuk penduduk
    // desa A dari tenant platform.
    const [akunPlatform] = await db
      .select({ id: users.id, villageId: users.villageId, residentId: users.residentId })
      .from(users)
      .where(eq(users.id, f.akunPlatformId));
    expect(akunPlatform).toEqual({
      id: f.akunPlatformId,
      villageId: null,
      residentId: f.residentA,
    });
  });

  it("menolak update yang memindahkan referensi ke tenant lain", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const f = fixture;

    const [kontakRow] = await db
      .insert(kontak)
      .values({ villageId: f.desaA, nama: `Kontak update ${RUN}`, residentId: f.residentA })
      .$returningId();
    const kontakId = idDari(kontakRow, "kontak update");

    const error = await tangkapError(() =>
      db.update(kontak).set({ residentId: f.residentB }).where(eq(kontak.id, kontakId)),
    );
    harusDitolak(error, "insert");

    const [tersimpan] = await db
      .select({ residentId: kontak.residentId })
      .from(kontak)
      .where(eq(kontak.id, kontakId))
      .limit(1);
    expect(tersimpan).toEqual({ residentId: f.residentA });
  });

  it("menolak delete parent yang masih direferensikan", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const f = fixture;

    // `kontak` menahan penghapusan penduduk; `family_member_logs` menahan KK.
    await db
      .insert(kontak)
      .values({ villageId: f.desaA, nama: `Kontak penahan ${RUN}`, residentId: f.residentA });
    await db.insert(familyMemberLogs).values({
      villageId: f.desaA,
      familyId: f.familyA,
      residentName: `Log penahan ${RUN}`,
      aksi: "added",
    });
    await db.insert(letterNumberArchive).values({
      villageId: f.desaA,
      letterId: f.letterA2,
      number: `003/PENAHAN/${RUN}`,
      sequence: 3,
      year: 2026,
      typeId: f.letterTypeA,
      typeName: `Jenis Surat A ${RUN}`,
      issuedAt: new Date("2026-01-01T00:00:00Z"),
    });

    harusDitolak(
      await tangkapError(() => db.delete(residents).where(eq(residents.id, f.residentA))),
      "delete",
    );
    harusDitolak(
      await tangkapError(() => db.delete(families).where(eq(families.id, f.familyA))),
      "delete",
    );
    harusDitolak(
      await tangkapError(() => db.delete(letters).where(eq(letters.id, f.letterA2))),
      "delete",
    );
  });

  it("melepas referensi lewat repository sebelum parent dihapus", async () => {
    if (fixture === null) throw new Error("Fixture tidak tersedia.");
    const f = fixture;

    const [kontakRow] = await db
      .insert(kontak)
      .values({ villageId: f.desaA, nama: `Kontak bersih ${RUN}`, residentId: f.residentA })
      .$returningId();
    const kontakId = idDari(kontakRow, "kontak bersih");
    const [lapakRow] = await db
      .insert(lapak)
      .values({ villageId: f.desaA, nama: `Lapak bersih ${RUN}`, residentId: f.residentA })
      .$returningId();
    const lapakId = idDari(lapakRow, "lapak bersih");
    const [notifikasiRow] = await db
      .insert(notifikasiTerkirim)
      .values({
        villageId: f.desaA,
        residentId: f.residentA,
        jenis: "uji.bersih",
        kanal: "whatsapp",
        target: "081200000000",
      })
      .$returningId();
    const notifikasiId = idDari(notifikasiRow, "notifikasi bersih");
    const [pendapatRow] = await db
      .insert(pendapat)
      .values({ villageId: f.desaA, residentId: f.residentA, pilihan: 2 })
      .$returningId();
    const pendapatId = idDari(pendapatRow, "pendapat bersih");
    const [logRow] = await db
      .insert(familyMemberLogs)
      .values({
        villageId: f.desaA,
        familyId: f.familyA,
        residentId: f.residentA,
        residentName: `Log bersih ${RUN}`,
        aksi: "removed",
      })
      .$returningId();
    const logId = idDari(logRow, "log bersih");
    // Akun platform dijadikan akun desa agar pembersihan `users` terbukti
    // bekerja untuk akun tenant, bukan hanya baris ber-`village_id` NULL.
    await db.update(users).set({ villageId: f.desaA }).where(eq(users.id, f.akunPlatformId));
    const [arsipRow] = await db
      .insert(letterNumberArchive)
      .values({
        villageId: f.desaA,
        letterId: f.letterA3,
        number: `004/BERSIH/${RUN}`,
        sequence: 4,
        year: 2026,
        typeId: f.letterTypeA,
        typeName: `Jenis Surat A ${RUN}`,
        issuedAt: new Date("2026-01-01T00:00:00Z"),
      })
      .$returningId();
    const arsipId = idDari(arsipRow, "arsip bersih");

    await deletePenduduk(f.desaA, f.residentA);

    const [kontakSetelah] = await db
      .select({ residentId: kontak.residentId })
      .from(kontak)
      .where(eq(kontak.id, kontakId));
    const [lapakSetelah] = await db
      .select({ residentId: lapak.residentId })
      .from(lapak)
      .where(eq(lapak.id, lapakId));
    const [notifikasiSetelah] = await db
      .select({ residentId: notifikasiTerkirim.residentId })
      .from(notifikasiTerkirim)
      .where(eq(notifikasiTerkirim.id, notifikasiId));
    const [pendapatSetelah] = await db
      .select({ residentId: pendapat.residentId })
      .from(pendapat)
      .where(eq(pendapat.id, pendapatId));
    const [logSetelah] = await db
      .select({ residentId: familyMemberLogs.residentId, familyId: familyMemberLogs.familyId })
      .from(familyMemberLogs)
      .where(eq(familyMemberLogs.id, logId));
    const [userSetelah] = await db
      .select({ residentId: users.residentId, villageId: users.villageId })
      .from(users)
      .where(eq(users.id, f.akunPlatformId));

    expect(kontakSetelah).toEqual({ residentId: null });
    expect(lapakSetelah).toEqual({ residentId: null });
    expect(notifikasiSetelah).toEqual({ residentId: null });
    expect(pendapatSetelah).toEqual({ residentId: null });
    expect(logSetelah).toEqual({ residentId: null, familyId: f.familyA });
    expect(userSetelah).toEqual({ residentId: null, villageId: f.desaA });

    await deleteSurat(f.desaA, f.letterA3);
    const [arsipSetelah] = await db
      .select({ letterId: letterNumberArchive.letterId })
      .from(letterNumberArchive)
      .where(eq(letterNumberArchive.id, arsipId));
    expect(arsipSetelah).toEqual({ letterId: null });

    await deleteKeluarga(f.desaA, f.familyA);
    const [logSetelahKk] = await db
      .select({ familyId: familyMemberLogs.familyId })
      .from(familyMemberLogs)
      .where(eq(familyMemberLogs.id, logId));
    expect(logSetelahKk).toEqual({ familyId: null });
  });
});
