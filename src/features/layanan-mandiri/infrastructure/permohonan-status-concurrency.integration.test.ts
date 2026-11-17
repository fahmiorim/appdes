import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db, pool } from "@/db";
import { letterTypes, permohonanSurat, residents, villages } from "@/db/schema";
import {
  buatPermohonan,
  prosesPermohonan,
} from "@/features/layanan-mandiri/infrastructure/layanan-mandiri-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * AUD-016 — `prosesPermohonan` membaca status, memvalidasi transisi, lalu
 * menulis. Dua operator bersamaan dapat menimpa hasil satu sama lain. Update
 * sekarang bersyarat pada status yang dibaca, sehingga hanya satu yang menang.
 *
 * Agar kedua permintaan dijamin membaca status awal yang sama, baris
 * permohonan dikunci `FOR UPDATE` di koneksi lain sebelum keduanya dijalankan.
 * SELECT biasa tidak ikut menunggu, sedangkan UPDATE keduanya tertahan sampai
 * kunci dilepas. Tanpa ini, permintaan kedua dapat membaca status yang sudah
 * diperbarui dan melakukan transisi lanjutan yang sah (mis. 2 → 5), sehingga
 * "hanya satu yang menang" menjadi tidak deterministik.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

let villageId: number | null = null;
let residentId: number | null = null;
let letterTypeId: number | null = null;
const permohonanIds: number[] = [];

function pastiId(row: { id: number | undefined } | undefined, label: string): number {
  if (row?.id === undefined) throw new Error(`Seed uji gagal: ${label} tidak terbentuk.`);
  return row.id;
}

/** Jalankan `jalankan` saat baris permohonan terkunci di koneksi lain. */
async function denganBarisTerkunci<T>(
  desa: number,
  id: number,
  jalankan: () => Promise<T>,
): Promise<T> {
  const koneksi = await pool.getConnection();
  try {
    await koneksi.beginTransaction();
    await koneksi.query(
      "SELECT id FROM permohonan_surat WHERE village_id = ? AND id = ? FOR UPDATE",
      [desa, id],
    );
    const hasil = jalankan();
    // Beri kedua permintaan waktu membaca status lama dan mengantre di UPDATE.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await koneksi.commit();
    return await hasil;
  } catch (error) {
    await koneksi.rollback().catch(() => undefined);
    throw error;
  } finally {
    koneksi.release();
  }
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const desa = pastiId(
    (
      await db
        .insert(villages)
        .values({ name: `Desa Permohonan ${RUN}`, code: `FP${RUN}` })
        .$returningId()
    )[0],
    "desa",
  );

  const penduduk = pastiId(
    (
      await db
        .insert(residents)
        .values({ villageId: desa, name: `Penduduk Permohonan ${RUN}`, gender: "male" })
        .$returningId()
    )[0],
    "penduduk",
  );

  const jenis = pastiId(
    (
      await db
        .insert(letterTypes)
        .values({
          villageId: desa,
          code: `FL${RUN}`,
          name: `Jenis Permohonan ${RUN}`,
          templateBody: "Isi surat",
        })
        .$returningId()
    )[0],
    "jenis surat",
  );

  villageId = desa;
  residentId = penduduk;
  letterTypeId = jenis;
});

afterAll(async () => {
  if (villageId === null) return;
  const desa = villageId;
  if (permohonanIds.length > 0) {
    await db.delete(permohonanSurat).where(inArray(permohonanSurat.id, permohonanIds));
  }
  await db.delete(letterTypes).where(eq(letterTypes.villageId, desa));
  await db.delete(residents).where(eq(residents.villageId, desa));
  await db.delete(villages).where(eq(villages.id, desa));
});

describe("AUD-016 transisi status permohonan bersamaan", () => {
  it("hanya mengizinkan satu transisi menang dan menolak yang lain sebagai konflik", async () => {
    if (villageId === null || residentId === null || letterTypeId === null) {
      throw new Error("Fixture tidak tersedia.");
    }
    const desa = villageId;

    for (let percobaan = 0; percobaan < 3; percobaan += 1) {
      const id = await buatPermohonan({
        villageId: desa,
        residentId,
        letterTypeId,
        noAntrian: `UJI-${RUN}-${percobaan}`,
      });
      if (id === undefined) throw new Error("Seed uji gagal: permohonan tidak terbentuk.");
      permohonanIds.push(id);

      const hasil = await denganBarisTerkunci(desa, id, () =>
        Promise.allSettled([
          prosesPermohonan(desa, id, 2),
          prosesPermohonan(desa, id, 5, "Dibatalkan operator lain"),
        ]),
      );

      const berhasil = hasil.filter((item) => item.status === "fulfilled");
      const gagal = hasil.filter((item) => item.status === "rejected");
      expect(berhasil).toHaveLength(1);
      expect(gagal).toHaveLength(1);
      expect(String((gagal[0] as PromiseRejectedResult).reason)).toContain("sudah diproses");

      const [tersimpan] = await db
        .select({ status: permohonanSurat.status })
        .from(permohonanSurat)
        .where(and(eq(permohonanSurat.villageId, desa), eq(permohonanSurat.id, id)));
      const pemenang = hasil[0].status === "fulfilled" ? 2 : 5;
      expect(tersimpan?.status).toBe(pemenang);
    }
  }, 60_000);
});
