import Link from "next/link";
import { notFound } from "next/navigation";
import { getSurveiDetailData } from "@/features/pelayanan/application/survei-use-cases";
import { hapusSoalSurveiAction, simpanSoalSurveiAction } from "../actions";

function pilihanText(value: string | null, skor: string | null) {
  if (!value) return "";
  try { const parsed: unknown = JSON.parse(value); if (!Array.isArray(parsed)) return "";
    let scoreMap: Record<string, number> = {};
    try { const scoreParsed: unknown = skor ? JSON.parse(skor) : {}; if (scoreParsed && typeof scoreParsed === "object" && !Array.isArray(scoreParsed)) scoreMap = scoreParsed as Record<string, number>; } catch { /* skor belum dikonfigurasi */ }
    return parsed.map((item) => String(item) + "|" + (scoreMap[String(item)] ?? "")).join(String.fromCharCode(10)); }
  catch { return ""; }
}
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ soal?: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const [data, query] = await Promise.all([getSurveiDetailData(id), searchParams]);
  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">Pelayanan Publik / Survei & Kepuasan</span><h1>{data.row.judul}</h1><p>{data.row.deskripsi ?? "Kelola pertanyaan dan pantau partisipasi responden."}</p></div><div className="page-heading-actions"><Link className="button button-secondary" href="/pelayanan-publik/survei">Kembali</Link>{data.canUpdate ? <Link className="button button-secondary" href={"/pelayanan-publik/survei/"+id+"/edit"}>Ubah Survei</Link><Link className="button button-primary" href={"/pelayanan-publik/survei/"+id+"/hasil"}>Lihat Hasil & IKM</Link> : null}</div></div>
    {query.soal === "tersimpan" ? <div className="alert alert-info">Pertanyaan berhasil disimpan.</div> : null}
    {query.soal === "dihapus" ? <div className="alert alert-info">Pertanyaan berhasil dihapus.</div> : null}
    <div className="dashboard-stats"><article className="modul-card"><span>Status</span><strong>{data.row.aktif === 1 ? "Aktif" : "Nonaktif"}</strong><small>Publikasi survei</small></article><article className="modul-card"><span>Responden</span><strong>{data.totalResponden}</strong><small>Jawaban masuk</small></article><article className="modul-card"><span>Pertanyaan</span><strong>{data.questions.length}</strong><small>Item dalam formulir</small></article><article className="modul-card"><span>Periode</span><strong style={{fontSize:16}}>{data.row.mulai ?? "Bebas"} – {data.row.selesai ?? "Bebas"}</strong><small>{data.row.sasaran ?? "Semua masyarakat"}</small></article></div>
    <section className="modul-card"><h2>Daftar Pertanyaan</h2>
      {data.questions.length ? data.questions.map((q) => <article className="survey-question" key={q.id}><div><strong>{q.urutan ?? 0}. {q.pertanyaan}</strong><p>{q.tipe === "choice" ? "Pilihan: " + pilihanText(q.pilihan, q.skorPilihan).split("
").join(" · ") : q.tipe === "number" ? "Jawaban angka" : "Jawaban teks"} · Bobot {q.bobot}</p></div>{data.canUpdate ? <form action={simpanSoalSurveiAction} className="survey-question-edit"><input type="hidden" name="surveyId" value={id}/><input type="hidden" name="questionId" value={q.id}/><input name="pertanyaan" aria-label="Pertanyaan" defaultValue={q.pertanyaan} required/><select name="tipe" defaultValue={q.tipe ?? "text"}><option value="text">Teks</option><option value="number">Angka</option><option value="choice">Pilihan</option></select><textarea name="pilihan" aria-label="Pilihan jawaban" rows={2} defaultValue={pilihanText(q.pilihan, q.skorPilihan)} placeholder="Satu opsi per baris: Puas|5"/><input type="number" name="bobot" min="1" max="100" defaultValue={q.bobot}/><button className="button button-secondary">Simpan</button></form> : null}{data.canDelete ? <form action={hapusSoalSurveiAction}><input type="hidden" name="surveyId" value={id}/><input type="hidden" name="questionId" value={q.id}/><button className="button button-danger-ghost">Hapus</button></form> : null}</article>) : <p className="modul-empty">Belum ada pertanyaan untuk survei ini.</p>}
    </section>
    {data.canUpdate ? <section className="modul-card"><h2>Tambah Pertanyaan</h2><form action={simpanSoalSurveiAction} className="modul-form-grid"><input type="hidden" name="surveyId" value={id}/><label className="modul-field" style={{gridColumn:"1 / -1"}}><span>Pertanyaan *</span><textarea name="pertanyaan" rows={3} minLength={3} maxLength={2000} required/></label><label className="modul-field"><span>Tipe jawaban</span><select name="tipe"><option value="text">Teks</option><option value="number">Angka</option><option value="choice">Pilihan ganda</option></select></label><label className="modul-field"><span>Bobot (1–100)</span><input type="number" name="bobot" min="1" max="100" defaultValue="1"/></label><label className="modul-field" style={{gridColumn:"1 / -1"}}><span>Opsi pilihan dan skor (Label|Skor 0–5, satu per baris)</span><textarea name="pilihan" rows={4}/></label><div><button className="button button-primary">Tambah Pertanyaan</button></div></form></section> : null}
  </div>;
}
