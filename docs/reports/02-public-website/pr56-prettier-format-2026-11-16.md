# PR #56 — Perbaikan kegagalan CI format check halaman pengumuman

- **Task:** memperbaiki check `Format check` yang gagal pada PR #56 (`feat/public-announcements-page`).
- **Tanggal:** 16 November 2026.
- **Branch:** `task/pr56-prettier-format`, base `cd20331` (`origin/feat/public-announcements-page`).
- **Commit perubahan kode:** `93fef90`.

## Kondisi awal

CI pada commit `cd20331` gagal di job `Unit test dan quality check` pada langkah `Format check`:

```text
[warn] src/app/pengumuman/page.tsx
[warn] src/app/pengumuman/pengumuman.module.css
[warn] Code style issues found in 2 files. Run Prettier with --write to fix.
```

Typecheck, lint, integration test, dan visual QA pada commit yang sama berhasil. Kegagalan murni berasal dari dua file baru halaman pengumuman yang belum melewati formatter repository.

## Analisis

Dua file ditambahkan tanpa menjalankan `prettier --write`. Tidak ada masalah logika, tipe, maupun perilaku; selisihnya hanya pemenggalan baris dan spasi CSS/TSX.

## File diubah

| File | Alasan |
|---|---|
| `src/app/pengumuman/page.tsx` | Diformat ulang dengan Prettier. |
| `src/app/pengumuman/pengumuman.module.css` | Diformat ulang dengan Prettier. |

Tidak ada perubahan perilaku, test, workflow, atau dependency.

## Validasi

| Perintah | Hasil |
|---|---|
| `npx prettier --write src/app/pengumuman/page.tsx src/app/pengumuman/pengumuman.module.css` | PASS — dua file diformat. |
| `npx prettier --check .` | PASS — `All matched files use Prettier code style!` |
| `git diff --stat` | 2 file, 65 insertions, 93 deletions (whitespace saja). |

Typecheck, lint, unit test, dan integration test tidak dijalankan ulang karena perubahan hanya format dan langkah-langkah tersebut sudah lulus pada commit `cd20331`. CI GitHub perlu dijalankan ulang setelah push untuk konfirmasi akhir.

## Risiko tersisa

- Diff menyentuh file besar sehingga sulit dibaca sekilas, meski isinya hanya format.
- Verifikasi akhir bergantung pada CI GitHub setelah branch di-push.

## Kesimpulan

Kegagalan `Format check` PR #56 diperbaiki dengan menerapkan formatter repository pada dua file yang dilaporkan. Tidak ada perubahan di luar scope.
