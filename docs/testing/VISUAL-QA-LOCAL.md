# Visual QA lokal (desktop 1440 & mobile 390)

Harness ini menjalankan aplikasi terhadap **database disposable** berisi fixture sintetis, lalu mengambil screenshot full-page pada viewport 1440×1000 dan 390×844 untuk dibandingkan dengan gambar referensi desain.

Semua data fiktif. Tidak ada koneksi ke database pengembangan/produksi: guard menolak DSN selain host loopback dan nama database `desa_visual_qa`/`desa_visual_qa_<suffix>`.

## Prasyarat

- Docker Desktop aktif (untuk MySQL 8 disposable), atau server MySQL/MariaDB lokal yang boleh dibuatkan database baru bernama `desa_visual_qa`.
- Node.js ≥ 22.12.
- Browser: Playwright mengunduh Chromium (`npx playwright install chromium`), **atau** gunakan Chrome/Edge yang sudah terpasang dengan `VISUAL_QA_CHANNEL=chrome`.

## 1. Siapkan database disposable

```bash
npm run visual:qa:db:up
```

Perintah ini menjalankan `compose.visual-qa.yml`: MySQL 8 pada `127.0.0.1:3307`, data di tmpfs (hilang saat container berhenti), database `desa_visual_qa`.

### Alternatif tanpa Docker

Bila Docker tidak tersedia tetapi ada server MySQL/MariaDB lokal yang boleh dibuatkan database baru, buat database terpisah dan arahkan harness ke sana:

```bash
# dengan kredensial server lokal Anda; nama database wajib desa_visual_qa*
export VISUAL_QA_DATABASE_URL="mysql://<user>:<password>@127.0.0.1:3306/desa_visual_qa"
```

`npm run visual:qa:migrate` membuat database tersebut bila belum ada. Database ini terpisah dari database pengembangan (`desa_dev`) dan dapat dihapus kapan saja dengan `DROP DATABASE desa_visual_qa`. Jangan mengarahkan `VISUAL_QA_DATABASE_URL` ke database pengembangan atau produksi — guard akan menolak nama di luar pola `desa_visual_qa*`.

## 2. Migrasi + fixture sintetis

```bash
export VISUAL_QA_DATABASE_ACK=1
export VISUAL_QA_DATABASE_URL="mysql://root:visual_qa_root@127.0.0.1:3307/desa_visual_qa"

npm run visual:qa:migrate
npm run visual:qa:seed
```

- `VISUAL_QA_DATABASE_ACK=1` wajib: pernyataan eksplisit bahwa target boleh dimigrasi dan diisi fixture.
- `VISUAL_QA_DATABASE_URL` opsional selama memakai DSN bawaan compose.
- `DATABASE_URL` pengembangan tidak pernah dibaca oleh skrip ini.

Seed membuat tenant `sukamaju.localhost` (Desa Suka Maju) berisi profil desa, perangkat, wilayah/keluarga/warga, agenda mendatang + arsip dua bulan lalu + satu draf, galeri, dokumen publik, halaman potensi, pengaduan, keuangan APBDes, jenis surat, dan layer GIS (Polygon, Feature, MultiPolygon, garis, titik).

Untuk mengulang dari nol:

```bash
npm run visual:qa:db:down
npm run visual:qa:db:up
npm run visual:qa:migrate
npm run visual:qa:seed
```

Skrip seed sengaja berhenti bila tenant contoh sudah ada, bukan menghapus data yang mungkin sudah diubah manual saat QA.

## 3. Jalankan aplikasi terhadap database visual

```bash
export DATABASE_URL="$VISUAL_QA_DATABASE_URL"
export DESA_BASE_DOMAIN=localhost
export APP_URL=http://127.0.0.1:3000
export BETTER_AUTH_URL=http://127.0.0.1:3000
export BETTER_AUTH_SECRET="visual-qa-only-secret-that-is-at-least-32-characters"

npm run build
NODE_ENV=production npm run start -- --hostname 127.0.0.1
```

Variabel yang di-export menimpa nilai `.env` lokal (Next.js tidak menimpa `process.env` yang sudah terisi), sehingga aplikasi tidak menyentuh database pengembangan. Jangan memakai secret nyata di sini.

`NODE_ENV=production` sengaja hanya diberikan ke proses `start`, bukan di-export: guard visual QA menolak `NODE_ENV=production` agar skrip tidak pernah dijalankan sebagai bagian dari pipeline produksi.

## 4. Ambil screenshot

Di terminal lain (aplikasi tetap berjalan):

```bash
export VISUAL_QA_DATABASE_ACK=1
npm run visual:qa:capture

# bila ingin memakai Chrome yang sudah terpasang, tanpa unduh Chromium:
VISUAL_QA_CHANNEL=chrome npm run visual:qa:capture
```

Hasil: `artifacts/visual-qa/<waktu>/` (gitignored)

```text
agenda-desktop.png        agenda-mobile.png
wilayah-desktop.png       wilayah-mobile.png
...
reference/agenda.png      reference/wilayah.png   (gambar desain, untuk dibandingkan)
```

Skrip memeriksa HTTP 200 lebih dulu untuk setiap route; bila ada route yang error, screenshot-nya tidak diambil dan skrip keluar dengan status 1 sambil menampilkan status HTTP dan cuplikan respons.

Skrip lokal mencakup 16 route publik: `agenda`, `galeri`, `galeri/kegiatan-desa`, `data/statistik`, `pemerintahan`, `wilayah`, `profil/sejarah`, `profil/visi-misi`, `dokumen`, `potensi`, `kontak`, `pengaduan`, `transparansi/apbdes`, `layanan`, `layanan/surat`, `profil`. Job `visual-qa.yml` mencakup 18 route publik (menambahkan `/` dan `/berita`) plus `/masuk`; daftar dan cakupannya **tidak identik** dengan skrip lokal. Workflow berjalan pada PR yang mengubah UI dan dapat dijalankan manual lewat `workflow_dispatch`.

## 5. Menilai hasil

Periksa untuk setiap halaman:

- desktop 1440: layout, hierarki, kepadatan, konsistensi komponen dengan referensi;
- mobile 390: tidak ada horizontal scroll, navigasi tetap dapat dipakai, tabel/grafik menyesuaikan;
- khusus `/agenda`: navigasi bulan tidak melewati batas, tombol nonaktif di batas, arsip bulan lampau dapat dibuka;
- khusus `/wilayah`: polygon tampil dengan skala bersama, posisi relatif benar, legenda sesuai layer.

Screenshot bukan bukti otomatis kelulusan visual: hasil tetap harus dibandingkan dengan `reference/` dan dicatat manual.

## Troubleshooting

| Gejala | Sebab / solusi |
| --- | --- |
| `failed to connect to the docker API` | Docker Desktop belum berjalan; jalankan lalu ulangi `visual:qa:db:up`. |
| `Host database ... ditolak` | DSN bukan loopback; harness hanya untuk lokal. |
| `VISUAL_QA_DATABASE_ACK wajib bernilai 1` | Setel `VISUAL_QA_DATABASE_ACK=1` setelah memastikan target disposable. |
| `Nama database ... tidak diizinkan` | Gunakan `desa_visual_qa` atau `desa_visual_qa_<suffix>`. |
| `Tenant contoh sudah ada` | Reset: `db:down` → `db:up` → `migrate` → `seed`. |
| `browserType.launch: Executable doesn't exist` | `npx playwright install chromium`, atau setel `VISUAL_QA_CHANNEL=chrome`. |
| Halaman tenant tampil 404 | Pastikan `DESA_BASE_DOMAIN=localhost` dan aplikasi dijalankan dengan `DATABASE_URL` database visual. |

## Catatan keamanan

- Database visual sengaja tanpa volume: `docker compose down` menghapus seluruh datanya.
- Guard (`scripts/visual-qa/guard.mjs`) diuji di `src/testing/visual-qa-guard.test.ts`, termasuk penolakan host non-loopback, nama database pengembangan/produksi, query string, dan `NODE_ENV=production`.
- Fixture memakai nama, nomor keluarga, dan kontak fiktif; jangan menggantinya dengan data warga asli.
