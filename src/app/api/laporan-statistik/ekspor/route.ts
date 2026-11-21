import { NextResponse } from "next/server";
import { getLaporanDesa, type JenisLaporan } from "@/features/laporan-statistik/application/laporan-statistik-use-cases";
const kinds: JenisLaporan[] = ["penduduk","keuangan","pembangunan","bantuan"];
const cell=(value:unknown)=>'"'+String(value??"").replace(/"/g,'""')+'"';
export async function GET(request:Request) {
 const url=new URL(request.url), kind=url.searchParams.get("jenis") as JenisLaporan|null;
 if(!kind||!kinds.includes(kind)) return NextResponse.json({error:"Jenis laporan tidak valid."},{status:400});
 const year=Number(url.searchParams.get("tahun")), data=await getLaporanDesa(kind,Number.isInteger(year)?year:undefined);
 const csv="\uFEFF"+[data.columns,...data.rows].map(row=>row.map(cell).join(",")).join("\r\n");
 return new NextResponse(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="laporan-${kind}-${data.year}.csv"`,"Cache-Control":"private, no-store"}});
}