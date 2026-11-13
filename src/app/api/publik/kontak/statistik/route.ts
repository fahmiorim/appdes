import { NextResponse } from "next/server";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getStatistikPengunjungPublik } from "@/features/kontak/application/statistik-pengunjung-use-cases";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";
import { alamatIp } from "@/lib/client-ip";

const BATAS_BACA_PER_MENIT = 60;

/** GET /api/publik/kontak/statistik — Statistiques visiteurs pour la page contact */
export async function GET(request: Request) {
  const batas = await batasiPermintaan(`kontak-statistik:${alamatIp(request)}`, {
    batas: BATAS_BACA_PER_MENIT,
  });
  if (batas.dibatasi) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi beberapa saat." },
      { status: 429 },
    );
  }

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
