# PHASE-2 — Lifecycle retensi dan purge tenant

- **Task:** implementasi lifecycle retensi tenant sesuai kebijakan default yang disetujui (nonaktif → 90 hari → ekspor wajib → purge + arsip agregat).
- **Tanggal:** 17 November 2026
- **Branch:** `task/phase-2-lifecycle-retention`
- **Base commit:** `7ef3851`
- **Commit implementasi:** `74a835f`

## 1. Tujuan

Menyediakan jalur resmi untuk mengakhiri masa hidup tenant: desa dinonaktifkan,
data dipertahankan selama masa tenggang, operator wajib membuat ekspor, lalu
data pribadi dihapus dan hanya statistik agregat, audit, tombstone, serta arsip
ekspor yang tersisa.

## 2. Kondisi awal dan analisis

Sebelum perubahan:

- `villages.active` bisa diubah lewat `setStatusDesa`, tetapi tidak ada catatan
  **kapan** desa dinonaktifkan, sehingga masa tenggang tidak dapat dihitung.
- Tidak ada mekanisme ekspor data tenant maupun penghapusan data tenant.
- Tidak ada tabel untuk mencatat ekspor, arsip purge, atau domain desa yang
  sudah dihentikan, sehingga domain bekas tenant dapat dipakai ulang secara
  tidak sengaja oleh desa baru.

Rancangan yang dipilih: aturan retensi murni di domain (`lifecycle-tenant.ts`),
repository untuk ekspor/purge, use case yang menegakkan otorisasi dan guard,
serta migration baru `0012` (tidak mengedit migration yang sudah diterapkan).

## 3. File yang diperiksa

- `src/db/schema/village.ts`, `src/db/schema/audit.ts`, `src/db/schema/auth.ts`
- `src/features/multi-desa/infrastructure/kelola-desa-repository.ts`
- `src/features/multi-desa/infrastructure/provisioning-repository.ts`
- `src/features/multi-desa/application/kelola-desa-use-cases.ts`
- `src/features/audit/domain/audit.ts`
- `src/features/publik/infrastructure/media-storage.ts`
- `src/features/multi-desa/provisioning-template.integration.test.ts`
- `vitest.integration.config.mts`, `scripts/integration-test-map.json`
- `docs/deployment/DATABASE.md`

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/db/schema/village.ts` | Kolom `nonaktif_sejak`, `purged_at`; tabel `tenant_exports`, `tenant_purge_archive`, `tenant_domain_tombstones` |
| `src/db/migrations/0012_tenant_lifecycle.sql`, `meta/0012_snapshot.json`, `meta/_journal.json` | Migration baru untuk kolom/tabel di atas |
| `src/features/multi-desa/domain/lifecycle-tenant.ts` (+ test) | Aturan retensi murni: 90 hari tenggang, ekspor 30 hari, retensi audit 24 bulan, guard purge |
| `src/features/multi-desa/infrastructure/lifecycle-tenant-repository.ts` | Ekspor JSON, purge transaksional, pembersihan ekspor kedaluwarsa |
| `src/features/multi-desa/application/lifecycle-desa-use-cases.ts` (+ test) | Use case super admin: status, ekspor, purge, pembersihan ekspor |
| `src/features/multi-desa/infrastructure/kelola-desa-repository.ts` | `setStatusDesa` mengisi/mengosongkan `nonaktif_sejak` dan menolak desa yang sudah di-purge |
| `src/features/multi-desa/infrastructure/provisioning-repository.ts` | Provisioning menolak domain yang tercatat di `tenant_domain_tombstones` |
| `src/features/audit/domain/audit.ts` | Event `desa.export` dan `desa.purge` beserta label |
| `src/features/multi-desa/lifecycle-tenant.integration.test.ts` | Test purge end-to-end pada database disposable |
| `vitest.integration.config.mts`, `scripts/integration-test-map.json` | Mendaftarkan test integrasi baru |
| `docs/deployment/DATABASE.md` | Prosedur lifecycle, daftar yang dihapus/dipertahankan, jumlah migration |

## 5. Perubahan

### 5.1 Aturan retensi (domain)

- `MASA_TENGGANG_HARI = 90`, `UMUR_EKSPOR_HARI = 30`, `RETENSI_AUDIT_BULAN = 24`.
- Status: `aktif` → `masa-tenggang` → `siap-purge`, atau `sudah-purge`.
- `alasanTidakBolehPurge` menolak desa aktif, desa yang belum melewati masa
  tenggang (dengan sisa hari), desa tanpa ekspor berlaku, desa tanpa penanda
  waktu nonaktif, dan desa yang sudah di-purge.

### 5.2 Ekspor

- Menulis JSON ke `storage/exports/<villageId>/<waktu>.json` berisi baris semua
  tabel ber-`village_id` kecuali tabel yang dipertahankan saat purge.
- Kolom yang namanya mengandung `password`, `token`, `secret`, `pin`, `otp`,
  atau `private_key` dikosongkan (`null`).
- Batas 200.000 baris per ekspor; lebih dari itu operator diarahkan memakai
  `mysqldump`.
- Catatan ekspor disimpan di `tenant_exports` dan berlaku 30 hari.

### 5.3 Purge

- Berjalan dalam satu transaksi. Baris desa dikunci (`SELECT … FOR UPDATE`)
  untuk mencegah purge ganda; desa aktif atau yang sudah di-purge ditolak.
- Daftar tabel diambil dari `information_schema.columns` (kolom `village_id`),
  urutan hapus dihitung dari graf `key_column_usage` (anak lebih dulu). Bila graf
  membentuk siklus, purge dibatalkan; `FOREIGN_KEY_CHECKS` tidak dinonaktifkan.
- Sebelum menghapus `village_domains`, domain dicatat ke
  `tenant_domain_tombstones`. Statistik jumlah baris per tabel disimpan di
  `tenant_purge_archive` (tanpa PII).
- Setelah transaksi sukses, folder `storage/media/<villageId>/` dihapus.
- `villages` tetap ada dengan `purged_at` terisi; `audit_logs`, `tenant_exports`,
  dan arsip purge tidak dihapus.

### 5.4 Integrasi

- `setStatusDesa(id, false)` mengisi `nonaktif_sejak`; `true` mengosongkannya.
- Provisioning menolak domain yang sudah di-purge meskipun baris tenant-nya
  sudah tidak ada.

## 6. Security dan tenant

- Seluruh use case memanggil `requireSuperAdmin` (role `super-admin` platform
  dengan `villageId === null`); administrator desa ditolak walau memiliki flag
  `isSuperadmin` desa.
- `villageId` tidak pernah diambil dari body/query sebagai dasar otorisasi pada
  operasi tenant; use case menerima `villageId` dari pemanggil yang sudah
  terotorisasi dan memvalidasinya sebagai bilangan bulat positif.
- Setiap SELECT/DELETE/CREATE pada ekspor dan purge dibatasi `village_id`.
- Purge tidak dapat dijalankan pada desa aktif atau tanpa ekspor; konfirmasi
  slug mencegah salah pilih tenant.
- Nama tabel dari `information_schema` divalidasi `^[a-z0-9_]+$` sebelum dipakai
  sebagai identifier SQL; nilai selalu di-bind sebagai parameter.
- Audit `desa.purge` hanya mencatat slug, jumlah baris, jumlah tabel, dan status
  media — tanpa isi data atau PII.
- Berkas ekspor berada di `storage/exports` (di-.gitignore lewat `/storage`).

## 7. Deviasi yang perlu diketahui reviewer

Kebijakan menyebut purge **meng-anonimisasi** data pribadi. Implementasi memilih
**menghapus seluruh baris ber-`village_id`** dan menyisakan statistik agregat.
Alasannya: hasilnya dapat diverifikasi tidak menyisakan PII, sedangkan anonimisasi
in-place berisiko meninggalkan kolom sensitif yang terlewat. Perilaku ini
didokumentasikan di `docs/deployment/DATABASE.md` §6.3.

## 8. Validasi

| Perintah | Hasil |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run check` (typegen, tsc, eslint, prettier) | PASS — 0 error, 7 warning lama (`<img>` di halaman masuk) |
| `npx vitest run src/features/multi-desa/domain/lifecycle-tenant.test.ts src/features/multi-desa/application/lifecycle-desa-use-cases.test.ts` | PASS — 20 test |
| `npm run test` | PASS — 206 file, 1822 test |
| `TEST_DATABASE_URL="mysql://root:@127.0.0.1:3306/desa_test" TEST_DATABASE_ACK=1 NODE_ENV=test npx vitest run --config vitest.integration.config.mts src/features/multi-desa/lifecycle-tenant.integration.test.ts` | PASS — 6 test (database disposable `desa_test`) |

Test integrasi membuktikan: `nonaktif_sejak` terisi, ekspor memuat data tenant
tanpa kolom PIN, purge menolak desa aktif, purge menghapus user/domain/media,
menyisakan tombstone domain, arsip statistik, catatan ekspor, dan audit log,
purge kedua ditolak, serta domain bekas tenant ditolak saat provisioning baru.

## 9. Risiko dan batasan

- Migration `0012` belum diuji pada salinan data production; hanya pada database
  disposable hasil migrasi penuh.
- Ekspor memuat seluruh baris di memori proses (batas 200.000 baris). Tenant
  besar perlu jalur `mysqldump` yang didokumentasikan, bukan implementasi baru.
- Pembersihan ekspor kedaluwarsa belum dijadwalkan otomatis; masih dipanggil
  manual melalui use case.
- Purge tidak dapat dibatalkan; backup database wajib sebelum eksekusi.
- UI konsol Super Admin untuk memicu ekspor/purge belum ada pada commit ini.

## 10. Kesimpulan

Lifecycle retensi berjalan end-to-end di lapisan domain, repository, use case,
dan skema, dengan guard berlapis dan bukti test integrasi pada database
disposable. Langkah berikutnya: konsol tenant di halaman Super Admin dan alat
ekspor template.
