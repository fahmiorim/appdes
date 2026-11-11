import {
  csvKesehatan,
  dataEksporKia,
  namaBerkasKesehatan,
  responsCsvKesehatan,
  responsGalatKesehatan,
} from "@/features/kesehatan/application/ekspor-kesehatan";

export async function GET() {
  try {
    const { desa, rows } = await dataEksporKia();

    const csv = csvKesehatan([
      ["No", "KIA", "Ibu", "Posyandu"],
      ...rows.map((row) => [row.id, row.noKia, row.ibuName, row.posyanduId]),
    ]);

    return responsCsvKesehatan(csv, namaBerkasKesehatan("kia", desa.namaDesa));
  } catch (error) {
    return responsGalatKesehatan(error);
  }
}
