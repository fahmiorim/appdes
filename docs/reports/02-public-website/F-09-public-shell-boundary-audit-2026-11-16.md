# F-09 — Audit Batas Shell Website Publik

- **Task:** F-09 — petakan duplikasi shell publik dan tentukan batas implementasi yang aman.
- **Tanggal:** 2026-11-16.
- **Branch:** `docs/audit-public-shell-boundary`.
- **Base commit:** `36163c952f55e409463350b8b062f7d7aa177eb1` (`origin/main` saat branch dibuat).
- **Commit hasil:** lihat commit laporan pada branch ini; perubahan hanya dokumentasi.
- **Mode:** audit statis read-only; tidak mengubah source, schema, konfigurasi, atau database.

## Tujuan dan kondisi awal

F-09 pada laporan audit website publik menyebut header, footer, hero, breadcrumb, dan tombol masuk disalin antarhalaman. Pemeriksaan lanjutan menunjukkan duplikasi memang luas, tetapi seluruh halaman tidak memakai satu desain shell yang seragam. Karena itu, ekstraksi satu layout global berisiko mengubah navigasi, identitas, maupun tampilan halaman yang saat ini berbeda.

## File yang diperiksa

- Acuan: `docs/TECHNICAL_AUDIT.md`, `docs/SID_FEATURE_MAP.md`, `docs/MASTER_ROADMAP.md`.
- Inventaris route: `src/app/**/page.tsx`, `src/app/layout.tsx`, dan route publik yang ditemukan melalui pencarian markup.
- Perwakilan implementasi: `src/app/page.tsx`, `agenda/page.tsx`, `profil/page.tsx`, `berita/page.tsx`, `berita/[slug]/page.tsx`, `pengumuman/page.tsx`, `wilayah/page.tsx`, `galeri/page.tsx`, `galeri/[slug]/page.tsx`, `kontak/page.tsx`, `layanan/page.tsx`, `sejarah/page.tsx`, `visi-misi/page.tsx`, `dokumen/page.tsx`, `potensi/page.tsx`, serta CSS modul terkait.
- `src/app/(auth)/masuk/page.tsx` diperiksa untuk membedakan halaman autentikasi dari situs publik.

## Temuan

1. **Ada satu kelompok reuse CSS yang nyata:** sembilan route mengimpor `src/app/informasi-publik.module.css` untuk shell dan konten. Header berbagi struktur dasar; footer umumnya berupa nama desa dan copyright FlexiDesa. Modul CSS ini juga memiliki aturan konten yang dipakai route tersebut, jadi memindahkan seluruh stylesheet ke komponen shell akan mencampur batas layout dengan styling isi halaman.
2. **Kelompok F-09 yang disebut dalam audit tidak identik secara visual maupun kontrak:** `/agenda`, `/wilayah`, `/potensi`, `/galeri`, dan `/pengumuman` berbeda pada topline (ada/tidak), logo/mark dan subjudul brand, tautan navigasi, cara menandai halaman aktif, serta footer. `/galeri` dan `/galeri/[slug]` paling dekat: keduanya memakai header/footer yang sama dan `galeri.module.css` yang sama.
3. **Perbedaan meluas di luar lima route awal:** `/`, `/profil`, arsip/detail berita, statistik, pemerintahan, layanan, dokumen, dan route publik lain memiliki varian header/footer tambahan. Footer beranda dan agenda lebih kaya (kolom kontak/tautan), sedangkan beberapa footer lain hanya satu baris. Tidak semua footer layak dipaksa menjadi satu komposisi.
4. **Hero dan breadcrumb bersifat konten halaman.** Label, urutan breadcrumb, isi, dan komposisinya berubah menurut route; bukti yang diperiksa tidak mendukung pemindahan bagian tersebut ke shell bersama.
5. **`src/app/layout.tsx` hanya menyediakan `<html>`/`<body>`.** Belum ada route-group layout khusus untuk situs publik. `/masuk` adalah halaman autentikasi dengan desain dan navigasi tersendiri, bukan kandidat untuk shell desa.

## Batas dan rekomendasi implementasi

- Jangan membuat satu layout publik global yang merender semua header/footer, dan jangan menggabungkan hero/breadcrumb pada task ini.
- Jika F-09 dilanjutkan, mulai dengan komponen presentasional header/footer yang menerima data desa dan elemen navigasi aktif dari halaman pemanggil. Komponen tidak menentukan sendiri menu global: isi serta urutan nav sekarang memang bervariasi. Pertahankan topline sebagai opsi hanya bila kontrak perlu mendukung route yang sudah memilikinya.
- Jadikan `/galeri` dan `/galeri/[slug]` pilot awal karena pasangan ini memiliki header/footer yang sama, share stylesheet, dan memberikan dua pemanggil untuk memvalidasi kontrak tanpa mengubah menu/brand halaman lain.
- Setelah pilot dan verifikasi tampilan, migrasikan kelompok lain bertahap. Untuk sembilan route yang memakai `informasi-publik.module.css`, pisahkan aturan header/footer dari aturan konten secara terarah; jangan memindahkan seluruh CSS module sekaligus.
- Jangan menyatukan perbedaan menu, label brand, topline, atau footer sebagai “polish” dalam refactor. Perubahan UX/navigasi memerlukan scope dan review terpisah.

## Validasi yang dijalankan

| Perintah / pemeriksaan | Hasil |
|---|---|
| Pencarian route dan markup `header`, `footer`, `nav`, serta pemakaian `informasi-publik.module.css` | **PASS** — variasi dan sembilan pemakai modul ditemukan; tidak ada source yang diubah. |
| Pembacaan implementasi route/CSS yang tercantum pada bagian file diperiksa | **PASS** — perbedaan struktural dirangkum di atas. |
| `git status --short --branch`, `git rev-parse`, `git merge-base` | **PASS** — working tree bersih saat mulai; branch berbasis `origin/main` `36163c9`. |
| Lint, typecheck, test, build, browser/visual QA | **SKIPPED** — audit statis tanpa perubahan kode; bukan bukti perilaku runtime. |

## File berubah

- Belum ada perubahan source. Laporan ini adalah satu-satunya file yang ditambahkan.

## Risiko dan batasan

Audit ini membuktikan keberadaan variasi dari source statis, bukan kesetaraan visual saat runtime. Tidak ada screenshot atau browser QA yang dijalankan. Sebelum mengubah CSS/layout, implementasi harus memverifikasi tampilan desktop dan mobile untuk route pilot; keputusan itu berada di task implementasi berikutnya.

## Kesimpulan

F-09 benar sebagai masalah duplikasi, tetapi batas yang aman adalah ekstraksi bertahap pada bagian presentasional yang kontraknya terbukti sama—bukan memaksa satu shell global. Rekomendasi langkah berikutnya adalah pilot header/footer pada pasangan route galeri, dengan menu dan hero tetap milik halaman, lalu review visual sebelum memperluas cakupan.
