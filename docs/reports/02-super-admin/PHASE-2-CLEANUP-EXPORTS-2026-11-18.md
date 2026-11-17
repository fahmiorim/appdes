# PHASE-2 — Pembersihan berkas ekspor tenant kedaluwarsa

- **Task:** menambahkan jadwal pembersihan berkas ekspor tenant yang kedaluwarsa.
- **Tanggal:** 18 November 2026
- **Branch:** `task/phase-2-cleanup-exports`
- **Base commit:** `c422ea9` (branch `task/phase-2-tenant-domain-console`)

## 1. Tujuan

`tenant_exports` menyimpan catatan ekspor data tenant dengan masa berlaku 30
hari, dan berkasnya berada di `storage/exports/<villageId>/`. Repository hanya
memiliki fungsi `bersihkanEksporKedaluwarsa()`; belum ada apa pun yang
menjalankannya secara berkala. Akibatnya salinan data pribadi desa (termasuk desa
yang sudah di-purge) tertinggal di disk selamanya dan baris `tenant_exports`
menumpuk. Task ini menambahkan jalur operasional yang dapat dijadwalkan
cron/systemd timer, tanpa endpoint HTTP baru dan tanpa kredensial tambahan.

## 2. Analisis dan pendekatan

- Server tidak menyediakan scheduler bawaan; repository juga tidak memuat unit
  systemd. Pola yang sudah dipakai untuk tugas operasional adalah skrip
  `scripts/platform/*.mjs` yang dijalankan dengan Node langsung (tanpa build).
  Pola itu dipakai lagi di sini.
- Alternatif yang ditolak: endpoint internal ber-secret (menambah permukaan HTTP
  dan manajemen secret) dan `setInterval` di dalam proses Next (tidak persisten,
  tidak terlihat di journal, dan berjalan di setiap instance).
- Aturan pemilihan baris (`kedaluwarsa_pada <= NOW()`) sengaja dibuat identik
  dengan use case/repository yang ada. Keduanya diberi komentar silang agar
  perubahan aturan tidak hanya terjadi di satu sisi. Penghapusan baris bersifat
  idempoten, sehingga aman bila timer berjalan ganda.

## 3. File yang diperiksa

- `src/features/multi-desa/infrastructure/lifecycle-tenant-repository.ts`
  (`eksporDataTenant`, `bersihkanEksporKedaluwarsa`, batas 30 hari)
- `src/db/schema/village.ts` (`tenant_exports`)
- `scripts/platform/export-template.mjs` + `.d.mts` (pola CLI dan fungsi murni)
- `scripts/platform/bootstrap.mjs` (pola `muatEnv`, penanganan error)
- `src/features/publik/infrastructure/media-storage.ts` (aturan path traversal)
- `docs/deployment/OPERATIONS.md`, `docs/deployment/DATABASE.md`

## 4. File yang diubah

| File | Alasan |
|---|---|
| `scripts/platform/cleanup-exports.mjs` | CLI pembersihan: `parseArgumen`, `jalurBerkasAman`, hapus berkas + baris per batch, `--dry-run`, `--json` |
| `scripts/platform/cleanup-exports.d.mts` | Deklarasi tipe fungsi murni agar dapat diuji dari TypeScript |
| `package.json` | Skrip `platform:cleanup-exports` |
| `src/features/multi-desa/application/cleanup-ekspor.test.ts` | Unit test parsing argumen dan penjagaan path (7 test) |
| `src/features/multi-desa/cleanup-ekspor.integration.test.ts` | Uji CLI sebagai proses terpisah pada database disposable (5 test) |
| `vitest.integration.config.mts`, `scripts/integration-test-map.json` | Mendaftarkan test integrasi baru |
| `docs/deployment/OPERATIONS.md` | Bagian 8.1: perintah, sifat skrip, contoh unit + timer systemd, cara verifikasi |
| `docs/deployment/DATABASE.md` | §6.3 menunjuk ke skrip penjadwalan, bukan lagi "dipanggil operator/penjadwal" tanpa rujukan |
| `src/app/(admin)/super-admin/page.test.ts` | Memperbaiki mock yang hilang untuk `daftarSemuaDomain` (lihat bagian 7) |

## 5. Perubahan

- `npm run platform:cleanup-exports [-- --dry-run] [-- --json]`:
  1. memuat `.env` tanpa menimpa environment pemanggil;
  2. memilih `tenant_exports` dengan `kedaluwarsa_pada <= NOW()`;
  3. menghapus berkasnya hanya bila path hasil resolusi berada di bawah
     `storage/exports`;
  4. menghapus barisnya per batch 500 id;
  5. mencetak ringkasan (`diperiksa`, `berkasDihapus`, `berkasTidakAda`,
     `berkasDilewati`, `barisDihapus`).
- `--dry-run` menghitung tanpa menghapus berkas maupun baris; `--json` mencetak
  satu baris JSON untuk log/journal; `--help` mencetak bantuan; argumen tak
  dikenal gagal dengan exit code 1.
- Dokumentasi menyertakan unit `appdes-cleanup-exports.service` + `.timer`
  harian 02:30 dengan `Persistent=true`, serta perintah `systemctl list-timers`
  dan `journalctl` untuk memeriksa hasil.

## 6. Security dan tenant

- Penghapusan berkas dibatasi pada `storage/exports`: path diselesaikan terhadap
  `process.cwd()` lalu wajib berawalan `akar + path.sep`, sehingga path absolut,
  `..`, dan folder berawalan mirip (`storage/exports-lain`) ditolak — ini diuji
  unit dan integrasi.
- Baris database yang path-nya tidak aman tetap dihapus (metadata kedaluwarsa),
  tetapi berkasnya tidak disentuh dan jumlahnya dilaporkan sebagai
  `berkasDilewati` untuk diperiksa manual.
- Skrip tidak menyentuh tabel desa, media, atau audit; tidak menerima input
  pengguna selain flag CLI; tidak mencetak kredensial (`DATABASE_URL` tidak
  pernah ditulis ke output).
- Tidak ada endpoint HTTP, sesi, atau kredensial baru. Otorisasi tetap di tingkat
  server/timer (user aplikasi).

## 7. Validasi

| Perintah | Hasil |
|---|---|
| `npx vitest run src/features/multi-desa/application/cleanup-ekspor.test.ts` | PASS — 7 test (gagal lebih dulu sebelum implementasi, sesuai TDD) |
| `TEST_DATABASE_URL="mysql://root:@127.0.0.1:3306/desa_test" TEST_DATABASE_ACK=1 NODE_ENV=test npx vitest run --config vitest.integration.config.mts src/features/multi-desa/cleanup-ekspor.integration.test.ts` | PASS — 5 test |
| `node scripts/platform/cleanup-exports.mjs --help` | PASS — exit 0 |
| `node scripts/platform/cleanup-exports.mjs --salah` | PASS — exit 1, pesan "Argumen tidak dikenal" |
| `npm run check` (tsc, eslint, prettier, unit test) | PASS — 208 file, 1840 test, 0 error |
| `npx vitest run "src/app/(admin)/super-admin/page.test.ts"` | PASS — 3 test |

Test integrasi membuktikan: ekspor kedaluwarsa dihapus beserta berkasnya
sementara ekspor yang masih berlaku tetap utuh; eksekusi ulang tidak menghapus
apa pun (idempoten); `--dry-run` tidak mengubah berkas/baris; berkas di luar
`storage/exports` tidak dihapus meski catatannya dihapus; catatan yang berkasnya
sudah hilang tetap dibersihkan.

Catatan kegagalan yang ditemukan dan diperbaiki selama verifikasi: `npm run
check` pertama gagal pada `src/app/(admin)/super-admin/page.test.ts` karena
halaman Super Admin (slice sebelumnya) memuat `daftarSemuaDomain()` sedangkan
mock-nya hanya menyediakan `requireSuperAdmin`/`daftarDesaSuperAdmin`, sehingga
query domain asli dijalankan ke database dan ditolak (`ER_ACCESS_DENIED_ERROR`).
Mock use case domain ditambahkan (dan mock `tenant-table` yang sudah tidak ada
dihapus); pemeriksaan diulang dan lulus.

## 8. Risiko dan batasan

- Timer systemd bersifat contoh operasional; repository tidak memuat unit file
  dan tidak ada monitoring otomatis. Kegagalan hanya terlihat di journal.
- Tidak ada penguncian antar-instance; dua proses bersamaan dapat mencoba
  menghapus berkas yang sama. Hal ini aman (unlink menoleransi `ENOENT` dan
  `DELETE` idempoten) tetapi jumlah `berkasDihapus` bisa berbeda antar-laporan.
- Berkas yang path-nya tidak aman dibiarkan di disk dan hanya dilaporkan; tidak
  ada pembersihan otomatis untuk kasus data rusak tersebut.
- Aturan pemilihan baris diduplikasi antara CLI dan
  `bersihkanEksporKedaluwarsa()` (komentar silang); perubahan aturan harus
  dilakukan di kedua tempat.
- `npm run build` tidak dijalankan ulang pada task ini karena tidak ada perubahan
  kode aplikasi (hanya skrip operasional, test, dan dokumentasi); hasil build
  terakhir dari slice konsol masih berlaku untuk kode aplikasi.

## 9. Kesimpulan

Pembersihan ekspor tenant kini dapat dijadwalkan dengan satu perintah yang aman
dijalankan berulang, dibatasi pada folder ekspor, dan terdokumentasi untuk
operator. Rekomendasi berikutnya: menyiapkan monitoring kegagalan timer (mis.
notifikasi bila `journalctl` mencatat exit non-nol) atau menjalankan skrip yang
sama dari backup harian.
