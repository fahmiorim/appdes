import Link from "next/link";
import { notFound } from "next/navigation";

import { getFormSurveiWargaData } from "@/features/pelayanan/application/survei-use-cases";

import { kirimJawabanSurveiAction } from "../actions";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ terkirim?: string }>;
}) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const [data, query] = await Promise.all([getFormSurveiWargaData(id), searchParams]);
  return (
    <main className="warga-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Layanan Mandiri / Survei</span>
          <h1>{data.row.judul}</h1>
          <p>{data.row.deskripsi ?? "Isi seluruh pertanyaan berikut sesuai pengalaman Anda."}</p>
        </div>
        <Link className="button button-secondary" href="/layanan-mandiri/survei">
          Kembali
        </Link>
      </div>
      {query.terkirim ? (
        <div className="alert alert-info">Terima kasih. Jawaban survei Anda berhasil dikirim.</div>
      ) : (
        <section className="modul-card">
          <form action={kirimJawabanSurveiAction} className="warga-survey-form">
            <input type="hidden" name="surveyId" value={id} />
            {data.questions.map((q, index) => (
              <label className="modul-field" key={q.id}>
                <span>
                  {index + 1}. {q.pertanyaan} *
                </span>
                {q.tipe === "choice" ? (
                  <select name={"jawaban_" + q.id} required defaultValue="">
                    <option value="" disabled>
                      Pilih jawaban
                    </option>
                    {(() => {
                      try {
                        const options: unknown = q.pilihan ? JSON.parse(q.pilihan) : [];
                        return Array.isArray(options)
                          ? options.map((option) => (
                              <option key={String(option)} value={String(option)}>
                                {String(option)}
                              </option>
                            ))
                          : null;
                      } catch {
                        return null;
                      }
                    })()}
                  </select>
                ) : q.tipe === "number" ? (
                  <select name={"jawaban_" + q.id} required defaultValue="">
                    <option value="" disabled>
                      Pilih nilai 0–5
                    </option>
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                ) : (
                  <textarea name={"jawaban_" + q.id} rows={3} maxLength={4000} required />
                )}
              </label>
            ))}
            <button className="button button-primary">Kirim Jawaban Survei</button>
          </form>
        </section>
      )}
    </main>
  );
}
