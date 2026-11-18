# PHASE-2 — Penyelarasan dokumen status Fase 2

- **Task:** merapikan dokumen aktif agar status Fase 2 sesuai implementasi yang sudah merged dan memisahkan sisa pekerjaan operasional.
- **Tanggal:** 18 November 2026
- **Branch:** `docs/phase-2-status-2026-11-18`
- **Base commit:** `171f4ed5710ec504dcd04f7eab2a787ea144e5d4` (`main`)
- **Jenis perubahan:** dokumentasi saja. Tidak ada perubahan source, schema, migration, atau data.

## 1. Kondisi awal

PR #106–#112 sudah merged ke `main` dan mencakup bootstrap Super Admin, provisioning
berbasis template, konsol tenant, pengelolaan domain alias, lifecycle retensi dan
purge, ekspor template, serta cleanup ekspor terjadwal. Beberapa dokumen aktif masih
menggambarkan kondisi sebelum pekerjaan itu:

| Dokumen | Klaim usang |
|---|---|
| `docs/SID_FEATURE_MAP.md` | "bootstrap Super Admin pertama belum ada"; pengelolaan domain di UI disebut sebagai pekerjaan lanjutan |
| `docs/MASTER_ROADMAP.md` | Fase 2 hanya berisi daftar pekerjaan tanpa status; backlog nomor 6 masih "Rencana Super Admin UI" |
| `docs/TECHNICAL_AUDIT.md` | AUD-009 menyatakan Server Action pengelolaan tenant tidak ditemukan dan provisioning masih mengambil desa pertama; AUD-010 menyatakan purge belum ada |
| `docs/deployment/README.md` | Menyebut 12 migrasi; menyatakan form pengelolaan domain belum ada di UI |
| `docs/deployment/STAGING.md` | Menyebut bootstrap "belum tersedia sebagai perintah repository"; checklist memakai 12 migrasi |
| `docs/reports/05-ui-audit/archive/SCREENSHOT-IMPLEMENTATION-MATRIX.md` | Menyebut manajemen tenant dan lifecycle tenant "belum ada UI lengkap" |

## 2. Bukti yang dipakai

Klaim baru dicocokkan langsung dengan kode di `main`, bukan dari ingatan laporan:

| Klaim | Bukti |
|---|---|
| 13 migrasi | `git ls-files 'src/db/migrations/*.sql'` menghasilkan 13 berkas (`0000`–`0012`) |
| Skrip platform tersedia | `package.json` memuat `platform:bootstrap`, `platform:export-template`, `platform:cleanup-exports` |
| Audit ekspor dan purge | `src/features/audit/domain/audit.ts:47-48` mendefinisikan `desa.export` dan `desa.purge` |
| Konsol tenant di halaman Super Admin | `src/app/(admin)/super-admin/page.tsx:11` mengimpor `TenantConsole` dan memakainya di baris 110 |
| Template platform | `src/db/templates/tenant-template.ts`, dipakai `src/features/multi-desa/infrastructure/provisioning-repository.ts` |
| Purge dan tombstone domain | `src/features/multi-desa/infrastructure/lifecycle-tenant-repository.ts`, laporan `PHASE-2-LIFECYCLE-2026-11-17.md` |

## 3. File yang diubah

| File | Alasan |
|---|---|
| `docs/MASTER_ROADMAP.md` | Menambahkan status kode Fase 2, kriteria kode selesai, daftar validasi operasional yang terbuka, dan mengganti backlog "Rencana Super Admin UI" menjadi walkthrough staging |
| `docs/SID_FEATURE_MAP.md` | Memperbarui status modul platform multi-desa dan header tanggal pembaruan |
| `docs/TECHNICAL_AUDIT.md` | Memperbarui AUD-009 dan AUD-010 agar mencerminkan kode sekarang, sekaligus mencatat validasi runtime yang belum terbukti |
| `docs/deployment/README.md` | Memperbaiki jumlah migrasi menjadi 13, menyesuaikan prosedur bootstrap, dan memperbarui status pengelolaan domain |
| `docs/deployment/STAGING.md` | Mengganti rujukan bootstrap yang usang dan memperluas checklist staging |
| `docs/reports/05-ui-audit/archive/SCREENSHOT-IMPLEMENTATION-MATRIX.md` | Menandai UI manajemen dan lifecycle tenant tersedia, dengan visual review tetap pending |

## 4. Perubahan

- Fase 2 di roadmap kini menyatakan implementasi repository selesai dan merged
  (PR #106–#112), dengan pemisahan eksplisit antara kriteria kode dan validasi
  operasional. Ini mencegah pembaca menyimpulkan fase sudah diterima di production.
- Empat sisa pekerjaan dicatat sebagai validasi, bukan fitur baru: walkthrough
  konsol di staging, pemasangan dan pemantauan timer cleanup, tinjauan template
  bawaan minimal, serta uji bootstrap dan login pada staging.
- Feature map dan matriks screenshot tidak lagi menyebut fitur yang sudah ada
  sebagai belum dibuat; status visual review tetap "pending" karena tidak ada
  uji browser pada task ini.
- AUD-009 dan AUD-010 dipertahankan sebagai temuan historis dengan status awal
  yang tidak dihapus, lalu ditambahkan kondisi kode saat ini. AUD-010 tidak
  ditandai tertutup sepenuhnya karena validasi purge pada data nyata belum
  dijalankan.
- Hitungan migrasi diseragamkan menjadi 13 pada dua dokumen deployment.

Laporan audit historis lain (misalnya
`docs/reports/00-baseline/deployment-documentation-report.md` dan
`docs/reports/00-baseline/phase-0-completion-report.md`) sengaja tidak diubah:
keduanya merekam kondisi pada commit saat pemeriksaan dan sudah memakai penanda
addendum.

## 5. Security dan tenant

- Tidak ada perubahan source, schema, migration, otorisasi, atau data.
- Dokumen tidak memuat secret, token, kredensial, atau data pribadi.
- Klaim keamanan yang ditulis tetap konservatif: purge dinyatakan tidak dapat
  dibatalkan dan wajib didahului backup database serta `storage/media`; validasi
  runtime dinyatakan belum terbukti.

## 6. Validasi

| Perintah | Hasil |
|---|---|
| `npx prettier --check docs/MASTER_ROADMAP.md docs/SID_FEATURE_MAP.md docs/TECHNICAL_AUDIT.md docs/deployment/README.md docs/deployment/STAGING.md docs/reports/05-ui-audit/archive/SCREENSHOT-IMPLEMENTATION-MATRIX.md` | **PASS** — semua berkas sesuai gaya Prettier |
| `git ls-files 'src/db/migrations/*.sql' \| wc -l` | **13** — dasar klaim jumlah migrasi |
| Pemeriksaan `package.json`, `audit.ts`, `super-admin/page.tsx`, `tenant-template.ts` | **PASS** — setiap klaim baru punya rujukan kode |
| `npm run check` / `npm run build` | **SKIPPED** — hanya dokumentasi; tidak ada kode yang berubah |

## 7. Risiko dan batasan

- Dokumen lain di luar enam berkas ini masih memuat klaim kondisi lama, misalnya
  laporan Fase 0 dan laporan audit historis. Berkas itu sengaja dibiarkan sebagai
  arsip; bila dianggap membingungkan, perlu task terpisah untuk memberi penanda
  status pada masing-masing.
- Walkthrough konsol, login hasil bootstrap, dan eksekusi purge tetap belum diuji
  pada lingkungan nyata. Dokumen sekarang menyatakannya sebagai pekerjaan terbuka.
- Template bawaan masih minimal (role `administrator`, tema `esensi`). Isi template
  standar belum diputuskan dan tidak diubah pada task ini.
- Timer cleanup masih berupa contoh konfigurasi di `docs/deployment/OPERATIONS.md`
  §8.1; belum dipasang atau dipantau di server.

## 8. Kesimpulan

Dokumen aktif kini membedakan tiga hal yang sebelumnya tercampur: fitur yang sudah
diimplementasikan dan merged, klaim audit historis, dan validasi operasional yang
belum dijalankan. Langkah berikutnya: walkthrough konsol Super Admin di staging,
lalu pemasangan timer cleanup dan verifikasi log.
