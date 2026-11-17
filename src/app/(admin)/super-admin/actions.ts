"use server";

import { revalidatePath } from "next/cache";

import {
  hapusDomain,
  jadikanDomainUtamaDesa,
  resetAksesAdminDesa,
  tambahDomain,
  ubahKuotaMedia,
  ubahStatusDesa,
} from "@/features/multi-desa/application/kelola-desa-use-cases";
import {
  eksporDataDesa,
  purgeDesa,
} from "@/features/multi-desa/application/lifecycle-desa-use-cases";
import { buatDesaBaru } from "@/features/multi-desa/application/provisioning-use-cases";
import { successState, toErrorState, type ActionState } from "@/lib/action-state";

/**
 * Server Action konsol tenant Super Admin.
 *
 * Lapisan route hanya memetakan FormData ke use case; seluruh validasi Zod,
 * otorisasi, dan audit tetap di application layer. `villageId` dari form tidak
 * pernah dianggap bukti otorisasi — use case memanggil `requireSuperAdmin` dan
 * memeriksa desa sebelum mengubah data.
 */

const HALAMAN = ["/super-admin", "/super-admin/tenant"] as const;

/** Ringkasan dan konsol tenant memuat data yang sama. */
function segarkanHalaman(): void {
  for (const path of HALAMAN) revalidatePath(path);
}

export async function buatDesaAction(
  _state: ActionState<{ id: number }>,
  formData: FormData,
): Promise<ActionState<{ id: number }>> {
  try {
    const hasil = await buatDesaBaru({
      name: formData.get("name"),
      code: formData.get("code"),
      domain: formData.get("domain") ?? "",
      adminName: formData.get("adminName"),
      adminUsername: formData.get("adminUsername"),
      adminEmail: formData.get("adminEmail"),
      adminPassword: formData.get("adminPassword"),
      kuotaMediaMb: formData.get("kuotaMediaMb") ?? "",
    });

    segarkanHalaman();
    return successState("Desa baru berhasil dibuat.", hasil);
  } catch (error) {
    return toErrorState(error);
  }
}

export async function ubahStatusAction(
  _state: ActionState<{ active: boolean }>,
  formData: FormData,
): Promise<ActionState<{ active: boolean }>> {
  try {
    const hasil = await ubahStatusDesa({
      villageId: formData.get("villageId"),
      active: formData.get("active"),
    });

    segarkanHalaman();
    return successState(
      hasil.active
        ? "Desa diaktifkan kembali; masa tenggang retensi direset."
        : "Desa dinonaktifkan. Masa tenggang retensi 90 hari dimulai.",
      hasil,
    );
  } catch (error) {
    return toErrorState(error);
  }
}

export async function ubahKuotaAction(
  _state: ActionState<{ kuotaMediaMb: number | null }>,
  formData: FormData,
): Promise<ActionState<{ kuotaMediaMb: number | null }>> {
  try {
    const hasil = await ubahKuotaMedia({
      villageId: formData.get("villageId"),
      kuotaMediaMb: formData.get("kuotaMediaMb") ?? "",
    });

    segarkanHalaman();
    return successState(
      hasil.kuotaMediaMb === null
        ? "Kuota media dihapus (tanpa batas)."
        : `Kuota media disetel ke ${hasil.kuotaMediaMb} MB.`,
      hasil,
    );
  } catch (error) {
    return toErrorState(error);
  }
}

export async function tambahDomainAction(
  _state: ActionState<{ id: number }>,
  formData: FormData,
): Promise<ActionState<{ id: number }>> {
  try {
    const hasil = await tambahDomain({
      villageId: formData.get("villageId"),
      domain: formData.get("domain"),
    });

    segarkanHalaman();
    return successState("Domain ditambahkan.", hasil);
  } catch (error) {
    return toErrorState(error);
  }
}

export async function hapusDomainAction(
  _state: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  try {
    await hapusDomain({
      villageId: formData.get("villageId"),
      domainId: formData.get("domainId"),
    });

    segarkanHalaman();
    return successState("Domain dihapus.");
  } catch (error) {
    return toErrorState(error);
  }
}

export async function jadikanUtamaAction(
  _state: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  try {
    await jadikanDomainUtamaDesa({
      villageId: formData.get("villageId"),
      domainId: formData.get("domainId"),
    });

    segarkanHalaman();
    return successState("Domain utama diperbarui.");
  } catch (error) {
    return toErrorState(error);
  }
}

export async function resetAdminAction(
  _state: ActionState<{ username: string | null; email: string; sandiSementara: string }>,
  formData: FormData,
): Promise<ActionState<{ username: string | null; email: string; sandiSementara: string }>> {
  try {
    const hasil = await resetAksesAdminDesa(formData.get("villageId"));

    segarkanHalaman();
    return successState(
      "Akses administrator desa direset. Sandi sementara hanya ditampilkan sekali ini.",
      hasil,
      "warning",
    );
  } catch (error) {
    return toErrorState(error);
  }
}

export async function eksporDataAction(
  _state: ActionState<Awaited<ReturnType<typeof eksporDataDesa>>>,
  formData: FormData,
): Promise<ActionState<Awaited<ReturnType<typeof eksporDataDesa>>>> {
  try {
    const hasil = await eksporDataDesa(formData.get("villageId"));

    segarkanHalaman();
    return successState(
      `Ekspor selesai: ${hasil.jumlahBaris.toLocaleString("id-ID")} baris. Simpan berkas sebelum masa berlaku 30 hari berakhir.`,
      hasil,
    );
  } catch (error) {
    return toErrorState(error);
  }
}

export async function purgeAction(
  _state: ActionState<{ jumlahBarisDihapus: number; tabelDiproses: number; mediaDihapus: boolean }>,
  formData: FormData,
): Promise<
  ActionState<{ jumlahBarisDihapus: number; tabelDiproses: number; mediaDihapus: boolean }>
> {
  try {
    const hasil = await purgeDesa({
      villageId: formData.get("villageId"),
      konfirmasi: formData.get("konfirmasi"),
    });

    segarkanHalaman();
    return successState(
      `Data desa di-purge: ${hasil.jumlahBarisDihapus.toLocaleString("id-ID")} baris dari ${hasil.tabelDiproses} tabel. Media ${hasil.mediaDihapus ? "terhapus" : "perlu dibersihkan manual"}.`,
      hasil,
      "warning",
    );
  } catch (error) {
    return toErrorState(error);
  }
}
