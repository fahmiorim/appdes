# Halaman masuk — hilangkan 7 warning `@next/next/no-img-element`

- **Task:** memperbaiki 7 warning ESLint yang sudah lama ada di halaman masuk.
- **Tanggal:** 18 November 2026
- **Branch:** `task/fix-login-image-warnings-2026-11-18`
- **Base commit:** `da63c9c` (`main`)

## 1. Kondisi awal

`npm run lint` menghasilkan **0 error, 7 warning** — semuanya
`@next/next/no-img-element` pada `src/app/(auth)/masuk/page.tsx` (baris 29, 75,
95, 104, 113, 122, 135):

| Elemen | Berkas aset |
|---|---|
| Logo header (`.login-brand-symbol`) | `/images/flexidesa-mark.svg` |
| Ilustrasi kartu masuk (`.login-illustration`) | `/images/login-security.svg` |
| 4 ikon keunggulan (`.login-benefit-icon`) | `benefit-fast/secure/services/devices.svg` |
| Logo footer (`.login-brand-symbol`) | `/images/flexidesa-mark.svg` |

File ini tidak pernah diubah oleh rangkaian PR Fase 2: `git log main..HEAD --
"src/app/(auth)/masuk/page.tsx"` kosong, dan warning muncul juga saat file
sementara proyek di-lint (warning `no-console` dari berkas itu ikut terhitung).
Artinya warning memang bawaan `main`, bukan efek perubahan Fase 2.

## 2. Pendekatan

- Semua aset adalah **SVG lokal** di `public/images/`. Optimizer gambar Next
  tidak memproses SVG, sehingga setiap gambar memakai `unoptimized` agar tidak
  ada request `/_next/image` yang berakhir 400 dan agar perilaku pengiriman
  berkas tetap sama seperti sebelumnya.
- `width`/`height` diisi sesuai ukuran CSS (logo 42×42, ilustrasi 132×120, ikon
  30×30) supaya rasio aspek tetap terjaga; CSS tidak diubah sama sekali.
- Logo header diberi `priority` agar tetap dimuat eager seperti `<img>` lama
  (bukan `loading="lazy"`), karena berada di atas lipatan. Logo footer dan ikon
  keunggulan tetap lazy seperti perilaku bawaan `next/image`.
- Tidak ada perubahan tata letak, kelas CSS, teks, atau aset.

## 3. File berubah

| File | Alasan |
|---|---|
| `src/app/(auth)/masuk/page.tsx` | Tujuh `<img>` diganti `<Image>` dari `next/image` dengan `width`/`height`/`unoptimized` (+`priority` pada logo header) |
| `docs/reports/02-public-website/LOGIN-IMAGE-WARNING-2026-11-18.md` | Laporan task |

## 4. Security dan tenant

Tidak ada perubahan autentikasi, sesi, otorisasi, maupun query. Tidak ada aset
baru, tidak ada `dangerouslyAllowSVG`, dan tidak ada konfigurasi `next.config`
yang dilonggarkan.

## 5. Validasi

| Perintah | Hasil |
|---|---|
| `npx eslint "src/app/(auth)/masuk/page.tsx"` | PASS — 0 warning |
| `npx eslint .` | PASS — 0 error, **0 warning** (sebelumnya 7) |
| `npm run check` (typegen, tsc, eslint, prettier, unit test) | PASS — 203 file, 1789 test |
| `npm run build` | PASS |
| Runtime: `GET /masuk` pada build produksi | 200, 7 `<img>`, **0** URL `/_next/image` |
| Runtime: seluruh aset `/images/*.svg` | 200 |

Bukti markup hasil render (logo header, eager):

```html
<img alt="" width="42" height="42" decoding="async" data-nimg="1"
     class="login-brand-symbol" style="color:transparent"
     src="/images/flexidesa-mark.svg"/>
```

dan ikon keunggulan tetap lazy:

```html
<img alt="" loading="lazy" width="30" height="30" decoding="async" data-nimg="1"
     style="color:transparent" src="/images/benefit-fast.svg"/>
```

Jumlah test pada `main` (203 file/1789 test) berbeda dari branch Fase 2 karena
test Fase 2 belum ada di `main`; angka ini yang benar untuk branch ini.

## 6. Risiko dan batasan

- Tidak ada test otomatis/browser untuk halaman masuk; kesetaraan visual
  diverifikasi lewat markup render (ukuran dan aset sama, CSS tidak berubah),
  bukan screenshot.
- `unoptimized` dipakai untuk semua gambar karena semuanya SVG; bila kelak ada
  gambar raster di halaman ini, `unoptimized` sebaiknya dilepas agar optimizer
  bekerja.
- Pemeriksaan runtime memakai build lokal di port sementara dengan `desa_dev`
  yang sudah dimigrasi; tidak ada data yang diubah.

## 7. Kesimpulan

Tujuh warning lama di halaman masuk hilang tanpa mengubah tampilan atau
perilaku pemuatan aset. Repository kini `eslint .` tanpa warning sama sekali.
