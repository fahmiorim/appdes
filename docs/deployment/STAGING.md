# Build dan Verifikasi Staging

Dokumen ini adalah prosedur minimum untuk membangun staging Appdes SID dari
repository, tanpa memakai data production. Staging harus memakai database dan
direktori media terpisah dari production.

> Status snapshot: prosedur ini ditinjau pada `main` commit `f19267d`
> (17 November 2026). `npm ci` dan `npm run build` berhasil dijalankan pada
> snapshot tersebut dengan environment build-only. Keberhasilan build bukan
> bukti bahwa staging sudah di-deploy; deployment tetap memerlukan server,
> domain, dan kredensial yang disediakan operator.

## 1. Prasyarat

- Node.js 22.x (CI memakai 22.22.1; `package.json` mensyaratkan `>=22.12.0`).
- MySQL 8.0.x untuk database staging.
- Salinan repository pada commit/tag yang disetujui.
- Domain staging dan reverse proxy HTTPS (lihat [README.md](./README.md)).
- Kredensial staging yang **bukan** kredensial production.

## 2. Siapkan database staging

Buat database dan user khusus staging. Jangan memakai database production atau
database test integration.

```bash
mysql -u root -p <<'SQL'
CREATE DATABASE sid_staging CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sid_staging'@'127.0.0.1' IDENTIFIED BY 'GANTI_PASSWORD_STAGING';
GRANT ALL PRIVILEGES ON sid_staging.* TO 'sid_staging'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
```

Simpan password hanya di `.env` staging dengan permission `600`.

## 3. Environment staging

```bash
cp .env.example .env
chmod 600 .env
```

Isi minimum:

```dotenv
NODE_ENV=production
APP_URL=https://staging.example.go.id
BETTER_AUTH_URL=https://staging.example.go.id
BETTER_AUTH_SECRET=GANTI_DENGAN_SECRET_STAGING_MINIMAL_32_KARAKTER
DATABASE_URL=mysql://sid_staging:GANTI_PASSWORD_STAGING@127.0.0.1:3306/sid_staging
NEXT_PUBLIC_APP_NAME=SID Staging
TRUST_PROXY=true
```

`TRUST_PROXY=true` hanya jika reverse proxy staging menimpa header forwarded.
Jangan menyalin `.env` production ke staging.

## 4. Install, migrasi, dan build

```bash
npm ci
npm run db:migrate
npm run build
```

`npm run db:migrate` harus selesai sebelum aplikasi dijalankan. Jika migrasi
gagal, jangan lanjut ke build/deploy; periksa koneksi dan backup database
staging.

## 5. Jalankan dan periksa

```bash
npm start
```

Di terminal lain, periksa endpoint health yang tidak memerlukan sesi:

```bash
curl -fsS -o /dev/null -w 'HTTP %{http_code}\n' \
  http://127.0.0.1:3000/api/publik/openapi
```

Lalu periksa melalui domain staging:

```bash
curl -I https://staging.example.go.id
curl -fsS -H 'Host: staging.example.go.id' \
  http://127.0.0.1:3000/api/publik/informasi | head -c 500
```

Halaman `/masuk` dan `/` dapat dibuka setelah tenant staging tersedia. Bootstrap
Super Admin/tenant pertama belum tersedia sebagai perintah repository; gunakan
dump baseline yang disetujui (lihat [DATABASE.md](./DATABASE.md) bagian 6).

## 6. Integration test pada database disposable

Integration test **tidak boleh** diarahkan ke staging yang berisi data penting.
Gunakan database MySQL disposable terpisah:

```bash
export TEST_DATABASE_URL='mysql://test:test@127.0.0.1:3306/desa_test_staging'
export TEST_DATABASE_ACK=1
npm run test:integration:ci
```

`test:integration:ci` gagal bila environment database tidak tersedia, sehingga
CI tidak dapat melaporkan integration test lulus karena di-skip. Untuk menjalankan
runner lokal tanpa database, `npm run test:integration` akan mencetak status
`SKIPPED`; status itu bukan bukti integrasi lulus.

## 7. Checklist kesiapan staging

- [ ] Database staging terpisah dan kredensial bukan production.
- [ ] `npm ci` selesai tanpa error.
- [ ] `npm run db:migrate` selesai dan 12 migrasi tercatat.
- [ ] `npm run build` selesai tanpa error.
- [ ] Service berjalan sebagai user non-root.
- [ ] `/api/publik/openapi` merespons 200.
- [ ] Domain staging dan HTTPS valid.
- [ ] Backup database staging dibuat sebelum pengujian yang mengubah data.
- [ ] Bootstrap tenant/Super Admin pertama disetujui dan diuji.
- [ ] Tidak ada secret atau data pribadi di log, screenshot, atau laporan.
