import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSuratFormOptions, getSuratPrintData } from "@/features/surat/application/surat-use-cases";
import { parseIsianFields, parseNilaiIsian } from "@/features/surat/domain/isian";
import { todayIsoDate } from "@/lib/forms";

import { perbaruiKonsepSuratAction } from "../../actions";
import { SuratForm } from "../../surat-form";

export const metadata: Metadata = { title: "Ubah Konsep Surat" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function UbahKonsepSuratPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();

  const [data, options] = await Promise.all([
    getSuratPrintData(id),
    getSuratFormOptions(),
  ]);
  if (data.surat.status !== "draft") notFound();

  const jenis = options.jenis.map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    requiresResident: item.requiresResident,
    fields: parseIsianFields(item.formIsian),
  }));
  const isiSurat = parseNilaiIsian(data.surat.nilaiIsian);

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administrasi Surat / Konsep</span>
          <h1>Ubah Konsep Surat</h1>
          <p>Perbarui data surat sebelum diajukan ke proses verifikasi.</p>
        </div>
        <Link href={`/persuratan/surat/${id}`} className="button button-secondary">← Kembali ke detail</Link>
      </div>
      {query.error ? <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>{query.error}</div> : null}
      <SuratForm
        jenis={jenis}
        penduduk={options.penduduk}
        tanggalDefault={todayIsoDate()}
        initial={{
          id,
          typeId: data.surat.typeId,
          residentId: data.surat.residentId,
          letterDate: data.surat.letterDate,
          purpose: data.surat.purpose,
          isiSurat,
        }}
        action={perbaruiKonsepSuratAction}
      />
    </div>
  );
}
