import { fileURLToPath } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  buktiPengirimanNotifikasi,
  bumindesBuku,
  bumindesItem,
  bumindesTanahKas,
  bumindesTanahKasMutasi,
  galeriAlbum,
  galeriFoto,
  lapak,
  lapakProduk,
  pemilihan,
  pemilihanKandidat,
  pengaduan,
  villages,
} from "@/db/schema";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/** AUD-034 Batch 4A: direct database enforcement for six tenant relations. */
const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = String(Date.now()).slice(-7);
const KODE = String(Date.now()).slice(-5);

interface Fixture {
  desaA: number;
  desaB: number;
  bukuA: number;
  bukuB: number;
  tanahA: number;
  tanahB: number;
  albumA: number;
  albumB: number;
  lapakA: number;
  lapakB: number;
  pengaduanA: number;
  pengaduanB: number;
  pemilihanA: number;
  pemilihanB: number;
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
    .values({
      name: `Desa B4 A ${RUN}`,
      code: `B4A${KODE}`,
    })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({
      name: `Desa B4 B ${RUN}`,
      code: `B4B${KODE}`,
    })
    .$returningId();
  const desaA = idDari(desaARow, "desa A");
  const desaB = idDari(desaBRow, "desa B");

  const [bukuARow] = await db
    .insert(bumindesBuku)
    .values({
      villageId: desaA,
      kodeBuku: `BA${RUN}`,
      namaBuku: "Buku A",
    })
    .$returningId();
  const [bukuBRow] = await db
    .insert(bumindesBuku)
    .values({
      villageId: desaB,
      kodeBuku: `BB${RUN}`,
      namaBuku: "Buku B",
    })
    .$returningId();

  const [tanahARow] = await db
    .insert(bumindesTanahKas)
    .values({
      villageId: desaA,
      nomorPersil: `TA${RUN}`,
    })
    .$returningId();
  const [tanahBRow] = await db
    .insert(bumindesTanahKas)
    .values({
      villageId: desaB,
      nomorPersil: `TB${RUN}`,
    })
    .$returningId();

  const [albumARow] = await db
    .insert(galeriAlbum)
    .values({
      villageId: desaA,
      nama: "Album A",
      slug: `album-a-${RUN}`,
    })
    .$returningId();
  const [albumBRow] = await db
    .insert(galeriAlbum)
    .values({
      villageId: desaB,
      nama: "Album B",
      slug: `album-b-${RUN}`,
    })
    .$returningId();

  const [lapakARow] = await db
    .insert(lapak)
    .values({
      villageId: desaA,
      nama: "Lapak A",
    })
    .$returningId();
  const [lapakBRow] = await db
    .insert(lapak)
    .values({
      villageId: desaB,
      nama: "Lapak B",
    })
    .$returningId();

  const [pengaduanARow] = await db
    .insert(pengaduan)
    .values({
      villageId: desaA,
      nomorTiket: `PGA-${RUN}`,
      judul: "A",
      isi: "A",
      namaPelapor: "Pelapor A",
    })
    .$returningId();
  const [pengaduanBRow] = await db
    .insert(pengaduan)
    .values({
      villageId: desaB,
      nomorTiket: `PGB-${RUN}`,
      judul: "B",
      isi: "B",
      namaPelapor: "Pelapor B",
    })
    .$returningId();

  const [pemilihanARow] = await db
    .insert(pemilihan)
    .values({
      villageId: desaA,
      tahun: 2026,
      jenis: "kepala_desa",
    })
    .$returningId();
  const [pemilihanBRow] = await db
    .insert(pemilihan)
    .values({
      villageId: desaB,
      tahun: 2026,
      jenis: "kepala_desa",
    })
    .$returningId();

  fixture = {
    desaA,
    desaB,
    bukuA: idDari(bukuARow, "buku A"),
    bukuB: idDari(bukuBRow, "buku B"),
    tanahA: idDari(tanahARow, "tanah A"),
    tanahB: idDari(tanahBRow, "tanah B"),
    albumA: idDari(albumARow, "album A"),
    albumB: idDari(albumBRow, "album B"),
    lapakA: idDari(lapakARow, "lapak A"),
    lapakB: idDari(lapakBRow, "lapak B"),
    pengaduanA: idDari(pengaduanARow, "pengaduan A"),
    pengaduanB: idDari(pengaduanBRow, "pengaduan B"),
    pemilihanA: idDari(pemilihanARow, "pemilihan A"),
    pemilihanB: idDari(pemilihanBRow, "pemilihan B"),
  };
});

afterAll(async () => {
  if (fixture === null) return;
  await db.delete(villages).where(inArray(villages.id, [fixture.desaA, fixture.desaB]));
});

describe("AUD-034 B4 composite tenant FK", () => {
  it("berjalan pada MySQL 8", async () => {
    const versi = (await db.execute(sql`SELECT VERSION() AS versi`)) as unknown as [
      Array<{ versi: string }>,
      unknown,
    ];
    expect(versi[0][0]?.versi).toMatch(/^8\./);
  });

  it("menolak insert lintas desa pada keenam relasi", async () => {
    const f = dataUji();
    const kasus: Array<{ nama: string; jalankan: () => Promise<unknown> }> = [
      {
        nama: "bumindes_item.buku_id",
        jalankan: () =>
          db.insert(bumindesItem).values({
            villageId: f.desaA,
            bukuId: f.bukuB,
            uraian: "cross tenant",
          }),
      },
      {
        nama: "bumindes_tanah_kas_mutasi.tanah_kas_id",
        jalankan: () =>
          db.insert(bumindesTanahKasMutasi).values({
            villageId: f.desaA,
            tanahKasId: f.tanahB,
            tanggal: "2026-11-14",
            jenis: "perubahan",
            uraian: "cross tenant",
          }),
      },
      {
        nama: "galeri_foto.album_id",
        jalankan: () =>
          db.insert(galeriFoto).values({
            villageId: f.desaA,
            albumId: f.albumB,
            gambar: "cross-tenant.jpg",
          }),
      },
      {
        nama: "lapak_produk.lapak_id",
        jalankan: () =>
          db.insert(lapakProduk).values({
            villageId: f.desaA,
            lapakId: f.lapakB,
            nama: "cross tenant",
            harga: "1000",
          }),
      },
      {
        nama: "bukti_pengiriman_notifikasi.pengaduan_id",
        jalankan: () =>
          db.insert(buktiPengirimanNotifikasi).values({
            villageId: f.desaA,
            pengaduanId: f.pengaduanB,
            metode: "email",
            target: "b@example.test",
          }),
      },
      {
        nama: "pemilihan_kandidat.pemilihan_id",
        jalankan: () =>
          db.insert(pemilihanKandidat).values({
            villageId: f.desaA,
            pemilihanId: f.pemilihanB,
            nomorUrut: 1,
            nama: "cross tenant",
          }),
      },
    ];

    for (const item of kasus) {
      const errorCode = await kodeGalat(item.jalankan);
      expect([1452, "ER_NO_REFERENCED_ROW_2"], item.nama).toContain(errorCode);
    }
  });

  it("menerima keenam relasi yang sah dan foto tanpa album (NULL)", async () => {
    const f = dataUji();
    await expect(
      db.insert(bumindesItem).values({
        villageId: f.desaA,
        bukuId: f.bukuA,
        uraian: "valid",
      }),
    ).resolves.toBeDefined();
    await expect(
      db.insert(bumindesTanahKasMutasi).values({
        villageId: f.desaA,
        tanahKasId: f.tanahA,
        tanggal: "2026-11-14",
        jenis: "perubahan",
        uraian: "valid",
      }),
    ).resolves.toBeDefined();
    await expect(
      db.insert(galeriFoto).values({
        villageId: f.desaA,
        albumId: f.albumA,
        gambar: "valid.jpg",
      }),
    ).resolves.toBeDefined();
    await expect(
      db.insert(galeriFoto).values({
        villageId: f.desaA,
        albumId: null,
        gambar: "standalone.jpg",
      }),
    ).resolves.toBeDefined();
    await expect(
      db.insert(lapakProduk).values({
        villageId: f.desaA,
        lapakId: f.lapakA,
        nama: "valid",
        harga: "1000",
      }),
    ).resolves.toBeDefined();
    await expect(
      db.insert(buktiPengirimanNotifikasi).values({
        villageId: f.desaA,
        pengaduanId: f.pengaduanA,
        metode: "email",
        target: "a@example.test",
      }),
    ).resolves.toBeDefined();
    await expect(
      db.insert(pemilihanKandidat).values({
        villageId: f.desaA,
        pemilihanId: f.pemilihanA,
        nomorUrut: 1,
        nama: "valid",
      }),
    ).resolves.toBeDefined();
  });

  it("menolak update yang memindahkan keenam relasi ke desa lain", async () => {
    const f = dataUji();
    const [item] = await db
      .insert(bumindesItem)
      .values({
        villageId: f.desaA,
        bukuId: f.bukuA,
        uraian: "update guard",
      })
      .$returningId();
    const [mutasi] = await db
      .insert(bumindesTanahKasMutasi)
      .values({
        villageId: f.desaA,
        tanahKasId: f.tanahA,
        tanggal: "2026-11-14",
        jenis: "perubahan",
        uraian: "update guard",
      })
      .$returningId();
    const [foto] = await db
      .insert(galeriFoto)
      .values({
        villageId: f.desaA,
        albumId: f.albumA,
        gambar: "update-guard.jpg",
      })
      .$returningId();
    const [produk] = await db
      .insert(lapakProduk)
      .values({
        villageId: f.desaA,
        lapakId: f.lapakA,
        nama: "update guard",
        harga: "1000",
      })
      .$returningId();
    const [bukti] = await db
      .insert(buktiPengirimanNotifikasi)
      .values({
        villageId: f.desaA,
        pengaduanId: f.pengaduanA,
        metode: "email",
        target: "update@example.test",
      })
      .$returningId();
    const [kandidat] = await db
      .insert(pemilihanKandidat)
      .values({
        villageId: f.desaA,
        pemilihanId: f.pemilihanA,
        nomorUrut: 3,
        nama: "update guard",
      })
      .$returningId();

    const kasus: Array<{ nama: string; jalankan: () => Promise<unknown> }> = [
      {
        nama: "bumindes_item",
        jalankan: () =>
          db
            .update(bumindesItem)
            .set({ bukuId: f.bukuB })
            .where(eq(bumindesItem.id, idDari(item, "item update"))),
      },
      {
        nama: "bumindes_tanah_kas_mutasi",
        jalankan: () =>
          db
            .update(bumindesTanahKasMutasi)
            .set({ tanahKasId: f.tanahB })
            .where(eq(bumindesTanahKasMutasi.id, idDari(mutasi, "mutasi update"))),
      },
      {
        nama: "galeri_foto",
        jalankan: () =>
          db
            .update(galeriFoto)
            .set({ albumId: f.albumB })
            .where(eq(galeriFoto.id, idDari(foto, "foto update"))),
      },
      {
        nama: "lapak_produk",
        jalankan: () =>
          db
            .update(lapakProduk)
            .set({ lapakId: f.lapakB })
            .where(eq(lapakProduk.id, idDari(produk, "produk update"))),
      },
      {
        nama: "bukti_pengiriman_notifikasi",
        jalankan: () =>
          db
            .update(buktiPengirimanNotifikasi)
            .set({ pengaduanId: f.pengaduanB })
            .where(eq(buktiPengirimanNotifikasi.id, idDari(bukti, "bukti update"))),
      },
      {
        nama: "pemilihan_kandidat",
        jalankan: () =>
          db
            .update(pemilihanKandidat)
            .set({ pemilihanId: f.pemilihanB })
            .where(eq(pemilihanKandidat.id, idDari(kandidat, "kandidat update"))),
      },
    ];

    for (const item of kasus) {
      const errorCode = await kodeGalat(item.jalankan);
      expect([1452, "ER_NO_REFERENCED_ROW_2"], item.nama).toContain(errorCode);
    }
  });

  it("menghapus anak melalui CASCADE tanpa menghapus data desa lain", async () => {
    const f = dataUji();

    const [itemRow] = await db
      .insert(bumindesItem)
      .values({
        villageId: f.desaA,
        bukuId: f.bukuA,
        uraian: "cascade",
      })
      .$returningId();
    const [mutasiRow] = await db
      .insert(bumindesTanahKasMutasi)
      .values({
        villageId: f.desaA,
        tanahKasId: f.tanahA,
        tanggal: "2026-11-14",
        jenis: "perubahan",
        uraian: "cascade",
      })
      .$returningId();
    const [fotoRow] = await db
      .insert(galeriFoto)
      .values({
        villageId: f.desaA,
        albumId: f.albumA,
        gambar: "cascade.jpg",
      })
      .$returningId();
    const [produkRow] = await db
      .insert(lapakProduk)
      .values({
        villageId: f.desaA,
        lapakId: f.lapakA,
        nama: "cascade",
        harga: "1000",
      })
      .$returningId();
    const [buktiRow] = await db
      .insert(buktiPengirimanNotifikasi)
      .values({
        villageId: f.desaA,
        pengaduanId: f.pengaduanA,
        metode: "whatsapp",
        target: "08123456789",
      })
      .$returningId();
    const [kandidatRow] = await db
      .insert(pemilihanKandidat)
      .values({
        villageId: f.desaA,
        pemilihanId: f.pemilihanA,
        nomorUrut: 2,
        nama: "cascade",
      })
      .$returningId();

    await db.delete(bumindesBuku).where(eq(bumindesBuku.id, f.bukuA));
    await db.delete(bumindesTanahKas).where(eq(bumindesTanahKas.id, f.tanahA));
    await db.delete(galeriAlbum).where(eq(galeriAlbum.id, f.albumA));
    await db.delete(lapak).where(eq(lapak.id, f.lapakA));
    await db.delete(pengaduan).where(eq(pengaduan.id, f.pengaduanA));
    await db.delete(pemilihan).where(eq(pemilihan.id, f.pemilihanA));

    const hasil = await Promise.all([
      db
        .select({ id: bumindesItem.id })
        .from(bumindesItem)
        .where(eq(bumindesItem.id, idDari(itemRow, "item"))),
      db
        .select({ id: bumindesTanahKasMutasi.id })
        .from(bumindesTanahKasMutasi)
        .where(eq(bumindesTanahKasMutasi.id, idDari(mutasiRow, "mutasi"))),
      db
        .select({ id: galeriFoto.id })
        .from(galeriFoto)
        .where(eq(galeriFoto.id, idDari(fotoRow, "foto"))),
      db
        .select({ id: lapakProduk.id })
        .from(lapakProduk)
        .where(eq(lapakProduk.id, idDari(produkRow, "produk"))),
      db
        .select({ id: buktiPengirimanNotifikasi.id })
        .from(buktiPengirimanNotifikasi)
        .where(eq(buktiPengirimanNotifikasi.id, idDari(buktiRow, "bukti"))),
      db
        .select({ id: pemilihanKandidat.id })
        .from(pemilihanKandidat)
        .where(eq(pemilihanKandidat.id, idDari(kandidatRow, "kandidat"))),
    ]);
    expect(hasil.every((rows) => rows.length === 0)).toBe(true);

    const [fotoMandiri] = await db
      .select({ id: galeriFoto.id })
      .from(galeriFoto)
      .where(eq(galeriFoto.gambar, "standalone.jpg"));
    expect(fotoMandiri).toBeDefined();
    expect(f.desaB).toBeGreaterThan(0);
  });
});
