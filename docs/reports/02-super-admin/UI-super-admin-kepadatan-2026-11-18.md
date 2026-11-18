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
- Topbar platform menampilkan dua baris konteks “Ruang kerja administrasi” + “Super Admin Platform” di atas judul halaman, sehingga judul baru muncul setelah 72 px topbar + 30 px padding konten. Teks itu mengulang halaman yang sedang dibuka.
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
| `src/components/shell/admin-topbar.tsx` | Topbar tidak lagi merender konteks “Ruang kerja administrasi / Super Admin Platform” untuk akun platform. |
| `src/app/(admin)/layout.tsx` | Meneruskan `isPlatformAdmin` ke topbar dan berhenti mengisi `villageName` dengan label platform. |
| `src/app/globals.css` | Netralkan dekorasi ganda baris perhatian, perbaiki jarak ganda panel/toolbar/pagination, rapatkan padding halaman dan kartu, rapatkan jarak logo → label menu platform. |
| `src/app/(admin)/super-admin/page.test.ts` | Test regresi: baris perhatian bernilai nol tidak dirender. |

## 4. Perubahan

- `PlatformStat` menjadi satu-satunya bentuk kartu statistik konsol; seluruh halaman memakai ikon `StatIcon` yang konsisten.
- Ringkasan: tiga tingkat pengantar (judul halaman + heading seksi) menjadi satu; panel "Perlu perhatian" hanya berisi kondisi nyata, dengan keadaan kosong "Tidak ada tindakan tertunda".
- Tindakan purge kini menautkan ke `/super-admin/tenant` (tempat aksinya), bukan halaman audit.
- Kolom aksi yang identik untuk semua baris dihapus dari tabel ringkasan dan domain; aksi tingkat halaman tetap ada di kepala kartu.
- Jarak vertikal: padding konten `34/64px` → `30/44px`, judul halaman `28px` → `22px`, grid statistik `22px` → `18px`, kepala kartu `20px 22px` → `16px 20px`, badan kartu `20px 22px` → `18px 20px`, panel kanan tidak lagi mendapat margin ganda.
- Topbar konsol platform menjadi satu baris tipis (54 px) berisi identitas pengguna dan tombol Keluar saja, sehingga judul halaman menjadi elemen pertama area konten (padding atas 30 px → 14 px). Topbar admin desa tidak berubah.
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
| `npm run check` (typecheck + lint + format:check + unit test), dijalankan setelah seluruh perubahan termasuk sidebar | PASS — 215 file test, 1888 test lulus |
| `node node_modules/vitest/vitest.mjs run "src/app/(admin)/super-admin/page.test.ts" --config vitest.config.mts` | PASS — 4 test |
| Pemeriksaan visual di browser (desktop/mobile, dark mode) | SKIPPED — tidak ada sesi browser pada lingkungan ini dan integration/browser test butuh database lokal yang sedang tidak berjalan (`ECONNREFUSED 127.0.0.1:3306`) |
| `npm run build` | SKIPPED — diverifikasi oleh job build di CI |

## 7. Risiko dan keterbatasan

- Judul halaman tidak dipindahkan secara literal ke dalam bar topbar: di Next.js, layout bersama tidak menerima judul milik halaman. Yang dilakukan adalah menghapus konteks duplikat dari topbar dan menaikkan judul halaman ke posisi paling atas area konten. Bila judul harus benar-benar sebaris dengan tombol Keluar, perlu perubahan struktur (mis. judul per halaman dirender lewat slot/parallel route).

- Perubahan CSS belum dilihat pada render nyata. Dua lapis `.platform-*` masih ada; perbaikan dilakukan dengan menimpa deklarasi yang bertabrakan, bukan dengan menggabungkan seluruh blok. Penggabungan menyeluruh (menghapus blok lama) perlu port media query dan kelas yang hanya didefinisikan di blok lama, sehingga sengaja tidak dilakukan dalam task ini.
- `PlatformStat` memakai markup `Card` + `StatIcon` yang sudah ada, tanpa kelas baru, sehingga tidak perlu aturan CSS tambahan.
- Test regresi memakai `renderToStaticMarkup` pada pohon hasil resolve; `Card` dimock `null` di test, jadi isi kartu statistik tidak diuji, hanya struktur panel perhatian dan keadaan kosongnya.
- Pemangkasan kolom "Aksi" mengasumsikan operator memakai tombol tingkat halaman atau membuka konsol tenant; belum ada deep-link per baris sejak awal.

## 8. Rekomendasi berikutnya

1. Walkthrough browser di staging: bandingkan jarak antarseksi, bentuk kartu statistik, baris perhatian, dan jarak logo → menu sidebar pada 1440 px, 1024 px, dan 360 px.
2. Setelah tampilan disetujui, gabungkan dua lapis CSS `.platform-*` menjadi satu blok dengan media query yang dipindahkan, agar tidak ada lagi deklarasi yang saling menimpa.
3. Pertimbangkan filter status pada konsol tenant lewat query param supaya tautan "desa nonaktif" / "siap purge" bisa langsung memfilter daftar.
