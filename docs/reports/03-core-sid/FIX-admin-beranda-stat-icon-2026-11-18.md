# Hotfix: duplikasi `StatIcon` di beranda admin

- **Task:** Memulihkan `main` yang gagal typecheck dan build setelah merge berurutan PR #120 lalu #119.
- **Tanggal:** 2026-11-18.
- **Branch:** `fix/admin-beranda-stat-icon`.
- **Base commit:** `886b0e8` (`main`).
- **Status:** Siap review. Belum di-merge.

## Kondisi awal

`npm run typecheck` pada `main` gagal:

```text
src/app/(admin)/beranda/page.tsx(6,10): error TS2440: Import declaration conflicts with local declaration of 'StatIcon'.
```

Build produksi gagal dengan pesan serupa (`the name 'StatIcon' is defined multiple times`).

## Analisis

- PR #118 menambahkan `function StatIcon` lokal di `src/app/(admin)/beranda/page.tsx` dan merge ke `main` sebagai `c476ec7`.
- PR #120 mengekstrak komponen itu ke `src/components/ui/stat-icon.tsx`, menggantinya dengan `import { StatIcon }`, dan merge sebagai `6e8471b`.
- PR #119 dibuka dari branch yang masih memuat versi #118 (fungsi lokal), lalu di-squash-merge sebagai `886b0e8` setelah #120. Squash itu mengembalikan 18 baris fungsi lokal ke `main` padahal import komponen bersama sudah ada.
- Hasilnya dua deklarasi `StatIcon` di satu modul. Seluruh PR baru ikut merah karena CI membangun merge commit terhadap `main` yang rusak.

## File yang diperiksa

- `src/app/(admin)/beranda/page.tsx` pada `c476ec7`, `6e8471b`, dan `886b0e8`.
- `src/components/ui/stat-icon.tsx` (ada di `main`, jadi komponen bersama adalah sumber yang benar).

## File yang diubah

- `src/app/(admin)/beranda/page.tsx` — hapus `function StatIcon` lokal dan import `ReactNode` yang menjadi tidak terpakai.

Tidak ada perubahan lain. Perilaku visual tidak berubah karena kedua implementasi merender markup yang sama.

## Security/tenant

Tidak ada perubahan query, otorisasi, permission, atau data. Hanya deklarasi komponen yang diduplikasi.

## Test

| Perintah | Hasil |
|---|---|
| `npx prettier --check src/app/(admin)/beranda/page.tsx` | PASS |
| `npx eslint src/app/(admin)/beranda/page.tsx` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | SKIPPED (dijalankan CI) |

## Risiko tersisa

- PR #121, #122, dan #123 dibangun di atas `main` yang masih rusak; check-nya merah sampai PR ini merge. Setelah merge, CI ketiganya perlu dipicu ulang.
- Squash merge PR bertumpuk dapat mengembalikan potongan yang sudah digantikan PR lain. Ke depan, branch turunan sebaiknya di-rebase atau di-update dari `main` sebelum merge.

## Rekomendasi berikutnya

1. Merge PR ini lebih dulu, lalu picu ulang CI PR lain.
2. Aktifkan required status checks di branch protection agar `main` tidak bisa menerima merge dengan typecheck merah.
