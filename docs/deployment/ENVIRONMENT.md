# Environment Variables

Dokumen ini mencantumkan variabel environment yang dibaca oleh kode di
repository. Jangan menambahkan variabel yang tidak ada di kode dan jangan
memakai nilai contoh di dokumen ini sebagai credential nyata.

## 1. Cara memuat environment

- Aplikasi membaca environment melalui `src/lib/env.ts` (validasi Zod) dan
  beberapa modul membaca `process.env` secara langsung (konfigurasi TTE).
- Next.js memuat `.env` dari direktori kerja proses. `drizzle-kit` juga memuat
  `.env` saat `npm run db:migrate` dijalankan.
- `.env` diabaikan Git; hanya `.env.example` yang boleh di-commit.
- Nilai `NEXT_PUBLIC_APP_NAME` di-inline saat **build**, bukan dibaca ulang saat
  runtime. Variabel lain dibaca oleh proses server.
- Jika validasi gagal, aplikasi berhenti dengan pesan
  `Konfigurasi environment tidak valid`. Perbaiki `.env`, lalu restart.

Contoh pengamanan file:

```bash
cd /opt/appdes/app
sudo chown appdes:appdes .env
sudo chmod 600 .env
```

Jangan menaruh `.env` di direktori yang dapat dibaca publik atau di dalam
artefak backup yang tidak terenkripsi.

## 2. Variabel wajib

### `NODE_ENV`

- **Fungsi:** memilih mode aplikasi dan logger. Nilai yang diterima:
  `development`, `test`, `production`.
- **Wajib:** ya untuk production (setel `production`).
- **Contoh aman:** `production`.
- **Catatan:** production memakai log JSON dan tidak menampilkan log debug.
  Jangan memakai `test` untuk server production.

### `DATABASE_URL`

- **Fungsi:** DSN MySQL untuk pool aplikasi, migrasi Drizzle, backup, dan
  restore.
- **Wajib:** ya. Tidak ada default.
- **Format:** `mysql://USER:PASSWORD@HOST:PORT/DATABASE`.
- **Contoh aman:** `mysql://sid_app:GANTI_PASSWORD_DB@127.0.0.1:3306/sid_production`.
- **Catatan keamanan:**
  - Password harus URL-encode bila mengandung `@`, `:`, `/`, `#`, `%`, atau
    karakter khusus lain.
  - Gunakan user database khusus, bukan `root`.
  - Jangan memakai database development/testing.
  - File `.env` harus `600`; jangan pernah menulis password ke log atau
    dokumentasi.

### `BETTER_AUTH_SECRET`

- **Fungsi:** secret Better Auth; juga dipakai untuk token tamu kiosk dan HMAC
  rate limit.
- **Wajib:** ya, minimal 32 karakter. Aplikasi menolak nilai lebih pendek.
- **Contoh aman:** `GANTI_DENGAN_HASIL_OPENSSL_RAND_HEX_32_BYTE`.
- **Pembuatan:**
  ```bash
  openssl rand -hex 32
  ```
- **Catatan keamanan:** jangan memakai contoh di atas. Merotasi secret ini
  membatalkan sesi yang ada, token tamu, dan kunci HMAC rate limit; lakukan
  dengan rencana logout/komunikasi.

### `BETTER_AUTH_URL`

- **Fungsi:** base URL Better Auth untuk callback, cookie, dan tautan reset
  sandi.
- **Wajib:** ya secara operasional; default `http://localhost:3000` tidak cocok
  untuk production.
- **Contoh aman:** `https://sid.example.go.id`.
- **Catatan:** gunakan origin publik HTTPS tanpa path tambahan. Samakan dengan
  `APP_URL`.

### `APP_URL`

- **Fungsi:** URL publik aplikasi yang divalidasi sebagai URL.
- **Wajib:** tidak secara teknis (default `http://localhost:3000`), tetapi wajib
  diisi benar untuk deployment.
- **Contoh aman:** `https://sid.example.go.id`.
- **Catatan:** source saat ini memakai `BETTER_AUTH_URL` untuk baseURL dan
  tautan reset; tetap setel `APP_URL` agar konsisten dan siap dipakai komponen
  lain. Jangan memakai HTTP publik.

## 3. Variabel opsional aplikasi

### `NEXT_PUBLIC_APP_NAME`

- **Fungsi:** nama aplikasi yang dipakai sebagai `appName` Better Auth dan metadata aplikasi yang tersedia.
- **Wajib:** tidak; default `Sistem Informasi Desa`.
- **Contoh aman:** `SID Desa Contoh`.
- **Catatan:** berawalan `NEXT_PUBLIC_`, sehingga aman terekspos ke browser.
  Nilai di-inline saat build; ubah nilai lalu build ulang.

### `TRUST_PROXY`

- **Fungsi:** menentukan apakah aplikasi memercayai `X-Real-IP`,
  `X-Forwarded-For`, dan `CF-Connecting-IP` untuk identitas klien.
- **Wajib:** tidak; default `false`.
- **Nilai:** hanya string `true` atau `false` (case-sensitive).
- **Contoh aman:** `true` **hanya** di belakang reverse proxy yang menimpa
  header.
- **Catatan keamanan:** jika `false`, header IP diabaikan untuk audit/rate
  limit. Namun resolver tenant tetap membaca `X-Forwarded-Host` lebih dulu,
  sehingga proxy **wajib** menimpa header tersebut. Jangan setel `true` bila
  port aplikasi dapat diakses langsung.

### `DESA_BASE_DOMAIN`

- **Fungsi:** domain induk untuk wildcard `<slug>.<DESA_BASE_DOMAIN>`.
- **Wajib:** tidak. Kosong berarti wildcard nonaktif; domain persis tetap
  dipakai.
- **Contoh aman:** `desa.example.go.id`.
- **Catatan:** isi tanpa `https://`, path, atau port. Perubahan nilai
  memengaruhi resolusi host dan perlu restart.

### `RESEND_API_KEY`

- **Fungsi:** API key Resend untuk email keluar (reset sandi dan notifikasi).
- **Wajib:** tidak.
- **Contoh aman:** `GANTI_API_KEY_RESEND`.
- **Catatan keamanan:** secret; simpan hanya di environment. Jika diisi,
  `RESEND_FROM` wajib diisi. Tanpa key ini, email reset tidak dikirim pada
  production (aplikasi mencatat error, bukan menampilkan tautan).

### `RESEND_FROM`

- **Fungsi:** alamat pengirim yang sudah diverifikasi di Resend.
- **Wajib:** wajib bila `RESEND_API_KEY` diisi.
- **Contoh aman:** `SID Desa Contoh <no-reply@example.go.id>`.
- **Catatan:** gunakan domain yang benar-benar diverifikasi. Jangan memakai
  alamat milik pihak lain.

### `EMAIL_WEBHOOK_TOKEN`

- **Fungsi:** rahasia bersama untuk webhook email masuk di
  `POST /api/webhooks/email`.
- **Wajib:** tidak. Bila kosong, endpoint mengembalikan 503.
- **Contoh aman:** `GANTI_TOKEN_WEBHOOK_ACAK_MINIMAL_32_KARAKTER`.
- **Catatan keamanan:**
  - Minimal 32 karakter bila diisi; nilai lebih pendek ditolak saat validasi.
  - Token tidak menentukan tenant. Tenant ditentukan dari host permintaan;
    reverse proxy harus menimpa `X-Forwarded-Host`.
  - Gunakan token unik dan rotasi bila diduga bocor.

## 4. Integrasi TTE/BSrE (opsional)

Konfigurasi ini dibaca oleh `src/features/surat/domain/tte.ts` melalui
`process.env`. Nilai tidak lengkap membuat mode aman `nonaktif`; jangan
mengaktifkan mode `bsre` sebelum provider dan keamanan TLS diuji.

| Variabel | Fungsi | Wajib | Contoh aman | Catatan |
|---|---|---|---|---|
| `TTE_MODE` | Mode TTE: `nonaktif`, `manual`, atau `bsre` | Tidak | `nonaktif` | Nilai tak dikenal jatuh ke `nonaktif` |
| `TTE_API` | Base URL API BSrE | Untuk `bsre` | `https://tte.example.go.id` | Gunakan HTTPS dan origin resmi |
| `TTE_USERNAME` | Username akun BSrE | Untuk `bsre` | `desa-contoh` | Bukan secret, tetap batasi akses |
| `TTE_NIK` | NIK penandatangan, 16 digit | Untuk `bsre` | `3201010101010001` | Data pribadi; jangan dipublikasikan |
| `TTE_PASSWORD` | Passphrase BSrE | Untuk `bsre` | `GANTI_PASSPHRASE_TTE` | **Secret**; hanya dibaca dari environment, jangan simpan di DB/log |
| `TTE_SSL` | Opsi konfigurasi TLS TTE | Tidak | `true` | Default `true`; opsi `false` tidak boleh dipakai di production |
| `TTE_TIMEOUT` | Timeout request TTE (milidetik) | Tidak | `30000` | Dibaca langsung dari `process.env`; tidak ada di `.env.example` dan tidak divalidasi Zod, pastikan bilangan bulat |

**Peringatan:** kode menerima `TTE_SSL=false` dan menyimpannya pada konfigurasi,
tetapi efek opsi tersebut terhadap verifikasi TLS klien belum terbukti di
pemeriksaan ini. Jangan memakai `false` di production. Temuan ini tercatat
sebagai AUD-020 di `docs/TECHNICAL_AUDIT.md`; verifikasi runtime diperlukan
sebelum mengaktifkan TTE.

## 5. WhatsApp/Baileys (opsional)

### `WHATSAPP_AUTH_DIR`

- **Fungsi:** direktori penyimpanan sesi Baileys.
- **Wajib:** tidak; default `storage/whatsapp-auth` relatif terhadap direktori
  kerja proses.
- **Contoh aman:** `storage/whatsapp-auth` atau path volume persisten.
- **Catatan keamanan:**
  - Direktori berisi kredensial sesi WhatsApp; batasi permission (`700`) dan
    jangan commit.
  - Aplikasi harus berjalan sebagai proses Node persisten; serverless tidak
    cocok.
  - Saat pertama dipakai, QR dicetak di log. Jangan menganggap pengiriman
    berhasil sebelum sesi tertaut.
  - Backup direktori ini terpisah dari backup media; jika sesi hilang, tautkan
    ulang lewat QR. Jangan menyalin kredensial sesi ke tempat tidak aman.

## 6. Variabel khusus pengujian

Jangan setel variabel ini di service production.

| Variabel | Fungsi | Nilai/ketentuan |
|---|---|---|
| `TEST_DATABASE_URL` | DSN database uji disposable untuk `npm run test:integration` | Harus `NODE_ENV=test`, host loopback (`127.0.0.1`, `localhost`, `::1`), nama `desa_test` atau `desa_test_<suffix>`, tanpa query string/fragment |
| `TEST_DATABASE_ACK` | Konfirmasi eksplisit bahwa database uji boleh dihapus/ditulis | Harus `1`; tanpa ini guard menolak |
| `RESTORE_UJI_KELUARAN` | Path output skrip mysql palsu pada unit test restore | Hanya untuk test harness; jangan set di production |

Guard integration test membuat database, menjalankan migrasi, dan menulis
fixture. **Jangan pernah** mengarahkan `TEST_DATABASE_URL` ke database
production atau database berisi data nyata. Lihat
`src/testing/db-test-guard.ts`.

## 7. Contoh `.env` production

Nilai di bawah adalah **placeholder**, bukan credential yang dapat dipakai.

```dotenv
NODE_ENV=production

APP_URL=https://sid.example.go.id
NEXT_PUBLIC_APP_NAME=SID Desa Contoh

DATABASE_URL=mysql://sid_app:GANTI_PASSWORD_DB@127.0.0.1:3306/sid_production
BETTER_AUTH_SECRET=GANTI_DENGAN_HASIL_OPENSSL_RAND_HEX_32_BYTE
BETTER_AUTH_URL=https://sid.example.go.id
TRUST_PROXY=true

# Opsional: email keluar
# RESEND_API_KEY=GANTI_API_KEY_RESEND
# RESEND_FROM=SID Desa Contoh <no-reply@example.go.id>

# Opsional: webhook email masuk
# EMAIL_WEBHOOK_TOKEN=GANTI_TOKEN_WEBHOOK_ACAK_MINIMAL_32_KARAKTER

# Opsional: WhatsApp
# WHATSAPP_AUTH_DIR=storage/whatsapp-auth

# Opsional: multi-desa wildcard
# DESA_BASE_DOMAIN=desa.example.go.id

# Opsional: TTE (jangan aktifkan sebelum hardening selesai)
# TTE_MODE=nonaktif
# TTE_API=
# TTE_USERNAME=
# TTE_NIK=
# TTE_PASSWORD=
# TTE_SSL=true
# TTE_TIMEOUT=30000
```

Jangan menambahkan `TEST_DATABASE_URL` atau `TEST_DATABASE_ACK` ke file ini.

## 8. Rotasi dan kegagalan konfigurasi

| Perubahan | Dampak | Prosedur aman |
|---|---|---|
| `DATABASE_URL`/password DB | Aplikasi kehilangan koneksi | Buat/ubah user DB, uji `mysql`, perbarui `.env`, restart, cek log |
| `BETTER_AUTH_SECRET` | Semua sesi, token tamu, dan HMAC rate limit lama tidak valid | Lakukan pada jendela pemeliharaan; komunikasikan logout |
| `BETTER_AUTH_URL`/`APP_URL` | Tautan auth dan cookie dapat salah origin | Pastikan DNS/TLS siap; restart; uji login |
| `RESEND_*` | Email reset/notifikasi berhenti atau pengirim ditolak | Uji pengiriman ke alamat internal |
| `EMAIL_WEBHOOK_TOKEN` | Webhook provider ditolak | Rotasi di kedua sisi bersamaan |
| `TTE_PASSWORD` | Tanda tangan gagal | Simpan hanya di environment; restart; uji di staging |
| `WHATSAPP_AUTH_DIR` | Sesi tidak ditemukan | Pindahkan folder dengan aman atau tautkan ulang |
| `NEXT_PUBLIC_APP_NAME` | Nama lama tetap tampil | Build ulang, bukan hanya restart |
| `NODE_ENV` | Perilaku log/cookie/error berubah | Gunakan `production` untuk service; jangan dicampur dengan test |

Jika aplikasi gagal start setelah perubahan env, kembalikan nilai sebelumnya
dari backup konfigurasi yang aman, lalu restart. Jangan menyalin nilai secret
ke tiket atau log.
