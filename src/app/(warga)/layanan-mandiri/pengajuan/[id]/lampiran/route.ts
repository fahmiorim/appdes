import { bacaLampiranPengajuanWargaData } from "@/features/pelayanan/application/pengajuan-use-cases";
import { getCurrentUser } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sesi berakhir.", { status: 401 });
  if (user.residentId === null) return new Response("Akun bukan warga.", { status: 403 });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return new Response("ID tidak valid.", { status: 400 });
  try {
    const bytes = await bacaLampiranPengajuanWargaData(id);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="pengajuan-${id}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    if (isAppError(error))
      return new Response(error.message, { status: appErrorStatus(error.code) });
    return new Response("Gagal membaca lampiran.", { status: 500 });
  }
}
