import "server-only";

import { bacaPengaturan } from "@/features/pengaturan/application/pengaturan-use-cases";
import { pengajuanRegistrasiWargaSchema, type PengajuanRegistrasiWargaInput } from "@/features/registrasi-warga/domain/registrasi-warga";
import { ajukanRegistrasiWarga, daftarRegistrasiWarga, prosesRegistrasiWarga } from "@/features/registrasi-warga/infrastructure/registrasi-warga-repository";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { requirePermission } from "@/lib/dal";
import { validationError } from "@/lib/errors";

export async function kirimPengajuanRegistrasiWarga(villageId: number, input: unknown): Promise<void> {
  const pengaturan = await bacaPengaturan(villageId);
  if (!pengaturan.pendaftaranWargaAktif) throw validationError("Pendaftaran akun warga sedang ditutup oleh pemerintah desa.");
  const parsed = pengajuanRegistrasiWargaSchema.safeParse(input);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Data pendaftaran tidak valid.");
  await ajukanRegistrasiWarga(villageId, parsed.data);
}

export async function ambilRegistrasiWargaAdmin() {
  const user = await requirePermission(RESOURCES.pengguna, "read");
  const villageId = await resolveVillageId(user);
  return daftarRegistrasiWarga(villageId);
}

export async function tinjauRegistrasiWargaAdmin(input: { id: number; keputusan: "setujui" | "tolak"; catatan?: string }) {
  if (!Number.isSafeInteger(input.id) || input.id <= 0 || !["setujui", "tolak"].includes(input.keputusan)) {
    throw validationError("Keputusan pendaftaran tidak valid.");
  }
  const user = await requirePermission(RESOURCES.pengguna, "update");
  const villageId = await resolveVillageId(user);
  return prosesRegistrasiWarga(villageId, input.id, input.keputusan, input.catatan);
}
