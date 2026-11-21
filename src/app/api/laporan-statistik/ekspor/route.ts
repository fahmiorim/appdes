import { NextResponse } from "next/server";
import { exportLaporan, type ExportFormat } from "@/features/laporan-statistik/application/export-laporan";
import { getLaporanDesa, type JenisLaporan } from "@/features/laporan-statistik/application/laporan-statistik-use-cases";
import { appErrorStatus, isAppError } from "@/lib/errors";
const kinds: JenisLaporan[] = ["penduduk","keuangan","pembangunan","bantuan","aset","layanan","surat-masuk","surat-keluar"];
const formats: ExportFormat[] = ["csv","xlsx","pdf"];
export const runtime = "nodejs";
export async function GET(request:Request) {
 try {
  const url=new URL(request.url), kind=url.searchParams.get("jenis") as JenisLaporan|null;
  const format=(url.searchParams.get("format")||"csv") as ExportFormat;
  if(!kind||!kinds.includes(kind)) return NextResponse.json({error:"Jenis laporan tidak valid."},{status:400});
  if(!formats.includes(format)) return NextResponse.json({error:"Format ekspor tidak didukung."},{status:400});
  const year=Number(url.searchParams.get("tahun")), data=await getLaporanDesa(kind,Number.isInteger(year)?year:undefined);
  return await exportLaporan({title:"Laporan "+kind+" Desa Tahun "+data.year,filename:"laporan-"+kind+"-"+data.year,columns:data.columns,rows:data.rows},format);
 } catch(error) {
  if(isAppError(error)) return NextResponse.json({error:error.message},{status:appErrorStatus(error.code)});
  return NextResponse.json({error:"Ekspor laporan gagal diproses."},{status:500});
 }
}
