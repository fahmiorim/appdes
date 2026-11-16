import { fileURLToPath } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { berita, beritaKategori, jabatanPerangkat, perangkatDesa, villages } from "@/db/schema";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * AUD-034 Batch 4C-1: dua relasi `SET NULL` tanpa jalur hapus parent di
 * aplikasi kini dijaga composite FK `RESTRICT`.
 *
 * Konsekuensi yang disengaja: menghapus kategori/jabatan yang masih dirujuk
 * sekarang ditolak database (1451), tidak lagi mengosongkan kolom child.
 */
const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = String(Date.now()).slice(-7);
const KODE = String(Date.now()).slice(-5);

interface Fixture {
  desaA: number;
  desaB: number;
  kategoriA: number;
  kategoriB: number;
  jabatanA: number;
  jabatanB: number;
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

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa B4C A ${RUN}`, code: `B4CA${KODE}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa B4C B ${RUN}`, code: `B4CB${KODE}` })
    .$returningId();
  const desaA = idDari(desaARow, "desa A");
  const desaB = idDari(desaBRow, "desa B");

  const [kategoriARow] = await db
    .insert(beritaKategori)
    .values({ villageId: desaA, nama: `Kategori A ${RUN}`, slug: `kategori-a-${RUN}` })
    .$returningId();
  const [kategoriBRow] = await db
    .insert(beritaKategori)
    .values({ villageId: desaB, nama: `Kategori B ${RUN}`, slug: `kategori-b-${RUN}` })
    .$returningId();

  const [jabatanARow] = await db
    .insert(jabatanPerangkat)
    .values({ villageId: desaA, nama: `Jabatan A ${RUN}`, slug: `jabatan-a-${RUN}` })
    .$returningId();
  const [jabatanBRow] = await db
    .insert(jabatanPerangkat)
    .values({ villageId: desaB, nama: `Jabatan B ${RUN}`, slug: `jabatan-b-${RUN}` })
    .$returningId();

  fixture = {
    desaA,
    desaB,
    kategoriA: idDari(kategoriARow, "kategori A"),
    kategoriB: idDari(kategoriBRow, "kategori B"),
    jabatanA: idDari(jabatanARow, "jabatan A"),
    jabatanB: idDari(jabatanBRow, "jabatan B"),
  };
});

afterAll(async () => {
  if (fixture === null) return;
  const desaIds = [fixture.desaA, fixture.desaB];
  // Composite FK RESTRICT: anak dibersihkan sebelum parent dan desa.
  await db.delete(berita).where(inArray(berita.villageId, desaIds));
  await db.delete(perangkatDesa).where(inArray(perangkatDesa.villageId, desaIds));
  await db.delete(beritaKategori).where(inArray(beritaKategori.villageId, desaIds));
  await db.delete(jabatanPerangkat).where(inArray(jabatanPerangkat.villageId, desaIds));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("AUD-034 B4C-1 composite tenant FK", () => {
  it("berjalan pada MySQL 8", async () => {
    const versi = (await db.execute(sql`SELECT VERSION() AS versi`)) as unknown as [
      Array<{ versi: string }>,
      unknown,
    ];
    expect(versi[0][0]?.versi).toMatch(/^8\./);
  });

  it("menolak insert lintas desa pada kedua relasi", async () => {
    const f = dataUji();
    const kasus: Array<{ nama: string; jalankan: () => Promise<unknown> }> = [
      {
        nama: "berita.kategori_id",
        jalankan: () =>
          db.insert(berita).values({
            villageId: f.desaA,
            kategoriId: f.kategoriB,
            judul: `Berita lintas ${RUN}`,
            slug: `berita-lintas-${RUN}`,
            isi: "Isi uji.",
          }),
      },
      {
        nama: "perangkat_desa.jabatan_id",
        jalankan: () =>
          db.insert(perangkatDesa).values({
            villageId: f.desaA,
            jabatanId: f.jabatanB,
            nama: `Perangkat lintas ${RUN}`,
          }),
      },
    ];

    for (const item of kasus) {
      const errorCode = await kodeGalat(item.jalankan);
      expect([1452, "ER_NO_REFERENCED_ROW_2"], item.nama).toContain(errorCode);
    }
  });

  it("menerima relasi sewilayah dan referensi NULL", async () => {
    const f = dataUji();
    await expect(
      db.insert(berita).values({
        villageId: f.desaA,
        kategoriId: f.kategoriA,
        judul: `Berita sah ${RUN}`,
        slug: `berita-sah-${RUN}`,
        isi: "Isi uji.",
      }),
    ).resolves.toBeDefined();
    await expect(
      db.insert(perangkatDesa).values({
        villageId: f.desaA,
        jabatanId: f.jabatanA,
        nama: `Perangkat sah ${RUN}`,
      }),
    ).resolves.toBeDefined();

    // Kolom tetap nullable: berita/perangkat tanpa kategori/jabatan sah.
    await expect(
      db.insert(berita).values({
        villageId: f.desaA,
        kategoriId: null,
        judul: `Berita tanpa kategori ${RUN}`,
        slug: `berita-tanpa-kategori-${RUN}`,
        isi: "Isi uji.",
      }),
    ).resolves.toBeDefined();
    await expect(
      db.insert(perangkatDesa).values({
        villageId: f.desaA,
        jabatanId: null,
        nama: `Perangkat tanpa jabatan ${RUN}`,
      }),
    ).resolves.toBeDefined();
  });

  it("menolak update yang memindahkan relasi ke desa lain", async () => {
    const f = dataUji();
    const [beritaRow] = await db
      .insert(berita)
      .values({
        villageId: f.desaA,
        kategoriId: f.kategoriA,
        judul: `Berita update ${RUN}`,
        slug: `berita-update-${RUN}`,
        isi: "Isi uji.",
      })
      .$returningId();
    const [perangkatRow] = await db
      .insert(perangkatDesa)
      .values({
        villageId: f.desaA,
        jabatanId: f.jabatanA,
        nama: `Perangkat update ${RUN}`,
      })
      .$returningId();

    const kasus: Array<{ nama: string; jalankan: () => Promise<unknown> }> = [
      {
        nama: "berita.kategori_id",
        jalankan: () =>
          db
            .update(berita)
            .set({ kategoriId: f.kategoriB })
            .where(eq(berita.id, idDari(beritaRow, "berita update"))),
      },
      {
        nama: "perangkat_desa.jabatan_id",
        jalankan: () =>
          db
            .update(perangkatDesa)
            .set({ jabatanId: f.jabatanB })
            .where(eq(perangkatDesa.id, idDari(perangkatRow, "perangkat update"))),
      },
    ];

    for (const item of kasus) {
      const errorCode = await kodeGalat(item.jalankan);
      expect([1452, "ER_NO_REFERENCED_ROW_2"], item.nama).toContain(errorCode);
    }
  });

  it("menolak hapus parent yang masih dirujuk, lalu berhasil setelah anak dilepas", async () => {
    const f = dataUji();
    const [kategoriRow] = await db
      .insert(beritaKategori)
      .values({
        villageId: f.desaA,
        nama: `Kategori terpakai ${RUN}`,
        slug: `kategori-pakai-${RUN}`,
      })
      .$returningId();
    const [jabatanRow] = await db
      .insert(jabatanPerangkat)
      .values({ villageId: f.desaA, nama: `Jabatan terpakai ${RUN}`, slug: `jabatan-pakai-${RUN}` })
      .$returningId();
    const kategoriId = idDari(kategoriRow, "kategori terpakai");
    const jabatanId = idDari(jabatanRow, "jabatan terpakai");

    const [beritaRow] = await db
      .insert(berita)
      .values({
        villageId: f.desaA,
        kategoriId,
        judul: `Berita terpakai ${RUN}`,
        slug: `berita-terpakai-${RUN}`,
        isi: "Isi uji.",
      })
      .$returningId();
    const [perangkatRow] = await db
      .insert(perangkatDesa)
      .values({ villageId: f.desaA, jabatanId, nama: `Perangkat terpakai ${RUN}` })
      .$returningId();

    // Perilaku berubah dari SET NULL: parent tidak bisa dihapus selama dirujuk.
    expect([1451, "ER_ROW_IS_REFERENCED_2"]).toContain(
      await kodeGalat(() => db.delete(beritaKategori).where(eq(beritaKategori.id, kategoriId))),
    );
    expect([1451, "ER_ROW_IS_REFERENCED_2"]).toContain(
      await kodeGalat(() => db.delete(jabatanPerangkat).where(eq(jabatanPerangkat.id, jabatanId))),
    );

    // Setelah referensi dilepas, penghapusan parent berhasil.
    await db
      .update(berita)
      .set({ kategoriId: null })
      .where(eq(berita.id, idDari(beritaRow, "berita terpakai")));
    await db
      .update(perangkatDesa)
      .set({ jabatanId: null })
      .where(eq(perangkatDesa.id, idDari(perangkatRow, "perangkat terpakai")));

    await expect(
      db.delete(beritaKategori).where(eq(beritaKategori.id, kategoriId)),
    ).resolves.toBeDefined();
    await expect(
      db.delete(jabatanPerangkat).where(eq(jabatanPerangkat.id, jabatanId)),
    ).resolves.toBeDefined();

    const [beritaTersisa] = await db
      .select({ kategoriId: berita.kategoriId })
      .from(berita)
      .where(eq(berita.id, idDari(beritaRow, "berita terpakai")));
    const [perangkatTersisa] = await db
      .select({ jabatanId: perangkatDesa.jabatanId })
      .from(perangkatDesa)
      .where(eq(perangkatDesa.id, idDari(perangkatRow, "perangkat terpakai")));
    expect(beritaTersisa).toEqual({ kategoriId: null });
    expect(perangkatTersisa).toEqual({ jabatanId: null });
  });

  it("menghapus desa setelah anak dibersihkan lebih dulu", async () => {
    const f = dataUji();
    const [desaRow] = await db
      .insert(villages)
      .values({ name: `Desa purge ${RUN}`, code: `PG${KODE}` })
      .$returningId();
    const desaId = idDari(desaRow, "desa purge");
    const [kategoriRow] = await db
      .insert(beritaKategori)
      .values({ villageId: desaId, nama: `Kategori purge ${RUN}`, slug: `kategori-purge-${RUN}` })
      .$returningId();
    const [jabatanRow] = await db
      .insert(jabatanPerangkat)
      .values({ villageId: desaId, nama: `Jabatan purge ${RUN}`, slug: `jabatan-purge-${RUN}` })
      .$returningId();
    await db.insert(berita).values({
      villageId: desaId,
      kategoriId: idDari(kategoriRow, "kategori purge"),
      judul: `Berita purge ${RUN}`,
      slug: `berita-purge-${RUN}`,
      isi: "Isi uji.",
    });
    await db.insert(perangkatDesa).values({
      villageId: desaId,
      jabatanId: idDari(jabatanRow, "jabatan purge"),
      nama: `Perangkat purge ${RUN}`,
    });

    // Urutan cascade antar-anak tidak dijamin MySQL, jadi anak dilepas eksplisit.
    await db.delete(berita).where(eq(berita.villageId, desaId));
    await db.delete(perangkatDesa).where(eq(perangkatDesa.villageId, desaId));
    await expect(db.delete(villages).where(eq(villages.id, desaId))).resolves.toBeDefined();

    const sisa = await Promise.all([
      db
        .select({ id: beritaKategori.id })
        .from(beritaKategori)
        .where(eq(beritaKategori.villageId, desaId)),
      db
        .select({ id: jabatanPerangkat.id })
        .from(jabatanPerangkat)
        .where(eq(jabatanPerangkat.villageId, desaId)),
    ]);
    expect(sisa.every((rows) => rows.length === 0)).toBe(true);
    expect(f.desaA).toBeGreaterThan(0);
  });
});
