# Perbaikan instruksi `X-Forwarded-Host` pada dokumen deployment

- **Task:** menyelaraskan instruksi header host di dokumentasi deployment dengan perilaku kode (temuan F-01 audit `DOCS-audit-host-2026-11-18.md`).
- **Tanggal:** 18 November 2026
- **Branch:** `docs/xfh-resolution-instructions`
- **Base commit:** `c97c489` (`main` setelah PR #130)
- **Jenis pekerjaan:** dokumentasi — **tidak ada perubahan kode**
- **Status:** siap review

## 1. Kondisi awal

Tiga dokumen deployment menyatakan resolver tenant membaca `X-Forwarded-Host` lebih dulu daripada `Host`, lalu mewajibkan proxy menimpa header tersebut. Kode sebenarnya:

- `src/features/desa/application/resolve-village.ts:38-40` hanya memakai header `Host`; `X-Forwarded-Host` sengaja diabaikan karena dapat dipalsukan (remediasi AUD-029).
- `src/app/api/webhooks/email/route.ts:97` juga mengabaikan `X-Forwarded-Host`; diuji di `route.test.ts:130`.
- `src/lib/request-origin.ts:13` **masih** memakai `x-forwarded-host ?? host` untuk URL absolut, dipakai `src/features/surat/application/surat-use-cases.ts:673, 905` saat menyusun tautan verifikasi surat.
- `TRUST_PROXY` hanya memengaruhi identitas IP klien (`src/lib/client-ip.ts:28`).

Dampak dokumentasi lama: operator diarahkan mengutamakan penulisan ulang `X-Forwarded-Host` dan bisa membiarkan `Host` berubah menjadi hostname upstream — justru penyebab tenant salah.

## 2. File yang diubah

| File | Perubahan |
|---|---|
| `docs/deployment/ENVIRONMENT.md` | Bagian `TRUST_PROXY`: flag hanya untuk IP klien; tenant hanya dari `Host`; proxy wajib mempertahankan `Host`; ditambah pengecualian `getRequestOrigin()`. Bagian `EMAIL_WEBHOOK_TOKEN`: tenant dari `Host`, header forwarded tidak memilih tenant tetapi tetap ditimpa untuk signature. |
| `docs/deployment/README.md` | Karakteristik sistem: tenant dari `Host` saja. Blok `TRUST_PROXY`: hanya `X-Forwarded-For`/`X-Real-IP`. Konfigurasi nginx: komentar `Host` vs `X-Forwarded-Host` dipisah. Persyaratan keamanan: `Host` wajib asli, header forwarded hanya untuk URL absolut. Tabel troubleshooting: pemeriksaan memakai `Host`. |
| `docs/deployment/OPERATIONS.md` | Checklist diagnosis domain: proxy mempertahankan `Host`. Prosedur "Tenant/domain salah": periksa `Host` yang diterima aplikasi. |

Tidak ada perubahan pada kode, konfigurasi runtime, atau `.env.example` (di sana pernyataan "X-Forwarded-Host tidak digunakan untuk memilih desa" sudah benar).

## 3. Ringkasan instruksi baru

- **Pemilihan tenant:** hanya header `Host`. Proxy wajib mengisi `Host` dengan host asli permintaan, bukan meneruskan nilai klien, dan tidak boleh menggantinya menjadi hostname upstream.
- **`TRUST_PROXY`:** hanya memengaruhi `X-Forwarded-For`/`X-Real-IP` untuk audit dan rate limit; tidak memengaruhi tenant.
- **`X-Forwarded-Host`:** tetap harus ditimpa proxy karena `getRequestOrigin()` memakainya (setelah `Host`) untuk URL absolut seperti tautan verifikasi surat; nilainya bukan penentu tenant.
- **Webhook email:** tenant dan signature memakai `Host`; header forwarded tidak memilih tenant.

## 4. Validasi

| Perintah | Hasil |
|---|---|
| `grep -rn "X-Forwarded-Host" docs/deployment/*.md` | 9 kecocokan, semuanya konsisten dengan kode (tidak ada lagi klaim "membaca lebih dulu") |
| `npx prettier --write` + `--check` pada tiga berkas | PASS (prettier dijalankan saat penulisan; lihat PR untuk diff) |
| `git diff --stat` | `ENVIRONMENT.md` +15/−5, `README.md` +21/−12, `OPERATIONS.md` +4/−2 |

Tidak ada pemeriksaan runtime yang dijalankan karena hanya teks dokumentasi yang berubah.

## 5. Risiko dan hal yang belum diperbaiki

- Temuan **F-02** (klaim 404 vs 500 untuk host tidak dikenal) dan **F-04** (fallback satu desa belum opt-in) tetap terbuka; keduanya memerlukan perubahan kode dan keputusan, bukan dokumentasi.
- Temuan **F-07** (`getRequestOrigin()` memakai `X-Forwarded-Host`) kini **didokumentasikan sebagai pengecualian**, bukan diperbaiki. Keputusan apakah tautan verifikasi surat harus memakai `Host` saja masih terbuka.
- Dokumen `docs/deployment/STAGING.md` menyebut "menimpa header forwarded" secara umum; tidak diubah karena tidak menyatakan bahwa resolver membaca `X-Forwarded-Host`.
- Dokumen arsitektur (`§3`, `§9`) sudah benar dalam hal ini karena melarang penggunaan `X-Forwarded-Host`; tidak ada perubahan di sana.

## 6. Kesimpulan

Instruksi deployment sekarang sesuai perilaku kode: tenant ditentukan `Host`, proxy wajib mempertahankan header itu, dan `X-Forwarded-Host` hanya berperan untuk URL absolut pada satu jalur yang secara eksplisit didokumentasikan. Operator tidak lagi diarahkan ke konfigurasi yang dapat membuat tenant salah.
