"use client";

import styles from "./apbdes.module.css";

export function PrintApbdesButton() {
  return (
    <button type="button" className={styles.printButton} onClick={() => window.print()}>
      ↓　Unduh APBDes (PDF)
    </button>
  );
}
