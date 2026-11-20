import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  bumindesAparat,
  bumindesBuku,
  bumindesItem,
  bumindesKader,
  bumindesPembangunan,
  bumindesPeraturan,
  bumindesTanahKas,
  bumindesTanahKasMutasi,
  idmIndikator,
  idmSdgs,
  pelanggan,
  pengaduan,
  villages,
} from "@/db/schema";
import {
  buatKunciApiRecord,
  findKunciApi,
  listKunciApi,
  nonaktifkanKunciApi,
} from "@/features/api-eksternal/infrastructure/api-key-repository";
import {
  deleteBumindesItem,
  getBumindesBuku,
  getBumindesItem,
  insertBumindesItem,
  listBumindesBuku,
  listBumindesItem,
  updateBumindesItem,
} from "@/features/bumindes/infrastructure/bumindes-repository";
import {
  getBumindesPembangunan,
  listBumindesKader,
  listBumindesPembangunan,
} from "@/features/bumindes/infrastructure/pembangunan-repository";
import {
  getBumindesPeraturan,
  listBumindesAparat,
  listBumindesPeraturan,
} from "@/features/bumindes/infrastructure/sekretariat-repository";
import {
  getBumindesTanahKas,
  listBumindesTanahKas,
  listBumindesTanahKasMutasi,
} from "@/features/bumindes/infrastructure/tanah-kas-repository";
import {
  createIdm,
  deleteIdm,
  deleteSdgs,
  listIdm,
  listSdgs,
  listTahunIdm,
  updateIdm,
  upsertSdgs,
} from "@/features/idm/infrastructure/idm-repository";
import {
  deletePelanggan,
  findPelanggan,
  listPelanggan,
  updatePelanggan,
} from "@/features/pelanggan/infrastructure/pelanggan-repository";
import {
  countTiketPadaTanggal,
  deletePengaduan,
  getPengaduan,
  insertPengaduan,
  listPengaduan,
  listPengaduanPublik,
  setPublikPengaduan,
  updateTanggapanPengaduan,
} from "@/features/pengaduan/infrastructure/pengaduan-repository";
import {
  hapusStatusPlugin,
  listStatusPlugin,
  simpanStatusPlugin,
} from "@/features/plugin/infrastructure/plugin-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * Modul yang sebelumnya belum punya integration test isolasi tenant khusus.
 * Fokus: daftar/detail hanya membaca desa sendiri, dan operasi tulis dengan ID
 * desa lain tidak mengubah baris apa pun.
 */
const MIGRATIONS_FOLDER = fileURLToPath(new URL("../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  desaA: number;
  desaB: number;
  idmA: number;
  idmB: number;
  pengaduanA: number;
  pengaduanB: number;
  bukuA: number;
  bukuB: number;
  itemA: number;
  itemB: number;
  peraturanA: number;
  peraturanB: number;
  tanahA: number;
  tanahB: number;
  pembangunanA: number;
  pembangunanB: number;
  kaderA: number;
  kaderB: number;
  aparatA: number;
  aparatB: number;
  kunciA: number;
  kunciB: number;
  pelangganA: number;
  pelangganB: number;
}

let fixture: Fixture | null = null;

function data(): Fixture {
  if (fixture === null) throw new Error("Fixture isolasi modul belum siap.");
  return fixture;
}

function id(row: { id: number } | undefined, label: string): number {
  if (row === undefined) throw new Error(`Seed gagal: ${label}.`);
  return row.id;
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa Modul A ${RUN}`, code: `MA${RUN.slice(-6)}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa Modul B ${RUN}`, code: `MB${RUN.slice(-6)}` })
    .$returningId();
  const desaA = id(desaARow, "desa A");
  const desaB = id(desaBRow, "desa B");

  const [idmARow] = await db
    .insert(idmIndikator)
    .values({ villageId: desaA, tahun: 2026, kode: "1", nama: `Indikator A ${RUN}` })
    .$returningId();
  const [idmBRow] = await db
    .insert(idmIndikator)
    .values({ villageId: desaB, tahun: 2026, kode: "1", nama: `Indikator B ${RUN}` })
    .$returningId();
  await db.insert(idmSdgs).values([
    { villageId: desaA, tahun: 2026, goal: 1, skor: 70 },
    { villageId: desaB, tahun: 2026, goal: 1, skor: 30 },
  ]);

  const valuesPengaduan = (desa: number, kode: string) => ({
    villageId: desa,
    nomorTiket: `PGD-20261120-${kode}${RUN}`,
    kategori: "umum",
    judul: `Pengaduan ${kode} ${RUN}`,
    isi: `Isi pengaduan ${kode}`,
    namaPelapor: `Pelapor ${kode} ${RUN}`,
    nik: null,
    telepon: null,
    email: null,
    alamat: null,
    lampiran: null,
    publik: true,
  });
  const [pengaduanARow] = await db
    .insert(pengaduan)
    .values(valuesPengaduan(desaA, "A"))
    .$returningId();
  const [pengaduanBRow] = await db
    .insert(pengaduan)
    .values(valuesPengaduan(desaB, "B"))
    .$returningId();

  const [bukuARow] = await db
    .insert(bumindesBuku)
    .values({ villageId: desaA, kodeBuku: `A-${RUN}`, namaBuku: `Buku A ${RUN}` })
    .$returningId();
  const [bukuBRow] = await db
    .insert(bumindesBuku)
    .values({ villageId: desaB, kodeBuku: `B-${RUN}`, namaBuku: `Buku B ${RUN}` })
    .$returningId();
  const bukuA = id(bukuARow, "buku A");
  const bukuB = id(bukuBRow, "buku B");

  const [itemARow] = await db
    .insert(bumindesItem)
    .values({ villageId: desaA, bukuId: bukuA, nomorUrut: 1, uraian: `Item A ${RUN}` })
    .$returningId();
  const [itemBRow] = await db
    .insert(bumindesItem)
    .values({ villageId: desaB, bukuId: bukuB, nomorUrut: 1, uraian: `Item B ${RUN}` })
    .$returningId();

  const [peraturanARow] = await db
    .insert(bumindesPeraturan)
    .values({ villageId: desaA, nomor: `01/${RUN}`, tentang: `Peraturan A ${RUN}` })
    .$returningId();
  const [peraturanBRow] = await db
    .insert(bumindesPeraturan)
    .values({ villageId: desaB, nomor: `02/${RUN}`, tentang: `Peraturan B ${RUN}` })
    .$returningId();

  const [tanahARow] = await db
    .insert(bumindesTanahKas)
    .values({ villageId: desaA, nomorPersil: `A-${RUN}`, luas: "100", nilai: "1000000" })
    .$returningId();
  const [tanahBRow] = await db
    .insert(bumindesTanahKas)
    .values({ villageId: desaB, nomorPersil: `B-${RUN}`, luas: "200", nilai: "2000000" })
    .$returningId();
  const tanahA = id(tanahARow, "tanah A");
  const tanahB = id(tanahBRow, "tanah B");
  await db.insert(bumindesTanahKasMutasi).values([
    {
      villageId: desaA,
      tanahKasId: tanahA,
      tanggal: "2026-01-01",
      jenis: "tambah",
      uraian: `Mutasi A ${RUN}`,
    },
    {
      villageId: desaB,
      tanahKasId: tanahB,
      tanggal: "2026-01-02",
      jenis: "kurang",
      uraian: `Mutasi B ${RUN}`,
    },
  ]);

  const [pembangunanARow] = await db
    .insert(bumindesPembangunan)
    .values({
      villageId: desaA,
      tahun: 2026,
      namaKegiatan: `Pembangunan A ${RUN}`,
      status: "rencana",
      biaya: "1000000",
    })
    .$returningId();
  const [pembangunanBRow] = await db
    .insert(bumindesPembangunan)
    .values({
      villageId: desaB,
      tahun: 2026,
      namaKegiatan: `Pembangunan B ${RUN}`,
      status: "rencana",
      biaya: "2000000",
    })
    .$returningId();

  const [kaderARow] = await db
    .insert(bumindesKader)
    .values({ villageId: desaA, nama: `Kader A ${RUN}` })
    .$returningId();
  const [kaderBRow] = await db
    .insert(bumindesKader)
    .values({ villageId: desaB, nama: `Kader B ${RUN}` })
    .$returningId();

  const [aparatARow] = await db
    .insert(bumindesAparat)
    .values({ villageId: desaA, nama: `Aparat A ${RUN}`, jabatan: "Kaur" })
    .$returningId();
  const [aparatBRow] = await db
    .insert(bumindesAparat)
    .values({ villageId: desaB, nama: `Aparat B ${RUN}`, jabatan: "Kaur" })
    .$returningId();

  const kunciA = await buatKunciApiRecord({
    villageId: desaA,
    name: `Kunci A ${RUN}`,
    hashedKey: `hash-a-${RUN}`,
    prefix: `pa${RUN.slice(-4)}`,
    rateLimit: 10,
    expiresAt: null,
  });
  const kunciB = await buatKunciApiRecord({
    villageId: desaB,
    name: `Kunci B ${RUN}`,
    hashedKey: `hash-b-${RUN}`,
    prefix: `pb${RUN.slice(-4)}`,
    rateLimit: 10,
    expiresAt: null,
  });

  const [pelangganARow] = await db
    .insert(pelanggan)
    .values({ villageId: desaA, nama: `Pelanggan A ${RUN}` })
    .$returningId();
  const [pelangganBRow] = await db
    .insert(pelanggan)
    .values({ villageId: desaB, nama: `Pelanggan B ${RUN}` })
    .$returningId();

  fixture = {
    desaA,
    desaB,
    idmA: id(idmARow, "indikator A"),
    idmB: id(idmBRow, "indikator B"),
    pengaduanA: id(pengaduanARow, "pengaduan A"),
    pengaduanB: id(pengaduanBRow, "pengaduan B"),
    bukuA,
    bukuB,
    itemA: id(itemARow, "item A"),
    itemB: id(itemBRow, "item B"),
    peraturanA: id(peraturanARow, "peraturan A"),
    peraturanB: id(peraturanBRow, "peraturan B"),
    tanahA,
    tanahB,
    pembangunanA: id(pembangunanARow, "pembangunan A"),
    pembangunanB: id(pembangunanBRow, "pembangunan B"),
    kaderA: id(kaderARow, "kader A"),
    kaderB: id(kaderBRow, "kader B"),
    aparatA: id(aparatARow, "aparat A"),
    aparatB: id(aparatBRow, "aparat B"),
    kunciA,
    kunciB,
    pelangganA: id(pelangganARow, "pelanggan A"),
    pelangganB: id(pelangganBRow, "pelanggan B"),
  };
});

afterAll(async () => {
  if (fixture === null) return;
  await db.delete(villages).where(inArray(villages.id, [fixture.desaA, fixture.desaB]));
});

describe("IDM", () => {
  it("membatasi daftar, tahun, SDGs, dan operasi tulis pada desa sendiri", async () => {
    const f = data();

    expect((await listIdm(f.desaA)).map((row) => row.id)).toEqual([f.idmA]);
    expect(await listTahunIdm(f.desaA)).toEqual([2026]);
    expect((await listSdgs(f.desaA, 2026)).map((row) => row.skor)).toEqual([70]);

    await updateIdm(f.idmB, f.desaA, { nama: `Diubah ${RUN}` });
    await deleteIdm(f.idmB, f.desaA);
    const [indikatorB] = await db
      .select({ nama: idmIndikator.nama })
      .from(idmIndikator)
      .where(eq(idmIndikator.id, f.idmB))
      .limit(1);
    expect(indikatorB?.nama).toBe(`Indikator B ${RUN}`);

    await upsertSdgs({ villageId: f.desaA, tahun: 2026, goal: 1, skor: 80 });
    expect((await listSdgs(f.desaA, 2026)).map((row) => row.skor)).toEqual([80]);
    await deleteSdgs(f.desaA, 2026, 1);
    expect(await listSdgs(f.desaA, 2026)).toEqual([]);
    expect((await listSdgs(f.desaB, 2026)).map((row) => row.skor)).toEqual([30]);

    const baru = await createIdm({
      villageId: f.desaA,
      tahun: 2027,
      kode: "2",
      nama: `Indikator baru ${RUN}`,
    });
    expect((await listIdm(f.desaA, 2027)).map((row) => row.id)).toEqual([baru]);
  });
});

describe("Pengaduan", () => {
  it("membatasi daftar, detail, publik, hitungan, dan aksi tulis", async () => {
    const f = data();

    expect((await listPengaduan(f.desaA)).map((row) => row.id)).toEqual([f.pengaduanA]);
    expect(await getPengaduan(f.desaA, f.pengaduanB)).toBeNull();
    expect((await listPengaduanPublik(f.desaA)).map((row) => row.id)).toEqual([f.pengaduanA]);
    expect(await countTiketPadaTanggal(f.desaA, "PGD-20261120-")).toBe(1);

    expect(
      await updateTanggapanPengaduan(f.desaA, f.pengaduanB, {
        status: "selesai",
        tanggapan: `Diubah ${RUN}`,
        publik: false,
        petugasId: null,
        ditanggapiPada: new Date(),
      }),
    ).toBe(false);
    expect(await setPublikPengaduan(f.desaA, f.pengaduanB, false)).toBe(false);
    expect(await deletePengaduan(f.desaA, f.pengaduanB)).toBe(false);

    const baru = await insertPengaduan(f.desaA, {
      nomorTiket: `PGD-20261120-N${RUN}`,
      kategori: "umum",
      judul: `Pengaduan baru ${RUN}`,
      isi: "Isi",
      namaPelapor: "Pelapor",
      nik: null,
      telepon: null,
      email: null,
      alamat: null,
      lampiran: null,
    });
    expect((await listPengaduan(f.desaA)).map((row) => row.id)).toContain(baru);
  });
});

describe("BUMDes", () => {
  it("membatasi buku, item, peraturan, aparat, tanah kas, pembangunan, dan kader", async () => {
    const f = data();

    expect((await listBumindesBuku(f.desaA)).map((row) => row.id)).toEqual([f.bukuA]);
    expect(await getBumindesBuku(f.desaA, f.bukuB)).toBeNull();
    expect((await listBumindesItem(f.desaA, f.bukuA)).map((row) => row.id)).toEqual([f.itemA]);
    expect(await getBumindesItem(f.desaA, f.itemB)).toBeNull();
    expect(
      await updateBumindesItem(f.desaA, f.itemB, {
        nomorUrut: 9,
        tanggal: null,
        uraian: "Diubah",
        keterangan: null,
      }),
    ).toBe(false);
    expect(await deleteBumindesItem(f.desaA, f.itemB)).toBe(false);

    const itemBaru = await insertBumindesItem(f.desaA, {
      bukuId: f.bukuA,
      nomorUrut: 2,
      tanggal: "2026-11-20",
      uraian: `Item baru ${RUN}`,
      keterangan: null,
    });
    expect((await listBumindesItem(f.desaA, f.bukuA)).map((row) => row.id)).toContain(itemBaru);

    expect((await listBumindesPeraturan(f.desaA)).map((row) => row.id)).toEqual([f.peraturanA]);
    expect(await getBumindesPeraturan(f.desaA, f.peraturanB)).toBeNull();
    expect((await listBumindesAparat(f.desaA)).map((row) => row.id)).toEqual([f.aparatA]);
    expect((await listBumindesTanahKas(f.desaA)).map((row) => row.id)).toEqual([f.tanahA]);
    expect(await getBumindesTanahKas(f.desaA, f.tanahB)).toBeNull();
    expect((await listBumindesTanahKasMutasi(f.desaA)).map((row) => row.tanahKasId)).toEqual([
      f.tanahA,
    ]);
    expect((await listBumindesPembangunan(f.desaA)).map((row) => row.id)).toEqual([f.pembangunanA]);
    expect(await getBumindesPembangunan(f.desaA, f.pembangunanB)).toBeNull();
    expect((await listBumindesKader(f.desaA)).map((row) => row.id)).toEqual([f.kaderA]);
  });
});

describe("API eksternal", () => {
  it("membatasi daftar, pencarian, dan penonaktifan kunci per desa", async () => {
    const f = data();

    expect((await listKunciApi(f.desaA)).map((row) => row.id)).toEqual([f.kunciA]);
    expect(await findKunciApi(f.desaA, f.kunciB)).toBeNull();

    await nonaktifkanKunciApi(f.desaA, f.kunciB);
    expect(await findKunciApi(f.desaB, f.kunciB)).toMatchObject({ active: true });
  });
});

describe("Pelanggan", () => {
  it("membatasi daftar, detail, update, dan delete per desa", async () => {
    const f = data();

    expect((await listPelanggan(f.desaA)).map((row) => row.id)).toEqual([f.pelangganA]);
    expect(await findPelanggan(f.desaA, f.pelangganB)).toBeNull();

    await updatePelanggan(f.pelangganB, f.desaA, { nama: `Diubah ${RUN}` });
    await deletePelanggan(f.pelangganB, f.desaA);
    expect(await findPelanggan(f.desaB, f.pelangganB)).toMatchObject({
      nama: `Pelanggan B ${RUN}`,
    });
  });
});

describe("Plugin", () => {
  it("menyimpan status per desa tanpa menimpa desa lain", async () => {
    const f = data();

    await simpanStatusPlugin(f.desaA, "whatsapp", true);
    await simpanStatusPlugin(f.desaB, "whatsapp", false);
    expect((await listStatusPlugin(f.desaA)).get("whatsapp")).toBe(true);
    expect((await listStatusPlugin(f.desaB)).get("whatsapp")).toBe(false);

    await hapusStatusPlugin(f.desaA, "whatsapp");
    expect((await listStatusPlugin(f.desaA)).has("whatsapp")).toBe(false);
    expect((await listStatusPlugin(f.desaB)).get("whatsapp")).toBe(false);
  });
});
