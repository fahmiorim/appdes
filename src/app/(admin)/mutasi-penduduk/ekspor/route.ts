import { getIdentitas } from "@/features/desa/application/get-identitas";
import { listRiwayatExport } from "@/features/penduduk/application/riwayat-penduduk-use-cases";
import { buildRiwayatPendudukCsv, MUTATION_TYPES, normalisasiMutationType, riwayatPendudukFilename } from "@/features/penduduk/domain/riwayat-penduduk";

export async function GET(request:Request) {
  const url=new URL(request.url);
  const q=(url.searchParams.get("q")??"").trim().slice(0,100);
  const type=normalisasiMutationType(url.searchParams.get("type"));
  const from=url.searchParams.get("from")??undefined;
  const to=url.searchParams.get("to")??undefined;
  const params={q,type,from:/^\d{4}-\d{2}-\d{2}$/.test(from??"")?from:undefined,to:/^\d{4}-\d{2}-\d{2}$/.test(to??"")?to:undefined};
  const [rows,desa]=await Promise.all([listRiwayatExport(params),getIdentitas()]);
  const csv=buildRiwayatPendudukCsv({namaDesa:desa?.namaDesa??null,rows});
  return new Response(csv,{headers:{
    "Content-Type":"text/csv; charset=utf-8",
    "Content-Disposition":`attachment; filename="${riwayatPendudukFilename(desa?.namaDesa??null)}"`,
    "Cache-Control":"private, no-store",
  }});
}
