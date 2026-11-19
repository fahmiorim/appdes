# Sinkronisasi Dokumen Mockup dan Relevansi Fase

- **Tanggal:** 19 November 2026
- **Branch:** `task/super-admin-mockup-audit`
- **Base commit:** `a715cc1`
- **Commit perubahan dokumen:** `483bb73a836795f0d6a55423f509a61f63f293dd`
- **Jenis task:** dokumentasi; tidak mengubah source code, schema, migration, atau data
- **Status:** siap review lokal

## 1. Tujuan

Menjawab dua hal:

1. Dokumen desain dan audit mana yang masih memakai jumlah atau cakupan mockup lama setelah katalog berubah menjadi 89 aset dan Super Admin bertambah menjadi 38 layar.
2. Apakah fase pembangunan yang sudah ada masih relevan terhadap fitur tambahan yang muncul di mockup, atau roadmap perlu diubah.

## 2. Kondisi awal

- `docs/mockups/README.md`, `docs/README.md`, dan `docs/design/ADMIN-PLATFORM-DESIGN.md` sudah diperbarui pada audit sebelumnya.
- `docs/design/DESIGN-SYSTEM.md` masih menyebut 52 mockup, 42 PNG, dan menyatakan Super Admin tidak memiliki screenshot.
- `docs/reports/README.md` masih menyebut audit final 42 mockup sebagai satu-satunya acuan status UI.
- `docs/design/README.md` masih menautkan hanya audit final 42 mockup.
- `docs/SID_FEATURE_MAP.md` belum mencatat bahwa 38 layar Super Admin dan 10 layar Admin Desa adalah referensi desain, bukan implementasi.
- `docs/MASTER_ROADMAP.md` belum memiliki penilaian eksplisit apakah fitur tambahan mengubah urutan fase.
- PR #156 masih terbuka dan `mergeStateStatus=BLOCKED`; check quality, integration MySQL, dan ringkasan CI berstatus gagal sebelum perubahan dokumentasi ini. Kegagalan tersebut tidak ditangani dalam task dokumentasi ini.

## 3. Analisis

Perluasan mockup tidak sama dengan penambahan fitur siap pakai. Audit sebelumnya menemukan:

- 15 layar Super Admin baru terpetakan sebagian.
- 23 layar belum memiliki fitur atau model data.
- Angka pada mockup saling bertentangan dan tidak boleh dipakai sebagai acceptance data.

Karena itu:

- Fase 0–6 tetap relevan dan tidak perlu dinomori ulang.
- Area baru dipetakan sebagai backlog dengan fase, prioritas, dan prasyarat.
- Langganan/pembayaran tidak dimasukkan ke Fase 2 karena belum ada model komersial; area ini dicatat sebagai kandidat Fase 7.
- Monitoring, keamanan, dan analitik tetap bergantung pada Fase 5 serta kontrol server/ingress, bukan sekadar UI.
- Arah visual Super Admin navy/ungu belum diputuskan; implementasi biru saat ini tidak diubah.

## 4. File yang diperiksa

- `docs/mockups/README.md`
- `docs/design/DESIGN-SYSTEM.md`
- `docs/design/ADMIN-PLATFORM-DESIGN.md`
- `docs/design/README.md`
- `docs/reports/README.md`
- `docs/SID_FEATURE_MAP.md`
- `docs/MASTER_ROADMAP.md`
- `docs/reports/05-ui-audit/REVIEW-MOCKUP-SUPER-ADMIN-2026-11-19.md`
- `docs/reports/05-ui-audit/REVIEW-MOCKUP-ADMIN-DESA-2026-11-19.md`
- `docs/reports/05-ui-audit/UI-MOCKUP-AUDIT-FINAL-2026-11-18.md`
- Status `main` dan check PR #156 melalui GitHub CLI.

## 5. File yang diubah

| File | Alasan |
|---|---|
| `docs/design/DESIGN-SYSTEM.md` | Memperbarui status ke 89 mockup, 38 Super Admin, 10 Admin Desa; memisahkan arah visual mockup dari token implementasi; memperbarui gate sebelum status stable. |
| `docs/design/README.md` | Mengganti acuan tunggal audit 42 mockup dengan tiga laporan sesuai cakupan. |
| `docs/reports/README.md` | Menambahkan tabel acuan audit berdasarkan cakupan dan menandai audit final sebagai snapshot historis. |
| `docs/mockups/README.md` | Menjelaskan bahwa status mengikuti tiga laporan, bukan hanya audit final. |
| `docs/design/ADMIN-PLATFORM-DESIGN.md` | Menautkan katalog menu platform ke keputusan fase di roadmap. |
| `docs/SID_FEATURE_MAP.md` | Mencatat status UI 19 November, login Admin Desa terpisah, dan fitur platform tambahan yang masih ditunda. |
| `docs/MASTER_ROADMAP.md` | Menambahkan §2B berisi relevansi fase dan pemetaan area mockup ke fase/prioritas. |
| `docs/reports/05-ui-audit/DOCS-SYNC-MOCKUP-2026-11-19.md` | Laporan task ini. |

## 6. Hasil perubahan

### 6.1 Design System

- Status naik menjadi Draft v0.4 dengan inventaris 89 aset.
- Rincian: 21 publik, 11 akun, 7 pendukung, 40 platform (2 landing/login + 38 konsol), dan 10 Admin Desa.
- Audit visual dinyatakan tidak mengukur pixel, kontras final, atau viewport implementasi.
- Warna Super Admin: implementasi saat ini biru, sedangkan mockup memperlihatkan navy/ungu yang belum disetujui. Tidak ada perubahan token.
- Gate stable tidak lagi meminta "42 PNG"; kini meminta audit lanjutan seluruh 89 aset tanpa klaim pixel-perfect.

### 6.2 Indeks laporan dan desain

- Laporan Super Admin, Admin Desa, dan audit final 42 mockup dipisahkan berdasarkan cakupan.
- Audit final tetap dipertahankan sebagai snapshot historis, bukan katalog lengkap.
- Tautan katalog mockup tidak lagi menyiratkan bahwa audit final mencakup seluruh 89 aset.

### 6.3 Peta fitur

- Ditambahkan catatan bahwa 38 Super Admin dan 10 Admin Desa adalah referensi desain.
- Login Admin Desa `/masuk-admin` disebut sebagai halaman autentikasi, bukan UI pengelolaan modul.
- Fitur langganan, analitik, editor template/tema, dan pusat keamanan dicatat sebagai ditunda dengan prasyaratnya.

### 6.4 Roadmap

§2B menjawab relevansi fase:

- Fase 0–6 dan urutannya tetap.
- Area baru dipetakan ke Fase 2, 3, 5, atau 6 sesuai prasyarat.
- Langganan dan invoice menjadi kandidat Fase 7, ditunda sampai keputusan bisnis.
- Fase 2 tetap ditutup lewat walkthrough staging, bukan dengan mengejar seluruh mockup.
- Semua butir tetap tunduk pada Definition of Done §7.

## 7. Security dan tenant

Tidak ada perubahan source, otorisasi, query, schema, atau data. Perubahan dokumentasi justru menegaskan:

- UI mockup bukan bukti otorisasi atau isolasi tenant.
- Pusat keamanan/firewall tidak boleh dianggap sebagai kontrol keamanan itu sendiri.
- Impersonasi dan broadcast memerlukan keputusan keamanan, audit, dan batas waktu.
- Analitik memerlukan definisi metrik, retensi, agregasi, akses, dan privasi sebelum data dikumpulkan.

## 8. Validasi

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Format Markdown | `npx prettier --check docs/MASTER_ROADMAP.md docs/SID_FEATURE_MAP.md docs/design/ADMIN-PLATFORM-DESIGN.md docs/design/DESIGN-SYSTEM.md docs/design/README.md docs/mockups/README.md docs/reports/README.md` | **PASS** — seluruh file sesuai Prettier |
| Tautan lokal | Skrip Node memeriksa tautan relatif pada tujuh file | **PASS** — seluruh tautan lokal menuju file yang ada |
| Istilah/angka basi | `grep` untuk `52 mockup`, `Render dan periksa 42`, `tidak memiliki screenshot` | **PASS** — tidak ditemukan pada dokumen aktif yang diperiksa |
| Unit/integration test | Tidak dijalankan | **SKIPPED** — perubahan hanya dokumentasi, tanpa perubahan kode |
| Browser visual comparison | Tidak dijalankan | **SKIPPED** — task tidak meminta screenshot atau visual acceptance |
| CI PR #156 | Status GitHub | **FAIL (sebelum task ini)** — quality, integration MySQL, dan ringkasan CI gagal; tidak diperbaiki dalam scope dokumentasi |

## 9. Risiko dan keterbatasan

- Angka 89 dan rincian 38/10 berasal dari audit 19 November dan katalog saat ini; penambahan atau penggantian aset setelah tanggal tersebut memerlukan pembaruan lagi.
- Audit visual belum pixel-perfect dan belum membandingkan implementasi di browser.
- Keputusan navy/ungu untuk Super Admin masih terbuka.
- PR #156 tetap terblokir oleh kegagalan check yang tidak berasal dari perubahan dokumentasi ini.
- Perubahan aset mockup lokal pengguna tidak di-stage dan tidak diubah.

## 10. Kesimpulan

Dokumentasi aktif kini konsisten dengan katalog 89 mockup. Fase 0–6 masih relevan; fitur tambahan diposisikan sebagai backlog bersyarat, dengan langganan/pembayaran sebagai kandidat Fase 7. Tidak ada klaim bahwa fitur mockup sudah diimplementasikan.
