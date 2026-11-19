# Deployment Appdes SID

Dokumen ini menjelaskan cara memasang, mengonfigurasi, dan menjalankan Appdes SID
di server Linux. Isinya disusun dari implementasi yang ada di repository, bukan
dari asumsi fitur yang belum tersedia.

> **Status snapshot repository**
>
> Dokumen ini ditinjau terhadap `main` pada commit `f19267d` (17 November 2026).
> Pada commit tersebut:
>
> - `src/app` berisi 29 `page.tsx` dan 2 `layout.tsx`: login `/masuk`, dashboard
>   admin `/beranda`, layanan mandiri warga, halaman publik, dan dashboard
>   `/super-admin` untuk memantau tenant.
> - Bootstrap Super Admin platform tersedia lewat `npm run platform:bootstrap`
>   (lihat bagian 6.1). Database hasil migrasi berisi skema kosong sampai
>   perintah itu dijalankan, dan perintah tersebut menolak bila akun platform
>   sudah ada.
> - Desa baru dibentuk dari template platform di
>   `src/db/templates/tenant-template.ts`, tidak lagi dengan menyalin desa
>   pertama. Template bawaan masih minimal dan halaman/konsol pengelolaan tenant
>   di UI belum lengkap.
> - Belum ada Dockerfile, konfigurasi PM2, konfigurasi Nginx, atau unit systemd
>   di repository. Contoh di dokumen ini adalah pilihan operasional, bukan file
>   yang disediakan aplikasi.
> - `npm run build` diverifikasi berhasil pada snapshot ini, termasuk job build
>   di CI. Build memerlukan environment valid; lihat [ENVIRONMENT.md](./ENVIRONMENT.md).
>
> Prosedur instalasi sampai aplikasi berjalan dapat diikuti. Bootstrap Super
> Admin memakai perintah pada bagian 6.1; pembuatan tenant dilakukan dari
> template platform. Temuan historis ada di
> [`docs/reports/00-baseline/deployment-documentation-report.md`](../reports/00-baseline/deployment-documentation-report.md).

## 1. Ruang lingkup

Dokumen ini mencakup:

- persiapan server dan dependency;
- konfigurasi environment;
- pembuatan database dan migrasi;
- build dan menjalankan proses Node;
- reverse proxy, HTTPS, serta domain multi-tenant;
- pemeriksaan setelah deployment dan troubleshooting umum.

Dokumen pendukung:

| Dokumen | Isi |
|---|---|
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Semua variabel environment yang benar-benar dibaca kode |
| [DATABASE.md](./DATABASE.md) | MySQL, migrasi, perbedaan development/testing/production |
| [BACKUP-RESTORE.md](./BACKUP-RESTORE.md) | Backup DB, media, restore, verifikasi, dan recovery |
| [OPERATIONS.md](./OPERATIONS.md) | Start/stop, log, health check, pemeliharaan, insiden |
| [STAGING.md](./STAGING.md) | Build dan verifikasi staging dengan database terpisah |

## 2. Arsitektur aplikasi

```text
Pengguna / API client
        |
        | HTTPS (443)
        v
Reverse proxy (TLS, Host/X-Forwarded-*)
        |
        | HTTP loopback (3000)
        v
Node.js + Next.js 16 (satu proses persisten)
   |          |                  |
   |          |                  +--> storage/media/<villageId>/...
   |          |                  +--> storage/whatsapp-auth (opsional)
   |          +--> MySQL 8 (satu database, isolasi village_id)
   +--> mysqldump/mysql (backup & restore database)
```

Karakteristik yang memengaruhi deployment:

- **Next.js 16 App Router** dengan route handler dan Server Action. Tidak ada
  output `standalone` pada `next.config.ts`; jalankan aplikasi dengan
  `next start` dari direktori proyek yang sudah di-build.
- **MySQL** diakses melalui `mysql2` dengan connection pool berukuran 10 per
  proses. Satu database menampung banyak desa; setiap tabel transaksional
  memakai `village_id`.
- **Better Auth** menangani sesi dan login. Sesi memakai cookie host-only,
  berlaku 7 hari, dan diperpanjang setelah dipakai.
- **Media** disimpan di disk lokal, bukan object storage. Direktori harus
  persisten dan tidak boleh hilang saat redeploy.
- **Tenant publik** ditentukan dari header `Host` saja, lalu dicocokkan dengan
  `villages.domain`, `village_domains`, dan slug wildcard
  `<slug>.<DESA_BASE_DOMAIN>`. `X-Forwarded-Host` tidak dipakai memilih tenant;
  reverse proxy wajib mempertahankan `Host` asli. Host yang tidak dikenal
  menghasilkan 404 pada instalasi multi-desa.
- **WhatsApp** memakai Baileys dan membutuhkan proses Node yang hidup terus.
  Koneksi dibuka saat pengiriman pertama; QR muncul di log server.
- **Backup/restore database** tersedia sebagai route handler khusus platform
  Super Admin. Backup media tidak termasuk di dalamnya.

## 3. Persyaratan server

### 3.1 Software minimum

| Komponen | Versi/ketentuan | Catatan |
|---|---|---|
| Linux | x86_64/arm64, systemd disarankan | Perintah contoh memakai bash dan systemd |
| Node.js | **22.x** | `package.json` mensyaratkan `>=22.12.0`; CI memakai Node 22.22.1 |
| npm | Mengikuti Node 22 | Gunakan `npm ci`, bukan `npm install`, untuk reproducible install |
| MySQL | **8.0.x** | CI memakai image `mysql:8.0`; kompatibilitas MariaDB belum diuji |
| MySQL client | `mysql` dan `mysqldump` | Dibutuhkan fitur backup/restore aplikasi |
| Git | Versi terbaru yang tersedia | Untuk mengambil source dari repository |
| Reverse proxy | Nginx, Caddy, atau lainnya | Tidak ada konfigurasi proxy di repository |
| Tools operasi | `curl`, `tar`, `gzip`, `sha256sum` | Untuk health check dan backup manual |

Jangan memakai Node 20 hanya karena batas minimum `package.json`. Samakan versi
runtime dengan CI (Node 22) agar hasil build dan perilaku modul konsisten.

### 3.2 Kapasitas

Repository tidak memuat hasil benchmark kapasitas. Ukuran CPU, RAM, dan disk
harus ditentukan dari volume data serta uji beban sendiri. Untuk perkiraan awal:

- build Next.js membutuhkan memori lebih besar daripada runtime;
- setiap proses aplikasi membuka sampai 10 koneksi MySQL;
- media dan backup menempati disk lokal;
- endpoint backup aplikasi menampung seluruh dump di memori Node (lihat
  [BACKUP-RESTORE.md](./BACKUP-RESTORE.md)), sehingga database besar memerlukan
  RAM yang jauh lebih besar atau backup CLI.

Jangan menganggap angka kapasitas apa pun di dokumen ini sebagai jaminan
performa.

### 3.3 Port dan jaringan

| Port | Akses | Fungsi |
|---|---|---|
| 443 | Publik | HTTPS melalui reverse proxy |
| 80 | Publik | Redirect ke HTTPS |
| 3000 | Loopback saja | Proses Next.js |
| 3306 | Loopback/private network | MySQL; jangan diekspos ke internet |

Batasi akses langsung ke port 3000 dan 3306 dengan firewall. Jika aplikasi
diakses langsung tanpa proxy, tenant dapat dipengaruhi header yang dikirim
klien; konfigurasi yang didukung adalah di belakang reverse proxy tepercaya.

## 4. Persiapan server

Semua contoh memakai:

```bash
APP_USER=appdes
APP_DIR=/opt/appdes/app
APP_PORT=3000
```

Jalankan perintah yang membutuhkan hak administrator dengan `sudo`.

### 4.1 Buat user dan direktori

```bash
sudo useradd --system --create-home --home-dir /opt/appdes \
  --shell /usr/sbin/nologin "$APP_USER"
sudo install -d -o "$APP_USER" -g "$APP_USER" /opt/appdes
sudo install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR"
```

Gunakan user khusus aplikasi. Jangan menjalankan proses Node sebagai `root`.

### 4.2 Sinkronkan waktu dan pasang dependency sistem

```bash
sudo timedatectl set-ntp true
sudo apt-get update
sudo apt-get install -y git curl ca-certificates mysql-client gzip tar
```

Nama paket berbeda di distribusi lain. Pastikan `mysql` dan `mysqldump` berasal
dari versi client yang kompatibel dengan server MySQL 8.0.

### 4.3 Ambil source

```bash
sudo -u "$APP_USER" git clone https://github.com/fahmiorim/appdes.git "$APP_DIR"
cd "$APP_DIR"
sudo -u "$APP_USER" git fetch --tags
COMMIT_SHA=GANTI_DENGAN_COMMIT_ATAU_TAG_YANG_DISETUJUI
sudo -u "$APP_USER" git checkout "$COMMIT_SHA"
```

Untuk production, gunakan commit atau tag yang sudah disetujui, bukan branch
kerja yang bergerak. Jangan menaruh token Git atau credential di URL clone.

### 4.4 Instal dependency

```bash
cd "$APP_DIR"
sudo -u "$APP_USER" npm ci
```

`npm ci` membutuhkan `package-lock.json`. Jangan memakai `npm install` untuk
deployment karena dapat mengubah lockfile.

## 5. Konfigurasi environment

```bash
cd "$APP_DIR"
sudo -u "$APP_USER" cp .env.example .env
sudo chown "$APP_USER:$APP_USER" .env
sudo chmod 600 .env
```

Isi nilai sebenarnya di `.env`. Jangan commit `.env`, jangan menyalinnya ke
tiket, chat, atau laporan. Variabel wajib minimum:

```dotenv
NODE_ENV=production
APP_URL=https://sid.example.go.id
BETTER_AUTH_URL=https://sid.example.go.id
BETTER_AUTH_SECRET=GANTI_DENGAN_SECRET_ACAK_MINIMAL_32_KARAKTER
DATABASE_URL=mysql://sid_app:GANTI_PASSWORD_DB@127.0.0.1:3306/sid_production
NEXT_PUBLIC_APP_NAME=SID Desa Contoh
TRUST_PROXY=true
```

- `BETTER_AUTH_SECRET` harus acak dan minimal 32 karakter. Contoh pembuatan:
  `openssl rand -hex 32`.
- `DATABASE_URL` harus URL-encode karakter khusus pada password.
- `TRUST_PROXY=true` hanya boleh dipakai bila reverse proxy benar-benar
  menimpa `X-Forwarded-For` dan `X-Real-IP` (identitas IP klien). Pemilihan
  tenant tidak bergantung pada nilai itu: aplikasi hanya membaca `Host`.
- `NEXT_PUBLIC_APP_NAME` di-inline saat build; mengubahnya memerlukan build
  ulang.

Penjelasan setiap variabel, termasuk variabel opsional, ada di
[ENVIRONMENT.md](./ENVIRONMENT.md).

## 6. Database dan migrasi

Database harus dibuat sebelum aplikasi dijalankan. Jangan memakai database
development atau testing untuk production.

Ringkasan prosedur (detail di [DATABASE.md](./DATABASE.md)):

```bash
# 1. Buat database dan user dengan hak minimum (lihat DATABASE.md).
# 2. Pastikan .env dapat dibaca proses dan DATABASE_URL menunjuk DB yang benar.
cd "$APP_DIR"
sudo -u "$APP_USER" npm run db:migrate
```

Aturan penting:

- Gunakan `npm run db:migrate` untuk menerapkan migrasi yang ada.
- **Jangan** memakai `npm run db:push` di production. Perintah itu menyamakan
  skema secara langsung dan dapat menghapus/mengubah objek tanpa prosedur
  persetujuan.
- **Jangan** mengarahkan `TEST_DATABASE_URL` atau `npm run test:integration`
  ke database production. Integration test membuat database, menjalankan
  migrasi, dan menulis fixture.
- Buat backup sebelum migrasi apa pun pada database yang sudah berisi data.
- Repository saat ini memiliki 16 migrasi: baseline
  `src/db/migrations/0000_baseline.sql` dan `0001`–`0015` untuk composite
  foreign key, kontrol tenant, lifecycle tenant, serta menu penduduk dan
  pengguna/grup akses. Tidak ada migrasi rollback
  otomatis; pemulihan dilakukan dari backup.

### 6.1 Bootstrap Super Admin dan desa pertama

Setelah `db:migrate`, skema terbentuk tetapi belum ada akun maupun desa. Buat
pengelola platform lebih dulu dengan skrip repository. Setelah bootstrap,
buat desa pertama dari konsol `/super-admin`:

```bash
cd "$APP_DIR"
sudo -u "$APP_USER" env \
  PLATFORM_ADMIN_NAME='Nama Pengelola' \
  PLATFORM_ADMIN_USERNAME=platform \
  PLATFORM_ADMIN_EMAIL=platform@contoh.id \
  PLATFORM_ADMIN_PASSWORD='sandi-acak-minimal-12-karakter' \
  npm run platform:bootstrap -- --yes
```

Jalankan sekali tanpa `--yes` untuk melihat target database dan rencana; skrip
hanya menulis bila flag itu diberikan. Skrip menolak berjalan bila sudah ada
akun platform (`village_id IS NULL`), sehingga tidak pernah menimpa akun lama.
Sandi dibaca dari environment (bukan argumen) dan wajib diganti pada login
pertama.

Desa baru kemudian dibuat dari konsol/dashboard Super Admin. Fondasinya berasal
dari template platform `src/db/templates/tenant-template.ts`, bukan dari desa
lain, sehingga instalasi baru tidak membutuhkan desa sumber. Template bawaan
masih minimal; katalog surat, buku bumindes, dan kategori inventaris sengaja
tidak diwariskan dan disiapkan oleh administrator desa.

Jangan menganggap endpoint sign-up Better Auth sebagai prosedur instalasi resmi.
Akun yang dibuat lewat sign-up tidak otomatis memiliki `villageId`, role, atau
akses modul. Rincian ada di [DATABASE.md](./DATABASE.md) bagian 6.

## 7. Build dan menjalankan aplikasi

### 7.1 Build

```bash
cd "$APP_DIR"
sudo -u "$APP_USER" npm run build
```

Build harus selesai tanpa error. `next.config.ts` tidak memakai output
`standalone`, sehingga direktori `.next`, `node_modules`, `package.json`, dan
`public` (bila ada) harus tetap tersedia saat runtime.

### 7.2 Uji jalan manual

Lakukan uji singkat sebelum memasang service manager:

```bash
cd "$APP_DIR"
sudo -u "$APP_USER" NODE_ENV=production npm run start -- -H 127.0.0.1 -p 3000
```

Di terminal lain:

```bash
curl -i http://127.0.0.1:3000/api/publik/openapi
```

Route tersebut tidak memerlukan sesi. Respons 200 menunjukkan proses dan
koneksi database dapat melayani permintaan. Hentikan proses manual dengan
`Ctrl+C` sebelum memakai systemd.

### 7.3 Contoh unit systemd

Repository tidak menyediakan unit systemd. Contoh berikut adalah template
operasional; sesuaikan path, user, dan hardening dengan distribusi Anda.

```ini
[Unit]
Description=Appdes SID
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=appdes
Group=appdes
WorkingDirectory=/opt/appdes/app
Environment=NODE_ENV=production
EnvironmentFile=-/opt/appdes/app/.env
ExecStart=/usr/bin/npm run start -- -H 127.0.0.1 -p 3000
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
UMask=0077
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Pasang dan jalankan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now appdes
sudo systemctl status appdes --no-pager
```

Catatan:

- Pastikan path `npm` benar (`command -v npm`).
- `EnvironmentFile` membantu service manager membaca `.env`; Next.js juga
  membaca file `.env` dari direktori kerja. Jangan menaruh nilai rahasia di unit
  file karena unit biasanya dapat dibaca user lain.
- Jika memakai PM2 atau supervisor lain, konfigurasikan proses persisten dengan
  direktori kerja, environment, dan restart policy yang setara. PM2 bukan
  dependency repository dan tidak ada file konfigurasinya di sini.
- Jangan memakai platform serverless untuk WhatsApp/Baileys atau untuk proses
  yang membutuhkan disk persisten.

## 8. Reverse proxy dan HTTPS

Tidak ada konfigurasi reverse proxy di repository. Contoh Nginx berikut
menunjukkan header yang wajib dipertahankan; gunakan proxy lain dengan perilaku
yang sama bila tidak memakai Nginx.

```nginx
server {
    listen 80;
    server_name sid.example.go.id *.desa.example.go.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sid.example.go.id *.desa.example.go.id;

    ssl_certificate     /etc/letsencrypt/live/sid.example.go.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sid.example.go.id/privkey.pem;

    # Restore database dibatasi 200 MB; beri ruang untuk overhead multipart.
    client_max_body_size 210m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # Tenant hanya ditentukan dari Host. Header ini wajib diisi proxy dari
        # host asli, bukan nilai kiriman klien.
        proxy_set_header Host $host;
        # X-Forwarded-Host tidak memilih tenant, tetapi dipakai menyusun URL
        # absolut (mis. tautan verifikasi surat); jangan teruskan nilai klien.
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

Persyaratan keamanan:

- Aktifkan HTTPS sebelum memakai login. Cookie sesi dan reset sandi tidak boleh
  berjalan di HTTP publik.
- **`Host` wajib berisi host asli** permintaan. Resolver tenant hanya membaca
  `Host`; `X-Forwarded-Host` diabaikan untuk pemilihan tenant. Jika proxy
  menulis ulang `Host` menjadi hostname upstream atau membiarkan klien
  mengirimnya, tenant akan salah ditentukan atau tidak ditemukan. Ini berlaku
  meskipun `TRUST_PROXY=false`.
- `X-Forwarded-Host` tetap harus ditimpa proxy karena `getRequestOrigin()`
  memakainya (setelah `Host`) untuk URL absolut seperti tautan verifikasi
  surat. Header forwarded yang berasal dari klien dapat menyisipkan host lain
  ke dokumen surat.
- Jangan mengekspos port 3000 ke internet. `TRUST_PROXY=true` hanya berguna
  bila tidak ada jalur yang melewati proxy.
- Batas `client_max_body_size` harus cukup untuk unggahan aplikasi dan restore
  database. Jangan menaikkannya tanpa kebutuhan.
- Sertifikat wildcard diperlukan bila memakai `*.DESA_BASE_DOMAIN`. Pastikan
  DNS dan sertifikat diperbarui sebelum kedaluwarsa.
- Jangan menonaktifkan verifikasi TLS pada reverse proxy.

## 9. Domain dan multi-tenant

### 9.1 Domain persis dan alias

Resolver mencoba:

1. domain/alias persis pada `villages.domain` dan `village_domains`;
2. alias `www.` dari domain tersebut;
3. wildcard `<slug>.<DESA_BASE_DOMAIN>` bila `DESA_BASE_DOMAIN` diisi;
4. fallback ke desa pertama **hanya** bila
   `TENANT_LEGACY_SINGLE_HOST_FALLBACK=true` **dan** instalasi berisi tepat
   satu desa; default mati.

Domain `www` diperlakukan sebagai alias dari domain tanpa `www`. Domain dengan
subdomain bertingkat (`a.b.desa.id`) tidak dipetakan ke desa `a`.

### 9.2 DNS

- Domain utama: arahkan A/AAAA ke alamat server.
- Wildcard: buat record `*.desa.example.go.id` bila memakai
  `DESA_BASE_DOMAIN=desa.example.go.id`.
- Jangan memakai protokol, path, atau port pada nilai `DESA_BASE_DOMAIN`.
- Pastikan reverse proxy menerima `server_name` untuk setiap domain yang
  digunakan.

### 9.3 Data domain

Sumber kebenaran ada di tabel `village_domains`; `villages.domain` adalah
cermin domain utama untuk kompatibilitas. Konsol `/super-admin` dapat menambah
alias, menjadikan alias domain utama, dan menghapus alias. Tetap validasi DNS,
TLS, dan routing domain pada lingkungan deployment. Jangan mengubah tabel secara
manual di production tanpa backup, validasi, dan persetujuan; kesalahan domain
dapat membuat tenant tidak dapat diakses atau menunjuk desa yang salah.

Pemeriksaan operasional:

```bash
mysql --defaults-extra-file=/etc/appdes/mysql-backup.cnf \
  -e "SELECT id, name, slug, domain, active FROM villages ORDER BY id;"
mysql --defaults-extra-file=/etc/appdes/mysql-backup.cnf \
  -e "SELECT village_id, domain, is_primary FROM village_domains ORDER BY village_id, id;"
```

Jangan mencetak password database ke terminal atau log.

## 10. Pemeriksaan setelah deployment

Jalankan pemeriksaan berikut dan catat hasil sebenarnya:

```bash
# 1. Service aktif
sudo systemctl status appdes --no-pager

# 2. Aplikasi dan database dapat melayani request
curl -fsS -o /dev/null -w '%{http_code}\n' \
  http://127.0.0.1:3000/api/publik/openapi

# 3. Database merespons dengan user aplikasi
mysql --defaults-extra-file=/etc/appdes/mysql-backup.cnf -e "SELECT 1;"

# 4. Tenant dikenali dari host (ganti domain contoh)
curl -fsS -H 'Host: sid.example.go.id' \
  http://127.0.0.1:3000/api/publik/informasi | head -c 500

# 5. HTTPS dan sertifikat
curl -I https://sid.example.go.id
openssl s_client -connect sid.example.go.id:443 -servername sid.example.go.id </dev/null 2>/dev/null \
  | openssl x509 -noout -dates

# 6. Log tidak menunjukkan error berulang
sudo journalctl -u appdes --since '10 min ago' --no-pager
```

Checklist minimum:

- [ ] `npm ci` dan `npm run build` selesai tanpa error.
- [ ] `npm run db:migrate` selesai dan skema ada.
- [ ] Service berjalan sebagai user non-root.
- [ ] `/api/publik/openapi` merespons 200.
- [ ] Koneksi database dari user aplikasi berhasil.
- [ ] Domain/tenant yang benar merespons; host asing tidak membocorkan tenant.
- [ ] HTTPS valid dan HTTP dialihkan ke HTTPS.
- [ ] `storage/media` dapat ditulis dan dibaca.
- [ ] Log tidak memuat secret, password, atau data pribadi.
- [ ] Backup database dan media dibuat serta diuji restore di staging.
- [ ] Super Admin platform dibuat dengan `npm run platform:bootstrap` dan sandi
      awalnya sudah diganti.
- [ ] Desa pertama dibuat dari template platform dan administrator desa dapat
      masuk.

Login dan alur admin **tidak dapat diuji** sebelum akun platform dan desa dibuat.
Jangan menandai deployment production selesai hanya karena service menyala.

## 11. Troubleshooting umum

| Gejala | Pemeriksaan | Tindakan |
|---|---|---|
| Service gagal start | `journalctl -u appdes -n 100 --no-pager` | Baca error environment; perbaiki `.env`, lalu restart |
| `Konfigurasi environment tidak valid` | Variabel wajib dan format URL | Isi `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`; jangan mengosongkan secret |
| `ECONNREFUSED` ke MySQL | `systemctl status mysql`, port, user/host grant | Nyalakan MySQL; pastikan host `127.0.0.1` dan grant sesuai |
| `Access denied for user` | User, host, password, URL-encoding | Perbaiki grant/password; uji dengan `mysql` |
| Domain mengembalikan 404 | `Host` yang diterima aplikasi, data `village_domains`, status desa | Pastikan desa aktif, domain cocok, proxy mempertahankan `Host` asli |
| Domain desa A menampilkan desa B | Header proxy, domain duplikat, fallback satu-desa | Perbaiki konfigurasi proxy dan data domain; jangan mengandalkan fallback |
| Media 404 | `storage/media/<villageId>/...`, permission, kategori | Pastikan direktori persisten dan proses dapat membaca |
| Upload gagal/413 | Batas proxy, ukuran berkas, kuota desa | Sesuaikan `client_max_body_size`; cek batas media 1–20 MB dan kuota |
| Restore 411 | `Content-Length` tidak ada | Kirim multipart dengan Content-Length; lihat BACKUP-RESTORE |
| Restore 413 | Berkas melebihi 200 MB | Potong/kompres ulang atau gunakan prosedur CLI tervalidasi |
| Backup 500 | `mysqldump` tidak ada atau kredensial salah | Pasang client, uji koneksi, cek log; backup CLI untuk DB besar |
| Login gagal setelah restore | Sesi, secret, data user | Pastikan `BETTER_AUTH_SECRET` sama; cek tabel `users`/`sessions`; jangan reset asal-asalan |
| WhatsApp tidak mengirim | Log QR, folder sesi, koneksi | Pindai QR; pastikan proses persisten; sesi logout perlu pairing ulang |

## 12. Deployment berikutnya

Untuk rilis baru:

1. backup database dan media;
2. siapkan release di direktori baru atau commit yang disetujui;
3. `npm ci`, lalu migrasi hanya jika ada migration yang disetujui;
4. `npm run build`;
5. restart service;
6. jalankan checklist bagian 10;
7. simpan rilis sebelumnya dan backup untuk rollback.

Jangan menjalankan `git pull` yang menimpa `.env`, `storage`, atau backup.
Jangan melakukan migrasi production tanpa backup dan persetujuan. Prosedur
operasional lengkap ada di [OPERATIONS.md](./OPERATIONS.md).
