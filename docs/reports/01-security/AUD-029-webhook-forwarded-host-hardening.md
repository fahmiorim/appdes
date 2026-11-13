# AUD-029 — Webhook & Forwarded-Host Security

- **Tanggal:** 13 November 2026
- **Branch:** `task/AUD-029-webhook-forwarded-host-hardening`
- **Base:** `main` — `e565f18baf78291724fed79fb8e8f19b90cf1de4`
- **Metode:** audit statis dan regression test route; tanpa database nyata, deployment, atau perubahan schema.

## 1. Ringkasan

Audit menemukan dua masalah terkait batas kepercayaan request:

1. `POST /api/webhooks/email` memakai token statis di body JSON. Token dibandingkan timing-safe, tetapi tidak mengikat autentikasi ke raw body, tidak memiliki timestamp, dan tidak memiliki event ID untuk mendeteksi replay.
2. Webhook dan resolver tenant publik memilih desa dari `X-Forwarded-Host` sebelum `Host`. Header forwarded dapat dipalsukan apabila reverse proxy tidak menghapus header kiriman klien dan menimpanya secara konsisten.

Remediasi pada branch ini menambahkan autentikasi HMAC-SHA256 bertimestamp, deduplikasi event lintas instance memakai sliding-window MySQL yang sudah tersedia, dan menghilangkan `X-Forwarded-Host` dari resolusi tenant.

## 2. Temuan dan perubahan

### AUD-029-01 — Webhook tidak mengikat signature ke payload dan tidak mencegah replay

**Prioritas:** P1 — Tinggi.

**Sebelum:** token rahasia statis dikirim sebagai properti JSON `token`. Signature tidak mencakup isi payload; request valid yang tertangkap dapat dikirim ulang tanpa batas.

**Sesudah:**
- Signature HMAC-SHA256 dihitung dari `<timestamp>.<event-id>.<normalized-host>.<raw-body>` dengan `EMAIL_WEBHOOK_TOKEN` sebagai secret. Host dinormalisasi menjadi lowercase tanpa port dan trailing dot, sehingga signature tidak dapat dipindahkan ke tenant lain.
- Header wajib: `X-Email-Webhook-Timestamp` (Unix detik), `X-Email-Webhook-Id` (8–128 karakter), dan `X-Email-Webhook-Signature` (64 karakter hex).
- Timestamp dengan selisih lebih dari 5 menit ditolak.
- Perbandingan signature memakai `timingSafeEqual`.
- Pasangan host + event ID dibatasi satu kali per 10 menit melalui `batasiPermintaan`, yang menyimpan hash key dan timestamp dalam `rate_limit_entries` melalui transaksi dan row lock MySQL. Deduplikasi berlaku lintas instance per host; tidak diperlukan tabel/migration baru.
- Signature diverifikasi sebelum parsing payload dan sebelum resolusi tenant / penyimpanan pesan.
- Event duplikat mendapat HTTP 409; signature invalid/kedaluwarsa mendapat HTTP 401.

### AUD-029-02 — X-Forwarded-Host dapat memengaruhi pemilihan tenant

**Prioritas:** P1 — Tinggi.

**Sebelum:** webhook dan `getIdentitasFromRequest()` memakai `x-forwarded-host ?? host`. Header yang dikirim klien dapat menentukan tenant jika proxy tidak membersihkan dan menulis ulang header tersebut.

**Sesudah:**
- Webhook hanya memakai `Host`.
- Resolver tenant request publik `getIdentitasFromRequest()` juga hanya memakai `Host`.
- `X-Forwarded-Host` tidak lagi menjadi sumber identitas tenant.
- Host yang tidak terdaftar pada instalasi multi-desa tetap ditolak oleh pemetaan tenant yang sudah ada.

## 3. Regression tests

Test route webhook mencakup:
- signature tidak valid ditolak sebelum tenant lookup dan penyimpanan;
- signature dengan timestamp lebih dari 5 menit ditolak;
- event ID yang sudah pernah dipakai pada host yang sama ditolak HTTP 409;
- signature untuk host desa A ditolak ketika Host diubah menjadi desa B;
- `X-Forwarded-Host` palsu diabaikan dan tenant diambil dari `Host`;
- host yang tidak dikenal ditolak tanpa menyimpan pesan.

## 4. Dampak operasional / perubahan kontrak provider

**Integrasi provider email wajib diperbarui sebelum perubahan ini di-deploy.** Provider tidak lagi mengirim `token` pada body. Provider harus:
1. membuat event ID unik untuk setiap event;
2. mengirim timestamp Unix dalam detik;
3. menormalisasi Host menjadi lowercase tanpa port dan trailing dot, lalu menghitung HMAC-SHA256 dengan secret `EMAIL_WEBHOOK_TOKEN` atas string `timestamp.event-id.normalized-host.raw-body`;
4. mengirim hasil hex pada header `X-Email-Webhook-Signature`.

Reverse proxy harus meneruskan header `Host` asli domain tenant yang telah divalidasi. Jangan mengandalkan `X-Forwarded-Host` untuk pemilihan tenant. Jika konfigurasi proxy saat ini mengganti Host menjadi hostname upstream, perbaiki konfigurasi proxy terlebih dahulu dan uji host tenant pada staging.

Event ID disimpan melalui tabel `rate_limit_entries` selama jendela 10 menit. Pengiriman ulang pasangan Host + event ID yang sama dalam jendela tersebut akan menerima 409. Catatan reliabilitas: event ID dicatat sebelum penyimpanan pesan; bila proses penyimpanan gagal setelah reservasi replay berhasil, retry dengan pasangan yang sama akan tertolak sampai jendela 10 menit berakhir. Untuk jaminan exactly-once yang atomik diperlukan penyimpanan event ID dalam transaksi yang sama dengan pesan (di luar cakupan perubahan tanpa schema).

## 5. Validasi dan batasan

| Pemeriksaan | Status |
|---|---|
| Audit kode webhook / resolver host | PASS — temuan di atas terkonfirmasi |
| Regression test route | PASS — 6 test route, termasuk signature lintas-host |
| Typecheck | PASS |
| Lint | PASS |
| Format check (Prettier) | PASS |
| Unit test | PASS — 187 file, 1.705 test |
| Integration test MySQL 8 | PASS — 16 file, 108 test pada database disposable `desa_test_ci` |
| Perubahan schema / migration | Tidak ada |
| Database development / production | Tidak disentuh |
| Konfigurasi reverse proxy aktual | NOT TESTED — perlu verifikasi di staging |
| Konfigurasi provider webhook aktual | NOT TESTED — provider perlu migrasi kontrak |
| Merge / deploy | Tidak dilakukan |

CI GitHub Actions run [43308530606](https://github.com/fahmiorim/appdes/actions/runs/43308530606) pada commit `ee6e9ba9eccf4dfa3f83b054b3ccb737224e71a2` selesai dengan status **success** untuk seluruh job: typecheck, lint, Prettier, 187 file / 1.705 unit test, dan 16 file / 108 integration test pada `desa_test_ci`.

## 6. Kesimpulan

Perubahan menghilangkan fallback tenant dari forwarded host dan memperkuat autentikasi webhook agar terikat pada payload, waktu, dan event ID unik. Ini belum boleh di-deploy sebelum provider mengadopsi header HMAC baru dan reverse proxy dipastikan mempertahankan Host tenant yang benar. Tidak ada merge atau deploy pada task ini.
