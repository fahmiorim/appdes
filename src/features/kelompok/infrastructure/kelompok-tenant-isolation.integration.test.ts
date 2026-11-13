import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { inArray } from "drizzle-orm";
import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { kelompok, kelompokAnggota, kelompokMaster, residents, villages } from "@/db/schema";
import type {
  KategoriKelompokFormInput,
  KelompokFormInput,
} from "@/features/kelompok/domain/kelompok";
import {
  addKelompokMember,
  countKelompokAnggota,
  deleteKategori,
  deleteKelompok,
  findKategoriById,
  kelompokMemberExists,
  listKelompok,
  listKelompokAnggotaPublik,
  listKelompokMembers,
  listLaporanAnggota,
  removeKelompokMember,
  setKelompokMemberPublic,
  updateKategori,
  updateKelompok,
} from "@/features/kelompok/infrastructure/kelompok-repository";
import { validasiDatabaseUji } from "@/testing/db-test-guard";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  villageA: number;
  villageB: number;
  groupA: number;
  categoryA: number;
  foreignCategory: number;
  residentA: number;
  residentB: number;
  foreignMemberId: number;
}

let fixture: Fixture | null = null;

function pastiId(row: { id: number | undefined } | undefined, label: string): number {
  if (row?.id === undefined) throw new Error(`Seed uji gagal: ${label}`);
  return row.id;
}

async function seedFixture(): Promise<Fixture> {
  const [villageARow] = await db
    .insert(villages)
    .values({ name: `Desa Kelompok A ${RUN}`, code: `KA${RUN}` })
    .$returningId();
  const [villageBRow] = await db
    .insert(villages)
    .values({ name: `Desa Kelompok B ${RUN}`, code: `KB${RUN}` })
    .$returningId();
  const villageA = pastiId(villageARow, "village A");
  const villageB = pastiId(villageBRow, "village B");

  const [categoryARow] = await db
    .insert(kelompokMaster)
    .values({ villageId: villageA, name: `Kategori A ${RUN}`, type: "kelompok" })
    .$returningId();
  const [categoryBRow] = await db
    .insert(kelompokMaster)
    .values({ villageId: villageB, name: `Kategori Rahasia B ${RUN}`, type: "kelompok" })
    .$returningId();

  const [groupRow] = await db
    .insert(kelompok)
    .values({
      villageId: villageA,
      name: `Kelompok A ${RUN}`,
      slug: `kelompok-a-${RUN}`,
      type: "kelompok",
      categoryId: pastiId(categoryBRow, "foreign category"),
    })
    .$returningId();

  const [residentARow] = await db
    .insert(residents)
    .values({ villageId: villageA, name: `Warga A ${RUN}`, gender: "female" })
    .$returningId();
  const [residentBRow] = await db
    .insert(residents)
    .values({ villageId: villageB, name: `Identitas Rahasia B ${RUN}`, gender: "male" })
    .$returningId();

  const groupA = pastiId(groupRow, "group A");
  const residentA = pastiId(residentARow, "resident A");
  const residentB = pastiId(residentBRow, "resident B");

  await db
    .insert(kelompokAnggota)
    .values({ villageId: villageA, kelompokId: groupA, residentId: residentA, position: 90 });

  // Baris legacy lintas tenant: child menyatakan desa A tetapi menunjuk penduduk B.
  // Composite FK (village_id, resident_id) menolak pasangan seperti ini, jadi
  // fixture disisipkan dengan FOREIGN_KEY_CHECKS dimatikan untuk meniru data
  // lama. Repository tetap wajib menyaringnya — itulah yang diuji di bawah.
  const koneksi = await mysql.createConnection(validasiDatabaseUji(process.env).opsiKoneksi);
  try {
    await koneksi.query("SET FOREIGN_KEY_CHECKS=0");
    await koneksi.query(
      "INSERT INTO kelompok_anggota (village_id, kelompok_id, resident_id, position) VALUES (?, ?, ?, ?)",
      [villageA, groupA, residentB, 1],
    );
  } finally {
    await koneksi.query("SET FOREIGN_KEY_CHECKS=1");
    await koneksi.end();
  }

  const [foreignMember] = await db
    .select({ id: kelompokAnggota.id })
    .from(kelompokAnggota)
    .where(inArray(kelompokAnggota.residentId, [residentB]));
  if (!foreignMember) throw new Error("Seed uji gagal: foreign member");

  return {
    villageA,
    villageB,
    groupA,
    categoryA: pastiId(categoryARow, "category A"),
    foreignCategory: pastiId(categoryBRow, "foreign category"),
    residentA,
    residentB,
    foreignMemberId: foreignMember.id,
  };
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });
  fixture = await seedFixture();
});

afterAll(async () => {
  if (!fixture) return;
  const villageIds = [fixture.villageA, fixture.villageB];
  await db.delete(residents).where(inArray(residents.villageId, villageIds));
  await db.delete(kelompok).where(inArray(kelompok.villageId, villageIds));
  await db.delete(kelompokMaster).where(inArray(kelompokMaster.villageId, villageIds));
  await db.delete(villages).where(inArray(villages.id, villageIds));
});

describe("isolasi tenant repository kelompok", () => {
  it("menyembunyikan kategori dan identitas anggota dari desa lain pada daftar, detail, publik, dan laporan", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const current = fixture;

    const daftar = await listKelompok({
      villageId: current.villageA,
      search: "",
      tipe: "",
      categoryId: null,
      page: 1,
      pageSize: 20,
    });
    expect(daftar.rows).toHaveLength(1);
    expect(daftar.rows[0]?.categoryName).toBeNull();
    expect(daftar.rows[0]?.leaderName).toBeNull();
    expect(daftar.rows[0]?.memberCount).toBe(1);
    expect(await countKelompokAnggota(current.villageA, current.groupA)).toBe(1);
    expect(await kelompokMemberExists(current.villageA, current.groupA, current.residentB)).toBe(
      false,
    );

    const anggota = await listKelompokMembers(current.villageA, current.groupA);
    expect(anggota).toHaveLength(1);
    expect(anggota[0]?.residentId).toBe(current.residentA);
    expect(anggota.some((row) => row.name.includes("Rahasia B"))).toBe(false);

    const publik = await listKelompokAnggotaPublik(current.villageA);
    expect(publik.get(current.groupA)).toHaveLength(1);
    expect(publik.get(current.groupA)?.[0]?.name).toContain("Warga A");

    const laporan = await listLaporanAnggota(current.villageA, "");
    expect(laporan).toHaveLength(1);
    expect(laporan[0]?.nama).toContain("Warga A");
    expect(laporan[0]?.kategoriNama).toBeNull();
  });

  it("menolak tambah anggota lintas desa dan membatasi perubahan parent dengan villageId", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const current = fixture;

    await expect(
      addKelompokMember(current.villageA, current.groupA, current.residentB, 90, null, null),
    ).rejects.toThrow(/tidak ditemukan pada desa aktif/);

    const inputKelompok: KelompokFormInput = {
      nama: `Tidak Boleh Diubah ${RUN}`,
      tipe: "kelompok",
      kategoriId: null,
      kode: "",
      nomorSk: "",
      keterangan: "",
    };
    await updateKelompok(current.villageB, current.groupA, `bypass-${RUN}`, inputKelompok);
    await deleteKelompok(current.villageB, current.groupA);

    const inputKategori: KategoriKelompokFormInput = {
      nama: `Tidak Boleh Diubah ${RUN}`,
      tipe: "kelompok",
    };
    await updateKategori(current.villageB, current.categoryA, inputKategori);
    await deleteKategori(current.villageB, current.categoryA);

    const category = await findKategoriById(current.villageA, current.categoryA);
    expect(category?.name).toBe(`Kategori A ${RUN}`);

    expect(
      await setKelompokMemberPublic(
        current.villageB,
        current.groupA,
        current.foreignMemberId,
        false,
      ),
    ).toBe(false);
    await removeKelompokMember(current.villageB, current.groupA, current.foreignMemberId);
  });
});
