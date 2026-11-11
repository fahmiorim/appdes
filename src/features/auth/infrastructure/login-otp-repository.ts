import "server-only";

import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { loginOtp } from "@/db/schema/login-otp";

import { MAKS_PERCOBAAN_OTP } from "../domain/login-otp";

export async function simpanKodeLogin(data: {
  userId: string;
  kanal: string;
  target: string;
  kodeHash: string;
  kedaluwarsa: Date;
}): Promise<void> {
  await db
    .delete(loginOtp)
    .where(and(eq(loginOtp.userId, data.userId), isNull(loginOtp.terpakaiAt)));

  await db.insert(loginOtp).values(data);
}

export async function findKodeLoginAktif(userId: string) {
  const [row] = await db
    .select()
    .from(loginOtp)
    .where(and(eq(loginOtp.userId, userId), isNull(loginOtp.terpakaiAt)))
    .orderBy(desc(loginOtp.id))
    .limit(1);

  return row ?? null;
}

/**
 * Klaim satu percobaan secara atomik.
 *
 * `percobaan < MAKS` ada di klausa WHERE sehingga permintaan paralel tidak
 * dapat melewati batas: hanya lima permintaan pertama yang mendapat `true`.
 * `false` berarti kode sudah terpakai atau batas percobaan tercapai.
 */
export async function catatPercobaanLogin(id: number): Promise<boolean> {
  const [hasil] = await db
    .update(loginOtp)
    .set({ percobaan: sql`${loginOtp.percobaan} + 1` })
    .where(
      and(
        eq(loginOtp.id, id),
        isNull(loginOtp.terpakaiAt),
        lt(loginOtp.percobaan, MAKS_PERCOBAAN_OTP),
      ),
    );

  return hasil.affectedRows > 0;
}

/** Tandai kode terpakai; `false` bila permintaan lain lebih dulu memakainya. */
export async function tandaiKodeLoginTerpakai(id: number): Promise<boolean> {
  const [hasil] = await db
    .update(loginOtp)
    .set({ terpakaiAt: new Date() })
    .where(and(eq(loginOtp.id, id), isNull(loginOtp.terpakaiAt)));

  return hasil.affectedRows > 0;
}
