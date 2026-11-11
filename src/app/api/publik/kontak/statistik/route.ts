import { NextResponse } from "next/server";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getStatistikPengunjungPublik } from "@/features/kontak/application/statistik-pengunjung-use-cases";

/** GET /api/publik/kontak/statistik — Statistiques visiteurs pour la page contact */
export async function GET() {
  let desa;
  try {
    desa = await getIdentitasFromRequest();
  } catch {
    return NextResponse.json({ error: "Desa tidak valid" }, { status: 400 });
  }

  const stats = await getStatistikPengunjungPublik({
    villageId: desa.id,
    halaman: "kontak",
    jumlahHari: 30,
  });

  return NextResponse.json({ stats });
}
