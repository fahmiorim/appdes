import type { Metadata } from "next";
import Link from "next/link";

import { getSuratFormOptions } from "@/features/surat/application/surat-use-cases";
import { parseIsianFields } from "@/features/surat/domain/isian";
import { todayIsoDate } from "@/lib/forms";

import { buatKonsepSuratAction } from "../actions";
import { SuratForm } from "../surat-form";

export const metadata: Metadata = { title: "Buat Surat" };

type SearchParams = Promise<{ error?: string }>;

export default async function BuatSuratPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ jenis, penduduk }, query] = await Promise.all([
    getSuratFormOptions(),
    searchParams,
  ]);
  const options = jenis.map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    requiresResident: item.requiresResident,
    fields: parseIsianFields(item.formIsian),
  }));

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administrasi Surat / Pembuatan Surat</span>
          <h1>Buat Surat Baru</h1>
          <p>Buat konsep surat berdasarkan jenis layanan dan data penduduk desa.</p>
        </div>
        <Link href="/persuratan/surat" className="button button-secondary">← Kembali ke daftar</Link>
      </div>

      {query.error ? (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>
          {query.error}
        </div>
      ) : null}

      {options.length === 0 ? (
        <section className="modul-card" style={{ padding: 24 }}>
          <h2 className="beranda-card-title">Belum ada jenis surat aktif</h2>
          <p className="modul-muted">Aktifkan atau buat jenis surat terlebih dahulu sebelum membuat surat baru.</p>
          <Link href="/persuratan/surat" className="button button-secondary">Kembali ke Administrasi Surat</Link>
        </section>
      ) : (
        <SuratForm
          jenis={options}
          penduduk={penduduk}
          tanggalDefault={todayIsoDate()}
          action={buatKonsepSuratAction}
        />
      )}
    </div>
  );
}
