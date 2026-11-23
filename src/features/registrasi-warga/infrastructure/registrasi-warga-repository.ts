import "server-only";

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { accounts, registrasiWarga, residents, users } from "@/db/schema";
import type {
  PengajuanRegistrasiWargaInput,
  RegistrasiWargaDTO,
} from "@/features/registrasi-warga/domain/registrasi-warga";
import { generatePin } from "@/features/warga/infrastructure/warga-repository";
import { conflict, notFound } from "@/lib/errors";

export async function ajukanRegistrasiWarga(
  villageId: number,
  input: PengajuanRegistrasiWargaInput,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [resident] = await tx
      .select({ id: residents.id, name: residents.name, lifeStatus: residents.lifeStatus })
      .from(residents)
      .where(and(eq(residents.villageId, villageId), eq(residents.nationalId, input.nik)))
      .limit(1)
      .for("update");

    // Gunakan pesan generik agar endpoint publik tidak menjadi oracle NIK.
    if (
      !resident ||
      resident.lifeStatus !== "alive" ||
      resident.name.trim().toLocaleLowerCase("id-ID") !==
        input.nama.trim().toLocaleLowerCase("id-ID")
    ) {
      throw conflict(
        "Data belum dapat diverifikasi. Periksa kembali data atau hubungi kantor desa.",
      );
    }

    const [account] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.villageId, villageId), eq(users.residentId, resident.id)))
      .limit(1);
    if (account)
      throw conflict("Akun layanan mandiri untuk NIK ini sudah tersedia. Silakan masuk.");

    const [pending] = await tx
      .select({ id: registrasiWarga.id })
      .from(registrasiWarga)
      .where(
        and(
          eq(registrasiWarga.villageId, villageId),
          eq(registrasiWarga.nik, input.nik),
          eq(registrasiWarga.status, "menunggu"),
        ),
      )
      .limit(1);
    if (pending) throw conflict("Pengajuan dengan NIK ini sedang menunggu pemeriksaan.");

    await tx.insert(registrasiWarga).values({
      villageId,
      nik: input.nik,
      nama: input.nama,
      noHp: input.noHp || null,
      status: "menunggu",
    });
  });
}

export async function daftarRegistrasiWarga(villageId: number): Promise<RegistrasiWargaDTO[]> {
  return db
    .select({
      id: registrasiWarga.id,
      nik: registrasiWarga.nik,
      nama: registrasiWarga.nama,
      noHp: registrasiWarga.noHp,
      status: registrasiWarga.status,
      catatan: registrasiWarga.catatan,
      createdAt: registrasiWarga.createdAt,
    })
    .from(registrasiWarga)
    .where(eq(registrasiWarga.villageId, villageId))
    .orderBy(desc(registrasiWarga.createdAt))
    .limit(200);
}

export async function prosesRegistrasiWarga(
  villageId: number,
  requestId: number,
  keputusan: "setujui" | "tolak",
  catatan?: string,
): Promise<{ username: string; pin: string } | null> {
  const [request] = await db
    .select()
    .from(registrasiWarga)
    .where(
      and(
        eq(registrasiWarga.id, requestId),
        eq(registrasiWarga.villageId, villageId),
        eq(registrasiWarga.status, "menunggu"),
      ),
    )
    .limit(1);
  if (!request) throw notFound("Pengajuan tidak ditemukan atau sudah diproses.");

  if (keputusan === "tolak") {
    await db
      .update(registrasiWarga)
      .set({
        status: "ditolak",
        catatan: catatan?.trim().slice(0, 500) || null,
        reviewedAt: new Date(),
      })
      .where(
        and(
          eq(registrasiWarga.id, requestId),
          eq(registrasiWarga.villageId, villageId),
          eq(registrasiWarga.status, "menunggu"),
        ),
      );
    return null;
  }

  const [resident] = await db
    .select({
      id: residents.id,
      name: residents.name,
      nationalId: residents.nationalId,
      lifeStatus: residents.lifeStatus,
    })
    .from(residents)
    .where(and(eq(residents.villageId, villageId), eq(residents.nationalId, request.nik)))
    .limit(1);
  if (
    !resident ||
    resident.lifeStatus !== "alive" ||
    resident.name.trim().toLocaleLowerCase("id-ID") !==
      request.nama.trim().toLocaleLowerCase("id-ID")
  ) {
    throw conflict("Data penduduk tidak lagi cocok. Periksa data penduduk sebelum menyetujui.");
  }
  const pin = generatePin();
  const passwordHash = await hashPassword(pin);
  const userId = randomUUID();
  const email = `${request.nik}.${villageId}@warga.desa.local`;

  await db.transaction(async (tx) => {
    const [pending] = await tx
      .select({ id: registrasiWarga.id })
      .from(registrasiWarga)
      .where(
        and(
          eq(registrasiWarga.id, requestId),
          eq(registrasiWarga.villageId, villageId),
          eq(registrasiWarga.status, "menunggu"),
        ),
      )
      .limit(1);
    if (!pending) throw conflict("Pengajuan sudah diproses oleh administrator lain.");

    const [existingAccount] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.villageId, villageId), eq(users.residentId, resident.id)))
      .limit(1);
    if (existingAccount) throw conflict("Penduduk ini sudah memiliki akun layanan mandiri.");

    await tx.insert(users).values({
      id: userId,
      name: resident.name,
      email,
      username: request.nik,
      displayUsername: request.nik,
      emailVerified: true,
      villageId,
      roleId: null,
      active: true,
      residentId: resident.id,
      mustChangePin: true,
    });
    await tx.insert(accounts).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    });
    await tx
      .update(registrasiWarga)
      .set({
        status: "disetujui",
        catatan: catatan?.trim().slice(0, 500) || null,
        reviewedAt: new Date(),
      })
      .where(
        and(
          eq(registrasiWarga.id, requestId),
          eq(registrasiWarga.villageId, villageId),
          eq(registrasiWarga.status, "menunggu"),
        ),
      );
  });

  return { username: request.nik, pin };
}
