import "server-only";

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { accounts, passwordHistory, roles, sessions, users } from "@/db/schema";
import type { PenggunaDTO } from "@/features/pengguna/domain/pengguna";

/**
 * Akses data pengguna.
 *
 * Tabel `users`/`accounts` dikelola better-auth, jadi pembuatan pengguna di sini
 * meniru hasil `signUpEmail` (baris user + akun kredensial ber-hash), tetapi
 * **tanpa** membuat sesi — admin yang menambah pengguna tidak boleh ikut
 * tergantikan sesinya.
 */

const penggunaColumns = {
  id: users.id,
  villageId: users.villageId,
  name: users.name,
  username: users.username,
  email: users.email,
  roleId: users.roleId,
  roleName: roles.name,
  active: users.active,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
};

type PenggunaRow = {
  id: string;
  villageId: number | null;
  name: string;
  username: string | null;
  email: string;
  roleId: number | null;
  roleName: string | null;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

function toDTO(row: PenggunaRow): PenggunaDTO {
  return { ...row, username: row.username ?? "" };
}

export async function listPengguna(villageId: number): Promise<PenggunaDTO[]> {
  const rows = await db
    .select(penggunaColumns)
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.villageId, villageId))
    .orderBy(users.name);

  return rows.map(toDTO);
}

export async function getPenggunaById(id: string): Promise<PenggunaDTO | null> {
  const [row] = await db
    .select(penggunaColumns)
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, id))
    .limit(1);

  return row ? toDTO(row) : null;
}

export async function findPenggunaByUsername(username: string): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  return row ?? null;
}

export async function findPenggunaByEmail(email: string): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return row ?? null;
}

export async function createPengguna(input: {
  villageId: number;
  name: string;
  username: string;
  email: string;
  roleId: number;
  active: boolean;
  password: string;
}): Promise<PenggunaDTO> {
  const passwordHash = await hashPassword(input.password);
  const userId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      name: input.name,
      email: input.email,
      username: input.username,
      displayUsername: input.username,
      emailVerified: true,
      villageId: input.villageId,
      roleId: input.roleId,
      active: input.active,
    });

    await tx.insert(accounts).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    });
  });

  const created = await getPenggunaById(userId);
  if (!created) throw new Error("Gagal mengambil pengguna baru.");
  return created;
}

export async function updatePengguna(
  id: string,
  input: {
    name: string;
    username: string;
    email: string;
    roleId: number;
    active: boolean;
    /** `null` = kata sandi tidak diubah. */
    password: string | null;
  },
): Promise<void> {
  const passwordHash = input.password === null ? null : await hashPassword(input.password);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        name: input.name,
        email: input.email,
        username: input.username,
        displayUsername: input.username,
        roleId: input.roleId,
        active: input.active,
      })
      .where(eq(users.id, id));

    if (passwordHash === null) {
      if (!input.active) await tx.delete(sessions).where(eq(sessions.userId, id));
      return;
    }

    const [account] = await tx
      .select({ id: accounts.id, password: accounts.password })
      .from(accounts)
      .where(and(eq(accounts.userId, id), eq(accounts.providerId, "credential")))
      .limit(1);

    if (account) {
      if (account.password) {
        await tx
          .insert(passwordHistory)
          .values({ userId: id, passwordHash: account.password })
          .onDuplicateKeyUpdate({ set: { passwordHash: account.password } });
      }
      await tx.update(accounts).set({ password: passwordHash }).where(eq(accounts.id, account.id));
    } else {
      await tx.insert(accounts).values({
        id: randomUUID(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: passwordHash,
      });
    }
    // Reset password oleh admin mencabut semua sesi lama seperti reset via Better Auth.
    await tx.delete(sessions).where(eq(sessions.userId, id));
    return;
  });
}

export async function deletePengguna(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}

export async function countPenggunaDenganRole(villageId: number, roleId: number): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(users)
    .where(and(eq(users.villageId, villageId), eq(users.roleId, roleId)));
  return row?.total ?? 0;
}
