import { getBukuAgendaEditorData } from "@/features/surat/application/buku-agenda-use-cases";

import { simpanSuratMasukAction } from "../../buku-agenda-actions";
import { BukuAgendaForm } from "../../buku-agenda-form";

export default async function BaruSuratMasukPage() {
  const { klasifikasi } = await getBukuAgendaEditorData("masuk");
  return <BukuAgendaForm jenis="masuk" klasifikasi={klasifikasi} action={simpanSuratMasukAction} />;
}
