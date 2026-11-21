import { NextResponse } from "next/server";
import { exportLaporan, type ExportFormat } from "@/features/laporan-statistik/application/export-laporan";
import { getLaporanDesa, type JenisLaporan } from "@/features/laporan-statistik/application/laporan-statistik-use-cases";
const kinds: JenisLaporan[] = ["penduduk","keuangan","pembangunan","bantuan"];
const formats: ExportFormat[] = ["csv","xlsx","pdf"];
export const runtime = "nodejs";
export async function GET(request:Request) {
 const url=new URL(request.url), kind=url.searchParams.get("jenis") as JenisLaporan|null;
 const format=(url.searchParams.get("format")||"csv") as ExportFormat;
 if(!kind||!kinds.includes(kind)) return NextResponse.json({error:"Jenis laporan tidak valid."},{status:400});
 if(!formats.includes(format)) return NextResponse.json({error:"Format ekspor tidak didukung."},{status:400});
 const year=Number(url.searchParams.get("tahun")), data=await getLaporanDesa(kind,Number.isInteger(year)?year:undefined);
 return exportLaporan({title:"Laporan "+kind+" Desa Tahun "+data.year,filename:"laporan-"+kind+"-"+data.year,columns:data.columns,rows:data.rows},format);
}
