# Audit & Validasi 7 Pull Request Website Publik — 15 November 2026

- **Task:** audit menyeluruh PR #50–#56 (`fahmiorim/appdes`) — kode, fungsional, visual, keamanan multi-tenant, dan CI.
- **Tanggal:** 15 November 2026.
- **Branch kerja:** `task/public-prs-50-56-audit` (dibuat dari `origin/feat/public-announcements-page`).
- **Base commit seluruh PR:** `7b09691c853a968ffddd8eb3a715f9443a1c3683` (`origin/main`).
- **Commit perbaikan format PR #56:** `3020138`.
- **Status:** selesai untuk audit; 1 perbaikan aman diterapkan; tidak ada merge, deploy, atau perubahan pada `main`.

---

## A. Ringkasan

| Indikator | Jumlah |
|---|---|
| PR diperiksa | 7 |
| CI hijau pada head terbaru | 5 (#51, #52, #53, #54, #55) |
| CI gagal pada head terbaru | 2 (#50, #56) |
| PR dengan temuan yang perlu diperbaiki | 3 (#51, #53, #56) |
| PR siap merge | 3 (#52, #54, #55) |
| PR terblokir | 1 (#50) |
| Belum siap untuk review | 0 |

Temuan paling menentukan:

1. **PR #50 dan PR #52 membuat file yang sama** (`docs/design/PUBLIC-VISUAL-AUDIT-2026-11-15.md`) dengan isi berbeda. Keduanya tidak dapat di-merge berurutan tanpa konflik add/add dan tanpa memilih satu sumber kebenaran.
2. **PR #50 gagal CI pada head terbaru** (`0f0e7bde`): job visual gagal tepat di langkah capture halaman publik, sehingga "perluasan cakupan audit visual" belum terbukti berjalan.
3. **PR #56 gagal CI pada head terbaru** (`cd20331f`) karena Prettier. Unit test ter-skip akibat gate format. Perbaikan memakai Prettier repository sudah dibuat di branch ini (`3020138`); gate lokal kini PASS.
4. **Tidak ditemukan kebocoran lintas tenant** pada kode PR #53–#56. Semua query publik memakai tenant dari host (`getIdentitasFromRequest`) dan filter status publik/aktif.
5. **Visual acceptance belum dapat dieksekusi ulang secara lokal**; perbandingan dilakukan terhadap screenshot referensi di repository dan struktur implementasi, bukan terhadap render aktual. Rincian batasan di bagian D.

---

## B. Tabel hasil audit

| PR | Kode | Visual | Fungsional | Security | CI (head terbaru) | Rekomendasi |
|---|---|---|---|---|---|---|
| #50 Test: Expand Public Visual Audit Coverage | Perlu perbaikan (F-02) | N/A — ini tooling capture, tanpa assertion kemiripan | Tidak — job capture gagal | N/A (tidak menyentuh data) | **FAIL** (`43727690665`) | BLOCKED |
| #51 Fix: Improve Public Calendar Visual Fidelity | Perlu perbaikan (F-04, F-05) | Gap struktural vs referensi; belum ada capture lokal | Sebagian — navigasi bulan ke masa lalu selalu kosong | Aman | **PASS** (`43712144773`) | NEEDS FIX |
| #52 Docs: Record Public Website Visual Review | Baik (F-12 nit) | Dokumentasi saja | N/A | N/A | **PASS** (`43709054612`) | READY TO MERGE |
| #53 Feature: Render Published GIS Boundaries | Perlu perbaikan (F-06, F-07) | Gap struktural (basemap, tabel batas, unduhan belum ada); peta SVG berfungsi | Ya, dengan empty state | Aman — tenant + `enabled=1` | **PASS** (`43711655669`) | NEEDS FIX |
| #54 Feature: Improve Public Potential Layout | Baik (sanitasi HTML benar) | Gap struktural (kartu kategori, metrik, galeri belum ada) | Ya, dengan empty state | Aman — `sanitasiHtml` + allowlist skema | **PASS** (`43712050019`) | READY TO MERGE |
| #55 Feature: Add Searchable Public Album Explorer | Baik (F-10 nit) | Gap struktural (tab foto/video, kategori, foto terbaru belum ada) | Ya (tanpa paginasi) | Aman | **PASS** (`43712243968`) | READY TO MERGE |
| #56 Feature: Add Village Announcements Page | Baik; format diperbaiki (F-03, F-11, F-13) | Referensi yang ada adalah halaman **detail**; halaman daftar belum punya referensi | Ya, bergantung kategori `pengumuman` | Aman — tenant + published-only | **FAIL** (`43729244244`) → diperbaiki lokal | NEEDS FIX |

Catatan: "Visual" tidak dapat dinyatakan PASS untuk satu pun PR karena render aktual tidak dapat dijalankan ulang pada audit ini (lihat bagian D). CI hijau hanya membuktikan route dapat dirender dan screenshot berhasil dibuat.

---

## C. Temuan

### Ringkasan temuan

| ID | PR | Severity | Temuan | Status |
|---|---|---|---|---|
| F-01 | #50, #52 | High | Dua PR menambahkan file laporan audit yang sama dengan isi berbeda | Terbuka |
| F-02 | #50 | High | CI gagal di langkah capture; gate capture dapat memberi false positive | Terbuka |
| F-03 | #56 | High | Format check gagal; unit test ter-skip | **Diperbaiki** (`3020138`) |
| F-04 | #51 | Medium | Navigasi bulan menampilkan bulan yang tidak mungkin berisi data | Terbuka |
| F-05 | #51 | Low | Clamp tahun membuat tombol "bulan sebelumnya" melompat ke tahun salah di batas bawah | Terbuka |
| F-06 | #53 | Medium | Validasi koordinat tidak membatasi bujur/lintang, berbeda dari helper kanonik | Terbuka |
| F-07 | #53 | Medium | Duplikasi parser/proyeksi GeoJSON dan tanpa test untuk transform baru | Terbuka |
| F-08 | #51, #56 | Medium | Setelah keduanya merge, tab "Pengumuman" di `/agenda` tetap disabled | Terbuka |
| F-09 | lintas PR | Medium | Public shell (header/footer/hero) disalin per halaman dan sudah menyimpang | Terbuka (bukan scope PR) |
| F-10 | #55 | Low | Daftar album tampil dua kali; tab kedua hanya anchor; tanpa paginasi | Terbuka |
| F-11 | #56 | Low | Halaman bergantung pada kategori ber-slug `pengumuman`; tidak ada fixture/test | Terbuka |
| F-12 | #52 | Low | Kalimat duplikat di baris 44; klaim viewport akan menyimpang dari #50 | Terbuka |
| F-13 | #56 | Low | Format tanggal tanpa `timeZone` eksplisit (bergantung TZ server) | Terbuka |

Tidak ada temuan Critical. Tidak ada indikasi IDOR, XSS, atau kebocoran data lintas tenant pada kode yang diaudit.

---

### F-01 — High — PR #50 dan #52 menulis file laporan yang sama

- **PR:** #50, #52.
- **File:** `docs/design/PUBLIC-VISUAL-AUDIT-2026-11-15.md`.
- **Bukti:** `git diff --name-only origin/main...origin/audit/public-visual-review-2026-11-15` dan `...origin/audit/public-visual-review-nov15-v2` sama-sama menghasilkan file tersebut. Isinya berbeda: versi #50 136 baris dan menyimpulkan 14 referensi FAIL; versi #52 65 baris dengan tabel temuan per halaman.
- **Dampak:** merge berurutan menghasilkan konflik add/add; jika dipaksa, satu dokumen akan menimpa dokumen lain dan rekomendasi visual menjadi ambigu.
- **Rekomendasi:** tetapkan satu dokumen kanonik. Pilihan paling sederhana: merge #52 lebih dulu sebagai catatan audit, lalu ubah #50 agar hanya membawa perubahan `.github/workflows/ci.yml` (buang salinan dokumennya) atau perbarui dokumen kanonik yang sama dalam commit terpisah.
- **Status:** Terbuka — butuh keputusan maintainer.

### F-02 — High — PR #50: job visual gagal dan gate capture dapat false positive

- **PR:** #50.
- **File:** `.github/workflows/ci.yml` baris 267–304.
- **Bukti CI:** run `43727690665` (head `0f0e7bde`). Job "Unit test dan quality check" sukses (Typecheck, Lint, Format check, Unit test semuanya success), tetapi job "Visual QA login (desktop/mobile)" gagal pada step `Capture public pages (reference desktop, wide desktop, and mobile)` (step 12). Langkah lain pada job tersebut sukses.
- **Bukti kode:** baris 301–303 menambahkan `|| test -s "<file>"`. Artinya exit code non-zero dari Playwright diabaikan selama file output ada dan tidak kosong. Screenshot yang tertulis sebagian (misalnya halaman error yang tetap menghasilkan file) dapat lolos.
- **Dampak:** (a) cakupan audit visual yang diklaim PR ini belum terbukti berjalan di CI; (b) gate dapat memberi false positive, bertentangan langsung dengan tujuan "workflow tidak memberikan false positive".
- **Catatan:** penyebab pasti kegagalan step tidak dapat dipastikan dari luar karena log job memerlukan autentikasi GitHub. Kandidat yang terlihat dari diff: cek status `curl` tanpa `-L` (baris 295–300) dan `|| test -s` yang menyembunyikan kegagalan screenshot. Keduanya perlu diverifikasi pada log run, bukan diasumsikan.
- **Rekomendasi:** jalankan ulang dengan log terbuka; gunakan `curl --fail --location` atau terima 2xx/3xx secara eksplisit; hapus `|| test -s` dan biarkan kegagalan Playwright menggagalkan job; tambahkan assertion bahwa jumlah file screenshot sesuai jumlah route.
- **Status:** Terbuka.

### F-03 — High — PR #56: Format check gagal, unit test ter-skip

- **PR:** #56.
- **File:** `src/app/pengumuman/page.tsx`, `src/app/pengumuman/pengumuman.module.css`.
- **Bukti CI:** run `43729244244` (head `cd20331f`). Typecheck PASS, Lint PASS, **Format check FAIL**, Unit test **SKIPPED**; Integration MySQL 8 PASS; job visual PASS.
- **Reproduksi lokal:** `./node_modules/.bin/prettier --check` pada dua file tersebut → exit 1 dengan warning kedua file.
- **Perbaikan:** `./node_modules/.bin/prettier --write` memakai konfigurasi repository (Prettier 3.9.10), lalu `--check` ulang PASS. Diff 65 insertions / 93 deletions, hanya format; tidak ada perubahan markup, logika, atau CSS values.
- **Verifikasi setelah perbaikan:** `npm run format:check` PASS (seluruh repo), `npm run typecheck` PASS, ESLint `src/app/pengumuman` PASS, `npm run test:unit` PASS (194 file, 1732 test).
- **Status:** **Diperbaiki** di branch `task/public-prs-50-56-audit`, commit `3020138`. PR #56 sendiri tetap merah sampai commit ini masuk ke branch PR atau PR di-update.

### F-04 — Medium — PR #51: navigasi bulan menampilkan periode yang tidak mungkin berisi data

- **PR:** #51.
- **File:** `src/app/agenda/page.tsx:79`, `:90–100`, `:122–127`.
- **Deskripsi:** halaman mengambil `agendaMendatang(desa.id, 100)`, dan `listAgendaPublik` hanya mengembalikan agenda dengan `mulai >= hari ini` (`src/features/agenda/infrastructure/agenda-repository.ts:27–46`). Sementara UI mengizinkan navigasi ke bulan lalu dan tahun sebelumnya (`currentYear - 1`). Akibatnya kalender masa lalu selalu kosong, bukan karena tidak ada kegiatan tetapi karena sumber datanya tidak pernah memuat agenda lampau. Batas 100 baris juga membuat bulan-bulan jauh di depan akan under-report jika agenda desa lebih dari 100.
- **Dampak:** informasi menyesatkan ("tidak ada kegiatan") dan kalender tidak dapat dipakai sebagai arsip.
- **Rekomendasi:** batasi navigasi ke rentang yang benar-benar dilayani, atau tambahkan query arsip per bulan (tenant-scoped, `tayang = true`, tanpa filter `>= hari ini`) dan hilangkan batas 100 untuk tampilan kalender. Sertakan test untuk bulan lampau.
- **Status:** Terbuka.

### F-05 — Low — PR #51: clamp tahun pada tombol bulan sebelumnya

- **PR:** #51.
- **File:** `src/app/agenda/page.tsx:90–100`, `:122–127`.
- **Deskripsi:** `year` dibatasi `[currentYear - 1, currentYear + 2]`. Dari Januari `currentYear - 1`, `previousMonth` menghasilkan Desember `currentYear - 2`; nilai itu ditolak dan jatuh ke `currentYear`, sehingga tombol "bulan sebelumnya" melompat ke Desember tahun berjalan. Kasus serupa terjadi pada `nextMonth` dari Desember `currentYear + 2`.
- **Dampak:** navigasi tidak konsisten pada batas rentang. Severity rendah karena hanya di tepi rentang.
- **Rekomendasi:** nonaktifkan tombol pada batas rentang, atau hitung `previousMonth`/`nextMonth` setelah clamp dan jangan tampilkan link yang tidak valid.
- **Status:** Terbuka.

### F-06 — Medium — PR #53: validasi koordinat tidak membatasi bujur/lintang

- **PR:** #53.
- **File:** `src/app/wilayah/page.tsx:22–30`.
- **Deskripsi:** `isCoordinate` hanya memeriksa `Array.isArray`, panjang ≥ 2, `typeof number`, dan `Number.isFinite`. Tidak ada batas `|lon| ≤ 180` dan `|lat| ≤ 90`. Helper kanonik di repository sudah punya aturan itu (`src/features/gis/domain/peta-cetak.ts:54–64`).
- **Dampak:** satu koordinat rusak (misalnya `1e9`) dapat merusak skala proyeksi sehingga seluruh peta tampil sebagai garis/titik tidak terbaca. Bukan celah keamanan, tetapi kegagalan render yang sulit didiagnosis.
- **Rekomendasi:** gunakan `parseGeoJsonKoordinat`/validator kanonik, atau tambahkan batas yang sama dan buang path yang tidak valid secara utuh.
- **Status:** Terbuka.

### F-07 — Medium — PR #53: duplikasi parser/proyeksi dan tidak ada test

- **PR:** #53.
- **File:** `src/app/wilayah/page.tsx:32–108`.
- **Deskripsi:** `areaRings` + `projectShapes` menduplikasi sebagian `parseGeoJsonKoordinat` dan `bangunPetaCetak` yang sudah ada dan teruji di `src/features/gis/domain/peta-cetak.ts`. PR ini tidak menambahkan test untuk parsing, proyeksi, atau empty state. Selain itu `getPetaPublik()` mengambil `garises` dan `points` yang tidak dipakai halaman (`src/features/gis/application/use-cases.ts:91–101`).
- **Dampak:** dua implementasi proyeksi dapat menyimpang; regresi tidak tertangkap; dua query tambahan per request tanpa manfaat.
- **Rekomendasi:** ekstrak satu helper domain yang dipakai peta publik dan peta cetak, tambahkan unit test untuk Polygon/MultiPolygon/koordinat invalid, dan panggil hanya data yang dipakai (atau gunakan `bangunPetaCetak` langsung).
- **Status:** Terbuka.

### F-08 — Medium — PR #51 dan #56: navigasi "Pengumuman" tidak konsisten setelah merge

- **PR:** #51, #56.
- **File:** `src/app/agenda/page.tsx` (tab `Pengumuman` memakai `styles.disabledTab`, `aria-disabled="true"`), `src/lib/public-paths.ts:34`.
- **Deskripsi:** #56 menambahkan route publik `/pengumuman`, tetapi #51 tetap merender "Pengumuman" sebagai tab non-aktif di `/agenda`, dan tidak ada perubahan navigasi di halaman lain. Keduanya hijau secara individual karena tidak ada yang menguji integrasi antar-PR.
- **Dampak:** setelah merge, pengguna melihat fitur yang tersedia tetapi ditandai disabled — kesan fitur rusak.
- **Rekomendasi:** setelah #56 masuk, ubah tab tersebut menjadi `Link href="/pengumuman"` dan tambahkan item navigasi yang konsisten. Ini pekerjaan lanjutan kecil, bukan alasan menahan #56.
- **Status:** Terbuka.

### F-09 — Medium — Lintas PR: public shell disalin per halaman

- **PR:** #51, #53, #54, #55, #56.
- **File:** `src/app/agenda/page.tsx`, `src/app/wilayah/page.tsx`, `src/app/potensi/page.tsx`, `src/app/galeri/page.tsx`, `src/app/pengumuman/page.tsx` beserta CSS module masing-masing.
- **Deskripsi:** setiap halaman menduplikasi header, footer, hero, breadcrumb, dan tombol masuk, dengan label/identitas yang sudah berbeda (mis. subjudul brand "Wilayah Administratif", "Potensi Desa", "Galeri Desa"; nav berbeda antar halaman). #52 mendokumentasikan ini sebagai P0.
- **Dampak:** setiap perbaikan shell harus diubah di banyak file; penyimpangan akan terus bertambah. Tidak ada satu PR pun yang memperburuk keamanan.
- **Rekomendasi:** jadikan konsolidasi shell sebagai task tersendiri setelah PR-PR ini merge; jangan perluas scope PR yang sedang direview.
- **Status:** Terbuka (bukan scope PR individual).

### F-10 — Low — PR #55: duplikasi daftar album dan tab yang hanya anchor

- **PR:** #55.
- **File:** `src/app/galeri/page.tsx:75–78`, `:174–190`.
- **Deskripsi:** tab "Album Kegiatan" hanya `<a href="#album-list">` ke konten yang sama dengan "Semua Galeri"; daftar album dirender dua kali (grid utama dan sidebar). Tidak ada paginasi/batas jumlah album.
- **Dampak:** duplikasi konten dan ruang layar; pada tenant dengan banyak album halaman memanjang tanpa batas.
- **Rekomendasi:** jadikan tab sebagai filter nyata atau hapus; tampilkan sidebar hanya sebagai ringkasan; pertimbangkan batas/paginasi album.
- **Status:** Terbuka.

### F-11 — Low — PR #56: ketergantungan pada kategori `pengumuman`

- **PR:** #56.
- **File:** `src/app/pengumuman/page.tsx:52–58`, `:265–274`.
- **Deskripsi:** halaman mencari kategori dengan slug `pengumuman`; bila tidak ada, halaman menampilkan empty state dengan instruksi ke admin. Tidak ada fixture, seed, atau test yang memastikan alur ini. `generateMetadata` memanggil `getIdentitasFromRequest()` lagi (`:39–40`) sementara page juga memanggilnya (`:49`), sehingga resolusi tenant berjalan dua kali per request.
- **Dampak:** fitur tampak "kosong" pada tenant yang belum menyiapkan kategori; biaya resolusi tenant ganda kecil tetapi mudah dihindari.
- **Rekomendasi:** dokumentasikan prasyarat kategori di deskripsi PR/README modul; gunakan `cache()` atau teruskan identitas yang sudah diresolusi ke metadata; tambahkan test untuk tenant tanpa kategori.
- **Status:** Terbuka.

### F-12 — Low — PR #52: kalimat duplikat dan klaim viewport

- **PR:** #52.
- **File:** `docs/design/PUBLIC-VISUAL-AUDIT-2026-11-15.md:44`.
- **Deskripsi:** kalimat "Route yang belum dibuat atau belum memiliki data tidak boleh dianggap lulus." tertulis dua kali. Dokumen juga menyatakan viewport desktop `1440×1000` saja, sedangkan #50 menambahkan capture `1024×1536`; bila keduanya digabung, dokumen akan menyimpang dari workflow.
- **Dampak:** kualitas dokumen dan risiko dokumentasi tidak sinkron.
- **Rekomendasi:** hapus duplikasi; setelah memilih dokumen kanonik (F-01), selaraskan daftar viewport dengan workflow final.
- **Status:** Terbuka.

### F-13 — Low — PR #56: format tanggal bergantung timezone server

- **PR:** #56.
- **File:** `src/app/pengumuman/page.tsx:31–37`, `:226–234`.
- **Deskripsi:** `Intl.DateTimeFormat("id-ID", ...)` dipanggil tanpa `timeZone`, sedangkan halaman lain di repository konsisten memakai `timeZone: "UTC"` untuk tanggal dari database.
- **Dampak:** tanggal dapat bergeser satu hari bila TZ server bukan UTC.
- **Rekomendasi:** tetapkan `timeZone: "UTC"` atau konversi ke zona Asia/Jakarta secara eksplisit dan konsisten.
- **Status:** Terbuka.

---

### Kontrol keamanan yang diverifikasi (positif)

- **Tenant dari host, bukan dari input klien:** `getPetaPublik()` (`src/features/gis/application/use-cases.ts:91–101`) memakai `getIdentitasFromRequest()`; #55 dan #56 memakai pola yang sama.
- **Hanya data yang dipublikasikan:** `listAreas`/`listPolygons` dengan `publicOnly` memfilter `enabled = 1` (`src/features/gis/infrastructure/gis-repository.ts:38–60`, `:143–160`); berita memakai `beritaLayakTayang` (`status = published` + jadwal terbit) dan galeri memfilter `aktif = true` (`src/features/publik/infrastructure/content-repository.ts:32–46`, `:182–225`).
- **Sanitasi HTML:** #54 merender konten dengan `sanitasiHtml` (`src/lib/sanitize.ts`) yang memakai allowlist tag/atribut, skema `http/https/mailto/tel`, membuang `on*`/`style`, dan menambahkan `rel="noopener noreferrer"`.
- **Tidak ada XSS di peta:** #53 hanya merender teks dari nama area dan `points` numerik hasil `toFixed`; warna divalidasi regex `#rrggbb`.
- **Media tenant-scoped:** `mediaUrl` di #51/#55/#56 menolak segmen `..` dan selalu memberi prefix `villageId`, sehingga route media memeriksa kepemilikan tenant.
- **Test isolasi tenant yang sudah ada:** `src/features/konten/dokumen-publik.integration.test.ts:128–135` menguji berita tenant lain tidak muncul. Test negative setara **belum ada** untuk halaman baru (#53–#56).

---

## D. Hasil Visual QA

### Status: SKIPPED — tidak ada perbandingan screenshot aktual pada audit ini

Screenshot aktual **tidak dapat diambil ulang** karena tiga hal yang terverifikasi:

1. Artifact CI memerlukan autentikasi GitHub: `GET /repos/fahmiorim/appdes/actions/artifacts/14167473877/zip` → **HTTP 401**.
2. Tidak ada Playwright lokal (`node_modules/.bin/playwright` tidak ditemukan) dan tidak ada database test/disposable; Docker daemon tidak berjalan (`docker info` gagal), sehingga aplikasi tidak dapat dijalankan dengan fixture sintetis.
3. `gh` tidak tersedia di environment; metadata dan check diambil via GitHub API publik.

Screenshot referensi di `docs/public/` berhasil diperiksa (Agenda, Wilayah, Potensi, Galeri, Pengumuman). Yang dilakukan di bawah adalah **perbandingan struktur implementasi terhadap referensi**, bukan visual acceptance. Halaman belum dinyatakan PASS.

| Referensi | Elemen utama referensi | Yang diimplementasikan PR | Gap |
|---|---|---|---|
| `Agenda Kegiatan Desa Suka Maju.png` | Hero ilustratif; 4 KPI; kalender + panel tanggal terpilih (waktu, lokasi, kategori); daftar kartu agenda berfoto; sidebar statistik, agenda mendatang, notifikasi, unduh PDF; paginasi | #51: tab, kalender dengan navigasi bulan, panel tanggal terpilih (judul/lokasi/deskripsi), filter, daftar agenda | Hero, KPI, kategori/waktu pada panel, kartu berfoto, sidebar, unduh PDF, paginasi belum ada |
| `Wilayah Desa Suka Maju.png` | Peta ber-basemap dengan polygon dusun berwarna + legenda; panel luas/ketinggian/iklim; tabel batas wilayah; tabel dusun + jumlah penduduk; kondisi geografis; unduh dokumen | #53: tab profil, peta SVG hasil proyeksi GeoJSON, legenda, ringkasan jumlah, daftar dusun/RW/RT | Basemap, tabel batas, luas/penduduk/ketinggian, narasi geografis, unduhan belum ada |
| `Potensi Desa Suka Maju Dashboard.png` | Grid 6 kategori potensi berfoto; potensi unggulan dengan metrik; panel data potensi; galeri; CTA | #54: tab, konten halaman statis tersanitasi, kartu info & kontak | Kartu kategori, metrik, galeri, CTA belum ada; data terstruktur belum tersedia |
| `Suka Maju Village Gallery Dashboard.png` | Tab Semua/Foto/Video/Album; grid album dengan jumlah foto; grid foto terbaru; pencarian + kategori berhitung; video; CTA | #55: tab (2), pencarian album, grid album, sidebar ringkasan + daftar album, callout | Tab foto/video, kategori, foto terbaru, video belum ada; pencarian masih per-album |
| `Pengumuman Musdes Desa Suka Maju.png` | **Halaman detail** pengumuman: hero, artikel lengkap, metadata, lampiran, kalender, pengumuman lain, notifikasi | #56: halaman **daftar** dengan featured + daftar + pencarian | Tidak ada referensi untuk halaman daftar; komposisi #56 wajar untuk listing, tetapi belum dapat disebut "sesuai referensi" |

Kesimpulan visual: PR #51–#56 adalah perbaikan inkremental yang membawa struktur lebih dekat ke referensi, tetapi **belum ada satu halaman pun yang setara secara visual** dengan screenshot desain. Ini konsisten dengan laporan #50/#52 yang menyatakan visual acceptance belum lulus.

Untuk menyelesaikan acceptance, diperlukan environment dengan database test disposable + fixture sintetis, lalu capture 1440×1000 dan 390×844 per halaman, dibandingkan langsung dengan referensi 1024×1536.

---

## E. Urutan merge yang disarankan

Semua PR berbasis pada commit yang sama dan tidak ada dependensi commit antar-PR. Yang ada hanya tabrakan file dan gap integrasi:

- Tabrakan file: #50 ↔ #52 (`docs/design/PUBLIC-VISUAL-AUDIT-2026-11-15.md`).
- Gap integrasi: #51 (tab Pengumuman disabled) ↔ #56 (route `/pengumuman`).
- File kode lain terpisah per PR.

Urutan yang paling aman:

1. **#52** — dokumentasi saja, CI hijau, menjadi catatan baseline. (Sekaligus menetapkan dokumen kanonik untuk F-01.)
2. **#51** — setelah F-04/F-05 diperbaiki; menyentuh `agenda/page.tsx` + CSS saja.
3. **#55** — independen, CI hijau.
4. **#54** — independen, CI hijau, sanitasi sudah benar.
5. **#53** — setelah F-06/F-07 diperbaiki; menyentuh `wilayah/page.tsx` + CSS saja.
6. **#56** — setelah commit `3020138` masuk ke branch PR (format) dan CI hijau; pertimbangkan sekaligus memperbaiki tab Pengumuman di `/agenda` (F-08).
7. **#50** — paling akhir, setelah job capture diperbaiki dan duplikasi dokumen diselesaikan. Jangan merge #50 lebih dulu karena akan memblokir #52.

Jika maintainer memilih dokumen versi #50 sebagai kanonik, tukar langkah 1 dan 7: merge #50 setelah CI-nya diperbaiki, lalu ubah #52 menjadi pembaruan dokumen yang sama (bukan file baru).

---

## F. Kesimpulan

### READY TO MERGE

- **#52** — dokumentasi; tidak mengubah kode. Nit F-12 (kalimat duplikat) dapat diperbaiki kapan saja.
- **#54** — layout Potensi; sanitasi HTML benar, tenant-scoped, empty state tersedia, CI hijau. Catatan: paritas visual belum terverifikasi.
- **#55** — galeri dengan pencarian; tenant-scoped, hanya album aktif, empty state untuk hasil kosong, CI hijau. Nit F-10.

### NEEDS FIX

- **#51** — perbaiki F-04 (bulan lampau selalu kosong / batas 100) dan F-05 (clamp navigasi), tambahkan test untuk kalender.
- **#53** — perbaiki F-06 (batas koordinat) dan F-07 (pakai helper kanonik + test, hindari query yang tidak dipakai).
- **#56** — format sudah diperbaiki di branch ini; merge setelah commit `3020138` masuk dan CI hijau. Pertimbangkan F-08, F-11, F-13 sebagai follow-up.

### BLOCKED

- **#50** — CI merah pada head terbaru, gate capture dapat false positive, dan bertabrakan dengan #52 pada file laporan yang sama.

### NOT READY FOR REVIEW

- Tidak ada.

---

## Validasi yang dijalankan

Semua perintah dijalankan pada branch `task/public-prs-50-56-audit` (head PR #56 + perbaikan format).

| Perintah | Hasil |
|---|---|
| `prettier --check src/app/pengumuman/page.tsx src/app/pengumuman/pengumuman.module.css` (sebelum) | **FAIL** — 2 file |
| `prettier --write` dua file tersebut | Diterapkan (65 insertions / 93 deletions, format saja) |
| `prettier --check` dua file tersebut (sesudah) | **PASS** |
| `npm run format:check` | **PASS** — seluruh repo |
| `npm run typecheck` | **PASS** |
| `eslint src/app/pengumuman` | **PASS** |
| `vitest run src/lib/public-paths.test.ts` | **PASS** — 3 test |
| `npm run test:unit` | **PASS** — 194 file, 1732 test |
| Integration test MySQL 8 (lokal) | **SKIPPED** — tidak ada database test disposable; Docker tidak berjalan |
| `npm run build` | **SKIPPED** — tidak dijalankan pada audit ini |
| Visual QA 1440/390 | **SKIPPED** — artifact 401, Playwright lokal tidak ada, DB tidak tersedia |
| `git diff` / `git status` | Diperiksa; hanya 2 file PR #56 yang berubah sebelum laporan ini |

Status CI pada head PR (dari GitHub API):

| PR | Head | Run | Hasil |
|---|---|---|---|
| #50 | `0f0e7bde` | `43727690665` | **FAIL** — job visual, step capture halaman publik |
| #51 | `d7731544` | `43712144773` | PASS |
| #52 | `55cd93f2` | `43709054612` | PASS |
| #53 | `625ae258` | `43711655669` | PASS |
| #54 | `7e5e14d9` | `43712050019` | PASS |
| #55 | `7e72ea61` | `43712243968` | PASS |
| #56 | `cd20331f` | `43729244244` | **FAIL** — Format check; Unit test skipped; Integration PASS |

---

## File yang diperiksa

Kode dan konteks (bukan hanya diff):

- `src/app/agenda/page.tsx`, `src/app/agenda/agenda.module.css`
- `src/app/wilayah/page.tsx`, `src/app/wilayah/wilayah.module.css`
- `src/app/potensi/page.tsx`, `src/app/informasi-publik.module.css`
- `src/app/galeri/page.tsx`, `src/app/galeri/galeri.module.css`
- `src/app/pengumuman/page.tsx`, `src/app/pengumuman/pengumuman.module.css`
- `src/lib/public-paths.ts`, `src/lib/public-paths.test.ts`, `src/lib/sanitize.ts`
- `src/features/agenda/application/agenda-use-cases.ts`, `src/features/agenda/infrastructure/agenda-repository.ts`
- `src/features/gis/application/use-cases.ts`, `src/features/gis/infrastructure/gis-repository.ts`, `src/features/gis/domain/peta-cetak.ts`, `src/features/gis/domain/gis.ts`
- `src/features/publik/application/konten-publik.ts`, `src/features/publik/infrastructure/content-repository.ts`
- `src/features/konten/dokumen-publik.integration.test.ts`
- `.github/workflows/ci.yml` (main, #50, #56)
- `docs/design/PUBLIC-VISUAL-AUDIT-2026-11-15.md` (kedua versi PR)
- `docs/public/{Agenda Kegiatan,Wilayah,Potensi,Galeri,Pengumuman} …png` (referensi)
- `package.json`, `vitest.config.mts`, `vitest.integration.config.mts`

## File yang diubah

| File | Alasan |
|---|---|
| `src/app/pengumuman/page.tsx` | Format Prettier repository; tanpa perubahan perilaku |
| `src/app/pengumuman/pengumuman.module.css` | Format Prettier repository; tanpa perubahan nilai CSS |
| `docs/reports/02-public-website/public-prs-50-56-audit-2026-11-15.md` | Laporan audit ini |

## Risiko tersisa

- Perbaikan format belum melewati CI pada commit `3020138`; bukti lokal kuat, tetapi status CI resmi menyusul setelah branch di-push/di-merge ke branch PR.
- Tidak ada verifikasi visual aktual; kesimpulan visual berbasis referensi + struktur kode.
- Integration test tidak dijalankan lokal; hasil integration hanya dari CI pada `cd20331f`.
- Halaman baru #53–#56 belum memiliki test negative lintas tenant pada level page/route; isolasi bergantung pada use case/repository yang sudah teruji.
- Branch `main` lokal tertinggal dari `origin/main`; audit memakai `origin/main` sebagai basis, bukan `main` lokal.

---

## G. Status pasca-merge — 16 November 2026

Bagian A–F di atas adalah catatan audit pada 15 November 2026 dan sengaja dipertahankan apa adanya sebagai rekam jejak. Bagian ini mencatat status temuan setelah PR #50–#58 di-merge ke `main`, diverifikasi ulang pada `main` = `5527e71`.

| ID | Status setelah merge | Bukti |
|---|---|---|
| F-01 | **Selesai** — satu dokumen kanonik | PR #52 ditutup tanpa merge (isinya versi ringkas dari dokumen `main` hasil #50); #50 tetap menjadi sumber kebenaran `docs/design/PUBLIC-VISUAL-AUDIT-2026-11-15.md` |
| F-02 | **Selesai** — capture CI berjalan | PR #50 di-merge (`e371d11`) setelah step `Capture public pages` diperbaiki; seluruh check PR hijau |
| F-03 | **Selesai** — format PR #56 | PR #56 di-merge (`cda1684`) dengan perbaikan Prettier `3020138`; check PR hijau |
| F-04, F-05 | **Selesai** — navigasi agenda dibatasi | PR #57 di-merge (`f6ac8db`): arsip bulan dimuat dan navigasi dibatasi |
| F-06, F-07 | **Selesai** — validasi dan proyeksi kanonik | PR #58 di-merge (`5b5b6b1`); `src/features/gis/domain/peta-cetak.ts` + `peta-cetak.test.ts` (13 test) |
| F-08 | **Terbuka** — tab "Pengumuman" masih nonaktif | `src/app/agenda/page.tsx:230` masih memakai `aria-disabled="true"`, padahal `/pengumuman` sudah live sejak #56; sekarang cukup diganti `Link` |
| F-09 | **Terbuka** — public shell disalin per halaman | Tidak ada PR yang mengangkat shell bersama; masih di luar scope PR #50–#58 |
| F-10 | **Terbuka** — daftar album ganda dan tab anchor | Masuk apa adanya bersama #55: nav `#album-list` dan daftar album di aside masih menampilkan isi yang sama |
| F-11 | **Terbuka** — ketergantungan kategori `pengumuman` | Belum ada fixture/data uji untuk kategori ini; belum ada test level page |
| F-12 | **Tidak berlaku** — PR #52 ditutup | Temuan menyangkut isi dokumen pada PR yang tidak di-merge |
| F-13 | **Terbuka** — format tanggal pakai timezone server | `src/app/pengumuman/page.tsx:32` masih memakai `Intl.DateTimeFormat("id-ID", …)` tanpa `timeZone` eksplisit |

### Temuan yang layak diangkat menjadi task berikutnya

1. **F-08** paling murah dan berdampak: `/pengumuman` sudah tersedia, tetapi navigasi `/agenda` masih menampilkannya sebagai tab mati — pengguna tidak bisa menemukan halaman yang sudah ada.
2. **F-13** kecil dan terukur: tetapkan `timeZone: "Asia/Jakarta"` pada pemformat tanggal publik agar tidak bergeser mengikuti timezone server.
3. **F-11** menyangkut kebenaran data: tambahkan fixture dan test yang membuktikan halaman pengumuman hanya menampilkan konten tenant aktif yang berstatus terbit.
4. **F-10** dan **F-09** bersifat struktural/visual; lebih baik dikerjakan bersama audit visual publik berikutnya, bukan sebagai patch terpisah.

### Validasi pada perubahan dokumentasi ini

- `npx prettier --check docs/reports/02-public-website/public-prs-50-56-audit-2026-11-15.md` — PASS.
- Tidak ada perubahan kode, schema, atau konfigurasi pada PR ini.
- Klaim status di tabel G diverifikasi dengan membaca file pada `main` (`src/app/agenda/page.tsx`, `src/app/pengumuman/page.tsx`) dan riwayat merge PR #50–#58; tidak ada test perilaku yang dijalankan untuk PR dokumentasi ini.
