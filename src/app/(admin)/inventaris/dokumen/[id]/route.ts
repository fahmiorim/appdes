import { getDokumenInventarisDownload } from "@/features/inventaris/application/inventaris-use-cases";

export async function GET(request: Request, { params }: RouteContext<"/inventaris/dokumen/[id]">) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1)
    return new Response("Dokumen tidak ditemukan.", { status: 404 });
  try {
    const doc = await getDokumenInventarisDownload(id);
    const namaAman = doc.namaFile.replace(/[^a-zA-Z0-9._-]/g, "_");
    return new Response(Buffer.from(doc.bytes), {
      headers: {
        "Content-Type": doc.mime,
        "Content-Disposition": `${new URL(request.url).searchParams.get("inline") === "1" && doc.mime.startsWith("image/") ? "inline" : "attachment"}; filename="${namaAman}"`,
        "Content-Length": String(doc.ukuran),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Dokumen tidak ditemukan atau akses ditolak.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
