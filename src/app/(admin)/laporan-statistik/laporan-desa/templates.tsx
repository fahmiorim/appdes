"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "../laporan-statistik.module.css";

type Template = {
  id: number;
  judul: string;
  jenis: string;
  deskripsi: string | null;
  createdAt: string;
};
const kinds = [
  ["penduduk", "Kependudukan"],
  ["keuangan", "Keuangan"],
  ["pembangunan", "Pembangunan"],
  ["bantuan", "Bantuan"],
  ["aset", "Inventaris & Aset"],
  ["layanan", "Pelayanan Publik"],
  ["surat-masuk", "Surat Masuk"],
  ["surat-keluar", "Surat Keluar"],
];
export function ReportTemplates({ tahun }: { tahun: number }) {
  const [items, setItems] = useState<Template[]>([]),
    [judul, setJudul] = useState(""),
    [jenis, setJenis] = useState("penduduk"),
    [deskripsi, setDeskripsi] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function refresh() {
    const r = await fetch("/api/laporan-statistik/template", { cache: "no-store" });
    if (r.ok) setItems((await r.json()).data);
  }
  useEffect(() => {
    let active = true;
    fetch("/api/laporan-statistik/template", { cache: "no-store" })
      .then(async (response) => (response.ok ? ((await response.json()).data as Template[]) : null))
      .then((data) => {
        if (active && data) setItems(data);
      })
      .catch(() => {
        if (active) setMessage("Tidak dapat memuat template laporan.");
      });
    return () => {
      active = false;
    };
  }, []);
  async function create() {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/laporan-statistik/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judul, jenis, deskripsi }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal membuat template.");
      setJudul("");
      setDeskripsi("");
      setMessage(d.message);
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal membuat template.");
    } finally {
      setBusy(false);
    }
  }
  async function rename(item: Template) {
    const value = window.prompt("Nama template:", item.judul);
    if (!value?.trim() || value.trim() === item.judul) return;
    const r = await fetch("/api/laporan-statistik/template", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, judul: value }),
    });
    const d = await r.json();
    setMessage(d.message || d.error || "");
    if (r.ok) await refresh();
  }
  async function remove(item: Template) {
    if (!window.confirm("Hapus template " + item.judul + "?")) return;
    const r = await fetch("/api/laporan-statistik/template?id=" + item.id, { method: "DELETE" });
    const d = await r.json();
    setMessage(d.message || d.error || "");
    if (r.ok) await refresh();
  }
  return (
    <section className={styles["ls-card"]}>
      <header>
        <div>
          <h2>Template Laporan</h2>
          <p>
            Simpan format laporan yang sering digunakan agar operator dapat membukanya kembali
            dengan cepat.
          </p>
        </div>
      </header>
      <div className={styles["ls-template-form"]}>
        <label>
          Nama Template
          <input
            value={judul}
            maxLength={150}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Contoh: Laporan Bulanan Kependudukan"
          />
        </label>
        <label>
          Jenis Laporan
          <select value={jenis} onChange={(e) => setJenis(e.target.value)}>
            {kinds.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Deskripsi
          <input
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            placeholder="Keterangan penggunaan (opsional)"
          />
        </label>
        <button
          type="button"
          className="button button-primary"
          disabled={busy || !judul.trim()}
          onClick={create}
        >
          {busy ? "Menyimpan…" : "Simpan Template"}
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {items.length ? (
        <div className={styles["ls-table"]}>
          <table>
            <thead>
              <tr>
                <th>Nama Template</th>
                <th>Jenis</th>
                <th>Deskripsi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.judul}</strong>
                  </td>
                  <td>{kinds.find((k) => k[0] === item.jenis)?.[1] ?? item.jenis}</td>
                  <td>{item.deskripsi || "—"}</td>
                  <td>
                    <Link
                      href={
                        "/laporan-statistik/laporan-desa?jenis=" + item.jenis + "&tahun=" + tahun
                      }
                    >
                      Gunakan
                    </Link>{" "}
                    ·{" "}
                    <button type="button" onClick={() => rename(item)}>
                      Ubah nama
                    </button>{" "}
                    ·{" "}
                    <button type="button" onClick={() => remove(item)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles["ls-empty"]}>Belum ada template buatan desa.</p>
      )}
    </section>
  );
}
