import Link from "next/link";
import type { SuratMasukDTO, SuratKeluarDTO, KlasifikasiSuratDTO } from "@/features/surat/domain/surat";

type Row = Partial<SuratMasukDTO & SuratKeluarDTO>;
export function BukuAgendaForm({ jenis, row, klasifikasi, action }: {
  jenis: "masuk" | "keluar"; row?: Row | null; klasifikasi: KlasifikasiSuratDTO[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const masuk = jenis === "masuk";
  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">Administrasi Surat / Buku Agenda</span><h1>{row?.id ? "Ubah" : "Tambah"} Surat {masuk ? "Masuk" : "Keluar"}</h1><p>Catat informasi surat dan lokasi arsip pada buku agenda desa.</p></div><Link className="button button-secondary" href={masuk ? "/persuratan/surat-masuk" : "/persuratan/surat-keluar"}>Kembali</Link></div>
    <section className="modul-card"><form action={action} className="modul-form-grid">
      {row?.id ? <input type="hidden" name="id" value={row.id}/> : null}
      <label className="modul-field"><span>Nomor agenda</span><input name="agendaNumber" type="number" min="0" max="99999" defaultValue={row?.agendaNumber ?? 0}/></label>
      <label className="modul-field"><span>Nomor surat</span><input name="letterNumber" required maxLength={50} defaultValue={row?.letterNumber ?? ""}/></label>
      <label className="modul-field"><span>{masuk ? "Tanggal diterima" : "Tanggal surat"}</span><input name={masuk ? "receivedDate" : "letterDate"} type="date" required defaultValue={masuk ? row?.receivedDate ?? "" : row?.letterDate ?? ""}/></label>
      {masuk ? <label className="modul-field"><span>Tanggal surat</span><input name="letterDate" type="date" defaultValue={row?.letterDate ?? ""}/></label> : <label className="modul-field"><span>Tanggal dikirim</span><input name="sentDate" type="date" defaultValue={row?.sentDate ?? ""}/></label>}
      <label className="modul-field"><span>{masuk ? "Pengirim" : "Penerima"}</span><input name={masuk ? "sender" : "recipient"} maxLength={150} defaultValue={masuk ? row?.sender ?? "" : row?.recipient ?? ""}/></label>
      <label className="modul-field"><span>Klasifikasi</span><select name="classificationId" defaultValue={row?.classificationId?.toString() ?? "none"}><option value="none">Tanpa klasifikasi</option>{klasifikasi.map((item)=><option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></label>
      <label className="modul-field"><span>Ringkasan / perihal</span><input name="summary" maxLength={255} defaultValue={row?.summary ?? ""}/></label>
      {masuk ? <label className="modul-field"><span>Disposisi</span><input name="disposition" maxLength={255} defaultValue={row?.disposition ?? ""}/></label> : null}
      <label className="modul-field"><span>Lokasi arsip</span><input name="archiveLocation" maxLength={150} defaultValue={row?.archiveLocation ?? ""}/></label>
      <div style={{gridColumn:"1 / -1",display:"flex",gap:10,justifyContent:"flex-end"}}><Link className="button button-secondary" href={masuk ? "/persuratan/surat-masuk" : "/persuratan/surat-keluar"}>Batal</Link><button className="button button-primary" type="submit">Simpan Surat {masuk ? "Masuk" : "Keluar"}</button></div>
    </form></section>
  </div>;
}
