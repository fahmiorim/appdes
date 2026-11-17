"use server";

import { revalidatePath } from "next/cache";

import {
  buatPenggunaPlatformBaru,
  cabutSesiPenggunaPlatformAkun,
  resetSandiPenggunaPlatform,
  ubahStatusPenggunaPlatform,
  type HasilResetSandiPlatform,
} from "@/features/multi-desa/application/pengguna-platform-use-cases";
import { successState, toErrorState, type ActionState } from "@/lib/action-state";

/**
 * Server Action konsol pengguna platform.
 *
 * Route hanya memetakan FormData ke use case; validasi Zod, guard Super Admin,
 * pembatasan akun platform, dan audit tetap di application layer. `id` dari form
 * tidak pernah dianggap bukti otorisasi.
 */

const HALAMAN = "/super-admin/pengguna";

export async function buatPenggunaAction(
  _state: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  try {
    const hasil = await buatPenggunaPlatformBaru({
      name: formData.get("name"),
      email: formData.get("email"),
      username: formData.get("username"),
      password: formData.get("password"),
    });

    revalidatePath(HALAMAN);
    return successState("Pengguna platform berhasil dibuat.", hasil);
  } catch (error) {
    return toErrorState(error);
  }
}

export async function ubahStatusPenggunaAction(
  _state: ActionState<{ active: boolean }>,
  formData: FormData,
): Promise<ActionState<{ active: boolean }>> {
  try {
    const hasil = await ubahStatusPenggunaPlatform({
      id: formData.get("id"),
      active: formData.get("active"),
    });

    revalidatePath(HALAMAN);
    return successState(
      hasil.active ? "Akun diaktifkan kembali." : "Akun dinonaktifkan dan seluruh sesinya dicabut.",
      hasil,
    );
  } catch (error) {
    return toErrorState(error);
  }
}

export async function resetSandiPenggunaAction(
  _state: ActionState<HasilResetSandiPlatform>,
  formData: FormData,
): Promise<ActionState<HasilResetSandiPlatform>> {
  try {
    const hasil = await resetSandiPenggunaPlatform(formData.get("id"));

    revalidatePath(HALAMAN);
    return successState(
      "Sandi direset. Sandi sementara hanya ditampilkan sekali ini.",
      hasil,
      "warning",
    );
  } catch (error) {
    return toErrorState(error);
  }
}

export async function cabutSesiPenggunaAction(
  _state: ActionState<{ jumlah: number }>,
  formData: FormData,
): Promise<ActionState<{ jumlah: number }>> {
  try {
    const hasil = await cabutSesiPenggunaPlatformAkun(formData.get("id"));

    revalidatePath(HALAMAN);
    return successState(`${hasil.jumlah} sesi dicabut.`, hasil);
  } catch (error) {
    return toErrorState(error);
  }
}
