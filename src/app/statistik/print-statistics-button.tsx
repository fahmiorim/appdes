"use client";

export function PrintStatisticsButton() {
  return (
    <button type="button" onClick={() => window.print()} className="printButton">
      Unduh Data (PDF)
    </button>
  );
}
