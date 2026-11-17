# PHASE-2 — Konsol pengelolaan tenant di halaman Super Admin

- **Task:** membangun konsol pengelolaan tenant pada halaman Super Admin.
- **Tanggal:** 17 November 2026
- **Branch:** `task/phase-2-tenant-console`
- **Base commit:** `a6e333b` (di atas branch `task/phase-2-template-export`)
- **Commit implementasi:** (lihat SHA pada penyerahan)

## 1. Tujuan

Halaman `/super-admin` sebelumnya hanya menampilkan daftar desa tanpa aksi:
membuat desa, menonaktifkan, mengatur kuota, mereset administrator, dan
menjalankan lifecycle retensi hanya bisa lewat kode. Konsol ini menghubungkan
use case yang sudah ada ke UI yang dapat dipakai operator platform, tanpa
memindahkan aturan bisnis atau otorisasi ke komponen.

## 2. Kondisi awal dan analisis

- `provisioning-use-cases`, `kelola-desa-use-cases`, dan
  `lifecycle-desa-use-cases` sudah tersedia, tetapi belum ada Server Action di
  `app/` yang memanggilnya.
- Belum ada halaman/form pembuatan desa, sehingga instalasi baru hanya bisa
  di-provision lewat kode.
- `TenantTable` hanya menampilkan data dan tidak membawa informasi retensi
  (`nonaktifSejak`, `purgedAt`, keberadaan ekspor berlaku).
- Halaman hanya menjalankan `requireSuperAdmin` untuk gerbang tampilan; aksi
  tulis belum memiliki jalur resmi dari UI.

## 3. File yang diperiksa

- `src/features/multi-desa/application/provisioning-use-cases.ts`
- `src/features/multi-desa/application/kelola-desa-use-cases.ts`
- `src/features/multi-desa/application/lifecycle-desa-use-cases.ts`
- `src/features/multi-desa/domain/desa-baru.ts`, `domain/kelola-desa.ts`, `domain/lifecycle-tenant.ts`
- `src/features/multi-desa/infrastructure/provisioning-repository.ts`
- `src/app/(warga)/layanan-mandiri/ubah-pin/actions.ts` (pola Server Action)
- `src/lib/action-state.ts`, `src/app/globals.css`
- `src/app/(admin)/super-admin/page.tsx`, `src/features/multi-desa/presentation/tenant-table.tsx`

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/app/(admin)/super-admin/actions.ts` | Server Action: buat desa, status, kuota, reset admin, ekspor, purge |
| `src/features/multi-desa/presentation/tenant-console.tsx` | Form pembuatan desa, tabel dengan filter status retensi, panel kelola per desa |
| `src/app/(admin)/super-admin/page.tsx` | Memakai konsol baru, menghitung status retensi, menambahkan kartu "Siap purge" |
| `src/features/multi-desa/infrastructure/provisioning-repository.ts` | `listDesaSuperAdmin` memuat `slug`, `nonaktifSejak`, `purgedAt`, `adaEksporBerlaku` |
| `src/features/multi-desa/presentation/tenant-table.tsx` | Dihapus; satu-satunya pemakai adalah halaman Super Admin yang kini memakai `TenantConsole` |
| `src/app/globals.css` | Gaya form pembuatan desa, badge retensi, panel kelola, tombol purge |
| `docs/deployment/DATABASE.md` | Menyebut konsol sebagai jalur ekspor/purge dan batas pengelolaan domain |

## 5. Perubahan

### 5.1 Server Action

- `buatDesaAction` → `buatDesaBaru` (validasi `desaBaruSchema` di use case).
- `ubahStatusAction` → `ubahStatusDesa`; menonaktifkan memulai masa tenggang,
  mengaktifkan mengosongkannya.
- `ubahKuotaAction` → `ubahKuotaMedia` (kosong = tanpa batas).
- `resetAdminAction` → `resetAksesAdminDesa`; sandi sementara hanya ada di
  state respons, ditampilkan sekali di UI, tidak diaudit.
- `eksporDataAction` → `eksporDataDesa`; menampilkan jalur berkas, ukuran, dan
  tanggal kedaluwarsa.
- `purgeAction` → `purgeDesa` dengan konfirmasi slug desa.

Semua aksi memanggil `revalidatePath("/super-admin")` setelah sukses dan
mengembalikan `ActionState` (pesan sukses/galat per-field) melalui
`successState`/`toErrorState`.

### 5.2 Konsol

- Form "Daftarkan desa baru": nama, kode 10 digit, domain opsional, akun
  administrator, sandi awal, kuota media.
- Tabel: kolom status, kolom retensi (aktif / masa tenggang + sisa hari / siap
  purge / sudah di-purge), dan tombol **Kelola** yang membuka panel.
- Filter: semua, aktif, nonaktif, siap purge; pencarian juga mencakup slug.
- Panel per desa: aktif/nonaktif, reset akses admin, kuota media, buat ekspor,
  dan purge (input slug). Tombol purge hanya tampil bila desa nonaktif, masa
  tenggang selesai, dan ada ekspor berlaku; selain itu ditampilkan alasannya.

### 5.3 Data daftar desa

`listDesaSuperAdmin` kini mengembalikan `slug`, `nonaktifSejak`, `purgedAt`, dan
`adaEksporBerlaku` (subquery `tenant_exports` yang belum kedaluwarsa), sehingga
konsol tidak perlu query per baris.

## 6. Security dan tenant

- Otorisasi tetap di server: halaman memanggil `requireSuperAdmin` untuk
  gerbang, dan setiap use case memanggil `requireSuperAdmin` lagi, sehingga
  Server Action tidak dapat dipakai tanpa sesi platform yang sah.
- `villageId` dari form hanya nilai input; use case memvalidasinya sebagai id
  positif dan memeriksa keberadaan desa sebelum mengubah data.
- Purge membutuhkan konfirmasi slug + guard status/retensi/ekspor di server;
  menyembunyikan tombol bukan kontrol keamanan.
- Sandi administrator desa baru dikirim ke use case dan di-hash di server;
  sandi sementara reset tidak pernah masuk audit log atau log aplikasi.
- Tidak ada perubahan pada aturan isolasi tenant maupun skema database.

## 7. Validasi

| Perintah | Hasil |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS — 0 error, 7 warning lama (`<img>` di halaman masuk) |
| `npx prettier --check .` | PASS |
| `npm run test` | PASS — 207 file, 1830 test |
| `npm run build` | PASS — `/super-admin` terdaftar sebagai route dinamis |

Tidak ada test browser/DOM otomatis untuk UI ini; verifikasi terbatas pada
typecheck, lint, unit test, dan build produksi.

## 8. Risiko dan batasan

- Interaksi form (submit, pesan galat, buka/tutup panel) belum diuji otomatis;
  perlu uji manual di staging sebelum rilis.
- Pengelolaan domain alias (tambah/hapus/jadikan utama) belum diekspos ke
  konsol walau use case-nya sudah ada.
- Daftar desa dihitung dengan beberapa subquery per baris seperti sebelumnya;
  pada jumlah tenant sangat besar perlu paginasi.
- Purge dari UI tetap tidak dapat dibatalkan; backup harus dilakukan lebih dulu.

## 9. Kesimpulan

Konsol tenant menyatukan pembuatan desa, status, kuota, reset admin, dan
lifecycle retensi pada satu halaman, dengan seluruh validasi/otorisasi tetap di
server. Langkah berikutnya: ekspos pengelolaan domain alias dan audit trail
tenant di konsol, serta uji manual alur purge di staging.
