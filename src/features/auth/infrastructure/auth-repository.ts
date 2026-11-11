import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { residents, users } from "@/db/schema";

/** Catat waktu login terakhir pengguna. */
export async function touchLastLogin(userId: string): Promise<void> {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
}

/**
 * Status akun yang menentukan tujuan setelah login.
 *
 * Dibaca langsung dari DB (bukan dari cookie) agar `residentId`/`mustChangePin`
 * selalu mutakhir, termasuk setelah operator mereset PIN.
 */
export async function getAccountLoginContext(userId: string): Promise<{
  active: boolean;
  residentId: number | null;
  mustChangePin: boolean;
  villageId: number | null;
} | null> {
  const [row] = await db
    .select({
      active: users.active,
      residentId: users.residentId,
      mustChangePin: users.mustChangePin,
      villageId: users.villageId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row ?? null;
}

/** Konteks minimum untuk menentukan apakah login memerlukan OTP. */
export interface LoginOtpContext {
  id: string;
  active: boolean;
  otpLoginAktif: boolean;
  villageId: number | null;
  residentId: number | null;
  email: string;
  phone: string | null;
}

export async function getLoginOtpContext(username: string): Promise<LoginOtpContext | null> {
  const [row] = await db
    .select({
      id: users.id,
      active: users.active,
      otpLoginAktif: users.otpLoginAktif,
      villageId: users.villageId,
      residentId: users.residentId,
      email: users.email,
      phone: residents.phone,
    })
    .from(users)
    .leftJoin(residents, eq(users.residentId, residents.id))
    .where(eq(users.username, username))
    .limit(1);

  return row ?? null;
}

/** Target OTP (WhatsApp bila ada, selain itu email) untuk satu pengguna. */
export async function getOtpLoginTarget(
  userId: string,
): Promise<{ phone: string | null; email: string } | null> {
  const [row] = await db
    .select({ email: users.email, phone: residents.phone })
    .from(users)
    .leftJoin(residents, eq(users.residentId, residents.id))
    .where(eq(users.id, userId))
    .limit(1);

  return row ?? null;
}

export async function getOtpLoginAktif(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ otpLoginAktif: users.otpLoginAktif })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row?.otpLoginAktif ?? false;
}

export async function setOtpLoginAktif(userId: string, aktif: boolean): Promise<void> {
  await db.update(users).set({ otpLoginAktif: aktif }).where(eq(users.id, userId));
}
