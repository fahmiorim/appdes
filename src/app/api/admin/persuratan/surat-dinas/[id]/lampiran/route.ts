import { getSuratDinasLampiranData } from "@/features/surat/application/surat-dinas-use-cases";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return new Response("Lampiran tidak ditemukan.", { status: 404 });
  }

  try {
    const { bytes, fileName } = await getSuratDinasLampiranData(id);
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "NOT_FOUND") {
      return new Response("Lampiran tidak ditemukan.", { status: 404 });
    }
    throw error;
  }
}
