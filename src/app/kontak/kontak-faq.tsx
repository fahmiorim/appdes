"use client";

import { useState } from "react";

import styles from "./kontak.module.css";

const questions = [
  [
    "Bagaimana cara menyampaikan pengaduan?",
    "Hubungi pemerintah desa melalui nomor telepon atau WhatsApp resmi yang tercantum pada halaman ini. Sertakan informasi yang jelas agar petugas dapat memahami laporan Anda.",
  ],
  [
    "Berapa lama pengaduan ditindaklanjuti?",
    "Waktu tindak lanjut dapat berbeda sesuai jenis laporan dan kebutuhan pemeriksaan. Silakan konfirmasi perkembangan melalui saluran kontak resmi desa.",
  ],
  [
    "Apakah pengaduan bisa dilakukan tanpa identitas?",
    "Kebijakan penerimaan laporan tanpa identitas belum dicantumkan pada informasi resmi desa. Tanyakan ketentuannya langsung kepada petugas.",
  ],
  [
    "Bagaimana cara melihat pengaduan yang sudah ditangani?",
    "Buka bagian Pengaduan Publik untuk melihat pengaduan yang telah disetujui pemerintah desa untuk ditampilkan.",
  ],
  [
    "Jenis pengaduan apa saja yang dapat disampaikan?",
    "Anda dapat menyampaikan pertanyaan, saran, atau laporan mengenai pelayanan dan kondisi lingkungan desa melalui kontak resmi.",
  ],
];
export function KontakFaq() {
  const [active, setActive] = useState(0);
  return (
    <div className={styles.faqList}>
      {questions.map(([q, a], i) => (
        <article className={styles.faqItem} key={q}>
          <button
            type="button"
            aria-expanded={active === i}
            onClick={() => setActive(active === i ? -1 : i)}
          >
            {q}
            <span>{active === i ? "⌃" : "⌄"}</span>
          </button>
          {active === i ? <p>{a}</p> : null}
        </article>
      ))}
    </div>
  );
}
