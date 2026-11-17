import type { ReactNode } from "react";

/**
 * Kotak ikon dekoratif untuk kartu statistik.
 *
 * Ikon hanya memperkuat pemindaian visual, bukan sumber informasi, sehingga
 * seluruh isinya ditandai `aria-hidden` agar pembaca layar tidak menerima
 * pengumuman ganda di samping label kartu.
 */
export function StatIcon({ children }: { children: ReactNode }) {
  return (
    <div className="stat-icon" aria-hidden="true">
      <svg
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        viewBox="0 0 24 24"
      >
        {children}
      </svg>
    </div>
  );
}
