import { toCsv } from "@/lib/csv";
import { listKeluarga } from "@/features/keluarga/application/use-cases";

export async function GET(request:Request) {
  const url=new URL(request.url);
  const search=(url.searchParams.get("q")??"").trim().slice(0,100);
  const result=await listKeluarga({search,page:1,pageSize:1000});
  const csv=`\uFEFF${toCsv([
    ["Nomor KK","Kepala Keluarga","Jumlah Anggota","Alamat","Wilayah"],
    ...result.rows.map(row=>[row.number,row.headName??"",String(row.memberCount),row.address??"",row.regionLabel??""]),
  ])}`;
  return new Response(csv,{headers:{
    "Content-Type":"text/csv; charset=utf-8",
    "Content-Disposition":'attachment; filename="data-kartu-keluarga.csv"',
    "Cache-Control":"private, no-store",
  }});
}
