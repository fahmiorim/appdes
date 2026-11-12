import { NextResponse } from "next/server";

import { getBantuanDetail } from "@/features/bantuan/application/use-cases";
import { asalDanaLabel, sasaranLabel } from "@/features/bantuan/domain/bantuan";
import { hasPermission } from "@/features/rbac/application/authorization";
import { toCsv } from "@/lib/csv";
import { penggunaRoute } from "@/lib/route-auth";

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

  const csv = toCsv(
    [
      [
        "Nama Program",
        "Sasaran",
        "Asal Dana",
        "Nama Sasaran",
        "Identitas",
        "No Kartu",
        "Tanggal Daftar",
      ],
      ...peserta.map((p) => [
        program.name,
        sasaranLabel(program.sasaran),
        asalDanaLabel(program.asalDana),
        p.targetName,
        p.targetIdentity ?? "-",
        p.cardNumber ?? "-",
        new Date().toISOString().split("T")[0] || "",
      ]),
    ],
    ",",
  );

  const filename = `rekap-bantuan-${program.slug}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
