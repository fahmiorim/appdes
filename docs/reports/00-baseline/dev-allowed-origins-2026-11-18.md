# Tombol konsol tidak bisa diklik di host `flexidesa.test` (hidrasi klien mati)

- **Task:** perbaikan lingkungan dev — komponen klien tidak ter-hydrate saat aplikasi dibuka lewat host `DESA_BASE_DOMAIN`.
- **Tanggal:** 18 November 2026.
- **Branch:** `task/dev-allowed-origins`.
- **Base commit:** `12028cca1b62d03e623b6a63d31517576d7eb14a` (`main`).

## 1. Gejala

Di konsol Super Admin, tombol **Daftarkan desa** (dialog pendaftaran tenant) tidak bereaksi saat diklik. Halaman tampil normal karena dirender server, tetapi tidak ada handler yang berjalan.

## 2. Diagnosis

Reproduksi memakai Chrome headless + CDP pada aplikasi yang berjalan.

1. Halaman tenant tidak dapat dipakai untuk pengujian langsung (butuh sesi). Karena itu dibuat halaman probe sementara tanpa auth yang merender `DialogDaftarDesa` di dalam `PlatformCard`, lalu diuji dengan klik mouse sungguhan (`Input.dispatchMouseEvent`).
2. Pada `http://127.0.0.1:3000` setelah server dev di-restart: tombol ter-hydrate dan `dialog.open` menjadi `true` — komponen dialog sendiri benar.
3. Pada host yang dipakai `.env` (`DESA_BASE_DOMAIN=flexidesa.test`), `http://flexidesa.test:3000`: tombol tidak pernah ter-hydrate (dicek sampai 20 detik) dan klik tidak membuka dialog. Halaman `/masuk` juga tidak responsif (tombol “Lihat” tidak mengganti tipe input).
4. Log dev server: `Blocked cross-origin request to Next.js dev resource /_next/hmr from "flexidesa.test"`. Next.js 16 menolak aset dev dari origin selain origin server, sehingga boot klien tidak berjalan dan React tidak pernah hydrate.

Kesimpulan: bukan bug pada komponen dialog atau CSS, melainkan konfigurasi dev. Semua tombol/form klien mati bila aplikasi dibuka lewat `*.flexidesa.test` (atau host `DESA_BASE_DOMAIN` lain) saat `next dev`.

## 3. Perubahan

| File | Alasan |
|---|---|
| `next.config.ts` | Menambahkan `allowedDevOrigins` dari `DESA_BASE_DOMAIN` (domain induk dan wildcard `*.<domain>`) agar host tenant boleh mengambil aset dev. Hanya berlaku pada `next dev`; build/start produksi tidak berubah. |

Tidak ada perubahan komponen, CSS, schema, migration, atau dependency.

## 4. Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| Sebelum perbaikan, `flexidesa.test:3000` — penanda hidrasi React | FAIL — tidak ada `__reactProps` pada node mana pun; klik tombol tidak membuka dialog |
| Sebelum perbaikan, `127.0.0.1:3000` (setelah server dev di-restart) — klik mouse pada tombol dialog | PASS — `dialog.open = true` |
| Sesudah perbaikan, `flexidesa.test:3000/masuk` — tombol “Lihat” mengganti tipe input | PASS — `password` → `text` |
| Sesudah perbaikan, log dev server | PASS — 0 peringatan “Blocked cross-origin”; React DOM boot tercatat di log browser |
| `npm run check` | PASS — typecheck, lint, format, 215 file / 1887 test |

Catatan: halaman probe dan skrip CDP hanya alat bantu sementara dan sudah dihapus; tidak ada berkas debug yang ikut di commit. Server dev yang berjalan dihentikan lalu dijalankan ulang agar konfigurasi baru dipakai.

## 5. Risiko dan batasan

- `allowedDevOrigins` memperluas origin yang boleh memuat aset dev **hanya saat `next dev`**; nilai wildcard mengikuti domain induk, jadi host lain di luar domain itu tetap ditolak.
- Bila `DESA_BASE_DOMAIN` kosong, daftar ini kosong dan perilaku kembali ke bawaan Next (hanya origin server).
- Perbaikan tidak diverifikasi pada halaman tenant yang butuh sesi; yang dibuktikan adalah hidrasi klien pada host tersebut (tombol login) dan bahwa komponen dialog berfungsi saat hidrasi berjalan.
- Gejala pada sesi sebelumnya juga dipengaruhi server dev yang sudah lama berjalan sambil berganti branch; restart tetap diperlukan setelah mengubah `next.config.ts`.

## 6. Kesimpulan

Tombol konsol mati karena React tidak pernah hydrate di host `flexidesa.test`. Dengan `allowedDevOrigins`, hidrasi berjalan dan dialog pendaftaran desa terbuka normal. Menunggu review maintainer; tidak ada merge atau deploy.
