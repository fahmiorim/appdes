import { getDokumenInventarisDownload } from "@/features/inventaris/application/inventaris-use-cases";
import { bacaMedia } from "@/features/publik/infrastructure/media-storage";

export async function GET(_request:Request,{params}:RouteContext<"/inventaris/dokumen/[id]">) {
  const {id:raw}=await params; const id=Number(raw);
  if(!Number.isSafeInteger(id)||id<1) return new Response("Dokumen tidak ditemukan.",{status:404});
  try {
    const doc=await getDokumenInventarisDownload(id);
    const bytes=await bacaMedia(doc.jalurMedia);
    return new Response(bytes,{
      headers:{
        "Content-Type":doc.mime,
        "Content-Disposition":`attachment; filename="${doc.namaFile.replace(/["\\\\\r\n]/g,"_")}"`,
        "Content-Length":String(doc.ukuran),
        "Cache-Control":"private, no-store",
        "X-Content-Type-Options":"nosniff",
      },
    });
  } catch {
    return new Response("Dokumen tidak ditemukan atau akses ditolak.",{status:404,headers:{"Cache-Control":"no-store"}});
  }
}
