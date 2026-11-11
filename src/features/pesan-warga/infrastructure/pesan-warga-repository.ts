import "server-only";

import { and, asc, count, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { residents } from "@/db/schema/resident";
import { wargaPesan, type NewWargaPesan } from "@/db/schema/warga-pesan";

import {
  pengirimPesan,
  type PendudukPercakapan,
  type PesanPercakapanRow,
  type PesanWargaDTO,
} from "../domain/pesan-warga";

/** Penduduk pemilik percakapan; `null` bila bukan warga desa ini. */
export async function findPendudukPercakapan(
  villageId: number,
  residentId: number,
): Promise<PendudukPercakapan | null> {
  const [row] = await db
    .select({ residentId: residents.id, nama: residents.name, nik: residents.nationalId })
    .from(residents)
    .where(and(eq(residents.id, residentId), eq(residents.villageId, villageId)))
    .limit(1);

  return row ?? null;
}

/** Seluruh pesan satu warga, urut lama → baru. */
export async function listPesanWarga(
  villageId: number,
  residentId: number,
): Promise<PesanWargaDTO[]> {
  const rows = await db
    .select({
      id: wargaPesan.id,
      pengirim: wargaPesan.pengirim,
      isi: wargaPesan.isi,
      createdAt: wargaPesan.createdAt,
    })
    .from(wargaPesan)
    .where(and(eq(wargaPesan.villageId, villageId), eq(wargaPesan.residentId, residentId)))
    .orderBy(asc(wargaPesan.createdAt), asc(wargaPesan.id));

  return rows.map((row) => ({
    id: row.id,
    pengirim: pengirimPesan(row.pengirim),
    isi: row.isi,
    createdAt: row.createdAt,
  }));
}

/** Semua pesan desa beserta identitas warga, urut baru → lama. */
export async function listPesanPercakapan(villageId: number): Promise<PesanPercakapanRow[]> {
  const rows = await db
    .select({
      residentId: wargaPesan.residentId,
      nama: residents.name,
      nik: residents.nationalId,
      pengirim: wargaPesan.pengirim,
      isi: wargaPesan.isi,
      createdAt: wargaPesan.createdAt,
      dibacaOperatorPada: wargaPesan.dibacaOperatorPada,
    })
    .from(wargaPesan)
    .innerJoin(residents, eq(residents.id, wargaPesan.residentId))
    .where(eq(wargaPesan.villageId, villageId))
    .orderBy(desc(wargaPesan.createdAt), desc(wargaPesan.id));

  return rows.map((row) => ({
    residentId: row.residentId,
    nama: row.nama,
    nik: row.nik,
    pengirim: pengirimPesan(row.pengirim),
    isi: row.isi,
    createdAt: row.createdAt,
    dibacaOperatorPada: row.dibacaOperatorPada,
  }));
}

export async function createPesanWarga(data: NewWargaPesan): Promise<number> {
  const [row] = await db.insert(wargaPesan).values(data).$returningId();
  if (!row) throw new Error("Gagal menyimpan pesan warga.");
  return row.id;
}

/** Tandai balasan operator sebagai sudah dibaca warga. */
export async function tandaiDibacaWarga(villageId: number, residentId: number): Promise<void> {
  await db
    .update(wargaPesan)
    .set({ dibacaWargaPada: new Date() })
    .where(
      and(
        eq(wargaPesan.villageId, villageId),
        eq(wargaPesan.residentId, residentId),
        eq(wargaPesan.pengirim, "operator"),
        isNull(wargaPesan.dibacaWargaPada),
      ),
    );
}

/** Tandai pesan warga sebagai sudah dibaca operator. */
export async function tandaiDibacaOperator(villageId: number, residentId: number): Promise<void> {
  await db
    .update(wargaPesan)
    .set({ dibacaOperatorPada: new Date() })
    .where(
      and(
        eq(wargaPesan.villageId, villageId),
        eq(wargaPesan.residentId, residentId),
        eq(wargaPesan.pengirim, "warga"),
        isNull(wargaPesan.dibacaOperatorPada),
      ),
    );
}

/** Jumlah balasan operator yang belum dibaca warga (lencana beranda). */
export async function hitungPesanBelumDibacaWarga(
  villageId: number,
  residentId: number,
): Promise<number> {
  const [row] = await db
    .select({ jumlah: count() })
    .from(wargaPesan)
    .where(
      and(
        eq(wargaPesan.villageId, villageId),
        eq(wargaPesan.residentId, residentId),
        eq(wargaPesan.pengirim, "operator"),
        isNull(wargaPesan.dibacaWargaPada),
      ),
    );

  return Number(row?.jumlah ?? 0);
}
