import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { tteConfig } from "@/db/schema";

import {
  parseKonfigTteTersimpan,
  serializeKonfigTteTersimpan,
  type KonfigTteTersimpan,
} from "../domain/tte";

export interface BarisKonfigTte {
  provider: string | null;
  aktif: boolean;
  konfigurasi: string | null;
}

/** Konfigurasi TTE satu desa (satu baris per desa). */
export async function getBarisKonfigTte(villageId: number): Promise<BarisKonfigTte | null> {
  const [row] = await db
    .select({
      provider: tteConfig.provider,
      aktif: tteConfig.aktif,
      konfigurasi: tteConfig.konfigurasi,
    })
    .from(tteConfig)
    .where(eq(tteConfig.villageId, villageId))
    .limit(1);

  if (!row) return null;
  return {
    provider: row.provider,
    aktif: row.aktif === 1,
    konfigurasi: row.konfigurasi,
  };
}

/** Konfigurasi tersimpan yang sudah diparse, atau `null` bila belum ada/rusak. */
export async function getKonfigTteTersimpan(villageId: number): Promise<KonfigTteTersimpan | null> {
  const row = await getBarisKonfigTte(villageId);
  if (!row) return null;

  const parsed = parseKonfigTteTersimpan(row.konfigurasi);
  if (!parsed) return null;

  return {
    ...parsed,
    provider: row.provider === "bsre" ? "bsre" : parsed.provider,
    aktif: row.aktif,
  };
}

/**
 * Simpan konfigurasi non-rahasia desa.
 *
 * Upsert berdasarkan `village_id` (unique index `tte_config_village_uq`).
 * Passphrase tidak pernah ikut ditulis; nilainya berasal dari environment.
 */
export async function simpanKonfigTteTersimpan(
  villageId: number,
  config: KonfigTteTersimpan,
): Promise<void> {
  const values = {
    villageId,
    provider: config.provider,
    aktif: config.aktif ? 1 : 0,
    konfigurasi: serializeKonfigTteTersimpan(config),
  };

  await db
    .insert(tteConfig)
    .values(values)
    .onDuplicateKeyUpdate({
      set: {
        provider: values.provider,
        aktif: values.aktif,
        konfigurasi: values.konfigurasi,
      },
    });
}
