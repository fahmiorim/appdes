# Arsitektur Multi-Tenant dan Domain FlexiDesa

> **Status:** rancangan target dan catatan implementasi (bukan bukti deployment).  
> **Repository:** `fahmiorim/appdes`  
> **Baseline source yang diperiksa:** branch `main`, commit `3aad86bb224801424dc62bc4f40faebe3f220d18` (12 November 2026).  
> **Tujuan:** menjadi kontrak arsitektur untuk pekerjaan routing hostname, provisioning tenant, autentikasi, dan deployment FlexiDesa.

## 1. Keputusan arsitektur

FlexiDesa menggunakan satu aplikasi Next.js dan satu database terpusat dengan isolasi data berdasarkan `village_id`. Setiap desa adalah tenant. Hostname menentukan konteks tenant hanya untuk permintaan publik; sesi dan otorisasi menentukan identitas pengguna serta hak akses pada area privat.

Hostname **bukan** bukti autentikasi dan tidak boleh menjadi satu-satunya kontrol akses. Setiap operasi privat tetap wajib memeriksa sesi, status akun, role, permission, dan kepemilikan data melalui server-side Data Access Layer/use case serta constraint database.

### 1.1 Peta hostname yang dituju

| Hostname | Kategori | Fungsi target | Tenant context |
|---|---|---|---|
| `flexidesa.id` | Platform publik | Landing page, informasi produk, pemasaran | Tidak ada |
| `www.flexidesa.id` | Alias platform | Redirect kanonis ke `flexidesa.id` | Tidak ada |
| `admin.flexidesa.id` | Platform privat | Konsol Super Admin platform | Platform scope, bukan desa |
| `demo.flexidesa.id` | Demo | Demo tenant terisolasi dan berisi data sintetis | Tenant demo khusus |
| `<slug>.flexidesa.id` | Tenant desa | Website publik desa dan area admin desa | Desa yang memiliki slug |
| Domain custom terverifikasi | Tenant desa | Domain publik desa pilihan | Desa pemilik domain terverifikasi |
| `api.flexidesa.id` | Reserved | Endpoint API platform bila kelak diperlukan | Ditentukan per credential/scope |

Nama host sistem lain seperti `www`, `admin`, `demo`, `api`, `mail`, `autodiscover`, `status`, `cdn`, dan `static` harus dicadangkan dan tidak boleh dipakai sebagai slug tenant. Daftar final harus menjadi satu konstanta domain yang dipakai validasi provisioning dan host router.

Rute `/admin` pada hostname tenant adalah area Admin Desa. Rute tersebut berbeda otoritas dari `admin.flexidesa.id`, yang hanya untuk Super Admin platform. Jangan menyamakan role administrator desa dengan role Super Admin platform.

## 2. Baseline implementasi yang ditemukan

Pemeriksaan statis pada baseline di atas menemukan fondasi berikut:

| Komponen | Lokasi | Kondisi pada baseline |
|---|---|---|
| Identitas tenant | `src/db/schema/village.ts` | Tabel `villages` memiliki `id`, `slug`, `domain`, `active`, dan kuota media |
| Domain dan alias | `src/db/schema/village.ts` | `village_domains` menyimpan banyak host per desa; domain unik global |
| Host normalization | `src/features/desa/domain/host.ts` | Normalisasi hostname, port, trailing dot, dan alias `www` |
| Host-to-tenant mapping | `src/features/desa/domain/tenant.ts` | Exact domain, wildcard slug, lalu fallback satu desa |
| Resolver request | `src/features/desa/application/resolve-village.ts` | Mengambil header `Host`, memuat domain desa aktif, dan menghasilkan 404 jika tidak terpetakan |
| Provisioning tenant | `src/features/multi-desa/application/provisioning-use-cases.ts` dan `infrastructure/provisioning-repository.ts` | Use case pembuatan desa dan akun administrator sudah tersedia |
| Pengelolaan domain | `src/features/multi-desa/infrastructure/kelola-desa-repository.ts` | Tambah/hapus alias dan ganti domain utama sudah tersedia |
| Session dan authorization | `src/lib/dal.ts`, `src/features/rbac/application/authorization.ts` | Sesi dan permission diperiksa di server |
| Proxy Next.js | `src/proxy.ts` | Pemeriksaan cookie dan redirect optimistis berdasarkan path; bukan host router |
| Better Auth | `src/lib/auth.ts` | `BETTER_AUTH_URL` statis dan cookie lintas subdomain dinonaktifkan |

### 2.1 Batasan yang harus dipahami

1. Resolver tenant saat ini adalah resolver untuk konteks desa, bukan classifier lengkap untuk semua host platform.
2. `src/proxy.ts` saat ini tidak memisahkan `flexidesa.id`, `admin.flexidesa.id`, `demo.flexidesa.id`, dan subdomain desa. Ia bekerja terutama berdasarkan pathname dan cookie.
3. Resolver saat ini memiliki fallback ketika jumlah desa aktif tepat satu. Fallback ini berguna untuk mode instalasi lama/satu desa, tetapi tidak boleh membuat host platform, host reserved, atau host yang tidak dikenal diam-diam menjadi tenant.
4. `BETTER_AUTH_URL` masih menjadi satu base URL konfigurasi untuk Better Auth. URL reset password juga dibentuk dari nilai tersebut. Alur auth lintas hostname perlu dirancang dan diuji sebelum domain produksi diaktifkan.
5. Cookie Better Auth saat ini host-only (`crossSubDomainCookies.enabled = false`). Pertahankan isolasi ini sebagai default; jangan membagikan cookie sesi ke seluruh subdomain tanpa threat model dan keputusan keamanan eksplisit.
6. Adanya tabel domain tidak berarti kepemilikan domain custom sudah diverifikasi. Pada baseline belum ditemukan lifecycle verifikasi DNS/HTTP challenge.
7. DNS wildcard, sertifikat TLS, reverse proxy, firewall, dan konfigurasi produksi belum diperiksa. Statusnya **belum diverifikasi**, bukan dianggap tersedia.

## 3. Aturan resolusi hostname target

Buat satu komponen murni, misalnya `classifyHost(host)`, yang menghasilkan discriminated union:

- `platform-public`
- `platform-admin`
- `demo`
- `village` dengan `villageId`
- `custom-domain` dengan `villageId`
- `reserved`
- `unknown`

Classifier harus menerima hostname yang telah dinormalisasi dari header `Host` yang disediakan server/reverse proxy tepercaya. Ia tidak boleh menerima tenant ID dari query string, body, cookie buatan klien, atau header `X-Forwarded-Host` yang tidak dipercaya.

Urutan resolusi yang disarankan:

1. Validasi dan normalisasi hostname (lowercase, hilangkan port dan trailing dot; tolak nilai kosong/format tidak valid).
2. Cocokkan exact host platform (`flexidesa.id`, `www.flexidesa.id`, `admin.flexidesa.id`, `demo.flexidesa.id`, `api.flexidesa.id`).
3. Tolak atau tangani host reserved sesuai kebijakan; jangan teruskan ke wildcard tenant.
4. Cocokkan exact domain custom yang status verifikasinya aktif dan tenant-nya aktif.
5. Cocokkan exact domain/alias tenant yang terdaftar.
6. Cocokkan tepat satu label `<slug>.<base-domain>` ke slug tenant aktif. Tolak label bertingkat seperti `a.b.flexidesa.id`.
7. Untuk host lain, hasilkan unknown/404 atau 421. **Jangan gunakan fallback satu desa pada domain produksi FlexiDesa.**

Resolver harus gagal tertutup (fail closed). Host tidak dikenal tidak boleh dialihkan ke tenant pertama atau tenant default.

### 3.1 Fallback mode legacy

Jika mode single-tenant lama masih dibutuhkan untuk development atau instalasi mandiri, fallback harus opt-in secara eksplisit melalui konfigurasi environment khusus, misalnya `TENANT_LEGACY_SINGLE_HOST_FALLBACK=true`, dan hanya boleh aktif pada environment yang disetujui.

Bahkan saat flag aktif:
- exact platform host dan reserved host tetap diproses lebih dahulu;
- host tidak valid tetap ditolak;
- flag tidak boleh aktif pada production FlexiDesa;
- test harus membuktikan host platform tidak pernah resolve ke desa tunggal.

Jangan menambahkan flag sebelum pemilik deployment menyetujui kebutuhan kompatibilitas legacy.

## 4. Batas tanggung jawab routing dan otorisasi

### 4.1 Host router / Next.js Proxy

Proxy boleh:
- melakukan normalisasi/classification ringan;
- melakukan redirect kanonis seperti `www` ke apex;
- mengarahkan host platform ke halaman/area platform;
- menolak host reserved/unknown;
- meneruskan request setelah validasi awal.

Proxy **tidak boleh** menjadi satu-satunya otorisasi. Jangan mengandalkan cookie presence untuk mengesahkan akses ke data. Matcher dan jalur API/Server Action harus tetap dilindungi pada server.

### 4.2 Server-side tenant context

Sediakan satu fungsi server-only untuk mendapatkan konteks request, misalnya:

```ts
type RequestTenantContext =
  | { kind: "platform-public" }
  | { kind: "platform-admin" }
  | { kind: "demo"; villageId: number }
  | { kind: "village"; villageId: number; slug: string }
  | { kind: "custom-domain"; villageId: number; canonicalHost: string };
```

Bentuk final boleh disesuaikan dengan pola repository. Ketentuannya:
- tenant context dibentuk dari hostname yang sudah divalidasi dan database;
- gunakan satu sumber resolver untuk halaman publik, API publik, media, dan webhook yang membutuhkan konteks tenant;
- jangan mengambil `villageId` dari input klien sebagai otoritas;
- cache hanya dalam scope request yang aman; jangan memakai cache global lintas request/tenant;
- tenant nonaktif, domain tidak aktif, atau domain belum terverifikasi tidak boleh di-resolve.

### 4.3 Area Admin Desa

Pada `<slug>.flexidesa.id/admin`:
- wajib ada sesi valid;
- akun harus terikat pada desa yang sama dengan tenant hostname;
- role harus dimiliki tenant yang sama;
- permission diperiksa pada setiap Server Action dan Route Handler;
- semua query dan mutation memakai `villageId` dari konteks server/sesi tepercaya;
- jika sesi berasal dari desa lain, tolak akses (403) atau minta login ulang; jangan mengganti tenant sesi secara otomatis.

### 4.4 Platform Super Admin

Pada `admin.flexidesa.id`:
- hanya role platform Super Admin yang dapat masuk;
- identitas platform dibedakan secara eksplisit dari administrator desa;
- akun platform tidak boleh memperoleh akses desa hanya karena hostname;
- ketika mengelola desa, operasi harus menyebut target `villageId` yang divalidasi oleh use case, dengan audit trail;
- jangan mengandalkan nama role saja: validasi role platform, status sistem, dan relasi `user.villageId === null` sesuai model yang disepakati.

## 5. Strategi autentikasi dan sesi

Default keamanan adalah cookie host-only. Sesi di satu hostname tidak otomatis berlaku di hostname lain. Ini mencegah sesi desa A terbaca oleh desa B dan mengurangi dampak kompromi subdomain.

Sebelum implementasi auth multi-host:
1. Tentukan hostname kanonis untuk login Admin Desa dan Platform Admin.
2. Tentukan apakah login dilakukan per hostname tenant atau melalui identity host terpisah dengan alur redirect bertoken sekali pakai.
3. Pastikan callback, logout, reset password, email verification (jika diaktifkan), dan redirect `next` menggunakan allowlist origin yang tepat.
4. Validasi `Origin`/CSRF dan trusted origins Better Auth sesuai daftar hostname yang dikelola; jangan memakai wildcard origin luas tanpa alasan.
5. Jangan mengirim token sesi melalui query string, log, referer, atau URL yang dapat dibagikan.
6. Jika perlu SSO lintas subdomain, gunakan protokol handoff berumur pendek, sekali pakai, audience-bound, dan server-side exchange; jangan memperluas cookie domain sebagai jalan pintas.
7. Pastikan reset password tidak mengirim tautan ke host yang dapat dikendalikan attacker. Pilih origin berdasarkan konfigurasi/allowlist server-side, bukan `Host` arbitrer.

Konfigurasi Better Auth `BETTER_AUTH_URL` tunggal harus ditinjau. Pilih pola yang didukung versi Better Auth yang dipakai: instance per host, base URL kanonis dengan trusted origins terkontrol, atau identity host terpisah. Jangan mengubah konfigurasi sebelum test integrasi membuktikan seluruh alur.

## 6. Demo tenant

`demo.flexidesa.id` harus menunjuk satu tenant demo khusus, bukan fallback ke tenant pertama dan bukan data produksi desa.

Persyaratan:
- tenant demo dibuat melalui provisioning resmi atau seed khusus yang repeatable;
- semua data penduduk, keluarga, surat, dan dokumen adalah sintetis;
- upload, notifikasi eksternal, TTE, WhatsApp, email, API key, dan integrasi berbayar dinonaktifkan atau diarahkan ke sandbox;
- akun demo memiliki permission terbatas dan dapat di-reset secara terjadwal;
- demo tidak dapat membaca atau menulis data tenant lain;
- jangan menggunakan database produksi berisi data pribadi untuk demo.

## 7. Database domain dan custom domain

### 7.1 Domain bawaan FlexiDesa

Wildcard `*.flexidesa.id` dipetakan ke slug tenant. Domain induk disimpan dalam konfigurasi aplikasi (`DESA_BASE_DOMAIN=flexidesa.id`). Reserved host selalu mengalahkan wildcard.

Tabel `village_domains` tetap menjadi sumber pemetaan exact domain/alias. `villages.domain` dipertahankan sebagai cermin domain utama selama kompatibilitas kode lama masih dibutuhkan.

### 7.2 Custom domain

Sebelum custom domain dibuka ke pelanggan, perlu lifecycle domain dengan status eksplisit, minimal:
- `pending_verification`
- `verified`
- `active`
- `disabled`

Model data perlu menyimpan token/challenge atau referensi verifikasi, metode verifikasi, waktu verifikasi, waktu aktivasi, dan status TLS. Token verifikasi harus acak, memiliki masa berlaku, tidak dapat digunakan ulang setelah selesai, dan tidak ditampilkan ke pengguna lain.

Alur target:
1. Super Admin/admin desa memasukkan domain.
2. Sistem memastikan domain belum terdaftar/terikat tenant lain.
3. Sistem menerbitkan TXT DNS challenge atau HTTP challenge yang aman.
4. Worker/server memverifikasi bukti DNS/HTTP dari sisi server.
5. Setelah verifikasi, domain dapat diaktifkan dan sertifikat TLS diterbitkan.
6. Resolver hanya memetakan domain yang verified + active dan tenant active.
7. Penghapusan/perubahan domain mencabut pemetaan dan menjadwalkan penanganan sertifikat.

Jangan mengaktifkan domain hanya berdasarkan input form. Validasi DNS dan penerbitan TLS harus memiliki timeout, retry, audit, dan perlindungan terhadap SSRF/rebinding bila sistem melakukan fetch HTTP.

## 8. DNS, TLS, dan reverse proxy

Target konfigurasi infrastruktur (belum diverifikasi pada server):

- A/AAAA apex `flexidesa.id` mengarah ke ingress/reverse proxy.
- CNAME `www` ke apex atau redirect di ingress.
- Wildcard A/AAAA atau CNAME `*.flexidesa.id` ke ingress.
- `admin`, `demo`, dan host reserved diarahkan ke aplikasi yang sama tetapi diklasifikasikan terpisah.
- Sertifikat mencakup apex dan wildcard. Sertifikat wildcard biasanya membutuhkan DNS-01 challenge; pastikan renewal otomatis dan alert expiry.
- Reverse proxy harus menolak Host yang tidak dikenal, menghapus header forwarded dari klien, lalu menulis ulang forwarded headers sendiri.
- Aplikasi hanya mempercayai header proxy bila request datang dari proxy tepercaya dan konfigurasi trust proxy dibatasi.
- TLS wajib untuk semua host; HTTP hanya redirect ke HTTPS.
- Batasi ukuran request, timeout, dan rate limit pada ingress.
- Jangan mengirim header `X-Forwarded-Host` dari input klien ke tenant resolver.

Pengujian deployment harus membuktikan Host yang diterima Next.js sama dengan host yang divalidasi ingress. DNS wildcard saja tidak cukup untuk menjamin isolasi tenant.

## 9. Security invariants

Invarian berikut wajib dipertahankan:

1. Host platform tidak pernah resolve ke tenant.
2. Host unknown/reserved tidak pernah resolve ke tenant.
3. Satu hostname exact hanya boleh dimiliki satu tenant.
4. Satu slug hanya boleh dimiliki satu tenant.
5. Domain custom hanya aktif setelah verifikasi.
6. Tenant nonaktif tidak dapat diakses melalui hostname/domain alias.
7. Hostname menentukan tenant publik, tetapi tidak mengautentikasi pengguna.
8. User desa hanya dapat mengakses tenant yang sama dengan `users.village_id`.
9. Role tenant harus memiliki `village_id` yang sama dengan user; pengecualian platform harus eksplisit.
10. Semua read/write/import/export/download/API memvalidasi permission dan tenant di server.
11. Composite FK dan validasi use case mencegah relasi lintas tenant.
12. Cookie sesi tetap host-only kecuali ada desain SSO yang telah direview.
13. Redirect dan callback auth hanya menuju origin allowlist.
14. Demo tidak memakai data pribadi produksi atau integrasi eksternal aktif.
15. Tidak ada fallback tenant implisit pada production FlexiDesa.

## 10. Test matrix dan acceptance criteria

### 10.1 Unit test host classifier

| Kasus | Hasil yang diharapkan |
|---|---|
| `flexidesa.id` | platform-public |
| `www.flexidesa.id` | redirect/canonical platform |
| `admin.flexidesa.id` | platform-admin |
| `demo.flexidesa.id` | demo tenant yang ditetapkan |
| `sukamaju.flexidesa.id` | tenant Sukamaju |
| `a.b.flexidesa.id` | unknown/404 |
| `api.flexidesa.id` | reserved/API, bukan tenant |
| `unknown.flexidesa.id` | unknown/404 |
| host dengan port dan huruf kapital | normalisasi konsisten |
| host kosong/malformed | reject |
| host platform ketika hanya ada satu tenant | tetap platform, tidak fallback |
| tenant nonaktif | reject/404 |
| domain custom pending | reject |
| domain custom verified + active | tenant pemilik domain |

### 10.2 Integration/security test

- Host tenant A tidak pernah membaca data tenant B.
- Sesi tenant A yang dipakai pada hostname tenant B ditolak.
- Admin desa tidak dapat membuka konsol platform.
- Platform Super Admin tidak dianggap sebagai administrator desa biasa.
- Server Action/Route Handler menolak request tanpa sesi/permission meskipun Proxy dilewati.
- Manipulasi `Host`, `X-Forwarded-Host`, `Origin`, `next`, dan callback URL tidak mengubah tenant atau membuka redirect eksternal.
- Domain alias dan primary domain memetakan ke tenant yang sama.
- Penggantian domain utama tidak meninggalkan domain lama aktif tanpa keputusan eksplisit.
- Demo tidak dapat membaca data tenant produksi.
- Cache, media, file download, export, dan response CDN tidak tercampur antar tenant.
- Host unknown/reserved tidak pernah memakai fallback satu desa.

### 10.3 Deployment acceptance

Sebelum production:
- wildcard DNS dan apex teruji dari jaringan eksternal;
- sertifikat apex/wildcard valid dan auto-renew terpantau;
- ingress menolak Host tak dikenal;
- forwarded headers ditimpa proxy tepercaya;
- HTTPS, HSTS, cookie Secure/HttpOnly/SameSite, dan trusted origins tervalidasi;
- alur login, logout, reset password, dan redirect diuji pada setiap jenis host;
- backup/restore mencakup konfigurasi domain dan data tenant;
- monitoring mencatat kegagalan resolusi host tanpa membocorkan data sensitif.

## 11. Rencana implementasi bertahap

Urutan berikut sengaja memisahkan perubahan routing dari security hardening yang sedang berjalan.

| Tahap | Lingkup | Output | Gerbang selesai |
|---|---|---|---|
| D0 | Konfirmasi domain, hostname reserved, canonical host, dan keputusan auth | ADR/keputusan produk | Pemilik produk menyetujui peta host |
| D1 | Unit host classifier + reserved slug validation | Domain classifier dan test | Seluruh unit test host lulus |
| D2 | Server-side request context dan integrasi resolver publik/API/media | Satu sumber tenant context | Tidak ada resolver host yang berbeda |
| D3 | Platform host routing dan pemisahan landing/admin/demo | Route platform | Test platform-host vs tenant-host lulus |
| D4 | Auth multi-host, callback, reset, logout, trusted origins | Alur autentikasi tervalidasi | Test host-only session/CSRF/redirect lulus |
| D5 | Demo tenant sintetis dan sandbox integrations | Demo aman | Tidak ada akses data produksi |
| D6 | Wildcard DNS/TLS/reverse proxy staging | Staging multi-host | Deployment acceptance lulus |
| D7 | Custom domain verification | Lifecycle domain | DNS/HTTP challenge dan TLS diuji |
| D8 | Production rollout bertahap | Host produksi | Monitoring, rollback, backup, dan runbook siap |

**Prasyarat:** selesaikan dan review pekerjaan tenant security/isolasi yang sedang berlangsung sebelum D2–D6. Jangan menggabungkan perubahan host router dengan migration/security hardening yang belum disetujui dalam satu perubahan besar.

## 12. Risiko terbuka dan hal yang belum dibuktikan

- Belum ada pemeriksaan live DNS, reverse proxy, firewall, TLS, atau konfigurasi hosting.
- Belum ada runtime test lintas hostname pada deployment staging.
- Strategi final Better Auth untuk banyak hostname belum diputuskan.
- Lifecycle verifikasi custom domain belum tersedia pada baseline.
- Fallback single-tenant masih ada di resolver domain; kebijakan production harus diputuskan dan diuji.
- Keberadaan use case provisioning belum membuktikan UI platform admin dan seluruh lifecycle tenant sudah siap.
- Perubahan arsitektur harus diperiksa terhadap branch security yang aktif sebelum digabungkan.

## 13. Referensi source code

- `src/db/schema/village.ts`
- `src/features/desa/domain/host.ts`
- `src/features/desa/domain/tenant.ts`
- `src/features/desa/application/resolve-village.ts`
- `src/features/desa/infrastructure/desa-repository.ts`
- `src/features/multi-desa/application/provisioning-use-cases.ts`
- `src/features/multi-desa/infrastructure/provisioning-repository.ts`
- `src/features/multi-desa/infrastructure/kelola-desa-repository.ts`
- `src/proxy.ts`
- `src/lib/dal.ts`
- `src/lib/auth.ts`
- `src/lib/public-paths.ts`

## 14. Change log

- 2026-11-14: Dokumen awal disusun berdasarkan audit statis baseline 12 November 2026. Memisahkan fakta implementasi yang ditemukan, target arsitektur FlexiDesa, security invariants, dan kriteria penerimaan deployment.
