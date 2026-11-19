"use client";

import { useState } from "react";

import styles from "./pengumuman-detail.module.css";

export function SalinTautan({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return <button type="button" onClick={copy} className={styles.copyLink}>{copied ? "Tersalin ✓" : "Salin Link"}</button>;
}
