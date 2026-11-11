import {
  csvKesehatan,
  dataEksporPemantauanAnak,
  namaBerkasKesehatan,
  responsCsvKesehatan,
  responsGalatKesehatan,
} from "@/features/kesehatan/application/ekspor-kesehatan";
import { STATUS_GIZI_ANAK, STATUS_TIKAR_ANAK } from "@/features/kesehatan/domain/kesehatan";

function statusGiziLabel(value: number): string {
  return STATUS_GIZI_ANAK.find((status) => status.value === value)?.label ?? "-";
}

function statusTikarLabel(value: number): string {
  return STATUS_TIKAR_ANAK.find((status) => status.value === value)?.label ?? "-";
}

export async function GET() {
  try {
    const { desa, rows } = await dataEksporPemantauanAnak();

    const csv = csvKesehatan([
      ["ID", "Posyandu", "Umur Bulan", "Status Gizi", "Status Tikar", "Imunisasi"],
      ...rows.map((row) => [
        row.id,
        row.posyanduId,
        row.umurBulan,
        statusGiziLabel(row.statusGizi),
        statusTikarLabel(row.statusTikar),
        row.pemberianImunisasiDasar ? "Ya" : "Tidak",
      ]),
    ]);

    return responsCsvKesehatan(csv, namaBerkasKesehatan("pemantauan-anak", desa.namaDesa));
  } catch (error) {
    return responsGalatKesehatan(error);
  }
}
