import type { Metadata } from "next";
import Link from "next/link";
import { getJenisSuratEditorData } from "@/features/surat/application/jenis-surat-use-cases";
import { JenisSuratForm } from "../jenis-surat-form";
export const metadata: Metadata = { title: "Tambah Jenis Surat" };
export default async function BaruJenisSuratPage() {
  const { klasifikasi, syarat } = await getJenisSuratEditorData();
  return <div className="modul-page"><div className="page-heading"><div><span className="eyebrow">Administrasi Surat / Master</span><h1>Tambah Jenis Surat</h1><p>Buat jenis surat baru beserta template, isian, dan ketentuan penerbitannya.</p></div><Link href="/persuratan/jenis-surat" className="button button-secondary">← Kembali</Link></div><JenisSuratForm jenis={null} klasifikasi={klasifikasi} syarat={syarat} /></div>;
}
