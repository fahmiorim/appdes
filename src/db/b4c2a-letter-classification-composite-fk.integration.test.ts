import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  incomingLetters,
  letterClassifications,
  letterDinas,
  letterTypes,
  outgoingLetters,
  villages,
} from "@/db/schema";
import { deleteKlasifikasi } from "@/features/surat/infrastructure/master-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * AUD-034 Batch 4C-2a: empat relasi `SET NULL` yang menunjuk
 * `letter_classifications` kini dijaga composite FK `RESTRICT`.
 *
 * Konsekuensi yang disengaja: menghapus klasifikasi yang masih dirujuk ditolak
 * database (1451), tidak lagi mengosongkan kolom child secara diam-diam.
 * Perilaku bisnis lama dipulihkan oleh transaksi `deleteKlasifikasi`, yang
 * melepas keempat referensi lebih dulu dalam satu transaksi.
 */
const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  desaA: number;
  desaB: number;
  klasifikasiA: number;
  klasifikasiB: number;
}

let fixture: Fixture | null = null;

function dataUji(): Fixture {
  if (fixture === null) throw new Error("Fixture integrasi belum siap.");
  return fixture;
}

function idDari(row: { id: number } | undefined, label: string): number {
  if (row?.id === undefined) throw new Error(`Seed gagal: ${label}.`);
  return row.id;
}

async function kodeGalat(upaya: () => Promise<unknown>): Promise<unknown> {
  let current: unknown;
  try {
    await upaya();
  } catch (error) {
    current = error;
  }
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const item = current as { code?: unknown; errno?: unknown; cause?: unknown };
    const code = item.code ?? item.errno;
    if (code !== undefined) return code;
    current = item.cause;
  }
  return undefined;
}

function tambahAnak(villageId: number, classificationId: number | null, akhiran: string) {
  return [
    {
      nama: "incoming_letters.classification_id",
      jalankan: () =>
        db.insert(incomingLetters).values({
          villageId,
          receivedDate: "2026-01-01",
          letterNumber: `IN-${akhiran}`,
          classificationId,
        }),
    },
    {
      nama: "letter_dinas.classification_id",
      jalankan: () =>
        db.insert(letterDinas).values({
          villageId,
          letterNumber: `DN-${akhiran}`,
          letterDate: "2026-01-01",
          subject: `Surat dinas ${akhiran}`,
          classificationId,
        }),
    },
    {
      nama: "letter_types.classification_id",
      jalankan: () =>
        db.insert(letterTypes).values({
          villageId,
          code: `LT-${akhiran}`,
          name: `Jenis surat ${akhiran}`,
          templateBody: "Isi surat uji.",
          classificationId,
        }),
    },
    {
      nama: "outgoing_letters.classification_id",
      jalankan: () =>
        db.insert(outgoingLetters).values({
          villageId,
          letterNumber: `OUT-${akhiran}`,
          letterDate: "2026-01-01",
          classificationId,
        }),
    },
  ];
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa B4C2A ${RUN}`, code: `A${RUN}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa B4C2A B ${RUN}`, code: `B${RUN}` })
    .$returningId();
  const desaA = idDari(desaARow, "desa A");
  const desaB = idDari(desaBRow, "desa B");

  const [klasifikasiARow] = await db
    .insert(letterClassifications)
    .values({ villageId: desaA, code: `KA${RUN}`, name: `Klasifikasi A ${RUN}` })
    .$returningId();
  const [klasifikasiBRow] = await db
    .insert(letterClassifications)
    .values({ villageId: desaB, code: `KB${RUN}`, name: `Klasifikasi B ${RUN}` })
    .$returningId();

  fixture = {
    desaA,
    desaB,
    klasifikasiA: idDari(klasifikasiARow, "klasifikasi A"),
    klasifikasiB: idDari(klasifikasiBRow, "klasifikasi B"),
  };
});

afterAll(async () => {
  if (fixture === null) return;
  const desaIds = [fixture.desaA, fixture.desaB];
  // Composite FK RESTRICT: anak dibersihkan sebelum klassifikasi dan desa.
  await db.delete(incomingLetters).where(inArray(incomingLetters.villageId, desaIds));
  await db.delete(letterDinas).where(inArray(letterDinas.villageId, desaIds));
  await db.delete(letterTypes).where(inArray(letterTypes.villageId, desaIds));
  await db.delete(outgoingLetters).where(inArray(outgoingLetters.villageId, desaIds));
  await db.delete(letterClassifications).where(inArray(letterClassifications.villageId, desaIds));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("AUD-034 B4C-2a composite tenant FK letter_classifications", () => {
  it("berjalan pada MySQL 8", async () => {
    const versi = (await db.execute(sql`SELECT VERSION() AS versi`)) as unknown as [
      Array<{ versi: string }>,
      unknown,
    ];
    expect(versi[0][0]?.versi).toMatch(/^8\./);
  });

  it("menolak insert lintas desa pada keempat relasi", async () => {
    const f = dataUji();
    for (const { nama, jalankan } of tambahAnak(f.desaA, f.klasifikasiB, `X${RUN}`)) {
      expect([1452, "ER_NO_REFERENCED_ROW_2"], nama).toContain(await kodeGalat(jalankan));
    }
  });

  it("menerima relasi sewilayah dan referensi NULL", async () => {
    const f = dataUji();
    for (const { nama, jalankan } of tambahAnak(f.desaA, f.klasifikasiA, `S${RUN}`)) {
      await expect(jalankan(), nama).resolves.toBeDefined();
    }
    for (const { nama, jalankan } of tambahAnak(f.desaA, null, `N${RUN}`)) {
      await expect(jalankan(), nama).resolves.toBeDefined();
    }
  });

  it("menolak update yang memindahkan relasi ke desa lain", async () => {
    const f = dataUji();
    const [incomingRow] = await db
      .insert(incomingLetters)
      .values({
        villageId: f.desaA,
        receivedDate: "2026-01-02",
        letterNumber: `IN-U${RUN}`,
        classificationId: f.klasifikasiA,
      })
      .$returningId();
    const [dinasRow] = await db
      .insert(letterDinas)
      .values({
        villageId: f.desaA,
        letterNumber: `DN-U${RUN}`,
        letterDate: "2026-01-02",
        subject: `Surat dinas update ${RUN}`,
        classificationId: f.klasifikasiA,
      })
      .$returningId();
    const [jenisRow] = await db
      .insert(letterTypes)
      .values({
        villageId: f.desaA,
        code: `LT-U${RUN}`,
        name: `Jenis surat update ${RUN}`,
        templateBody: "Isi surat uji.",
        classificationId: f.klasifikasiA,
      })
      .$returningId();
    const [outgoingRow] = await db
      .insert(outgoingLetters)
      .values({
        villageId: f.desaA,
        letterNumber: `OUT-U${RUN}`,
        letterDate: "2026-01-02",
        classificationId: f.klasifikasiA,
      })
      .$returningId();

    const kasus: Array<{ nama: string; jalankan: () => Promise<unknown> }> = [
      {
        nama: "incoming_letters.classification_id",
        jalankan: () =>
          db
            .update(incomingLetters)
            .set({ classificationId: f.klasifikasiB })
            .where(eq(incomingLetters.id, idDari(incomingRow, "surat masuk update"))),
      },
      {
        nama: "letter_dinas.classification_id",
        jalankan: () =>
          db
            .update(letterDinas)
            .set({ classificationId: f.klasifikasiB })
            .where(eq(letterDinas.id, idDari(dinasRow, "surat dinas update"))),
      },
      {
        nama: "letter_types.classification_id",
        jalankan: () =>
          db
            .update(letterTypes)
            .set({ classificationId: f.klasifikasiB })
            .where(eq(letterTypes.id, idDari(jenisRow, "jenis surat update"))),
      },
      {
        nama: "outgoing_letters.classification_id",
        jalankan: () =>
          db
            .update(outgoingLetters)
            .set({ classificationId: f.klasifikasiB })
            .where(eq(outgoingLetters.id, idDari(outgoingRow, "surat keluar update"))),
      },
    ];

    for (const item of kasus) {
      expect([1452, "ER_NO_REFERENCED_ROW_2"], item.nama).toContain(await kodeGalat(item.jalankan));
    }
  });

  it("menolak hapus langsung, lalu transaksi aplikasi melepas semua referensi", async () => {
    const f = dataUji();
    const [klasifikasiRow] = await db
      .insert(letterClassifications)
      .values({ villageId: f.desaA, code: `KP${RUN}`, name: `Klasifikasi terpakai ${RUN}` })
      .$returningId();
    const klasifikasiId = idDari(klasifikasiRow, "klasifikasi terpakai");

    const anak = tambahAnak(f.desaA, klasifikasiId, `P${RUN}`);
    for (const item of anak) await item.jalankan();

    // Perilaku berubah dari SET NULL: parent tidak bisa dihapus selama dirujuk.
    expect([1451, "ER_ROW_IS_REFERENCED_2"]).toContain(
      await kodeGalat(() =>
        db.delete(letterClassifications).where(eq(letterClassifications.id, klasifikasiId)),
      ),
    );

    // Jalur aplikasi: satu transaksi melepas empat referensi lalu menghapus parent.
    await expect(deleteKlasifikasi(f.desaA, klasifikasiId)).resolves.toBeUndefined();

    const [sisaKlasifikasi, suratMasuk, suratDinas, jenisSurat, suratKeluar] = await Promise.all([
      db
        .select({ id: letterClassifications.id })
        .from(letterClassifications)
        .where(eq(letterClassifications.id, klasifikasiId)),
      db
        .select({ classificationId: incomingLetters.classificationId })
        .from(incomingLetters)
        .where(eq(incomingLetters.letterNumber, `IN-P${RUN}`)),
      db
        .select({ classificationId: letterDinas.classificationId })
        .from(letterDinas)
        .where(eq(letterDinas.letterNumber, `DN-P${RUN}`)),
      db
        .select({ classificationId: letterTypes.classificationId })
        .from(letterTypes)
        .where(eq(letterTypes.code, `LT-P${RUN}`)),
      db
        .select({ classificationId: outgoingLetters.classificationId })
        .from(outgoingLetters)
        .where(eq(outgoingLetters.letterNumber, `OUT-P${RUN}`)),
    ]);

    expect(sisaKlasifikasi).toHaveLength(0);
    expect(suratMasuk).toEqual([{ classificationId: null }]);
    expect(suratDinas).toEqual([{ classificationId: null }]);
    expect(jenisSurat).toEqual([{ classificationId: null }]);
    expect(suratKeluar).toEqual([{ classificationId: null }]);
  });

  it("tidak menyentuh referensi desa lain saat klasifikasi dihapus", async () => {
    const f = dataUji();
    const [klasifikasiARow] = await db
      .insert(letterClassifications)
      .values({ villageId: f.desaA, code: `KS${RUN}`, name: `Klasifikasi scope ${RUN}` })
      .$returningId();
    const klasifikasiA = idDari(klasifikasiARow, "klasifikasi scope A");
    const [klasifikasiBRow] = await db
      .insert(letterClassifications)
      .values({ villageId: f.desaB, code: `KS${RUN}`, name: `Klasifikasi scope B ${RUN}` })
      .$returningId();
    const klasifikasiB = idDari(klasifikasiBRow, "klasifikasi scope B");

    await db.insert(incomingLetters).values({
      villageId: f.desaA,
      receivedDate: "2026-01-03",
      letterNumber: `IN-SC${RUN}`,
      classificationId: klasifikasiA,
    });
    await db.insert(incomingLetters).values({
      villageId: f.desaB,
      receivedDate: "2026-01-03",
      letterNumber: `IN-SC${RUN}`,
      classificationId: klasifikasiB,
    });

    await deleteKlasifikasi(f.desaA, klasifikasiA);

    const [milikB] = await db
      .select({ classificationId: incomingLetters.classificationId })
      .from(incomingLetters)
      .where(eq(incomingLetters.villageId, f.desaB))
      .limit(1);
    expect(milikB).toEqual({ classificationId: klasifikasiB });
  });

  it("menghapus desa setelah anak dan klasifikasi dibersihkan lebih dulu", async () => {
    const f = dataUji();
    const [desaRow] = await db
      .insert(villages)
      .values({ name: `Desa purge B4C2A ${RUN}`, code: `P${RUN}` })
      .$returningId();
    const desaId = idDari(desaRow, "desa purge");
    const [klasifikasiRow] = await db
      .insert(letterClassifications)
      .values({ villageId: desaId, code: `PG${RUN}`, name: `Klasifikasi purge ${RUN}` })
      .$returningId();
    const klasifikasiId = idDari(klasifikasiRow, "klasifikasi purge");
    for (const item of tambahAnak(desaId, klasifikasiId, `G${RUN}`)) await item.jalankan();

    await db.delete(incomingLetters).where(eq(incomingLetters.villageId, desaId));
    await db.delete(letterDinas).where(eq(letterDinas.villageId, desaId));
    await db.delete(letterTypes).where(eq(letterTypes.villageId, desaId));
    await db.delete(outgoingLetters).where(eq(outgoingLetters.villageId, desaId));
    await expect(db.delete(villages).where(eq(villages.id, desaId))).resolves.toBeDefined();

    const sisa = await db
      .select({ id: letterClassifications.id })
      .from(letterClassifications)
      .where(eq(letterClassifications.villageId, desaId));
    expect(sisa).toHaveLength(0);
    expect(f.desaA).toBeGreaterThan(0);
  });
});
