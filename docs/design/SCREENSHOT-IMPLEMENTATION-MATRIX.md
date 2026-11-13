# Matriks Screenshot → Halaman → Komponen → Route → Status

> Baseline repository: `main` commit `343ef35a7858303eb82afc69c8caca7848a1a8e7`.
> Matriks ini memisahkan **referensi desain**, **rute yang diusulkan**, dan **bukti implementasi aktual**.

## Definisi status

- **Reference exists**: screenshot tersedia.
- **Route candidate**: pola URL yang disarankan; belum berarti route telah dibuat.
- **Backend evidence**: domain/use case/API/route handler terkait teridentifikasi.
- **UI not found**: file halaman Next.js/komponen UI untuk halaman tersebut tidak ditemukan pada baseline yang diperiksa.
- **Needs validation**: perlu walkthrough dan verifikasi alur/permission.

Tidak ada screenshot yang diberi status “implemented” hanya karena nama modul atau backend-nya ditemukan.

## A. Website publik desa

| Screenshot | Halaman/tujuan | Komponen utama | Route kandidat | Bukti/status baseline |
|---|---|---|---|---|
| Sistem Informasi Desa Suka Maju.png | Beranda desa | Public shell, hero, berita terbaru, ringkasan, agenda, footer | `/` | Referensi ada; UI page belum ditemukan |
| Profil Desa Suka Maju_ Informasi dan Potensi Desa.png | Profil desa | Breadcrumb, profile header, content section, media | `/profil` | Referensi ada; UI page belum ditemukan |
| Sejarah Desa Suka Maju_ Jejak Perjalanan Desa.png | Sejarah | Timeline/content, media | `/profil/sejarah` | Referensi ada; UI page belum ditemukan |
| Visi & Misi Desa Suka Maju.png | Visi dan misi | Page header, content cards | `/profil/visi-misi` | Referensi ada; UI page belum ditemukan |
| Pemerintahan Desa Suka Maju Dashboard.png | Struktur pemerintahan | Organization chart/list, official card | `/pemerintahan` | Referensi ada; UI page belum ditemukan |
| Village Official Profile Dashboard.png | Detail perangkat | Official profile, role/contact | `/pemerintahan/perangkat/[slug]` | Referensi ada; UI page belum ditemukan |
| Wilayah Desa Suka Maju.png | Wilayah | Region list/map, hierarchy | `/wilayah` | Referensi ada; backend wilayah/GIS perlu dipetakan; UI page belum ditemukan |
| Village News Dashboard – Desa Suka Maju.png | Daftar berita | Search/filter, article card, pagination | `/berita` | Referensi ada; konten backend teridentifikasi; UI page belum ditemukan |
| Berita Gotong Royong Desa Suka Maju.png | Detail berita | Article header, body, author/date, related content | `/berita/[slug]` | Referensi ada; UI page belum ditemukan |
| Pengumuman Musdes Desa Suka Maju.png | Pengumuman | Announcement list/detail, status/date | `/pengumuman` | Referensi ada; UI page belum ditemukan |
| Agenda Kegiatan Desa Suka Maju.png | Agenda | Event list/calendar, date badge | `/agenda` | Referensi ada; backend agenda teridentifikasi; UI page belum ditemukan |
| Suka Maju Village Gallery Dashboard.png | Galeri | Gallery grid, category/filter | `/galeri` | Referensi ada; UI page belum ditemukan |
| Desa Suka Maju Photo Gallery.png | Tampilan galeri/foto | Masonry/grid, lightbox | `/galeri/foto` | Referensi ada; UI page belum ditemukan |
| Potensi Desa Suka Maju Dashboard.png | Potensi desa | Potential cards, category, detail | `/potensi` | Referensi ada; UI page belum ditemukan |
| Data Statistik Desa Suka Maju Dashboard.png | Statistik publik | KPI, chart, data table, source note | `/data/statistik` | Referensi ada; backend statistik teridentifikasi; UI page belum ditemukan |
| Desa Suka Maju APBDes Dashboard.png | APBDes | Budget summary, category chart, document list | `/transparansi/apbdes` | Referensi ada; backend keuangan/APBDes teridentifikasi; UI page belum ditemukan |
| Indonesian Village Finance Dashboard.png | Keuangan desa | Financial summary, report cards, documents | `/transparansi/keuangan` | Referensi ada; backend keuangan teridentifikasi; UI page belum ditemukan |
| Desa Sukamaju Online Services.png | Katalog layanan | Service cards, requirements, CTA | `/layanan` | Referensi ada; layanan mandiri backend teridentifikasi; UI page belum ditemukan |
| Suka Maju Online Letter Services Dashboard.png | Layanan surat online | Letter catalog, application form/status | `/layanan/surat` | Referensi ada; backend surat/layanan teridentifikasi; UI page belum ditemukan |
| Kontak & Pengaduan Desa Suka Maju.png | Kontak/pengaduan | Contact info, complaint form, map | `/kontak` | Referensi ada; backend kontak/pengaduan teridentifikasi; UI page belum ditemukan |
| Suka Maju Village Information Dashboard.png | Informasi desa | Information cards/list | `/informasi` | Referensi ada; UI page belum ditemukan |

## B. Akun dan autentikasi

| Screenshot | Halaman/tujuan | Komponen utama | Route kandidat | Bukti/status baseline |
|---|---|---|---|---|
| Modern Indonesian Village Login Portal.png | Login | Auth shell, email/username, password, validation | `/masuk` | Auth backend teridentifikasi; UI page belum ditemukan |
| SID Desa Sukamaju Registration Page.png | Registrasi | Registration form, terms link | `/daftar` | Flow dan eligibility perlu validasi; UI page belum ditemukan |
| SID Desa Sukamaju OTP Verification.png | Verifikasi OTP | OTP input, resend, expiry notice | `/verifikasi` | UI page belum ditemukan; provider/flow perlu validasi |
| SID Desa Sukamaju_ Akun Terverifikasi.png | Konfirmasi verifikasi | Success state, next action | `/akun/terverifikasi` | UI page belum ditemukan |
| SID Desa Sukamaju Reset Kata Sandi.png | Reset kata sandi | New password, confirmation, policy | `/reset-password` | Auth backend teridentifikasi; UI page belum ditemukan |
| Reset Kata Sandi SID Desa Sukamaju.png | Minta reset kata sandi | Email input, confirmation notice | `/lupa-password` | Auth backend teridentifikasi; UI page belum ditemukan |
| Sukamaju Village Profile Dashboard.png | Profil pengguna | Profile summary, avatar, personal fields | `/akun/profil` | UI page belum ditemukan |
| Edit Profil Pengguna SID Desa Sukamaju.png | Edit profil | Profile form, save/cancel | `/akun/profil/edit` | UI page belum ditemukan |
| Pengaturan Keamanan Akun Desa Sukamaju.png | Keamanan akun | Password/session/security settings | `/akun/keamanan` | UI page belum ditemukan |
| SID Desa Sukamaju Notification Settings Dashboard.png | Preferensi notifikasi | Notification toggles/preferences | `/akun/notifikasi` | Backend notifikasi teridentifikasi; UI page belum ditemukan |
| Riwayat Pengajuan Layanan Desa Sukamaju.png | Riwayat layanan warga | Status timeline, request list, detail link | `/akun/layanan` | Layanan mandiri backend teridentifikasi; UI page belum ditemukan |

## C. Halaman pendukung

| Screenshot | Halaman/tujuan | Komponen utama | Route kandidat | Bukti/status baseline |
|---|---|---|---|---|
| SID Desa Sukamaju 404 Page.png | Halaman tidak ditemukan | Error shell, back/home CTA | `/not-found` | Screenshot ada; UI page belum ditemukan |
| SID Desa Sukamaju Maintenance Page.png | Maintenance | Status notice, expected return/help | `/maintenance` | Screenshot ada; UI page belum ditemukan |
| Akses Ditolak di Desa Sukamaju.png | Akses ditolak | Forbidden notice, safe navigation | `/forbidden` | Auth/permission backend ada; UI page belum ditemukan |
| SID Desa Sukamaju Search Results.png | Hasil pencarian | Search field, result list, empty state | `/pencarian?q=...` | UI page belum ditemukan |
| Sitemap Desa Sukamaju Website.png | Sitemap | Hierarchical link list | `/sitemap` | UI page belum ditemukan |
| Kebijakan Privasi SID Sukamaju.png | Kebijakan privasi | Legal content, section navigation | `/kebijakan-privasi` | UI page belum ditemukan |
| Syarat dan Ketentuan SID Desa Sukamaju.png | Syarat dan ketentuan | Legal content, section navigation | `/syarat-ketentuan` | UI page belum ditemukan |

## D. Area produk yang belum memiliki screenshot pada inventaris ini

Fitur berikut ada di peta fitur/roadmap, tetapi tidak memiliki screenshot khusus pada 39 aset yang terinventarisasi. Desain baru diperlukan setelah scope MVP dan role disepakati:

- Dashboard Admin Desa dan navigasi operasional.
- Manajemen penduduk, keluarga, rumah tangga, mutasi, dan wilayah.
- Inbox surat masuk/keluar, disposisi, verifikasi, dan arsip surat.
- Form dan dashboard IDM/SDGs.
- Dashboard Super Admin platform dan lifecycle tenant.
- Provisioning desa, pengaturan domain, paket, kuota, suspend/reactivate.
- Bantuan sosial, kelompok, inventaris, pembangunan, KIA, kehadiran, arsip, anjungan.
- Pengaturan modul, role/permission, audit log, backup/restore, monitoring.

## E. Cara menutup matriks

Untuk setiap baris:
1. Pastikan file screenshot dapat dibuka dan identifikasi viewport/varian.
2. Tentukan route final dan role yang boleh mengakses.
3. Temukan atau implementasikan page/layout/component.
4. Catat status: `not started`, `in progress`, `implemented`, `visually reviewed`, `accepted`.
5. Lampirkan PR/commit dan bukti test/visual review.
6. Pastikan data yang ditampilkan berasal dari tenant aktif dan izin server-side.

## F. Temuan baseline yang memengaruhi rencana

Struktur `src/app` pada baseline memuat route handler ekspor, PDF, dan API; pemeriksaan file tidak menemukan `page.tsx`, `page.ts`, `layout.tsx`, `layout.ts`, atau komponen React `.tsx/.jsx`. Dengan demikian, dokumen ini tidak mengklaim halaman UI sudah ada. Sebelum frontend dibangun, perlu keputusan eksplisit apakah UI lama memang sengaja dihapus dan desain di `docs/` menjadi spesifikasi utama.

## Referensi

- [Inventaris screenshot](./SCREENSHOT-INVENTORY.md)
- [Design System](./DESIGN-SYSTEM.md)
- [Peta fitur SID](../SID_FEATURE_MAP.md)
- [Master roadmap](../MASTER_ROADMAP.md)
