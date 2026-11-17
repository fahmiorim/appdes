import { forbidden, redirect } from "next/navigation";

import { requireSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import { isAppError } from "@/lib/errors";

/**
 * Gerbang seluruh halaman konsol platform.
 *
 * Guard dijalankan di level halaman, bukan hanya di use case data, agar setiap
 * rute baru di bawah `/super-admin` otomatis terlindungi: pengguna yang sudah
 * login tetapi tidak berhak mendapat halaman 403, sedangkan pengguna tanpa sesi
 * diarahkan ke halaman masuk.
 */
export async function pastikanSuperAdmin() {
  try {
    return await requireSuperAdmin();
  } catch (error) {
    if (isAppError(error) && error.code === "FORBIDDEN") {
      forbidden();
    }

    if (isAppError(error) && error.code === "UNAUTHENTICATED") {
      redirect("/masuk");
    }

    throw error;
  }
}
