import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { count, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { anggotaGrupKontak, kontak, kontakGrup, residents, villages } from "@/db/schema";
import {
  addAnggotaGrupUseCase,
  createKontakGrupUseCase,
  createKontakUseCase,
  updateKontakGrupUseCase,
  updateKontakUseCase,
} from "@/features/kontak/application/use-cases";
import { listAnggotaGrupDetail } from "@/features/kontak/infrastructure/kontak-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * AUD-034 Batch 2 — isolasi tenant pada direktori kontak.
 *
 * Dua desa sintetis dipakai untuk membuktikan bahwa `residentId` dan
 * `kontakId` yang berasal dari input tidak dapat menautkan data desa lain.
 * Pesan kesalahan untuk data lintas desa harus sama dengan data yang tidak
 * ada, sehingga keberadaan baris tenant lain tidak terbocorkan.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  desaA: number;
  desaB: number;
  pendudukA: number;
  pendudukB: number;
  kontakA: number;
  kontakB: number;
  /** Kontak desa A khusus untuk menguji update dengan penduduk desa lain. */
  kontakUjiResident: number;
  /** Kontak desa A khusus untuk update yang sah. */
  kontakUjiSah: number;
  /** Kontak desa A khusus untuk menguji `villageId` spoof. */
  kontakUjiSpoof: number;
  /** Kontak desa B sebagai target update dari desa A. */
  kontakUjiAsing: number;
  grupA: number;
  grupB: number;
  grupLegacy: number;
  grupUji: number;
}

let fixture: Fixture | null = null;

function pastiId(row: { id: number | undefined } | undefined, label: string): number {
  const id = row?.id;
  if (id === undefined) throw new Error(`Seed uji gagal: ${label}`);
  return id;
}

function dataUji(): Fixture {
  if (fixture === null) throw new Error("Fixture integrasi tidak siap.");
  return fixture;
}

async function hitungKontakBernama(nama: string): Promise<number> {
  const [row] = await db.select({ nilai: count() }).from(kontak).where(eq(kontak.nama, nama));
  return Number(row?.nilai ?? 0);
}

async function bacaKontak(id: number) {
  const [row] = await db
    .select({
      nama: kontak.nama,
      telepon: kontak.telepon,
      residentId: kontak.residentId,
      villageId: kontak.villageId,
    })
    .from(kontak)
    .where(eq(kontak.id, id));
  return row;
}

async function hitungAnggota(grupId: number): Promise<number> {
  const [row] = await db
    .select({ nilai: count() })
    .from(anggotaGrupKontak)
    .where(eq(anggotaGrupKontak.grupId, grupId));
  return Number(row?.nilai ?? 0);
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa Kontak A ${RUN}`, code: `KA${RUN}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa Kontak B ${RUN}`, code: `KB${RUN}` })
    .$returningId();
  const desaA = pastiId(desaARow, "desa A");
  const desaB = pastiId(desaBRow, "desa B");

  const [pendudukARow] = await db
    .insert(residents)
    .values({
      villageId: desaA,
      name: `Penduduk Kontak A ${RUN}`,
      gender: "male",
      birthDate: "1990-01-01",
    })
    .$returningId();
  const [pendudukBRow] = await db
    .insert(residents)
    .values({
      villageId: desaB,
      name: `Penduduk Kontak B ${RUN}`,
      gender: "female",
      birthDate: "1991-02-02",
    })
    .$returningId();
  const pendudukA = pastiId(pendudukARow, "penduduk A");
  const pendudukB = pastiId(pendudukBRow, "penduduk B");

  const [kontakARow] = await db
    .insert(kontak)
    .values({ villageId: desaA, residentId: pendudukA, nama: `Kontak A ${RUN}` })
    .$returningId();
  const [kontakBRow] = await db
    .insert(kontak)
    .values({ villageId: desaB, residentId: pendudukB, nama: `Kontak B ${RUN}` })
    .$returningId();

  const [kontakUjiResidentRow] = await db
    .insert(kontak)
    .values({ villageId: desaA, residentId: pendudukA, nama: `Kontak Uji Resident ${RUN}` })
    .$returningId();
  const [kontakUjiSahRow] = await db
    .insert(kontak)
    .values({ villageId: desaA, residentId: pendudukA, nama: `Kontak Uji Sah ${RUN}` })
    .$returningId();
  const [kontakUjiSpoofRow] = await db
    .insert(kontak)
    .values({ villageId: desaA, residentId: pendudukA, nama: `Kontak Uji Spoof ${RUN}` })
    .$returningId();
  const [kontakUjiAsingRow] = await db
    .insert(kontak)
    .values({ villageId: desaB, residentId: pendudukB, nama: `Kontak Uji Asing ${RUN}` })
    .$returningId();

  const [grupARow] = await db
    .insert(kontakGrup)
    .values({ villageId: desaA, namaGrup: `Grup A ${RUN}` })
    .$returningId();
  const [grupBRow] = await db
    .insert(kontakGrup)
    .values({ villageId: desaB, namaGrup: `Grup B ${RUN}` })
    .$returningId();
  const [grupLegacyRow] = await db
    .insert(kontakGrup)
    .values({ villageId: desaA, namaGrup: `Grup Legacy ${RUN}` })
    .$returningId();
  const [grupUjiRow] = await db
    .insert(kontakGrup)
    .values({ villageId: desaA, namaGrup: `Grup Uji ${RUN}` })
    .$returningId();

  fixture = {
    desaA,
    desaB,
    pendudukA,
    pendudukB,
    kontakA: pastiId(kontakARow, "kontak A"),
    kontakB: pastiId(kontakBRow, "kontak B"),
    kontakUjiResident: pastiId(kontakUjiResidentRow, "kontak uji resident"),
    kontakUjiSah: pastiId(kontakUjiSahRow, "kontak uji sah"),
    kontakUjiSpoof: pastiId(kontakUjiSpoofRow, "kontak uji spoof"),
    kontakUjiAsing: pastiId(kontakUjiAsingRow, "kontak uji asing"),
    grupA: pastiId(grupARow, "grup A"),
    grupB: pastiId(grupBRow, "grup B"),
    grupLegacy: pastiId(grupLegacyRow, "grup legacy"),
    grupUji: pastiId(grupUjiRow, "grup uji"),
  };
});

afterAll(async () => {
  if (fixture === null) return;
  const desaIds = [fixture.desaA, fixture.desaB];

  // `anggota_grup_kontak` belum memakai composite FK (Batch 4), jadi anak
  // dihapus eksplisit sebelum desa.
  await db.delete(anggotaGrupKontak).where(inArray(anggotaGrupKontak.villageId, desaIds));
  await db.delete(kontak).where(inArray(kontak.villageId, desaIds));
  await db.delete(kontakGrup).where(inArray(kontakGrup.villageId, desaIds));
  await db.delete(residents).where(inArray(residents.villageId, desaIds));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("createKontakUseCase — residentId lintas desa", () => {
  it("menolak penduduk desa lain tanpa menyimpan kontak dan tanpa membocorkan desa asal", async () => {
    const { desaA, desaB, pendudukB } = dataUji();
    const nama = `Kontak Lintas ${RUN}`;

    const kesalahan = await createKontakUseCase(desaA, {
      villageId: desaB,
      residentId: pendudukB,
      nama,
    }).catch((error: unknown) => error);

    expect(kesalahan).toMatchObject({
      code: "VALIDATION",
      message: "Penduduk tidak ditemukan.",
    });
    expect(JSON.stringify(kesalahan)).not.toContain(`Desa Kontak B ${RUN}`);
    expect(await hitungKontakBernama(nama)).toBe(0);
  });

  it("memberi pesan yang sama untuk penduduk yang tidak ada", async () => {
    const { desaA } = dataUji();
    const nama = `Kontak Tidak Ada ${RUN}`;

    const kesalahan = await createKontakUseCase(desaA, {
      villageId: desaA,
      residentId: 999_999_999,
      nama,
    }).catch((error: unknown) => error);

    expect(kesalahan).toMatchObject({
      code: "VALIDATION",
      message: "Penduduk tidak ditemukan.",
    });
    expect(await hitungKontakBernama(nama)).toBe(0);
  });

  it("menyimpan kontak desa sendiri dan mengabaikan villageId dari input", async () => {
    const { desaA, desaB, pendudukA } = dataUji();
    const nama = `Kontak Sah ${RUN}`;

    const id = await createKontakUseCase(desaA, {
      villageId: desaB,
      residentId: pendudukA,
      nama,
    });

    const [row] = await db.select().from(kontak).where(eq(kontak.id, id));
    expect(row?.villageId).toBe(desaA);
    expect(row?.residentId).toBe(pendudukA);
    expect(row?.nama).toBe(nama);
  });

  it("mengabaikan id dari payload create kontak", async () => {
    const { desaA, desaB, pendudukA } = dataUji();
    const nama = `Kontak Id Payload ${RUN}`;
    const idPalsu = 900_000_001;

    const id = await createKontakUseCase(desaA, {
      id: idPalsu,
      villageId: desaB,
      residentId: pendudukA,
      nama,
    });

    expect(id).not.toBe(idPalsu);
    expect(await bacaKontak(idPalsu)).toBeUndefined();
    expect(await bacaKontak(id)).toMatchObject({
      nama,
      villageId: desaA,
      residentId: pendudukA,
    });
  });

  it("mengabaikan id dari payload create grup", async () => {
    const { desaA, desaB } = dataUji();
    const namaGrup = `Grup Id Payload ${RUN}`;
    const idPalsu = 900_000_002;

    const id = await createKontakGrupUseCase(desaA, {
      id: idPalsu,
      villageId: desaB,
      namaGrup,
    });

    expect(id).not.toBe(idPalsu);
    const [row] = await db
      .select({ namaGrup: kontakGrup.namaGrup, villageId: kontakGrup.villageId })
      .from(kontakGrup)
      .where(eq(kontakGrup.id, id));
    expect(row).toEqual({ namaGrup, villageId: desaA });
    const [palsu] = await db
      .select({ id: kontakGrup.id })
      .from(kontakGrup)
      .where(eq(kontakGrup.id, idPalsu));
    expect(palsu).toBeUndefined();
  });

  it("menerima kontak tanpa tautan penduduk", async () => {
    const { desaA, desaB } = dataUji();
    const nama = `Kontak Eksternal ${RUN}`;

    const id = await createKontakUseCase(desaA, { villageId: desaB, residentId: null, nama });

    const [row] = await db.select().from(kontak).where(eq(kontak.id, id));
    expect(row?.villageId).toBe(desaA);
    expect(row?.residentId).toBeNull();
  });
});

describe("updateKontakUseCase — pembaruan lintas desa", () => {
  it("menolak penduduk desa lain dan tidak mengubah kontak", async () => {
    const { desaA, pendudukA, pendudukB, kontakUjiResident } = dataUji();

    const kesalahan = await updateKontakUseCase(desaA, {
      id: kontakUjiResident,
      villageId: desaA,
      residentId: pendudukB,
      nama: `Nama Diubah ${RUN}`,
    }).catch((error: unknown) => error);

    expect(kesalahan).toMatchObject({
      code: "VALIDATION",
      message: "Penduduk tidak ditemukan.",
    });
    expect(await bacaKontak(kontakUjiResident)).toMatchObject({
      nama: `Kontak Uji Resident ${RUN}`,
      residentId: pendudukA,
      villageId: desaA,
    });
  });

  it("menyimpan perubahan dengan penduduk desa sendiri", async () => {
    const { desaA, pendudukA, kontakUjiSah } = dataUji();

    await updateKontakUseCase(desaA, {
      id: kontakUjiSah,
      villageId: desaA,
      residentId: pendudukA,
      nama: `Kontak Uji Sah Baru ${RUN}`,
      telepon: "081200000001",
    });

    expect(await bacaKontak(kontakUjiSah)).toMatchObject({
      nama: `Kontak Uji Sah Baru ${RUN}`,
      telepon: "081200000001",
      residentId: pendudukA,
      villageId: desaA,
    });
  });

  it("tidak dapat memindahkan kontak lewat villageId dari input", async () => {
    const { desaA, desaB, kontakUjiSpoof } = dataUji();

    await updateKontakUseCase(desaA, {
      id: kontakUjiSpoof,
      villageId: desaB,
      nama: `Kontak Uji Spoof Baru ${RUN}`,
    });

    expect(await bacaKontak(kontakUjiSpoof)).toMatchObject({
      nama: `Kontak Uji Spoof Baru ${RUN}`,
      villageId: desaA,
    });
  });

  it("menolak kontak desa lain dengan pesan yang sama seperti kontak tidak ada", async () => {
    const { desaA, desaB, kontakUjiAsing } = dataUji();

    const asing = await updateKontakUseCase(desaA, {
      id: kontakUjiAsing,
      villageId: desaB,
      nama: `Diambil Alih ${RUN}`,
    }).catch((error: unknown) => error);
    const tidakAda = await updateKontakUseCase(desaA, {
      id: 999_999_999,
      villageId: desaA,
      nama: `Tidak Ada ${RUN}`,
    }).catch((error: unknown) => error);

    expect(asing).toMatchObject({ code: "NOT_FOUND", message: "Kontak tidak ditemukan." });
    expect(tidakAda).toMatchObject({ code: "NOT_FOUND", message: "Kontak tidak ditemukan." });
    expect(await bacaKontak(kontakUjiAsing)).toMatchObject({
      nama: `Kontak Uji Asing ${RUN}`,
      villageId: desaB,
    });
  });
});

describe("updateKontakGrupUseCase — pembaruan lintas desa", () => {
  it("menolak grup desa lain dan tidak mengubahnya", async () => {
    const { desaA, desaB, grupB } = dataUji();

    const kesalahan = await updateKontakGrupUseCase(desaA, {
      id: grupB,
      villageId: desaA,
      namaGrup: `Grup Diambil Alih ${RUN}`,
    }).catch((error: unknown) => error);

    expect(kesalahan).toMatchObject({
      code: "NOT_FOUND",
      message: "Grup kontak tidak ditemukan.",
    });
    const [row] = await db
      .select({ namaGrup: kontakGrup.namaGrup, villageId: kontakGrup.villageId })
      .from(kontakGrup)
      .where(eq(kontakGrup.id, grupB));
    expect(row).toEqual({ namaGrup: `Grup B ${RUN}`, villageId: desaB });
  });

  it("memperbarui grup desa sendiri tanpa memindahkan desa", async () => {
    const { desaA, desaB, grupUji } = dataUji();

    await updateKontakGrupUseCase(desaA, {
      id: grupUji,
      villageId: desaB,
      namaGrup: `Grup Uji Baru ${RUN}`,
      keterangan: "diperbarui",
    });

    const [row] = await db
      .select({
        namaGrup: kontakGrup.namaGrup,
        keterangan: kontakGrup.keterangan,
        villageId: kontakGrup.villageId,
      })
      .from(kontakGrup)
      .where(eq(kontakGrup.id, grupUji));
    expect(row).toEqual({
      namaGrup: `Grup Uji Baru ${RUN}`,
      keterangan: "diperbarui",
      villageId: desaA,
    });
  });
});

describe("addAnggotaGrupUseCase — kontak & grup lintas desa", () => {
  it("menolak kontak desa lain tanpa membuat anggota grup", async () => {
    const { desaA, grupA, kontakB } = dataUji();

    await expect(
      addAnggotaGrupUseCase(desaA, grupA, { kontakId: kontakB, peran: "Ketua" }),
    ).rejects.toMatchObject({ code: "VALIDATION", message: "Kontak tidak ditemukan." });

    expect(await hitungAnggota(grupA)).toBe(0);
  });

  it("menolak grup desa lain tanpa membuat anggota", async () => {
    const { desaA, grupB, kontakA } = dataUji();

    await expect(
      addAnggotaGrupUseCase(desaA, grupB, { kontakId: kontakA, peran: null }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "Grup kontak tidak ditemukan." });

    expect(await hitungAnggota(grupB)).toBe(0);
  });

  it("menambah anggota dari kontak dan grup desa sendiri", async () => {
    const { desaA, grupA, kontakA } = dataUji();

    await addAnggotaGrupUseCase(desaA, grupA, { kontakId: kontakA, peran: "Ketua" });

    expect(await hitungAnggota(grupA)).toBe(1);
    const [row] = await db
      .select({
        villageId: anggotaGrupKontak.villageId,
        kontakId: anggotaGrupKontak.kontakId,
        peran: anggotaGrupKontak.peran,
      })
      .from(anggotaGrupKontak)
      .where(eq(anggotaGrupKontak.grupId, grupA));
    expect(row).toEqual({ villageId: desaA, kontakId: kontakA, peran: "Ketua" });
  });

  it("daftar anggota tidak membaca kontak desa lain dari baris lama", async () => {
    const { desaA, grupLegacy, kontakB } = dataUji();

    // Baris legacy: belum ada composite FK pada `anggota_grup_kontak`
    // (kandidat Batch 4), sehingga kombinasi ini masih dapat tersimpan.
    await db
      .insert(anggotaGrupKontak)
      .values({ villageId: desaA, grupId: grupLegacy, kontakId: kontakB, peran: "Sekretaris" });

    const rows = await listAnggotaGrupDetail(desaA, grupLegacy);
    expect(rows).toHaveLength(0);
  });
});
