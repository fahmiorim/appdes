# Operations Runbook

Panduan ini untuk administrator server yang menjalankan Appdes SID. Perintah
mengasumsikan:

```bash
APP_USER=appdes
APP_DIR=/opt/appdes/app
SERVICE=appdes
APP_PORT=3000
```

Sesuaikan nama service dan path dengan instalasi Anda. Repository tidak memuat
service manager, monitoring, atau konfigurasi log terpusat; contoh di sini
adalah prosedur operasional, bukan fitur bawaan.

> **Penting:** pada snapshot ini belum ada halaman web/login dan belum ada
> bootstrap tenant. Pemeriksaan API dapat dilakukan, tetapi uji login hanya
> mungkin setelah bootstrap tersedia.

## 1. Start, stop, dan restart

### 1.1 Dengan systemd (contoh)

```bash
sudo systemctl start appdes
sudo systemctl stop appdes
sudo systemctl restart appdes
sudo systemctl status appdes --no-pager
```

Setelah mengubah unit file:

```bash
sudo systemctl daemon-reload
sudo systemctl restart appdes
```

`systemctl stop` mengirim SIGTERM. Tunggu proses berhenti; jangan langsung
memakai `kill -9`, karena dapat memutus koneksi dan meninggalkan pekerjaan
setengah selesai.

### 1.2 Tanpa systemd

Jalankan di foreground untuk diagnosis:

```bash
cd /opt/appdes/app
sudo -u appdes NODE_ENV=production npm run start -- -H 127.0.0.1 -p 3000
```

Jika memakai supervisor lain (misalnya PM2), pastikan:

- direktori kerja adalah `APP_DIR`;
- environment production dan `.env` terbaca;
- proses di-restart saat crash;
- hanya satu proses yang menangani port 3000;
- log dikirim ke stdout/journal, bukan file yang tidak dirotasi.

PM2 bukan dependency repository dan tidak ada konfigurasi PM2 di sini. Jangan
menganggap PM2 tersedia.

### 1.3 Urutan startup yang disarankan

1. MySQL aktif dan dapat diakses.
2. Aplikasi start.
3. Reverse proxy meneruskan traffic.
4. Health check lulus.
5. Baru buka akses pengguna.

Jika MySQL belum siap, aplikasi dapat gagal saat request pertama. Nyalakan
MySQL terlebih dahulu.

## 2. Pemeriksaan status aplikasi

```bash
# Proses dan port
sudo systemctl is-active appdes
sudo systemctl status appdes --no-pager
sudo ss -ltnp | grep ':3000'  # butuh akses root untuk melihat proses

# Health check aplikasi + database
curl -fsS -o /dev/null -w 'HTTP %{http_code}\n' \
  http://127.0.0.1:3000/api/publik/openapi

# Health check publik melalui proxy
curl -fsS -o /dev/null -w 'HTTP %{http_code}\n' \
  https://sid.example.go.id/api/publik/openapi
```

`/api/publik/openapi` adalah route yang benar-benar ada dan tidak memerlukan
sesi. **Jangan memakai `/` sebagai health check**: pada snapshot ini tidak ada
halaman root, sehingga 404 bukan bukti aplikasi rusak.

Respons 200 berarti proses dan jalur database dapat melayani request. Jika 429,
aplikasi hidup tetapi kena rate limit; cek log dan ulangi dari IP yang sah. Jika
502 dari proxy, periksa service dan port.

## 3. Pemeriksaan log

Production menulis log JSON ke stdout; systemd menampungnya di journal. Tidak
ada file log aplikasi khusus yang perlu dirotasi.

```bash
# Ikuti log
sudo journalctl -u appdes -f

# Error sejak 1 jam terakhir
sudo journalctl -u appdes --since '1 hour ago' -p err --no-pager

# Log 200 baris terakhir
sudo journalctl -u appdes -n 200 --no-pager

# Filter pesan aplikasi tertentu
sudo journalctl -u appdes --since today --no-pager | grep -i 'whatsapp\|database\|auth'
```

Yang perlu diperiksa:

- error environment/konfigurasi saat start;
- `ECONNREFUSED`, `Access denied`, atau error MySQL berulang;
- error `mysqldump`/`mysql` saat backup/restore;
- QR WhatsApp dan status koneksi;
- error auth/reset sandi;
- stack trace yang berulang, bukan satu kegagalan sesaat.

Jangan menyalin log yang memuat data pribadi, token, password, atau QR ke tiket
publik. QR adalah kredensial sementara; batasi akses ke terminal.

## 4. Pemeriksaan koneksi database

Gunakan file kredensial `600`, jangan password di command line:

```bash
mysqladmin --defaults-extra-file=/etc/appdes/mysql-backup.cnf ping
mysql --defaults-extra-file=/etc/appdes/mysql-backup.cnf \
  -e "SELECT 1 AS ok, DATABASE() AS db, @@version AS versi;"
```

Dari sisi aplikasi, health check `/api/publik/openapi` juga menyentuh database
(rate limit). Untuk memeriksa tabel dan tenant:

```bash
mysql --defaults-extra-file=/etc/appdes/mysql-backup.cnf sid_production \
  -e "SELECT COUNT(*) AS desa FROM villages; \
      SELECT id, name, slug, domain, active FROM villages ORDER BY id;"
```Jangan menjalankan `DROP`, `TRUNCATE`, `ALTER`, atau restore hanya untuk "melihat apakah database merespons". Gunakan query baca.

Jika koneksi gagal:

1. cek service MySQL dan disk;
2. cek `DATABASE_URL` dan URL-encoding password;
3. cek grant user/host;
4. cek `max_connections`;
5. cek log MySQL dan journal aplikasi.

## 5. Pemeriksaan domain tenant

```bash
# DNS
dig +short sid.example.go.id
dig +short desa-contoh.desa.example.go.id

# Resolusi tenant dari dalam server
curl -fsS -H 'Host: sid.example.go.id' \
  http://127.0.0.1:3000/api/publik/informasi | head -c 500

# Host yang tidak dikenal harus 404 pada instalasi multi-desa
curl -s -o /dev/null -w '%{http_code}\n' \
  -H 'Host: tidak-dikenal.example.go.id' \
  http://127.0.0.1:3000/api/publik/informasi

# Sertifikat
curl -I https://sid.example.go.id
openssl s_client -connect sid.example.go.id:443 \
  -servername sid.example.go.id </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -dates
```

Periksa:

- `village_domains` dan `villages.domain`;
- `villages.active` (desa nonaktif tidak dipetakan);
- `DESA_BASE_DOMAIN` dan DNS wildcard;
- reverse proxy menimpa `X-Forwarded-Host` dengan host asli;
- tidak ada domain duplikat;
- fallback satu-desa tidak dipakai secara tidak sengaja pada instalasi
  multi-desa.

Jika domain desa A menampilkan desa B, hentikan akses, periksa header proxy dan
data domain, lalu perbaiki dengan backup. Jangan mengandalkan fallback "desa
pertama" untuk menutupi kesalahan mapping.

## 6. Pemeriksaan penyimpanan dan media

```bash
df -h /opt/appdes/app /var/lib/mysql /var/backups
du -sh /opt/appdes/app/storage/media
du -sh /opt/appdes/app/storage/whatsapp-auth 2>/dev/null || true
find /opt/appdes/app/storage/media -type f | wc -l
sudo -u appdes test -r /opt/appdes/app/storage/media && echo "media terbaca"
sudo -u appdes test -w /opt/appdes/app/storage/media && echo "media dapat ditulis"
```

- `storage/media` harus persisten dan tidak dihapus saat redeploy.
- Backup media terpisah dari backup database; lihat
  [BACKUP-RESTORE.md](./BACKUP-RESTORE.md).
- Kuota media per desa diatur di `villages.kuota_media_mb`; nilai `NULL` berarti
  tanpa batas. Jangan mengubah kuota langsung di DB tanpa persetujuan.
- Jangan menghapus file media hanya karena database tidak menunjuknya; bisa jadi
  ada operasi yang sedang berjalan. Lakukan rekonsiliasi dengan backup.

## 7. Pemeriksaan WhatsApp (opsional)

WhatsApp memakai Baileys dan hanya aktif saat fitur notifikasi dipakai.

```bash
sudo journalctl -u appdes --since today --no-pager | grep -i whatsapp
sudo ls -la /opt/appdes/app/storage/whatsapp-auth
```

- QR muncul di log saat pertama kali; pindai melalui WhatsApp > Perangkat
  tertaut.
- Jika sesi logout, aplikasi mencatat peringatan. Hapus folder sesi **hanya**
  setelah memastikan tidak ada proses yang memakainya, lalu pindai ulang.
- Folder sesi adalah kredensial. Jangan menyalinnya ke chat, tiket, atau arsip
  tidak terenkripsi.
- Pastikan proses Node persisten; serverless akan memutus soket.

## 8. Pemeliharaan rutin

| Frekuensi | Tugas | Bukti |
|---|---|---|
| Harian | Cek service, health check, disk, error log | Status dan timestamp |
| Harian | Backup database + media | File, checksum, exit code |
| Mingguan | Uji `gzip -t`/checksum, cek ukuran backup, cek sertifikat | Log pemeriksaan |
| Bulanan | Restore drill di staging, review akses, review kuota/media | Laporan drill |
| Bulanan | Patch OS/Node/MySQL dan review dependency | Change ticket |
| Triwulanan | Uji failover/recovery, rotasi secret sesuai kebijakan | Laporan |
| Tahunan | Review retensi backup, domain, sertifikat, dan RPO/RTO | Dokumen |

Pemeliharaan wajib:

- jangan menjalankan update dependency langsung di production tanpa staging;
- backup sebelum migrasi/upgrade;
- jangan memakai `npm audit fix --force` di production tanpa review;
- jangan menghapus backup lama sebelum backup baru diverifikasi;
- jangan mengekspos database atau port 3000 ke internet;
- jangan menonaktifkan TLS atau `TRUST_PROXY` untuk "mempercepat" perbaikan.

## 9. Prosedur rilis/update

1. Catat commit saat ini dan buat backup DB + media.
2. Uji rilis di staging dengan salinan data.
3. Siapkan release baru di direktori terpisah atau checkout commit yang
   disetujui; jangan menimpa `.env`/`storage`.
4. `npm ci`.
5. Jalankan migrasi hanya jika ada migration yang disetujui dan sudah diuji.
6. `npm run build`.
7. Hentikan service, arahkan WorkingDirectory/symlink ke release baru, start.
8. Jalankan checklist health check dan tenant.
9. Jika gagal, kembalikan release sebelumnya dan, bila migrasi mengubah data,
   pulihkan backup sesuai prosedur.

Tidak ada mekanisme zero-downtime atau rollback otomatis di repository. Jangan
mengklaim rilis tanpa jendela pemeliharaan bila perubahan schema berisiko.

## 10. Prosedur insiden

### Aplikasi 502/503

1. `systemctl status appdes`.
2. Cek log error dan port 3000.
3. Cek MySQL.
4. Jika proses mati, start; jika crash berulang, jangan loop restart tanpa
   membaca penyebab.
5. Periksa perubahan `.env`, build, atau disk terakhir.

### Database tidak tersedia

1. Jangan menghapus data atau menjalankan restore.
2. Cek service MySQL, disk, dan koneksi.
3. Cek `DATABASE_URL`, grant, dan `max_connections`.
4. Jika data korup, ikuti prosedur restore dengan backup yang diverifikasi.
5. Catat waktu dan dampak.

### Disk penuh

1. Hentikan penulisan baru bila perlu (maintenance).
2. Cek `df -h`, `du -sh`, dan file besar.
3. Hapus log/backup lama hanya dengan persetujuan dan setelah backup penting
   diverifikasi.
4. Jangan menghapus file MySQL atau `storage/media` secara manual untuk mencari
   ruang.
5. Tambah kapasitas dan restart bila perlu.

### Tenant/domain salah

1. Hentikan akses bila data lintas tenant terlihat.
2. Periksa `X-Forwarded-Host`, konfigurasi proxy, DNS, dan data domain.
3. Jangan mengubah domain production tanpa backup.
4. Setelah perbaikan, uji dua tenant dan host asing.
5. Catat sebagai insiden keamanan bila data tenant lain terekspos.

### Sertifikat TLS kedaluwarsa

1. Perbarui sertifikat (Certbot atau mekanisme organisasi).
2. Reload reverse proxy.
3. Uji dengan `openssl s_client` dan `curl`.
4. Jangan mematikan HTTPS sebagai solusi sementara.

### WhatsApp terputus/logout

1. Cek log dan folder sesi.
2. Jika logout, hapus sesi hanya setelah konfirmasi, lalu pindai QR baru.
3. Pastikan proses persisten dan waktu server benar.
4. Jangan menganggap pesan terkirim bila status tertaut belum kembali.

### Restore gagal

Ikuti [BACKUP-RESTORE.md](./BACKUP-RESTORE.md), bagian "Recovery jika restore
gagal". Jangan mengulang restore atau menjalankan `DROP DATABASE` tanpa
persetujuan.

### Dugaan insiden keamanan

1. Isolasi akses (proxy/firewall), tetapi jangan menghapus log.
2. Simpan bukti: journal, log MySQL, akses proxy, perubahan file.
3. Rotasi secret yang mungkin bocor (`BETTER_AUTH_SECRET`, DB, webhook, TTE,
   WhatsApp) sesuai prosedur.
4. Pulihkan dari backup yang bersih bila diperlukan.
5. Laporkan ke pemilik sistem; jangan melakukan investigasi destruktif.

## 11. Monitoring minimum

Repository tidak menyediakan monitoring/alert. Pasang pemeriksaan eksternal
untuk:

- HTTP `/api/publik/openapi` (status dan latency);
- koneksi MySQL dan kapasitas koneksi;
- disk, inode, dan pertumbuhan `storage/media`;
- usia backup terakhir dan hasil checksum;
- masa berlaku sertifikat TLS;
- error rate di journal (misalnya pola `error`);
- status WhatsApp bila dipakai.

Ambang alert harus ditentukan dari baseline operasi nyata. Jangan mengklaim
RPO/RTO atau ketersediaan tertentu tanpa pengukuran.

## 12. Checklist operator

- [ ] Service aktif dan health check 200.
- [ ] Database dapat diakses user aplikasi.
- [ ] Domain tenant benar; host asing tidak bocor.
- [ ] HTTPS valid dan proxy menimpa header.
- [ ] Media dapat dibaca/ditulis; disk cukup.
- [ ] Log tidak memuat secret/data pribadi dan tidak ada error berulang.
- [ ] Backup terbaru ada, checksum valid, dan restore pernah diuji.
- [ ] WhatsApp tertaut bila fitur dipakai.
- [ ] Perubahan tercatat di change ticket dan audit.
