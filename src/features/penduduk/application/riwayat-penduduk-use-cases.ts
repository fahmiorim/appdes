import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { PENDUDUK_RESOURCE } from "@/features/penduduk/domain/penduduk";
import {
  catatDatangSchema,
  catatKelahiranSchema,
  catatKematianSchema,
  catatPerubahanSchema,
  catatPindahKeluarSchema,
  type CatatDatangInput,
  type CatatKelahiranInput,
  type CatatKematianInput,
  type CatatPerubahanInput,
  type CatatPindahKeluarInput,
  type ListRiwayatParams,
  type ListRiwayatResult,
} from "@/features/penduduk/domain/riwayat-penduduk";
import {
  findPendudukById,
  nationalIdExists,
} from "@/features/penduduk/infrastructure/penduduk-repository";
import {
  getRiwayatByResident,
  listRiwayatPenduduk,
  listRiwayatPendudukExport,
  simpanPendudukBaruDanMutasi,
  ubahStatusPendudukDanMutasi,
} from "@/features/penduduk/infrastructure/riwayat-penduduk-repository";
import { requirePermission } from "@/lib/dal";
import { conflict, notFound } from "@/lib/errors";

export async function listRiwayat(params: ListRiwayatParams): Promise<ListRiwayatResult> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  return listRiwayatPenduduk(villageId, params);
}

export async function listRiwayatExport(params: ListRiwayatParams) {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  return listRiwayatPendudukExport(villageId, params);
}

export async function getRiwayatByPendudukId(residentId: number) {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  return getRiwayatByResident(villageId, residentId);
}

export async function catatKelahiran(input: CatatKelahiranInput, actorId?: string | null) {
  const user = await requirePermission(PENDUDUK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const parsed = catatKelahiranSchema.parse(input);

  const nid = parsed.nationalId;
  if (nid && (await nationalIdExists(villageId, nid, null))) {
    throw conflict("NIK sudah terdaftar di desa ini.");
  }

  const id = await simpanPendudukBaruDanMutasi(
    {
      villageId,
      familyId: parsed.familyId ?? null,
      regionId: parsed.regionId ?? null,
      nationalId: nid,
      name: parsed.name.trim(),
      gender: parsed.gender === "male" || parsed.gender === "female" ? parsed.gender : "male",
      birthDate: parsed.eventDate,
      birthPlace: null,
      address: parsed.address || null,
      phone: null,
      fatherName: parsed.fatherName || null,
      motherName: parsed.motherName || null,
      fatherNationalId: null,
      motherNationalId: null,
      lifeStatus: "alive",
      residenceStatus: "permanent",
      familyRelationId: null,
      religionId: null,
      maritalStatusId: null,
      educationId: null,
      educationSedangId: null,
      occupationId: null,
      citizenshipId: null,
      bloodTypeId: null,
      rtmId: null,
      rtmLevel: null,
    },
    {
      villageId,
      type: "birth",
      eventDate: parsed.eventDate,
      reportedAt: new Date(),
      actorId: actorId ?? user.id,
      reason: parsed.reason || null,
      notes: parsed.notes || null,
      referenceNo: parsed.referenceNo || null,
      meta: {
        fatherName: parsed.fatherName || null,
        motherName: parsed.motherName || null,
      },
    },
  );

  return { id };
}

export async function catatKematian(input: CatatKematianInput, actorId?: string | null) {
  const user = await requirePermission(PENDUDUK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const parsed = catatKematianSchema.parse(input);

  const penduduk = await findPendudukById(villageId, parsed.residentId);
  if (!penduduk) throw notFound("Data penduduk tidak ditemukan.");

  if (penduduk.lifeStatus === "deceased") {
    throw conflict("Penduduk ini sudah tercatat meninggal.");
  }

  await ubahStatusPendudukDanMutasi(villageId, parsed.residentId, "deceased", {
    villageId,
    type: "death",
    eventDate: parsed.eventDate,
    reportedAt: new Date(),
    actorId: actorId ?? user.id,
    reason: parsed.reason || null,
    notes: parsed.notes || null,
    referenceNo: parsed.referenceNo || null,
    meta: null,
  });
}

export async function catatPindahKeluar(input: CatatPindahKeluarInput, actorId?: string | null) {
  const user = await requirePermission(PENDUDUK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const parsed = catatPindahKeluarSchema.parse(input);

  const penduduk = await findPendudukById(villageId, parsed.residentId);
  if (!penduduk) throw notFound("Data penduduk tidak ditemukan.");

  if (penduduk.lifeStatus === "moved") {
    throw conflict("Penduduk ini sudah tercatat pindah keluar.");
  }

  await ubahStatusPendudukDanMutasi(villageId, parsed.residentId, "moved", {
    villageId,
    type: "move_out",
    eventDate: parsed.eventDate,
    reportedAt: new Date(),
    actorId: actorId ?? user.id,
    reason: parsed.reason || null,
    notes: parsed.notes || null,
    referenceNo: parsed.referenceNo || null,
    toAddress: parsed.toAddress || null,
    meta: { destination: parsed.destination || null },
  });
}

export async function catatPerubahan(input: CatatPerubahanInput, actorId?: string | null) {
  const user = await requirePermission(PENDUDUK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const parsed = catatPerubahanSchema.parse(input);

  if (parsed.lifeStatus === "deceased" || parsed.lifeStatus === "moved") {
    throw conflict("Gunakan pencatatan kematian atau pindah keluar untuk status tersebut.");
  }

  const penduduk = await findPendudukById(villageId, parsed.residentId);
  if (!penduduk) throw notFound("Data penduduk tidak ditemukan.");
  if (penduduk.lifeStatus === parsed.lifeStatus) {
    throw conflict("Status kependudukan tidak berubah.");
  }

  await ubahStatusPendudukDanMutasi(villageId, parsed.residentId, parsed.lifeStatus, {
    villageId,
    type: "change",
    eventDate: parsed.eventDate,
    reportedAt: new Date(),
    actorId: actorId ?? user.id,
    reason: parsed.reason || null,
    notes: parsed.notes || null,
    referenceNo: parsed.referenceNo || null,
    meta: { fromLifeStatus: penduduk.lifeStatus, toLifeStatus: parsed.lifeStatus },
  });
}

export async function catatDatang(input: CatatDatangInput, actorId?: string | null) {
  const user = await requirePermission(PENDUDUK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const parsed = catatDatangSchema.parse(input);

  const nid = parsed.nationalId;
  if (nid && (await nationalIdExists(villageId, nid, null))) {
    throw conflict("NIK sudah terdaftar di desa ini.");
  }

  const id = await simpanPendudukBaruDanMutasi(
    {
      villageId,
      familyId: parsed.familyId ?? null,
      regionId: parsed.regionId ?? null,
      nationalId: nid,
      name: parsed.name.trim(),
      gender: parsed.gender === "male" || parsed.gender === "female" ? parsed.gender : "male",
      birthDate: parsed.birthDate,
      birthPlace: parsed.birthPlace || null,
      address: parsed.address || null,
      phone: null,
      fatherName: null,
      motherName: null,
      fatherNationalId: null,
      motherNationalId: null,
      lifeStatus: "alive",
      residenceStatus: "permanent",
      familyRelationId: null,
      religionId: null,
      maritalStatusId: null,
      educationId: null,
      educationSedangId: null,
      occupationId: null,
      citizenshipId: null,
      bloodTypeId: null,
      rtmId: null,
      rtmLevel: null,
    },
    {
      villageId,
      type: "move_in",
      eventDate: parsed.eventDate,
      reportedAt: new Date(),
      actorId: actorId ?? user.id,
      reason: parsed.reason || null,
      notes: parsed.notes || null,
      referenceNo: parsed.referenceNo || null,
      fromAddress: parsed.fromAddress || null,
      meta: { fromAddress: parsed.fromAddress || null },
    },
  );

  return { id };
}
