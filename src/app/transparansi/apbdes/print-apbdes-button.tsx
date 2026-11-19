"use client";

export function PrintApbdesButton() {
  return (
    <button type="button" className="printApbdesButton" onClick={() => window.print()}>
      ↓　Unduh APBDes (PDF)
    </button>
  );
}
