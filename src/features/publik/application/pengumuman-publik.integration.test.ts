import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { berita, beritaKategori, villages } from "@/db/schema";
import { daftarBerita, daftarKategoriBerita } from "@/features/publik/application/konten-publik";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * Uji integrasi untuk data halaman publik `/pengumuman`.
 *
 * Halaman memanggil `daftarKategoriBerita(desa.id)` lalu
 * `daftarBerita(desa.id, { kategoriSlug: "pengumuman" })`; keduanya diuji di sini
 * agar isolasi tenant dan filter status publik tidak hanya diasumsikan. Fixture
 * sengaja memakai dua desa dengan slug kategori yang sama, karena `slug` hanya
 * unik per desa — persis kasus yang bisa membocorkan konten bila filter
 * `village_id` hilang.
 */
const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 6);

let fixture: { desaA: number; desaB: number } | null = null;

function pastiId(row: { id: number | undefined } | undefined, label: string): number {
  if (row?.id === undefined) throw new Error(`Seed uji gagal: ${label}`);
  return row.id;
}

function hariLalu(hari: number): Date {
  return new Date(Date.now() - hari * 24 * 60 * 60 * 1000);
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaA] = await db
    .insert(villages)
    .values({ name: `Desa Pengumuman ${RUN}`, code: `PA${RUN}` })
    .$returningId();
  const [desaB] = await db
    .insert(villages)
    .values({ name: `Desa Lain ${RUN}`, code: `PB${RUN}` })
    .$returningId();

  const desaAId = pastiId(desaA, "desa A");
  const desaBId = pastiId(desaB, "desa B");
  fixture = { desaA: desaAId, desaB: desaBId };

  const [kategoriPengumumanA] = await db
    .insert(beritaKategori)
    .values({ villageId: desaAId, nama: `Pengumuman ${RUN}`, slug: "pengumuman", urut: 1 })
    .$returningId();
  await db.insert(beritaKategori).values({
    villageId: desaAId,
    nama: `Berita Umum ${RUN}`,
    slug: `berita-umum-${RUN}`,
    urut: 2,
  });
  // Kategori nonaktif tidak boleh muncul di filter halaman publik.
  await db.insert(beritaKategori).values({
    villageId: desaAId,
    nama: `Pengumuman Nonaktif ${RUN}`,
    slug: `pengumuman-nonaktif-${RUN}`,
    aktif: false,
    urut: 3,
  });

  // Slug kategori yang sama di desa lain: tanpa filter tenant, kontennya bocor.
  const [kategoriPengumumanB] = await db
    .insert(beritaKategori)
    .values({ villageId: desaBId, nama: `Pengumuman ${RUN}`, slug: "pengumuman", urut: 1 })
    .$returningId();

  const kategoriAId = pastiId(kategoriPengumumanA, "kategori A");
  const kategoriBId = pastiId(kategoriPengumumanB, "kategori B");

  await db.insert(berita).values([
    {
      villageId: desaAId,
      kategoriId: kategoriAId,
      judul: `Pengumuman Desa A ${RUN}`,
      slug: `pengumuman-desa-a-${RUN}`,
      ringkasan: "Informasi khusus warga desa A.",
      isi: "<p>Isi pengumuman desa A.</p>",
      status: "published",
      terbitPada: hariLalu(2),
    },
    {
      villageId: desaAId,
      kategoriId: kategoriAId,
      judul: `Pengumuman Terjadwal ${RUN}`,
      slug: `pengumuman-terjadwal-${RUN}`,
      isi: "<p>Belum boleh tayang.</p>",
      status: "published",
      terbitPada: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      villageId: desaAId,
      kategoriId: kategoriAId,
      judul: `Pengumuman Draf ${RUN}`,
      slug: `pengumuman-draf-${RUN}`,
      isi: "<p>Masih draf.</p>",
      status: "draft",
    },
    {
      villageId: desaAId,
      kategoriId: kategoriAId,
      judul: `Pengumuman Tanpa Jadwal ${RUN}`,
      slug: `pengumuman-tanpa-jadwal-${RUN}`,
      isi: "<p>Terbit tanpa jadwal.</p>",
      status: "published",
      terbitPada: null,
    },
  ]);

  // Berita desa B memakai kategori milik desa B, bukan kategori desa A.
  await db.insert(berita).values({
    villageId: desaBId,
    kategoriId: kategoriBId,
    judul: `Pengumuman Milik B ${RUN}`,
    slug: `pengumuman-milik-b-${RUN}`,
    isi: "<p>Isi pengumuman milik desa B.</p>",
    status: "published",
    terbitPada: hariLalu(1),
  });
});

afterAll(async () => {
  if (!fixture) return;
  // Composite FK RESTRICT `berita_kategori_tenant_fk`: berita dan kategori
  // dibersihkan lebih dulu agar hapus desa tidak bergantung urutan cascade.
  await db.delete(berita).where(inArray(berita.villageId, [fixture.desaA, fixture.desaB]));
  await db
    .delete(beritaKategori)
    .where(inArray(beritaKategori.villageId, [fixture.desaA, fixture.desaB]));
  await db.delete(villages).where(eq(villages.id, fixture.desaA));
  await db.delete(villages).where(eq(villages.id, fixture.desaB));
});

describe("kategori pengumuman publik", () => {
  it("hanya mengembalikan kategori aktif milik desa yang meminta", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    const kategori = await daftarKategoriBerita(fixture.desaA);
    expect(kategori.map((item) => item.slug)).toEqual(["pengumuman", `berita-umum-${RUN}`]);
    expect(kategori.every((item) => item.nama.endsWith(RUN))).toBe(true);

    const kategoriB = await daftarKategoriBerita(fixture.desaB);
    expect(kategoriB.map((item) => item.slug)).toEqual(["pengumuman"]);
  });

  it("tidak menampilkan kategori nonaktif", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    const kategori = await daftarKategoriBerita(fixture.desaA);
    expect(kategori.some((item) => item.slug === `pengumuman-nonaktif-${RUN}`)).toBe(false);
  });
});

describe("daftar pengumuman publik", () => {
  it("hanya menampilkan pengumuman terbit milik desa sendiri", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    const pengumuman = await daftarBerita(fixture.desaA, {
      limit: 60,
      kategoriSlug: "pengumuman",
    });

    expect(pengumuman.map((item) => item.judul).sort()).toEqual(
      [`Pengumuman Desa A ${RUN}`, `Pengumuman Tanpa Jadwal ${RUN}`].sort(),
    );
  });

  it("menyembunyikan draf dan pengumuman yang belum jatuh tempo", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    const pengumuman = await daftarBerita(fixture.desaA, {
      limit: 60,
      kategoriSlug: "pengumuman",
    });
    const judul = pengumuman.map((item) => item.judul);

    expect(judul).not.toContain(`Pengumuman Draf ${RUN}`);
    expect(judul).not.toContain(`Pengumuman Terjadwal ${RUN}`);
  });

  it("tidak membocorkan pengumuman desa lain meski slug kategori sama", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    const pengumumanA = await daftarBerita(fixture.desaA, {
      limit: 60,
      kategoriSlug: "pengumuman",
    });
    expect(pengumumanA.map((item) => item.judul)).not.toContain(`Pengumuman Milik B ${RUN}`);

    const pengumumanB = await daftarBerita(fixture.desaB, {
      limit: 60,
      kategoriSlug: "pengumuman",
    });
    expect(pengumumanB.map((item) => item.judul)).toEqual([`Pengumuman Milik B ${RUN}`]);
  });

  it("membatasi hasil pencarian pada tenant dan kategori yang diminta", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    const hasil = await daftarBerita(fixture.desaA, {
      limit: 60,
      kategoriSlug: "pengumuman",
      cari: "khusus",
    });
    expect(hasil.map((item) => item.judul)).toEqual([`Pengumuman Desa A ${RUN}`]);

    const hasilLain = await daftarBerita(fixture.desaB, {
      limit: 60,
      kategoriSlug: "pengumuman",
      cari: "khusus",
    });
    expect(hasilLain).toEqual([]);
  });
});
