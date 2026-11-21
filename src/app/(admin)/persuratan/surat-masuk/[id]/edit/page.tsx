import { notFound } from "next/navigation";

import { getBukuAgendaEditorData } from "@/features/surat/application/buku-agenda-use-cases";

import { simpanSuratMasukAction } from "../../../buku-agenda-actions";
import { BukuAgendaForm } from "../../../buku-agenda-form";

export default async function EditSuratMasukPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const { row, klasifikasi } = await getBukuAgendaEditorData("masuk", id);
  return (
    <BukuAgendaForm
      jenis="masuk"
      row={row}
      klasifikasi={klasifikasi}
      action={simpanSuratMasukAction}
    />
  );
}
