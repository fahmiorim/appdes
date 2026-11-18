# Host platform terpisah dari domain induk desa

- **Task:** `flexidesa.test/` menampilkan beranda desa pertama; seharusnya landing page platform.
- **Tanggal:** 18 November 2026
- **Branch:** `task/platform-host-landing`
- **Base commit:** `3edaee8` (`main` setelah PR #129)
- **Commit kode:** `df7de18`
- **Pull request:** https://github.com/fahmiorim/appdes/pull/130
- **Status:** siap review

## 1. Kondisi awal

Membuka `http://flexidesa.test:3000/` menampilkan beranda Desa Kwala Gunung, bukan landing page platform, baik saat login sebagai Super Admin maupun tanpa sesi.

Bukti awal (tanpa cookie sesi):

```
curl -H "Host: flexidesa.test" http://127.0.0.1:3000/
→ status 200, tanpa redirect, <title>Sistem Informasi Desa … (beranda desa)
```

Isi database dev saat itu hanya satu desa: `id=1`, `slug=kwala-gunung`, domain `kwalagunung.flexides.test`, dengan satu baris `village_domains` yang sama.

## 2. Analisis

1. `/` selalu merender beranda desa: `src/app/page.tsx` memanggil `getIdentitasFromRequest()` tepat setelah guard.
2. `flexidesa.test` bukan domain desa mana pun, sehingga pencocokan domain persis dan wildcard `*.flexidesa.test` (label kosong) tidak menghasilkan tenant.
3. Resolusi lalu jatuh ke fallback satu-desa di `src/features/desa/domain/tenant.ts`:
   `return peta.jumlahDesa === 1 ? peta.desaPertamaId : null;`
   Karena instalasi berisi satu desa, **host apa pun** — apex, `127.0.0.1`, host asing — memakai desa itu.
4. Tidak ada route landing page platform. Riwayat repo tidak pernah memuat berkas landing (`git log --all --name-only | grep -i landing` kosong); yang tampil di apex adalah beranda desa.
5. Proxy hanya mengurus cookie sesi (`src/proxy.ts`), tidak mengklasifikasi host.

Konsekuensi lain: pada instalasi multi-desa, apex berubah menjadi 404 karena fallback tidak berlaku — tetap bukan landing page.

### Koreksi rancangan

Rancangan awal menyamakan "host platform" dengan `DESA_BASE_DOMAIN`. Itu hanya benar di dev, karena model host yang dituju adalah:

| Konsep | Dev | Produksi | Peran |
|---|---|---|---|
| Host platform | `flexidesa.test` | `flexidesa.id` | Landing page produk |
| Domain induk desa | `flexidesa.test` | `desa.id` | Wildcard `<slug>.<base>` |
| Domain eksplisit | `kwalagunung.flexides.test` | mis. `kwalagunung.desa.id` | `village_domains` |

Jika host platform diturunkan dari `DESA_BASE_DOMAIN`, apex `desa.id` akan salah dianggap landing. Karena itu host platform dipisah ke konfigurasi sendiri.

## 3. Perubahan

| File | Alasan |
|---|---|
| `src/lib/env.ts` | Variabel baru `PLATFORM_HOSTS` (opsional, dipisah koma). |
| `src/features/desa/domain/host.ts` | `normalisasiDaftarHost()` dan `adalahHostPlatform()`: klasifikasi murni, mengenali alias `www`, menolak host yang hanya berakhiran teks host platform. |
| `src/features/desa/domain/host.test.ts` | Test normalisasi daftar, alias `www`, subdomain desa, host penyerupai, dan skenario produksi (`flexidesa.id` vs `kwalagunung.desa.id`). |
| `src/features/desa/application/platform-host.ts` | Sumber tunggal daftar host platform: `PLATFORM_HOSTS`, fallback host `APP_URL`. |
| `src/app/page.tsx` | Host platform → landing; host desa → beranda desa seperti sebelumnya. |
| `src/app/platform-landing.tsx`, `src/app/platform-landing.module.css` | Landing page platform: hero, tiga pilar, daftar fitur, akses per peran, CTA ke konsol dan halaman masuk. |
| `src/features/desa/application/resolve-village.ts` | Host platform ditolak lewat `notFound()` Next, sehingga jalur tenant di domain platform menghasilkan 404, bukan data desa tertentu. |
| `.env.example`, `docs/deployment/ENVIRONMENT.md` | Dokumentasi `PLATFORM_HOSTS` beserta contoh dev/produksi dan penegasan bahwa nilainya terpisah dari `DESA_BASE_DOMAIN`. |

Tidak ada perubahan schema, migration, Server Action, atau data.

## 4. Perilaku sekarang

| Permintaan (dev) | Hasil |
|---|---|
| `flexidesa.test/` | landing page platform |
| `flexidesa.test/berita` | 404 (host platform tanpa konteks desa) |
| `flexidesa.test/masuk` | 200 (login tetap bisa dibuka dari landing) |
| `kwala-gunung.flexidesa.test/` | beranda Desa Kwala Gunung |
| `kwala-gunung.flexidesa.test/berita` | 200, berita desa |
| `127.0.0.1:3000/` | beranda desa (fallback satu-desa untuk dev tetap berlaku) |

Konfigurasi produksi yang dituju:

```
APP_URL=https://flexidesa.id
PLATFORM_HOSTS=flexidesa.id
DESA_BASE_DOMAIN=desa.id
# domain desa: kwalagunung.desa.id (wildcard atau baris village_domains)
```

## 5. Security dan tenant

- Host platform **tidak pernah** dipetakan ke tenant, termasuk pada instalasi satu desa, sehingga domain produk tidak lagi membocorkan beranda desa tertentu.
- Pencocokan bersifat exact setelah normalisasi; `flexidesa.id.evil.example` tidak dianggap host platform.
- Alias `www` hanya mengikuti host dasarnya, bukan host lain.
- Resolusi tenant tetap hanya memakai header `Host` (bukan `X-Forwarded-Host`) sesuai aturan yang sudah ada; perubahan ini tidak menambah jalur baru.
- Tidak ada data desa yang dikirim ke landing page: halaman bersifat statis, tanpa query database.
- Daftar host platform berasal dari environment, bukan dari input pengguna.

## 6. Validasi

| Perintah | Hasil |
|---|---|
| `node node_modules/vitest/vitest.mjs run --config vitest.config.mts src/features/desa/domain/host.test.ts` (sebelum implementasi) | FAIL — `adalahHostPlatform is not a function` (RED terverifikasi) |
| `node node_modules/vitest/vitest.mjs run --config vitest.config.mts src/features/desa/domain/host.test.ts src/features/desa/domain/tenant.test.ts` | PASS — 13 + 13 test |
| `npx tsc --noEmit` | PASS |
| `npx eslint` (berkas yang diubah) | PASS |
| `npm run check` | PASS — 219 file, 1915 test |
| Verifikasi HTTP ke dev server (port 3000, header `Host`) | PASS, sesuai tabel bagian 4 |

Verifikasi HTTP memakai dev server milik pengguna yang sedang berjalan; tidak ada penulisan data.

## 7. Risiko dan hal yang belum diverifikasi

- Landing page saat ini **belum mengikuti mockup** `docs/landing page/FlexiDesa.id Modern Village Dashboard.png` (hero dengan tangkapan layar produk, empat statistik, delapan fitur unggulan, CTA bergambar). Mockup memuat aset gambar dan klaim angka yang belum ada di repo (mis. "100+ desa", "99,9% uptime", halaman Harga/Demo/Dokumentasi), sehingga penerapannya perlu keputusan produk dan aset.
- Jika `PLATFORM_HOSTS` kosong, host platform mengikuti `APP_URL`. Deployment yang mengubah `APP_URL` ke localhost tanpa mengisi `PLATFORM_HOSTS` akan kehilangan landing di domain publik.
- Jalur API publik (media, statistik) pada host platform belum diuji; route tersebut memakai resolver tenant yang sama sehingga berperilaku 404, tetapi belum diverifikasi per endpoint.
- `AppError` dari `resolveVillageByHost` untuk host tak dikenal pada instalasi multi-desa masih dipetakan sebagai 500 karena repo belum punya `error.tsx`/`not-found.tsx`; hanya cabang host platform yang memakai `notFound()` Next. Ini masalah lama, bukan regresi dari perubahan ini.
- Tampilan landing belum diperiksa di perangkat nyata; verifikasi visual hanya struktur HTML melalui HTTP.

## 8. Kesimpulan

Domain platform dan domain desa kini terpisah secara eksplisit. Apex menampilkan landing page produk, host desa tetap menampilkan beranda desa, dan fallback satu-desa tidak lagi bisa menjadikan domain platform sebagai tenant. Konfigurasi produksi (`flexidesa.id` + `desa.id`) sudah didukung tanpa mengubah aturan wildcard desa.

Langkah berikutnya: memutuskan apakah landing diterapkan mengikuti mockup (butuh aset gambar dan keputusan atas klaim statistik), lalu menambahkan test tingkat halaman untuk cabang host.
