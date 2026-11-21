import { getSuratDinasEditorData } from "@/features/surat/application/surat-dinas-use-cases";

import { SuratDinasForm } from "../surat-dinas-form";

export const metadata = { title: "Buat Surat Dinas" };

export default async function BaruSuratDinasPage() {
  const { klasifikasi } = await getSuratDinasEditorData();
  return <SuratDinasForm klasifikasi={klasifikasi} />;
}
