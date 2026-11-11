import { NextResponse } from "next/server";

import { getBantuanDetail } from "@/features/bantuan/application/use-cases";
import { asalDanaLabel, sasaranLabel } from "@/features/bantuan/domain/bantuan";
import { hasPermission } from "@/features/rbac/application/authorization";
import { penggunaRoute } from "@/lib/route-auth";

interface BantuanCsvRow {
  namaProgram: string;
  sasaran: string;
  asalDana: string;
  namaSasaran: string;
  identitas: string;
  noKartu: string;
  tanggalDaftar: string;
}

function buildBantuanCsv(rows: Array<BantuanCsvRow>): string {
  // Header baris CSV
  const header = "Nama Program,Sasaran,Asal Dana,Nama Sasaran,Identitas,No Kartu,Tanggal Daftar\n";

  // Build data rows
  const dataRows = rows.map((row) => {
    const fields = [
      `"${row.namaProgram}"`,
      `"${row.sasaran}"`,
      `"${row.asalDana}"`,
      `"${row.namaSasaran}"`,
      `"${row.identitas}"`,
      `"${row.noKartu}"`,
      `"${row.tanggalDaftar}"`,
    ];
    return fields.join(",");
  });

  // Gabungkan header dan data
  return header + dataRows.join("\n");
}

export async function GET(request: Request) {
  const auth = await penggunaRoute();
  if (!auth.ok) return auth.respons;
  const user = auth.user;

  if (!hasPermission(user.permissions, "bantuan", "read")) {
    return new NextResponse("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const programId = searchParams.get("programId")
    ? Number(searchParams.get("programId"))
    : undefined;

  if (!programId) {
    return new NextResponse("ID program wajib diisi.", { status: 400 });
  }

  const foundProgram = await getBantuanDetail(programId);

  if (!foundProgram) {
    return new NextResponse("Program bantuan tidak ditemukan.", { status: 404 });
  }

  const { program, peserta } = foundProgram;

  // Build CSV rows with labels
  const csvRows: Array<BantuanCsvRow> = peserta.map((p) => ({
    namaProgram: program.name,
    sasaran: sasaranLabel(program.sasaran),
    asalDana: asalDanaLabel(program.asalDana),
    namaSasaran: p.targetName,
    identitas: p.targetIdentity ?? "-",
    noKartu: p.cardNumber ?? "-",
    tanggalDaftar: new Date().toISOString().split("T")[0] || "",
  }));

  const filename = `rekap-bantuan-${program.slug}.csv`;

  return new NextResponse(buildBantuanCsv(csvRows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
