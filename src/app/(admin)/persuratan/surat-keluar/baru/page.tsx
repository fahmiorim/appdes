import { getBukuAgendaEditorData } from "@/features/surat/application/buku-agenda-use-cases";
import { simpanSuratKeluarAction } from "../../buku-agenda-actions";
import { BukuAgendaForm } from "../../buku-agenda-form";
export default async function BaruSuratKeluarPage(){const {klasifikasi}=await getBukuAgendaEditorData("keluar");return <BukuAgendaForm jenis="keluar" klasifikasi={klasifikasi} action={simpanSuratKeluarAction}/>;}
