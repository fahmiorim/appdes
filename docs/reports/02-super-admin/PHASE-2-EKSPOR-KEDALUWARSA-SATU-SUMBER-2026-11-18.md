# PHASE-2 — Satu sumber aturan ekspor tenant kedaluwarsa

- **Task:** menyatukan aturan pemilihan ekspor kedaluwarsa agar CLI penjadwal
  dan use case/repository memakai satu sumber.
- **Tanggal:** 18 November 2026
- **Branch:** `task/phase-2-cleanup-exports-single-source`
- **Base commit:** `e7b7295` (branch `task/phase-2-cleanup-exports`)

## 1. Tujuan

Slice sebelumnya meninggalkan dua definisi "ekspor kedaluwarsa": kondisi SQL di
`bersihkanEksporKedaluwarsa()` (drizzle `lte`) dan kondisi SQL di CLI
(`kedaluwarsa_pada <= NOW()`), ditambah dua salinan penjagaan path dan loop
penghapusan berkas. Keduanya hanya diikat komentar "ubah keduanya". Task ini
memindahkan aturan itu ke satu modul domain yang dipakai kedua jalur, sehingga
perubahan kebijakan tidak bisa menyimpang.

## 2. Analisis dan pendekatan

- CLI harus dapat dijalankan Node langsung dari systemd timer tanpa build, dan
  `engines.node` repository adalah `>=22.12.0` — di versi itu Node belum bisa
  mengimpor `.ts` secara andal. Karena itu modul bersama ditulis `.mjs` dan
  diberi deklarasi `.d.mts` (pola yang sudah dipakai `scripts/platform/*.d.mts`).
- Modul diletakkan di **domain** (`src/features/multi-desa/domain/`), bukan di
  `scripts/`, karena aturan ini milik aplikasi: repository server mengimpornya
  langsung, dan CLI (lapisan operasional) bergantung pada domain, bukan
  sebaliknya. Modul tidak mengimpor `@/...` sehingga tetap bisa dijalankan Node.
- Modul tidak menyentuh database. Pemanggil memilih baris (`id`, `berkas`,
  `kedaluwarsaPada`); modul menentukan mana yang kedaluwarsa dan berkas mana
  yang boleh dihapus.
- Konsekuensi yang diterima: repository kini membaca seluruh baris
  `tenant_exports` (hanya metadata, bukan isi ekspor) lalu menyaring di memori,
  alih-alih memakai kondisi SQL terpisah. Tabel hanya menyimpan ekspor maksimal
  30 hari dan barisnya dihapus fungsi ini, sehingga ukurannya kecil; ini ditulis
  sebagai komentar di fungsi tersebut.
- Alternatif yang ditolak: `sql.raw("kedaluwarsa_pada <= NOW()")` di drizzle
  (kehilangan parameter `sekarang` yang dapat diinjeksi untuk test), dan
  menghapus use case (di luar permintaan; API server-side tetap diperlukan).

## 3. File yang diperiksa

- `src/features/multi-desa/infrastructure/lifecycle-tenant-repository.ts`
- `src/features/multi-desa/application/lifecycle-desa-use-cases.ts`
- `scripts/platform/cleanup-exports.mjs`, `cleanup-exports.d.mts`
- `src/features/multi-desa/application/cleanup-ekspor.test.ts`,
  `src/features/multi-desa/cleanup-ekspor.integration.test.ts`
- `docs/deployment/DATABASE.md` (§6.3), `docs/deployment/OPERATIONS.md` (§8.1)
- `package.json` (`engines.node`)

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/features/multi-desa/domain/ekspor-kedaluwarsa.mjs` | **Baru.** Satu-satunya definisi: `pilihKedaluwarsa`, `jalurBerkasAman`, `periksaBerkasEkspor`, `hapusBerkasEkspor` |
| `src/features/multi-desa/domain/ekspor-kedaluwarsa.d.mts` | **Baru.** Deklarasi tipe untuk pemakai TypeScript |
| `src/features/multi-desa/domain/ekspor-kedaluwarsa.test.ts` | **Baru.** 11 test: batas kedaluwarsa, string dari driver, tanggal invalid, path guard, hitung/hapus berkas |
| `src/features/multi-desa/infrastructure/lifecycle-tenant-repository.ts` | `bersihkanEksporKedaluwarsa` memakai modul bersama; hapus `lte`/`unlink`, tambah `inArray` |
| `scripts/platform/cleanup-exports.mjs` | Hapus salinan aturan; impor modul bersama; query tanpa kondisi kedaluwarsa sendiri |
| `scripts/platform/cleanup-exports.d.mts` | Tinggal mendeklarasikan `parseArgumen` milik CLI |
| `src/features/multi-desa/application/cleanup-ekspor.test.ts` | Test path guard dipindah ke test modul domain; tinggal test parsing argumen |
| `src/features/multi-desa/cleanup-ekspor.integration.test.ts` | Tambah test bahwa repository dan CLI memberi hasil yang sama |
| `docs/deployment/DATABASE.md`, `docs/deployment/OPERATIONS.md` | Menunjuk modul bersama sebagai satu-satunya tempat aturan |

## 5. Perubahan

- `pilihKedaluwarsa(daftar, sekarang)`: batas **inklusif** (`kedaluwarsaPada <=
  sekarang`), menerima `Date`, string ISO dari driver MySQL, atau angka; tanggal
  tidak valid **tidak** dianggap kedaluwarsa (data rusak tidak memicu
  penghapusan).
- `jalurBerkasAman(akarEkspor, berkas, cwd)`: menolak path absolut di luar
  folder, `..`, dan folder berawalan mirip (`storage/exports-lain`).
- `periksaBerkasEkspor` / `hapusBerkasEkspor`: menghitung dan menghapus berkas
  aman; berkas hilang dihitung `berkasTidakAda`, path tidak aman dihitung
  `berkasDilewati`.
- Repository: ambil `id, berkas, kedaluwarsaPada` → `pilihKedaluwarsa` →
  `hapusBerkasEkspor` → hapus baris dengan `inArray(id)`. Perilaku eksternal
  tidak berubah: tetap mengembalikan `{ dihapus: number }`.
- CLI: query tanpa kondisi kedaluwarsa sendiri, menyaring dengan
  `pilihKedaluwarsa`; `--dry-run` memakai `periksaBerkasEkspor`. Ringkasan JSON
  dan teks tetap sama.

## 6. Security dan tenant

- Penjagaan path kini hanya satu implementasi dan diuji sekali; CLI dan
  repository tidak dapat berbeda soal berkas mana yang boleh dihapus.
- Penghapusan baris tetap dibatasi pada id hasil seleksi; tidak ada operasi
  lintas tenant baru. Ini operasi platform (Super Admin / timer) yang memang
  membersihkan ekspor semua tenant, sama seperti sebelumnya.
- Tidak ada endpoint, sesi, atau kredensial baru; tidak ada data pribadi yang
  dicetak oleh skrip maupun modul.

## 7. Validasi

| Perintah | Hasil |
|---|---|
| `npx vitest run src/features/multi-desa/domain/ekspor-kedaluwarsa.test.ts` | PASS — 11 test (gagal lebih dulu karena modul belum ada) |
| `npx vitest run src/features/multi-desa/domain/ekspor-kedaluwarsa.test.ts src/features/multi-desa/application/cleanup-ekspor.test.ts` | PASS — 14 test |
| `TEST_DATABASE_URL="mysql://root:@127.0.0.1:3306/desa_test" TEST_DATABASE_ACK=1 NODE_ENV=test npx vitest run --config vitest.integration.config.mts src/features/multi-desa/cleanup-ekspor.integration.test.ts` | PASS — 6 test |
| `npx tsc --noEmit` | PASS |
| `npm run check` | PASS — 209 file, 1847 test, 0 error (7 warning lama `<img>`) |
| `npm run build` | PASS — termasuk resolusi `@/.../ekspor-kedaluwarsa.mjs` di bundel server |

Kegagalan yang muncul saat verifikasi: test integrasi baru pertama kali gagal
pada assertion `toEqual([baru.id])` karena desa uji masih menyimpan baris valid
dari test sebelumnya. Assertion diperbaiki menjadi `toContain(baru.id)` dan
`not.toContain(lama.id)` — bukan kode produksi yang diubah — lalu test lulus.

## 8. Risiko dan batasan

- Repository kini membaca seluruh baris `tenant_exports` tanpa filter SQL. Aman
  untuk volume sekarang (metadata 30 hari), tetapi bila tabel tumbuh besar
  (mis. cleanup lama tidak berjalan), query perlu kembali memakai filter rentang
  yang tetap berasal dari modul bersama.
- Modul `.mjs` di folder domain menyimpang dari konvensi TypeScript modul lain;
  ini konsekuensi kebutuhan menjalankan CLI tanpa build dan didokumentasikan di
  header modul.
- Perilaku `jalurBerkasAman` bergantung pada `process.cwd()`; pemanggil yang
  menjalankan proses dari direktori lain harus mengoper `cwd` eksplisit.
- Tidak ada test untuk jam yang tidak valid (`sekarang` bukan Date) selain guard
  `TypeError`; jalur itu tidak dipakai pemanggil saat ini.

## 9. Kesimpulan

Aturan kedaluwarsa ekspor tenant, penjagaan path, dan penghapusan berkas kini
memiliki satu implementasi di `domain/ekspor-kedaluwarsa.mjs`, dipakai oleh
repository/use case dan CLI penjadwal, dengan test yang mengunci batas
kedaluwarsa dan keamanan path. Langkah berikutnya yang disarankan: menjalankan
`bersihkanEksporKedaluwarsa` dari konsol Super Admin (aksi "bersihkan ekspor")
agar operator punya jalur manual tanpa akses server.
