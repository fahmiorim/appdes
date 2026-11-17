import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { villages } from "@/db/schema";
import {
  akarPenyimpananMedia,
  hitungUkuranMedia,
  simpanUnggahanMedia,
} from "@/features/publik/infrastructure/media-storage";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * AUD-014 — kuota media diperiksa dari pemakaian disk sebelum berkas ditulis.
 * Tanpa serialisasi, unggahan bersamaan sama-sama lolos pemeriksaan dan
 * melewati kuota. Test ini membuktikan pemeriksaan + penulisan berjalan di
 * bawah kunci per desa.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);
const KUOTA_MB = 1;
const UKURAN_BERKAS = 400 * 1024;

/**
 * id sengaja dipilih dari rentang tinggi agar folder `storage/media/<id>`
 * tidak bertabrakan dengan desa dev (id kecil) atau sisa run sebelumnya.
 * Test tidak boleh menghapus/menghitung berkas milik database lain.
 */
const ID_DESA_UJI = 1_500_000_000 + Math.floor(Math.random() * 1_000_000);

let villageId: number | null = null;

function isiBerkas(seed: number): Uint8Array {
  const isi = new Uint8Array(UKURAN_BERKAS);
  isi.fill(seed % 251);
  // Simpan signature PNG supaya fixture tetap valid setelah validasi magic bytes.
  isi.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return isi;
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaRow] = await db
    .insert(villages)
    .values({
      id: ID_DESA_UJI,
      name: `Desa Media ${RUN}`,
      code: `FM${RUN}`,
      kuotaMediaMb: KUOTA_MB,
    })
    .$returningId();
  if (desaRow?.id === undefined) throw new Error("Seed uji gagal: desa tidak terbentuk.");
  villageId = desaRow.id;
});

afterAll(async () => {
  if (villageId === null) return;
  await rm(path.join(akarPenyimpananMedia(), String(villageId)), {
    recursive: true,
    force: true,
  });
  await db.delete(villages).where(eq(villages.id, villageId));
});

describe("AUD-014 kuota media pada unggahan bersamaan", () => {
  it("tidak melampaui kuota desa dan menolak kelebihan dengan pesan kuota", async () => {
    if (villageId === null) throw new Error("Fixture tidak tersedia.");
    const desa = villageId;

    const hasil = await Promise.allSettled(
      [0, 1, 2, 3].map((index) =>
        simpanUnggahanMedia(desa, "umum", {
          nama: `berkas-${index}-${RUN}.png`,
          mime: "image/png",
          ukuran: UKURAN_BERKAS,
          isi: isiBerkas(index),
        }),
      ),
    );

    const berhasil = hasil.filter((item) => item.status === "fulfilled");
    const gagal = hasil.filter((item) => item.status === "rejected");
    expect(berhasil).toHaveLength(2);
    expect(gagal).toHaveLength(2);

    for (const item of gagal) {
      expect(String((item as PromiseRejectedResult).reason)).toContain("Kuota media desa");
    }

    const terpakai = await hitungUkuranMedia(desa);
    expect(terpakai).toBe(UKURAN_BERKAS * berhasil.length);
    expect(terpakai).toBeLessThanOrEqual(KUOTA_MB * 1024 * 1024);

    const jalur = berhasil.map(
      (item) => (item as PromiseFulfilledResult<{ jalur: string }>).value.jalur,
    );
    expect(new Set(jalur).size).toBe(jalur.length);
  }, 60_000);
});
