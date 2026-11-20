import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJenisSuratEditorData } from "@/features/surat/application/jenis-surat-use-cases";
import { JenisSuratForm } from "../../jenis-surat-form";
export const metadata: Metadata = { title: "Edit Jenis Surat" };
export default async function EditJenisSuratPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params; const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const { jenis, klasifikasi, syarat, canDelete } = await getJenisSuratEditorData(id);
  return <div className="modul-page"><div className="page-heading"><div><span className="eyebrow">Administrasi Surat / Master</span><h1>Kelola {jenis?.name}</h1><p>Perubahan template akan digunakan pada surat baru, tanpa mengubah arsip surat yang sudah diterbitkan.</p></div><Link href="/persuratan/jenis-surat" className="button button-secondary">← Kembali</Link></div><JenisSuratForm jenis={jenis} klasifikasi={klasifikasi} syarat={syarat} canDelete={canDelete} /></div>;
}
