import { notFound } from "next/navigation";

import { getBukuAgendaEditorData } from "@/features/surat/application/buku-agenda-use-cases";

import { simpanSuratKeluarAction } from "../../../buku-agenda-actions";
import { BukuAgendaForm } from "../../../buku-agenda-form";

export default async function EditSuratKeluarPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const { row, klasifikasi } = await getBukuAgendaEditorData("keluar", id);
  return (
    <BukuAgendaForm
      jenis="keluar"
      row={row}
      klasifikasi={klasifikasi}
      action={simpanSuratKeluarAction}
    />
  );
}
