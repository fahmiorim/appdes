"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../laporan-statistik.module.css";

type SavedReport = { id: number; judul: string; jenis: string; tahun: number; deskripsi: string | null; createdAt: string };
const labels: Record<string, string> = { penduduk: "Kependudukan", keuangan: "Keuangan Desa", pembangunan: "Pembangunan", bantuan: "Program Bantuan" };

export function SavedReports({ jenis, tahun }: { jenis: string; tahun: number }) {
  const [items, setItems] = useState<SavedReport[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function refresh() {
    const response = await fetch("/api/laporan-statistik/tersimpan", { cache: "no-store" });
    if (response.ok) setItems((await response.json()).data);
  }
  useEffect(() => { void refresh(); }, []);
  async function save() {
    if (!title.trim()) { setMessage("Isi judul laporan terlebih dahulu."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/laporan-statistik/tersimpan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ judul: title, jenis, tahun }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal menyimpan laporan.");
      setTitle(""); setMessage("Laporan berhasil disimpan sebagai snapshot data."); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menyimpan laporan."); }
    finally { setBusy(false); }
  }
  async function rename(item: SavedReport) {
    const judul = window.prompt("Judul laporan:", item.judul);
    if (!judul?.trim() || judul.trim() === item.judul) return;
    const response = await fetch("/api/laporan-statistik/tersimpan", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, judul }) });
    const result = await response.json(); setMessage(result.message || result.error || "");
    if (response.ok) await refresh();
  }
  async function remove(item: SavedReport) {
    if (!window.confirm(`Hapus laporan "${item.judul}"? Data snapshot yang tersimpan akan dihapus.`)) return;
    const response = await fetch(`/api/laporan-statistik/tersimpan?id=${item.id}`, { method: "DELETE" });
    const result = await response.json(); setMessage(result.message || result.error || "");
    if (response.ok) await refresh();
  }
  return <section className={styles["ls-card"]}>
    <header><div><h2>Arsip Laporan Tersimpan</h2><p>Simpan snapshot laporan agar dapat dibuka kembali meskipun data operasional berubah.</p></div></header>
    <div className={styles["ls-actions"]}>
      <label>Nama laporan<input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder={`Laporan ${labels[jenis] || jenis} ${tahun}`} /></label>
      <button type="button" className="button button-primary" onClick={save} disabled={busy}>{busy ? "Menyimpan…" : "Simpan Laporan"}</button>
    </div>
    {message && <p role="status">{message}</p>}
    {items.length ? <div className={styles["ls-table"]}><table><thead><tr><th>Nama Laporan</th><th>Jenis</th><th>Tahun</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>
      {items.map(item => <tr key={item.id}><td><strong>{item.judul}</strong>{item.deskripsi && <small>{item.deskripsi}</small>}</td><td>{labels[item.jenis] || item.jenis}</td><td>{item.tahun}</td><td>{new Date(item.createdAt).toLocaleDateString("id-ID")}</td><td><Link href={`/laporan-statistik/laporan-desa/tersimpan/${item.id}`}>Buka</Link> · <button type="button" onClick={() => rename(item)}>Ubah nama</button> · <button type="button" onClick={() => remove(item)}>Hapus</button></td></tr>)}
    </tbody></table></div> : <p className={styles["ls-empty"]}>Belum ada laporan yang disimpan.</p>}
  </section>;
}
