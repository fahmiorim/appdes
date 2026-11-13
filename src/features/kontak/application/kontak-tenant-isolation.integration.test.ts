import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { count, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { anggotaGrupKontak, kontak, kontakGrup, residents, villages } from "@/db/schema";
import {
  addAnggotaGrupUseCase,
  createKontakUseCase,
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
  grupA: number;
  grupB: number;
  grupLegacy: number;
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

  fixture = {
    desaA,
    desaB,
    pendudukA,
    pendudukB,
    kontakA: pastiId(kontakARow, "kontak A"),
    kontakB: pastiId(kontakBRow, "kontak B"),
    grupA: pastiId(grupARow, "grup A"),
    grupB: pastiId(grupBRow, "grup B"),
    grupLegacy: pastiId(grupLegacyRow, "grup legacy"),
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

  it("menerima kontak tanpa tautan penduduk", async () => {
    const { desaA, desaB } = dataUji();
    const nama = `Kontak Eksternal ${RUN}`;

    const id = await createKontakUseCase(desaA, { villageId: desaB, residentId: null, nama });

    const [row] = await db.select().from(kontak).where(eq(kontak.id, id));
    expect(row?.villageId).toBe(desaA);
    expect(row?.residentId).toBeNull();
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
