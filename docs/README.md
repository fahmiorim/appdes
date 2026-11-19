# Dokumentasi Appdes SID

Indeks dokumen repository. Gunakan halaman ini untuk menentukan dokumen mana yang menjadi acuan aktif dan mana yang merupakan snapshot historis.

## Dokumen acuan

| Dokumen | Isi |
|---|---|
| [MASTER_ROADMAP.md](./MASTER_ROADMAP.md) | Urutan fase, prioritas, dependensi, dan Definition of Done |
| [SID_FEATURE_MAP.md](./SID_FEATURE_MAP.md) | Peta modul, status bukti implementasi, dan pekerjaan lanjutan |
| [TECHNICAL_AUDIT.md](./TECHNICAL_AUDIT.md) | Temuan audit teknis dan kontrol positif |
| [AGENTS.md](../AGENTS.md) | Aturan kerja, keamanan multi-tenant, dan format laporan |

## Struktur

| Folder | Fungsi |
|---|---|
| [`architecture/`](./architecture/) | Arsitektur sistem, model multi-tenant, dan inventaris modul |
| [`decisions/`](./decisions/) | Architecture Decision Record (ADR) |
| [`deployment/`](./deployment/) | Instalasi, environment, database, backup, dan operasi |
| [`design/`](./design/) | Spesifikasi desain yang masih menjadi acuan implementasi |
| [`mockups/`](./mockups/) | 126 gambar referensi UI, dikelompokkan per area |
| [`testing/`](./testing/) | Peta integration test dan panduan visual QA |
| [`reports/`](./reports/) | Laporan task, audit, dan snapshot hasil pemeriksaan |

## Membedakan dokumen aktif dan historis

- **Aktif** — dokumen di akar `docs/`, `architecture/`, `decisions/`, `deployment/`, `design/`, `mockups/`, dan `testing/`. Perbarui bila kontrak, status, atau prosedurnya berubah.
- **Snapshot** — laporan di `reports/`. Isinya merekam kondisi saat task dikerjakan dan tidak boleh ditulis ulang seolah kondisi sekarang.
- **Arsip** — laporan atau audit lama di `reports/**/archive/`. Dipertahankan untuk jejak audit; jangan dijadikan acuan status terbaru.

Laporan historis tidak dihapus hanya karena sudah digantikan. Penghapusan hanya dilakukan bila isinya benar-benar duplikat dan tidak memiliki informasi unik. Bila sebuah laporan digantikan, tambahkan rujukan ke penggantinya dan pindahkan ke `archive/`.

## Menambah dokumen

- Spesifikasi desain baru: `design/`.
- Mockup baru: subfolder yang sesuai di `mockups/`.
- Panduan pengujian: `testing/`.
- Laporan task/audit: folder fase atau area di `reports/`, dengan nama deskriptif dan tanggal.
- Keputusan arsitektur: `decisions/`.

Jangan menaruh screenshot di root `docs/` atau mencampurnya dengan laporan. Jangan menautkan file di luar repository untuk bukti yang dibutuhkan reviewer.
