import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { requirePermission } from "@/lib/dal";
import { notFound, validationError } from "@/lib/errors";

import { balasPesanSchema, normalisasiEmail, pesanEmailMasukSchema } from "../domain/mailbox";
import {
  getPesanMasukMailbox,
  listMailboxPesan,
  simpanMailboxPesan,
  tandaiMailboxDibaca,
} from "../infrastructure/mailbox-repository";
import { kirimNotifikasi } from "./kirim-notifikasi";

export async function daftarPesanMailbox() {
  const user = await requirePermission(RESOURCES.notifikasi, "read");
  return listMailboxPesan(await resolveVillageId(user));
}

/** Dipanggil oleh webhook hanya setelah token diverifikasi dan desa diambil dari Host. */
export async function terimaPesanEmailWebhook(input: {
  villageId: number;
  alamat: string;
  subjek?: string;
  isi: string;
  tanggal?: string;
}): Promise<number> {
  const parsed = pesanEmailMasukSchema.omit({ token: true }).safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Payload email tidak valid.");
  }

  return simpanMailboxPesan({
    villageId: input.villageId,
    arah: "masuk",
    alamat: normalisasiEmail(parsed.data.alamat),
    subjek: parsed.data.subjek || null,
    isi: parsed.data.isi,
    dibaca: false,
    ...(parsed.data.tanggal ? { createdAt: new Date(parsed.data.tanggal) } : {}),
  });
}

export async function tandaiPesanMailboxDibaca(idInput: unknown): Promise<void> {
  const user = await requirePermission(RESOURCES.notifikasi, "update");
  const id = Number(idInput);
  if (!Number.isSafeInteger(id) || id < 1) throw validationError("Pesan tidak valid.");
  const villageId = await resolveVillageId(user);
  const pesan = await getPesanMasukMailbox(villageId, id);
  if (!pesan) throw notFound("Pesan email tidak ditemukan.");
  await tandaiMailboxDibaca(villageId, id);
}

export async function balasPesanMailbox(input: unknown): Promise<{
  sukses: boolean;
  dilewati: boolean;
  error?: string;
}> {
  const user = await requirePermission(RESOURCES.notifikasi, "update");
  const parsed = balasPesanSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Data balasan tidak valid.");
  }

  const villageId = await resolveVillageId(user);
  const pesanAsal = await getPesanMasukMailbox(villageId, parsed.data.id);
  if (!pesanAsal) throw notFound("Pesan email tidak ditemukan.");

  const hasil = await kirimNotifikasi({
    villageId,
    jenis: "mailbox.balas",
    kanal: "email",
    target: pesanAsal.alamat,
    subjek: pesanAsal.subjek ? `Re: ${pesanAsal.subjek}` : "Balasan dari pemerintah desa",
    pesan: parsed.data.isi,
  });

  if (hasil.sukses) {
    await simpanMailboxPesan({
      villageId,
      arah: "keluar",
      alamat: pesanAsal.alamat,
      subjek: pesanAsal.subjek ? `Re: ${pesanAsal.subjek}` : "Balasan dari pemerintah desa",
      isi: parsed.data.isi,
      dibaca: true,
    });
    await tandaiMailboxDibaca(villageId, pesanAsal.id);
    await recordAuditEvent({
      villageId,
      actorId: user.id,
      event: AUDIT_EVENTS.notifikasiKirim,
      resource: RESOURCES.notifikasi,
      details: { kanal: "email", arah: "balasan-kotak-masuk", pesanId: pesanAsal.id },
    });
  }

  return hasil;
}
