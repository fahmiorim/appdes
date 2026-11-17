# PHASE-2 — Alat ekspor template tenant dari instalasi referensi

- **Task:** menyediakan alat untuk mengekspor template fondasi tenant dari desa referensi yang sudah berjalan.
- **Tanggal:** 17 November 2026
- **Branch:** `task/phase-2-template-export`
- **Base commit:** `af0c79a` (di atas branch `task/phase-2-lifecycle-retention`)
- **Commit implementasi:** `5c5d22f`

## 1. Tujuan

Template provisioning sebelumnya hanya tersedia sebagai berkas bawaan yang
ditulis tangan (`src/db/templates/tenant-template.ts`). Operator yang sudah
menyusun role, modul, akses, dan menu di satu desa harus menuliskannya ulang
secara manual. Alat ini mengekspor konfigurasi desa referensi menjadi bentuk
template yang sama, siap direview lalu dipakai untuk desa berikutnya.

## 2. Kondisi awal dan analisis

- Skema template (`templateTenantSchema`) memakai kunci alami (slug), termasuk
  `parentSlug` untuk modul, sehingga ekspor tidak boleh membawa id database.
- `modules.parent_id` memakai `0` untuk tingkat atas dan id lain untuk induk,
  sehingga pemetaan id → slug dilakukan saat ekspor.
- `role_permissions` tidak memiliki `village_id`; batas tenant ditegakkan lewat
  join ke `roles` dan `modules` milik desa yang sama.
- Template hanya mendukung menu publik satu tingkat (`menu_publik.parent_id`
  boleh `null`), sehingga menu anak tidak dapat diekspor.
- Katalog surat, buku bumindes, kategori inventaris, dan data warga bukan
  fondasi tenant dan tidak boleh ikut.

## 3. File yang diperiksa

- `src/features/multi-desa/domain/template-tenant.ts`
- `src/features/multi-desa/infrastructure/template-tenant-repository.ts`
- `src/db/templates/tenant-template.ts`
- `src/db/schema/rbac.ts`, `src/db/schema/theme.ts`, `src/db/schema/content.ts`
- `scripts/platform/bootstrap.mjs` (pola CLI: `.env`, `mysql2`, pesan gagal)
- `package.json`, `vitest.config.mts`, `vitest.integration.config.mts`

## 4. File yang diubah

| File | Alasan |
|---|---|
| `scripts/platform/export-template.mjs` | CLI ekspor: argumen, pemilihan desa, query tenant, penulisan berkas |
| `scripts/platform/export-template.d.mts` | Deklarasi tipe fungsi murni CLI agar dapat diuji dari TypeScript |
| `package.json` | Skrip `platform:export-template` |
| `src/features/multi-desa/application/template-ekspor.test.ts` | Unit test `parseArgumen` dan `susunTemplate` |
| `src/features/multi-desa/template-ekspor.integration.test.ts` | Uji CLI end-to-end pada database disposable |
| `vitest.integration.config.mts`, `scripts/integration-test-map.json` | Mendaftarkan test integrasi baru |
| `docs/deployment/DATABASE.md` | Prosedur ekspor template (§6.4) |

## 5. Perubahan

- `parseArgumen` menerima `--village`, `--out`, `--force`, `--json`, `--help`;
  menolak argumen tak dikenal, opsi tanpa nilai, dan `--json` tanpa `--out`.
- `susunTemplate` memetakan baris tenant menjadi template `versi: 1` dengan
  `sumber.jenis = "ekspor"`, slug sebagai kunci relasi, dan `parentSlug` dari
  `parent_id` (induk di luar tenant diperlakukan sebagai tingkat atas).
- Akses yang menunjuk role/modul di luar tenant, atau duplikat, dibuang.
- Tema diambil dari satu baris aktif terbaru; tidak ada tema → `tema: null`.
- Menu publik bertingkat: hanya menu akar yang diekspor; jumlah menu anak
  dilaporkan di ringkasan.
- Desa referensi wajib memuat role `administrator`; bila tidak, CLI berhenti
  dengan pesan jelas sebelum menulis berkas.
- Tanpa `--out`, JSON template dicetak ke stdout dan ringkasan ke stderr agar
  dapat dipipe; dengan `--out`, berkas tidak ditimpa tanpa `--force`.
- Tanpa `--village`, instalasi dengan tepat satu desa dipakai otomatis;
  instalasi dengan banyak desa menampilkan daftar slug dan berhenti.

## 6. Security dan tenant

- Skrip hanya membaca database; tidak ada INSERT/UPDATE/DELETE.
- Query dibatasi `village_id` desa referensi, termasuk join akses
  (`roles.village_id` dan `modules.village_id`).
- Tidak ada data warga, dokumen, surat, atau katalog milik desa yang diekspor.
- Kredensial tidak diperlukan dan tidak dicetak; ringkasan target hanya memuat
  host/port/nama database.
- Berkas tujuan tidak ditimpa tanpa `--force`, mencegah kehilangan template
  yang sudah direview secara tidak sengaja.
- Menu publik diekspor apa adanya (nama/link), yang memang konten publik desa.

## 7. Validasi

| Perintah | Hasil |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run check` (typegen, tsc, eslint, prettier, unit test) | PASS — 0 error, 7 warning lama (`<img>` di halaman masuk); 207 file, 1830 test |
| `npx vitest run src/features/multi-desa/application/template-ekspor.test.ts` | PASS — 8 test |
| `TEST_DATABASE_URL="mysql://root:@127.0.0.1:3306/desa_test" TEST_DATABASE_ACK=1 NODE_ENV=test npx vitest run --config vitest.integration.config.mts src/features/multi-desa/template-ekspor.integration.test.ts` | PASS — 3 test |

Test integrasi menjalankan CLI sebagai proses terpisah pada database disposable
`desa_test`: hasil stdout divalidasi dengan `parseTemplateTenant`, ringkasan
`--json` diperiksa, `--out` menulis berkas, `--force` diperlukan untuk menimpa,
dan slug yang tidak ada ditolak.

## 8. Risiko dan batasan

- Menu publik bertingkat belum dapat diekspor karena skema template belum
  mendukung `parentSlug` untuk menu; menu anak dilaporkan dan dilewati.
- Ekspor memuat seluruh modul desa referensi, termasuk modul yang hanya relevan
  untuk desa tersebut. Reviewer wajib menyaring sebelum memakai hasilnya sebagai
  template platform.
- Tema diekspor sebagai slug/nama/versi/opsi; aset tema tetap milik aplikasi.
- Tidak ada mode "diff" terhadap template yang sedang berlaku.

## 9. Kesimpulan

Alat ekspor menghasilkan template tervalidasi dari instalasi referensi tanpa
menyentuh data di database dan tanpa menyalin data master desa. Langkah
berikutnya: konsol pengelolaan tenant di halaman Super Admin.
