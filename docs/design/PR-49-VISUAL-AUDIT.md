# Audit Visual & Kesesuaian Referensi — PR #49

Tanggal audit: 15 November 2026  
PR: [#49 — feat(public): build village public information pages](https://github.com/fahmiorim/appdes/pull/49)  
Head saat audit awal: `d33e61909cb6be52738b0bbeda683cd606ad08cd`

## Kesimpulan

PR ini **belum boleh dinyatakan selesai secara visual**. Implementasi route dan pemanggilan data sudah ada, tetapi bukti browser yang tersedia belum menguji halaman-halaman publik yang ditambahkan. CI Visual QA saat ini hanya membuka dan mengambil screenshot `/masuk` pada desktop dan mobile.

Screenshot referensi di `docs/public/` dan matriks `SCREENSHOT-IMPLEMENTATION-MATRIX.md` tetap menjadi sumber kebenaran. Status `implemented` tidak sama dengan `visually reviewed` atau `accepted`.

## Temuan

### 1. Ketidaksesuaian route dengan matriks desain

Matriks desain menetapkan route:
- Sejarah: `/profil/sejarah`, sedangkan implementasi awal tersedia di `/sejarah`.
- Visi & misi: `/profil/visi-misi`, sedangkan implementasi awal tersedia di `/visi-misi`.
- Statistik: `/data/statistik`, sedangkan implementasi awal tersedia di `/statistik`.

Tindak lanjut pada PR ini: menambahkan route canonical yang sesuai matriks, sambil mempertahankan route awal sebagai alias kompatibilitas.

### 2. Bukti visual belum mencakup halaman publik

Workflow `.github/workflows/ci.yml` hanya menangkap:
- `/masuk` pada viewport 1440×1000.
- `/masuk` pada viewport 390×844.

Artifact `flexidesa-login-visual-qa` berisi bukti login dan referensi login. Ini tidak membuktikan tampilan agenda, galeri, statistik, pemerintahan, wilayah, dokumen, APBDes, layanan, kontak, dan halaman publik lain.

### 3. Konsistensi shell perlu diperiksa

Beberapa halaman memakai stylesheet khusus (misalnya Agenda, Wilayah, Galeri, Pemerintahan, Statistik), sementara halaman lain memakai `informasi-publik.module.css`. Header, isi navigasi, logo/mark, breadcrumb, dan footer ditulis berulang di banyak page. Ini berisiko menimbulkan perbedaan visual dan perilaku responsive antarhalaman.

Tindak lanjut: lakukan konsolidasi shell/komponen setelah perbandingan terhadap screenshot per halaman, bukan melakukan refactor buta yang justru menjauh dari referensi.

### 4. Format check gagal

Pada workflow run `43687099262`:
- Typecheck: lulus.
- Lint: lulus (7 warning `<img>` pada halaman login yang sudah ada).
- Integration test MySQL 8: lulus.
- Visual QA login desktop/mobile: lulus.
- Format check: gagal pada 21 file.
- Unit test: dilewati karena langkah format check gagal.

File yang dilaporkan Prettier tidak sesuai format tercantum pada log CI. Format check harus hijau sebelum PR siap merge.

## Cakupan referensi yang belum boleh diklaim selesai

Referensi yang ada tetapi belum dibuktikan visualnya antara lain:
- Profil perangkat desa/detail perangkat.
- Pengumuman.
- Informasi keuangan desa.
- Halaman informasi desa.
- Galeri/foto dengan perilaku grid/lightbox sesuai referensi.
- Form pengaduan pada desain kontak/pengaduan (belum dibuat karena belum ada endpoint publik penyimpanan yang aman).

Jangan menyatakan seluruh 21 screenshot publik sudah diimplementasikan hanya karena beberapa route terkait sudah tersedia.

## Gerbang penerimaan

PR hanya dapat dinyatakan siap review visual setelah:
1. Route canonical mengikuti matriks desain.
2. CI typecheck, lint, format, unit, dan integration test lulus.
3. Screenshot desktop dan mobile diambil untuk seluruh route yang ditambahkan, menggunakan fixture sintetis tenant yang konsisten.
4. Setiap screenshot dibandingkan dengan referensi yang cocok; catat perbedaan layout, tipografi, warna, grid, gambar, dan responsive behavior.
5. Temuan visual diperbaiki dan bukti screenshot terbaru dilampirkan.
6. Status tiap halaman dicatat sebagai `implemented`, `visually reviewed`, atau `accepted` secara jujur.

**Keputusan saat audit:** PR tetap terbuka dan belum di-merge. Visual acceptance masih pending.


## Perbaikan lanjutan setelah audit awal

- Menambahkan styling `.sectionHead` yang sebelumnya dipakai halaman `/layanan` tetapi belum didefinisikan di CSS module bersama.
- Mengubah navigasi pada breakpoint mobile di shell publik agar tidak hilang seluruhnya; navigasi kini tersedia sebagai baris horizontal yang dapat digulir. Perlu tetap dibandingkan dengan screenshot referensi untuk memastikan pola ini cocok.
- Memperbarui workflow CI ke Node.js 22.22.1 karena dependensi `lint-staged@17` mensyaratkan minimal Node 22.22.1; runner sebelumnya memakai 22.12.0.
- Ketiga route canonical ditambahkan dan tautan silang sejarah/visi-misi diperbarui.
- Perbaikan ini belum menggantikan screenshot comparison. Status visual semua halaman tetap pending sampai bukti desktop/mobile per halaman tersedia.
