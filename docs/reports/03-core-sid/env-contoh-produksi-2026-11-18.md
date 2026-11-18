# Contoh konfigurasi host produksi di `.env.example`

- **Task:** melengkapi `.env.example` dengan blok contoh konfigurasi produksi untuk pemisahan host platform dan domain desa.
- **Tanggal:** 18 November 2026
- **Branch:** `chore/env-contoh-produksi`
- **Base commit:** `c97c489` (`main` setelah PR #130)
- **Status:** siap review

## 1. Kondisi awal

Setelah PR #130, `PLATFORM_HOSTS` sudah ada di `.env.example`, tetapi:

- `APP_URL` dan `BETTER_AUTH_URL` masih bernilai dev (`http://localhost:3000`) tanpa petunjuk nilai produksi;
- `PLATFORM_HOSTS` dan `DESA_BASE_DOMAIN` hanya komentar terpisah, tidak ada contoh yang bisa disalin sebagai satu set;
- belum ada penjelasan bahwa `BETTER_AUTH_URL` ikut menentukan `baseURL` better-auth dan tautan reset sandi.

## 2. Perubahan

`.env.example`:

- Catatan pada `APP_URL` bahwa produksi memakai domain platform dan merujuk ke blok contoh.
- Blok **Contoh produksi**: `APP_URL`, `BETTER_AUTH_URL`, `PLATFORM_HOSTS=flexidesa.id`, `DESA_BASE_DOMAIN=desa.id`, beserta penjelasan bahwa host platform tidak dipetakan ke tenant dan domain desa berasal dari wildcard atau `village_domains`.
- Blok **Contoh dev**: `APP_URL`/`BETTER_AUTH_URL` `http://flexidesa.test:3000`, `PLATFORM_HOSTS=flexidesa.test`, `DESA_BASE_DOMAIN=flexidesa.test`.

`.env` dev (tidak di-commit, berada di `.gitignore`): menambahkan `PLATFORM_HOSTS=flexidesa.test` agar host platform tidak lagi hanya bergantung pada fallback `APP_URL`.

Tidak ada perubahan kode, schema, atau migration.

## 3. Validasi

| Perintah | Hasil |
|---|---|
| `npx prettier --check .env.example` | SKIPPED — Prettier tidak punya parser untuk `.env`, jadi berkas ini tidak diperiksa formatter |
| `npx prettier --check docs/reports/03-core-sid/env-contoh-produksi-2026-11-18.md` | PASS |
| `git diff --stat` / `git status --short` | hanya `.env.example` (dan folder mockup milik pengguna yang belum dilacak) |

`.env` tidak muncul di `git status` karena diabaikan, sehingga tidak ada risiko nilai rahasia masuk commit.

## 4. Risiko dan catatan

- Perubahan `.env` baru berlaku setelah dev server dijalankan ulang; nilainya sama dengan fallback host `APP_URL` sehingga perilaku saat ini tidak berubah.
- `APP_URL` di `.env.example` sengaja tetap `http://localhost:3000` (nilai aman untuk salinan baru); nilai produksi ada di blok contoh.
- Dokumentasi rinci tiap variabel tetap di `docs/deployment/ENVIRONMENT.md`.

## 5. Kesimpulan

`/.env.example` kini memuat satu set konfigurasi produksi dan dev yang bisa disalin langsung, termasuk pasangan `BETTER_AUTH_URL` yang wajib ikut berubah di produksi.
