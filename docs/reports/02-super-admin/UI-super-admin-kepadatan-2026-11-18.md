# UI Super Admin — audit kepadatan, perbaikan bentuk, dan pemangkasan informasi

- **Task:** audit UI konsol Super Admin (`/super-admin`), perbaiki bentuk komponen yang lemah, buang informasi yang tidak perlu, dan kurangi whitespace berlebih.
- **Tanggal:** 18 November 2026
- **Branch:** `task/super-admin-console-density`
- **Base commit:** `12028cc` (`main` setelah PR #125)
- **Status:** siap review

## 1. Kondisi awal

Konsol platform terdiri dari tujuh halaman (`ringkasan`, `tenant`, `domain`, `pengguna`, `audit`, `template`, `pengaturan`). Semua halaman memakai kerangka `platform-ui.tsx` dan gaya `.platform-*` di `src/app/globals.css`.

Dua masalah struktural ditemukan dari source:

1. **Dua lapis aturan CSS `.platform-*`.** Blok lama (mulai `src/app/globals.css:1818`) dan blok "Super Admin console refresh" (mulai `~:2295`) mendefinisikan selector yang sama. Karena blok refresh tidak mereset semua properti blok lama, beberapa elemen mendapat dekorasi ganda:
   - `.platform-attention-list > li` pada blok lama menggambar kotak `border: 1px solid` + `border-radius: 12px` + `padding: 14px 16px`; blok refresh menambahkan `padding: 14px 0` dan `border-bottom`. Hasilnya baris perhatian tampil sebagai kotak berbingkai yang juga bergaris bawah.
   - `.platform-split` blok lama memakai `margin-top: 20px`, sedangkan blok refresh menetapkan `.platform-split .platform-card { margin-top: 20px }`. Kartu kanan terdorong 20 px lebih jauh daripada kartu di atasnya, ditambah `gap: 18px`.
   - `.platform-toolbar` blok lama `margin-bottom: 14px` tidak pernah direset saat blok refresh menambahkan padding dan garis bawah, sehingga toolbar berjarak ganda dari tabel.
   - `.platform-pagination` blok lama `margin-top: 14px` tetap berlaku bersama `padding: 14–18px` pada blok refresh.
2. **Kartu statistik tidak seragam.** Ringkasan memakai `Card` + `StatIcon`, sedangkan Domain, Pengguna, Template, dan Pengaturan memakai `Card` tanpa ikon. Bentuk kartu jadi berbeda antarhalaman meski fungsinya sama.

Informasi yang berulang atau tidak membantu operator:

- `Ringkasan` menampilkan heading "Gambaran platform" yang mengulang judul dan deskripsi halaman tepat di bawahnya.
- Panel "Perlu perhatian" selalu merender tiga baris, termasuk saat hitungannya nol, sehingga operator melihat "0 desa tanpa domain" dan tombol yang tidak melakukan apa pun.
- Baris "desa siap purge" menautkan ke halaman **audit**, padahal tindakan purge ada di konsol tenant.
- Tabel "Tenant terbaru" punya kolom "Aksi" berisi tautan "Kelola" yang identik untuk semua baris dan menduplikasi tombol "Kelola semua tenant" di kepala kartu.
- `Domain` menampilkan empat kartu statistik untuk tiga angka (satu kartu, "Domain utama", hanya mengulang isi kolom "Jenis" pada tabel), plus kolom aksi yang tautannya sama untuk setiap baris.
- `Template tenant` menampilkan path source (`src/db/templates/tenant-template.ts`) dan perintah CLI `npm run platform:export-template` di antarmuka operator.
- Halaman Tenant desa membuka dengan formulir “Daftarkan desa baru” 8 kolom yang selalu terbuka, sehingga daftar tenant — isi utama halaman — terdorong ke bawah dan judul kartu “Daftar tenant” bertabrakan dengan isinya. Aksi sesekali ini memakan area paling menonjol.
- Topbar platform menampilkan dua baris konteks “Ruang kerja administrasi” + “Super Admin Platform”, lalu judul halaman muncul terpisah di bawahnya. Blok judul (eyebrow + judul + deskripsi) memakan satu layar penuh sebelum data pertama terlihat.
- Sidebar platform: brand ber-`margin-bottom: 28px` ditambah label menu ber-`margin-top: 22px`, sehingga jarak logo ke tulisan “Platform” ±50 px. Di bawah menu ada paragraf pengantar dan footer “Sistem Informasi Desa / Konsol Super Admin” yang mengulang subjudul brand di bagian atas sidebar.

## 2. File yang diperiksa

- `src/app/(admin)/super-admin/{page,tenant/page,domain/page,pengguna/page,audit/page,template/page,pengaturan/page}.tsx`
- `src/app/(admin)/super-admin/page.test.ts`, `src/app/(admin)/super-admin/guard.ts`
- `src/features/multi-desa/presentation/{platform-ui,tenant-console,pengguna-platform-console}.tsx`
- `src/features/navigation/domain/menu-platform.ts`
- `src/app/globals.css` (blok `.platform-*` dan pembungkus `.admin-main:has(.platform-page-head)`)
- `src/components/ui/card.tsx`, `src/components/ui/stat-icon.tsx`
- `docs/MASTER_ROADMAP.md`, `docs/SID_FEATURE_MAP.md`, `docs/TECHNICAL_AUDIT.md` (AUD-009)

## 3. File yang diubah

| File | Alasan |
|---|---|
| `src/features/multi-desa/presentation/platform-ui.tsx` | Menambah `PlatformStat` agar seluruh kartu statistik konsol punya bentuk sama (ikon, label, nilai, catatan). |
| `src/app/(admin)/super-admin/page.tsx` | Hapus heading duplikat, pakai `PlatformStat`, sembunyikan baris perhatian bernilai nol, arahkan aksi purge ke konsol tenant, hapus kolom "Aksi" yang berulang. |
| `src/app/(admin)/super-admin/domain/page.tsx` | Ringkas 4 kartu menjadi 3 (drop "Domain utama" yang terwakili kolom "Jenis"), pakai `PlatformStat`, hapus kolom aksi identik. |
| `src/app/(admin)/super-admin/pengguna/page.tsx` | Pakai `PlatformStat`; isi KPI tidak berubah. |
| `src/app/(admin)/super-admin/template/page.tsx` | Pakai `PlatformStat`; buang path source dan instruksi CLI dari antarmuka, ganti dengan satu kalimat status baca-saja. |
| `src/app/(admin)/super-admin/pengaturan/page.tsx` | Pakai `PlatformStat` untuk tiga kartu retensi. |
| `src/components/shell/admin-sidebar.tsx` | Hapus paragraf pengantar dan footer duplikat pada sidebar platform; sidebar desa tidak berubah. |
| `src/features/navigation/domain/header-platform.ts` | Sumber tunggal judul/deskripsi tiap halaman konsol, dipakai top bar. |
| `src/features/navigation/domain/header-platform.test.ts` | Test cakupan header terhadap `MENU_PLATFORM`, sub-rute, dan fallback. |
| `src/components/shell/platform-topbar-head.tsx` | Komponen top bar yang membaca rute aktif dan menampilkan identitas halaman. |
| `src/components/shell/admin-topbar.tsx` | Topbar platform menampilkan identitas halaman (bukan label “Ruang kerja administrasi”), tombol Keluar tetap. |
| `src/app/(admin)/layout.tsx` | Meneruskan `isPlatformAdmin` ke topbar dan menandai `.admin-main` dengan `data-konsol="platform"`. |
| Tujuh halaman `/super-admin/**` | Blok `PlatformPageHeader` dihapus; aksi header dipindah (Domain → top bar, Audit CSV → kepala kartu). |
| `src/features/multi-desa/presentation/platform-ui.tsx` | `PlatformPageHeader` dihapus karena judul kini di top bar. |
| `src/features/multi-desa/presentation/dialog-daftar-desa.tsx` | Tombol “Daftarkan desa” + dialog native `<dialog>` berisi form; memanggil Server Action yang sama dan me-refresh daftar setelah sukses. |
| `src/features/multi-desa/presentation/tenant-console.tsx` | `FormBuatDesa` dan `GalatField` dihapus; konsol hanya berisi filter, tabel, dan panel detail. |
| `src/app/(admin)/super-admin/tenant/page.tsx` | Tombol pendaftaran dipasang di aksi kepala kartu; action `buat` tidak lagi diteruskan ke konsol. |
| `src/app/globals.css` | Netralkan dekorasi ganda baris perhatian, perbaiki jarak ganda panel/toolbar/pagination, rapatkan padding halaman dan kartu, rapatkan jarak logo → label menu platform. |
| `src/app/(admin)/super-admin/page.test.ts` | Test regresi: baris perhatian bernilai nol tidak dirender. |

## 4. Perubahan

- `PlatformStat` menjadi satu-satunya bentuk kartu statistik konsol; seluruh halaman memakai ikon `StatIcon` yang konsisten.
- Ringkasan: tiga tingkat pengantar (judul halaman + heading seksi) menjadi satu; panel "Perlu perhatian" hanya berisi kondisi nyata, dengan keadaan kosong "Tidak ada tindakan tertunda".
- Tindakan purge kini menautkan ke `/super-admin/tenant` (tempat aksinya), bukan halaman audit.
- Kolom aksi yang identik untuk semua baris dihapus dari tabel ringkasan dan domain; aksi tingkat halaman tetap ada di kepala kartu.
- Jarak vertikal: padding konten `34/64px` → `30/44px`, judul halaman `28px` → `22px`, grid statistik `22px` → `18px`, kepala kartu `20px 22px` → `16px 20px`, badan kartu `20px 22px` → `18px 20px`, panel kanan tidak lagi mendapat margin ganda.
- Pendaftaran desa tidak lagi menetap di halaman. Tombol **Daftarkan desa** di kepala kartu membuka dialog berisi form yang sama (nama, kode, domain, admin, sandi awal, kuota). Dialog memakai `<dialog>` native: fokus terkurung, Escape dan klik latar menutup, tombol Batal/Tutup tersedia. Setelah sukses dialog menutup dan daftar di belakangnya di-refresh lewat `router.refresh()`.
- Identitas halaman (eyebrow, judul, deskripsi) pindah ke top bar konsol: top bar membaca rute aktif lewat `usePathname()` dan memetakan header dari `headerPlatform()`. Konten halaman langsung dimulai dari kartu statistik/tabel. Topbar admin desa tetap memakai “Ruang kerja administrasi”.
- Skala tipografi judul top bar 19 px (16 px di bawah 860 px, deskripsi disembunyikan) agar tidak memakan tinggi layar.
- Aksi header yang tidak dinamis dipindah: “Buka konsol tenant” pada Domain kini di top bar; “Unduh CSV” pada Audit diletakkan di kepala kartu bersama penghitung peristiwa karena tautannya membawa filter aktif.
- Scoping CSS platform yang sebelumnya memakai `.admin-main:has(.platform-page-head)` diganti `[data-konsol="platform"]` karena elemen pemicu `:has()` sudah dihapus.
- Sidebar platform tidak lagi menampilkan catatan pengantar dan footer; menu, tautan, dan penanda halaman aktif tidak berubah. Sidebar desa tetap memakai catatan “Segera” dan footer seperti sebelumnya.
- Tidak ada perubahan otorisasi, query, use case, Server Action, atau skema data.

## 5. Security/tenant

- Tidak ada perubahan pada guard `pastikanSuperAdmin()`, `requireSuperAdmin`, Server Action, maupun query tenant.
- Halaman tetap membaca data yang sama lewat use case yang sudah ada; pemangkasan hanya menghapus tampilan turunan (angka yang bisa dihitung dari data lain) dan tautan yang tidak spesifik.
- Tidak ada data tenant yang terbuka atau tertutup oleh perubahan ini; `villageId` tetap tidak dipakai sebagai bukti otorisasi.
- Tidak ada secret, token, NIK, atau data pribadi yang ditambahkan ke UI, test, atau laporan. Nilai environment pada halaman Pengaturan tetap hanya status aktif/nonaktif tanpa nilai rahasia.

## 6. Validasi

| Perintah | Hasil |
|---|---|
| `npx prettier --write` pada 8 file yang diubah | PASS |
| `npm run check` (typecheck + lint + format:check + unit test), dijalankan setelah seluruh perubahan termasuk pemindahan header ke top bar | PASS — 216 file test, 1893 test lulus |
| `node node_modules/vitest/vitest.mjs run "src/app/(admin)/super-admin/page.test.ts" --config vitest.config.mts` | PASS — 4 test |
| Pemeriksaan visual di browser (desktop/mobile, dark mode) | SKIPPED — tidak ada sesi browser pada lingkungan ini dan integration/browser test butuh database lokal yang sedang tidak berjalan (`ECONNREFUSED 127.0.0.1:3306`) |
| `npm run build` | SKIPPED — diverifikasi oleh job build di CI |

## 7. Risiko dan keterbatasan

- Judul halaman kini berasal dari `header-platform.ts`, bukan dari JSX halaman. Bila judul/deskripsi halaman diubah, entri di file itu juga harus diperbarui; test hanya memastikan setiap menu punya entri dan nilainya terisi, bukan kesamaan teks dengan `metadata.title`.
- Top bar kini setinggi judul + deskripsi (±66 px di desktop, ±54 px di mobile karena deskripsi disembunyikan). Belum ada pengukuran render nyata.
- Dialog pendaftaran desa belum dijalankan di browser: pembukaan lewat `showModal()`, penutupan dengan Escape/klik latar, dan refresh daftar setelah sukses belum disaksikan. Elemen `<dialog>` membutuhkan browser modern, yang dipenuhi semua browser target proyek.
- `tenant-create`/`tenant-create-grid` CSS hanya dipakai form lama sehingga ikut dihapus; dialog memakai kelas `platform-dialog*` dan `platform-form-grid` yang baru.

- Perubahan CSS belum dilihat pada render nyata. Dua lapis `.platform-*` masih ada; perbaikan dilakukan dengan menimpa deklarasi yang bertabrakan, bukan dengan menggabungkan seluruh blok. Penggabungan menyeluruh (menghapus blok lama) perlu port media query dan kelas yang hanya didefinisikan di blok lama, sehingga sengaja tidak dilakukan dalam task ini.
- `PlatformStat` memakai markup `Card` + `StatIcon` yang sudah ada, tanpa kelas baru, sehingga tidak perlu aturan CSS tambahan.
- Test regresi memakai `renderToStaticMarkup` pada pohon hasil resolve; `Card` dimock `null` di test, jadi isi kartu statistik tidak diuji, hanya struktur panel perhatian dan keadaan kosongnya.
- Pemangkasan kolom "Aksi" mengasumsikan operator memakai tombol tingkat halaman atau membuka konsol tenant; belum ada deep-link per baris sejak awal.

## 8. Rekomendasi berikutnya

1. Walkthrough browser di staging: bandingkan jarak antarseksi, bentuk kartu statistik, baris perhatian, dan jarak logo → menu sidebar pada 1440 px, 1024 px, dan 360 px.
2. Setelah tampilan disetujui, gabungkan dua lapis CSS `.platform-*` menjadi satu blok dengan media query yang dipindahkan, agar tidak ada lagi deklarasi yang saling menimpa.
3. Pertimbangkan filter status pada konsol tenant lewat query param supaya tautan "desa nonaktif" / "siap purge" bisa langsung memfilter daftar.
