# AUD-019/AUD-020 — TTE origin, redirect, and TLS hardening (work in progress)

- **Task:** Partial remediation for TTE cross-origin credential leakage, redirect handling, and insecure HTTP/TLS configuration.
- **Date:** 2026-11-12
- **Branch:** `task/AUD-019-020-tte-security`
- **Base commit:** `d6f2a615d6a471b427ad35393250ba87f2aa3e05`
- **Current implementation commit:** `3608b037651a09ae98a17a5b3083d008e483dcf8`
- **Status:** INCOMPLETE — not ready for merge or production.

## Kondisi awal

Adapter TTE menerima URL file dari respons provider. URL absolut eksternal dapat digunakan untuk permintaan unduhan dengan Basic Authorization yang sama. Fetch juga mengikuti redirect secara default. Konfigurasi menerima `TTE_SSL=false`, sementara kontrak keamanan repository mengharuskan HTTPS dan verifikasi sertifikat aktif.

## Perubahan yang sudah dibuat

- `src/features/surat/domain/tte.ts`
  - Menolak base URL TTE yang bukan HTTPS atau memuat username/password/query/fragment.
  - Membatasi URL unduhan hasil provider ke HTTPS dan origin yang sama dengan provider.
  - Mengatur fetch agar tidak mengikuti redirect otomatis dan menolak respons redirect.
  - Memaksa konfigurasi runtime `ssl` tetap `true`; nilai `TTE_SSL=false` tidak lagi menonaktifkan verifikasi TLS.
- `src/features/surat/domain/tte.test.ts`
  - Mengubah ekspektasi TLS agar selalu aktif.
  - Menambahkan test untuk URL unduhan lintas-origin, endpoint HTTP, dan redirect.

## Validasi

- **SKIPPED:** `npm run check` — belum dijalankan karena perubahan dilakukan melalui GitHub dan belum tersedia runtime lokal dalam sesi ini.
- **SKIPPED:** test unit TTE — perlu dijalankan oleh coding agent di lingkungan lokal.
- **SKIPPED:** integration test — tidak dijalankan.
- **SKIPPED:** build — tidak dijalankan.
- **PASS:** pemeriksaan compare GitHub menunjukkan branch 2 commit di depan `main`, 0 commit di belakang; dua file kode berubah.

## Risiko dan pekerjaan yang masih wajib

1. **SSRF ke tujuan private melalui base URL belum ditutup.** Base URL masih dapat menunjuk hostname/IP yang diarahkan ke loopback, private, link-local, atau metadata endpoint. Perlu validasi alamat IP literal dan hasil DNS resolution untuk seluruh alamat A/AAAA, dengan perlindungan terhadap DNS rebinding/re-resolution saat koneksi.
2. Uji provider BSrE nyata/staging belum dilakukan.
3. Perlu review apakah semua variasi respons provider memakai URL relatif/satu origin; perilaku lintas-origin kini sengaja ditolak.
4. Perlu verifikasi perilaku TLS pada runtime Node.js yang digunakan deployment. Implementasi native fetch mempertahankan verifikasi sertifikat default; opsi `ssl` tidak digunakan untuk melemahkannya.

## Langkah berikutnya

Lanjutkan hardening validasi host/IP dan DNS di lingkungan lokal, tambahkan test untuk IPv4/IPv6 private, loopback, link-local, metadata, serta DNS multi-record, lalu jalankan typecheck/lint/format/unit test. Jangan merge atau deploy sebelum seluruh risiko SSRF ditutup dan hasil test diverifikasi.
