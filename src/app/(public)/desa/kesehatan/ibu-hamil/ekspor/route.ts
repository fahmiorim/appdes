import {
  csvKesehatan,
  dataEksporIbuHamil,
  namaBerkasKesehatan,
  responsCsvKesehatan,
  responsGalatKesehatan,
} from "@/features/kesehatan/application/ekspor-kesehatan";

function statusKehamilanLabel(value: number | null): string {
  if (value === 1) return "Normal";
  if (value === 2) return "Risiko Tinggi";
  if (value === 3) return "Kekurangan Energi Kronis";
  return "-";
}

export async function GET() {
  try {
    const { desa, rows } = await dataEksporIbuHamil();

    const csv = csvKesehatan([
      ["ID", "Posyandu", "Status Kehamilan", "Usia Hamil", "Pemeriksaan", "Nifas"],
      ...rows.map((row) => [
        row.id,
        row.posyanduId,
        statusKehamilanLabel(row.statusKehamilan),
        row.usiaKehamilan,
        row.pemeriksaanKehamilan ? "Ya" : "Tidak",
        row.pemeriksaanNifas ? "Ya" : "Tidak",
      ]),
    ]);

    return responsCsvKesehatan(csv, namaBerkasKesehatan("ibu-hamil", desa.namaDesa));
  } catch (error) {
    return responsGalatKesehatan(error);
  }
}
