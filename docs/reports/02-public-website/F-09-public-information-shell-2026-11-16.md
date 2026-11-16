# F-09 — Shell Header/Footer untuk Sembilan Route `informasi-publik`

- **Task:** F-09 lanjutan — perluas komponen header/footer bersama ke seluruh route yang memakai `informasi-publik.module.css`, tanpa mengubah UX navigasi.
- **Tanggal:** 2026-11-16.
- **Branch:** `refactor/public-information-shell`.
- **Base commit:** `36163c952f55e409463350b8b062f7d7aa177eb1` (`origin/main`).
- **Commit implementasi:** `9e772981ea946d6a6169bc38101ea6bc3d4d8ac1`.
- **Status:** di-merge ke `main` melalui PR #65 (`6c662de58be07b7a6486ad6da9cc888f11f877db`, 15 November 2026); tidak ada deploy.

## Kondisi awal dan analisis

Audit F-09 menemukan sembilan route mengimpor `src/app/informasi-publik.module.css`, dan header/footer ditulis ulang di setiap route. Audit juga mencatat variasi yang tidak boleh diseragamkan: menu berbeda per halaman, label brand berbeda, dan empat halaman tidak merender brand mark.

Pendekatan yang dipilih mengikuti rekomendasi audit: komponen presentasional menerima nama desa, label brand, daftar navigasi, dan opsi brand mark dari halaman pemanggil. Komponen tidak menentukan menu global. Stylesheet tidak diubah dan tidak dipindahkan, sehingga kelas CSS yang dipakai tetap sama persis dengan sebelumnya.

Pilot `/galeri` dan `/galeri/[slug]` berada pada branch/PR terpisah (`refactor/public-gallery-shell`, PR #64) karena memakai `galeri.module.css` dan kontrak nav yang berbeda. Task ini tidak bergantung pada kode pilot tersebut.

## File yang diperiksa

- `docs/reports/02-public-website/F-09-public-shell-boundary-audit-2026-11-16.md` pada branch audit.
- `docs/TECHNICAL_AUDIT.md`, `docs/SID_FEATURE_MAP.md`, `docs/MASTER_ROADMAP.md`.
- Kesembilan route pemakai `informasi-publik.module.css` dan `src/app/informasi-publik.module.css`.
- `src/app/galeri/gallery-shell.tsx` sebagai pola pilot, `src/app/layout.tsx`, `src/components/shell/*`.

## File yang diubah

- `src/app/public-shell.tsx` — komponen shell publik presentasional baru untuk `<main>`, header/nav/login, dan footer.
- `src/app/public-shell.test.ts` — server render test kontrak shell (dua kasus).
- `src/app/kontak/page.tsx`, `visi-misi/page.tsx`, `dokumen/page.tsx`, `sejarah/page.tsx`, `pengaduan/page.tsx`, `potensi/page.tsx`, `layanan/page.tsx`, `layanan/surat/page.tsx`, `transparansi/apbdes/page.tsx` — memakai `PublicShell`.
- Laporan task ini.

## Perubahan

Markup header/footer dipindahkan tanpa mengubah copy, urutan tautan, brand mark, atau kelas CSS. Hero, breadcrumb, dan seluruh konten halaman tetap berada di route masing-masing. `informasi-publik.module.css` tidak disentuh.

Navigasi yang dipertahankan persis:

| Route | Label brand | Mark | Menu |
|---|---|---|---|
| `/kontak` | Kontak & Informasi | ya | Beranda, Profil Desa, Berita, Agenda |
| `/visi-misi` | Visi & Misi Desa | ya | Beranda, Profil Desa, Sejarah, Berita |
| `/dokumen` | Dokumen & Informasi Publik | ya | Beranda, Profil Desa, Berita, Kontak |
| `/transparansi/apbdes` | Transparansi Anggaran | tidak | Beranda, Profil Desa, Dokumen, Kontak |
| `/sejarah` | Sejarah Desa | ya | Beranda, Profil Desa, Visi & Misi, Berita |
| `/potensi` | Potensi Desa | tidak | Beranda, Profil Desa, Wilayah, Kontak |
| `/layanan` | Portal Layanan Warga | tidak | Beranda, Profil Desa, Berita, Kontak |
| `/layanan/surat` | Katalog Layanan Surat | tidak | Beranda, Semua layanan, Kontak |
| `/pengaduan` | Pengaduan Masyarakat | ya | Beranda, Profil Desa, Berita, Kontak |

## Security/tenant

Tidak ada perubahan akses data, autentikasi, atau otorisasi. Setiap route tetap memanggil `getIdentitasFromRequest()` dan meneruskan `desa.namaDesa` hasil resolusi server-side sebagai konten tampilan. Tidak ada `villageId` dari klien, query baru, atau perubahan pada data yang diambil.

## Validasi

| Perintah | Hasil |
|---|---|
| `npx vitest run --config vitest.config.mts src/app/public-shell.test.ts` | **PASS** — 2 test. Run pertama **FAIL** sesuai harapan karena `./public-shell` belum ada. |
| `npm run test:unit` | **PASS** — 196 file, 1.753 test lulus. |
| `npm run typecheck` | **PASS** — `next typegen` dan `tsc --noEmit` selesai. |
| `npx eslint` pada 11 file yang berubah | **PASS** — tanpa error/warning. |
| `npx prettier --check` pada 11 file yang berubah | **PASS** — dua file dirapikan sekali, lalu seluruhnya lulus. |
| `git diff --check` | **PASS** — whitespace bersih. |
| Integration test MySQL, build produksi, browser/screenshot QA | **SKIPPED** — refactor presentasional tanpa perubahan query/CSS; CI PR akan menjalankan integration test. Tidak ada klaim kesetaraan visual runtime. |

## Diff

11 file: 233 baris ditambah, 256 dihapus. Sembilan halaman kehilangan 252 baris markup duplikat dan menggantinya dengan 111 baris pemanggilan komponen; komponen dan test menambah 122 baris.

## Risiko tersisa

Kesetaraan tampilan belum diverifikasi lewat browser/screenshot; validasi saat ini adalah test render server dan diff yang menjaga kelas CSS serta copy. Aturan header/footer masih berbagi file dengan aturan konten di `informasi-publik.module.css`; pemisahan stylesheet terarah belum dilakukan agar tidak menimbulkan perubahan visual. Shell ini belum dipakai oleh route yang punya header/topline/footer berbeda (`/`, `/profil`, `/agenda`, `/berita`, `/pengumuman`, `/wilayah`, dan lainnya).

## Kesimpulan dan langkah berikutnya

Sembilan route pemakai `informasi-publik.module.css` kini berbagi satu shell tanpa perubahan navigasi, label brand, brand mark, atau CSS. Pekerjaan ini di-merge ke `main` melalui PR #65; verifikasi visual desktop/mobile belum dilakukan. Langkah berikutnya yang terpisah: verifikasi visual desktop/mobile, lalu evaluasi pemisahan aturan shell dari aturan konten di stylesheet tersebut.
