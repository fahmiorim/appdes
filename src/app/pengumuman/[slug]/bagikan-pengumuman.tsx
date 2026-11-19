"use client";

import { useState } from "react";

import styles from "./pengumuman-detail.module.css";

export function BagikanPengumuman({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  function open(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className={styles.shareRow}>
      <strong>♧　Bagikan Pengumuman</strong>
      <button
        type="button"
        className={styles.whatsapp}
        onClick={() =>
          open(`https://wa.me/?text=${encodeURIComponent(title + " " + window.location.href)}`)
        }
      >
        WhatsApp
      </button>
      <button
        type="button"
        className={styles.facebook}
        onClick={() =>
          open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
          )
        }
      >
        Facebook
      </button>
      <button
        type="button"
        className={styles.telegram}
        onClick={() =>
          open(
            `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(title)}`,
          )
        }
      >
        Telegram
      </button>
      <button type="button" className={styles.copyLink} onClick={copy}>
        {copied ? "Tersalin ✓" : "Salin Link"}
      </button>
    </div>
  );
}
