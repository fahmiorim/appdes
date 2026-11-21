import { notFound } from "next/navigation";

import { getSuratDinasEditorData } from "@/features/surat/application/surat-dinas-use-cases";

import { SuratDinasForm } from "../../surat-dinas-form";

export const metadata = { title: "Ubah Surat Dinas" };

export default async function EditSuratDinasPage({ params }: { params: Promise<{ id: string }> }) {
  const rawId = Number((await params).id);
  if (!Number.isSafeInteger(rawId) || rawId < 1) notFound();
  const { row, klasifikasi } = await getSuratDinasEditorData(rawId);
  if (!row) notFound();
  return <SuratDinasForm row={row} klasifikasi={klasifikasi} />;
}
