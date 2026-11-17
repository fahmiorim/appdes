# Fase 2 — Bootstrap Super Admin dan template provisioning tenant

- **Task:** Fase 2, irisan 1 — bootstrap Super Admin platform dan provisioning
  desa berbasis template platform (bukan menyalin desa pertama).
- **Tanggal:** 17 November 2026.
- **Branch:** `task/phase-2-self-contained-provisioning`.
- **Base commit:** `da63c9cd7f06d631763cd51da0fbae10cd9d1842` (`main`).
- **Commit hasil:** belum dibuat saat laporan ini ditulis; diisi pada commit yang sama.

## 1. Kondisi awal dan analisis

Roadmap Fase 2 menetapkan dua kriteria yang belum terpenuhi:

1. Provisioning harus bekerja pada instalasi baru **tanpa desa sumber**.
2. Aksi sensitif platform harus tercatat dalam audit trail.

Temuan saat pemeriksaan:

- `provisionDesa` mengambil desa dengan `id` terkecil sebagai **cetakan**, lalu
  menyalin role, modul, matriks akses, tema, menu publik, katalog surat, buku
  bumindes, dan kategori inventaris. Pada database kosong fungsi ini melempar
  `Belum ada desa sumber untuk menyalin fondasi.`
- Tidak ada katalog role/modul di kode; satu-satunya sumbernya adalah baris
  database instalasi yang sudah berjalan. Karena itu template tidak dapat
  diturunkan dari repository tanpa menjadi artefak baru.
- Tidak ada jalur bootstrap untuk akun platform. Dashboard `/super-admin` sudah
  ada, tetapi instalasi baru tidak punya akun yang dapat masuk.
- `buatDesaBaru` tidak menulis audit, sehingga pembuatan tenant tidak tercatat.
- Di database lokal (`desa_dev`) hanya ada role platform dan satu akun platform;
  tidak ada desa, jadi tidak ada katalog nyata yang bisa diekspor di sini.

## 2. Keputusan implementasi

1. **Template sebagai artefak repository.** Template ditulis di
   `src/db/templates/tenant-template.ts`, divalidasi skema Zod, dan memakai kunci
   alami (slug) sehingga tidak bergantung pada id database mana pun. Provisioning
   memakai satu jalur: baca template → tulis fondasi. Tidak ada lagi fallback ke
   desa pertama.
2. **Batas isi template.** Template memuat role, modul, matriks akses, tema, dan
   menu publik. Katalog surat, buku bumindes, dan kategori inventaris **tidak**
   ikut: ketiganya data master milik desa (template surat memuat kop, logo, dan
   format penomoran desa asal) sehingga tidak boleh diwariskan diam-diam.
3. **Template bawaan minimal.** Katalog admin saat ini hanya `/beranda`, jadi
   template hanya berisi role `administrator` dan tema `esensi`. Modul ditambah
   ke template ketika halaman admin tersedia.
4. **Bootstrap tanpa endpoint publik.** Skrip CLI membaca kredensial dari
   environment, hanya menulis dengan `--yes`, dan menolak berjalan bila sudah ada
   akun platform.

## 3. File yang diperiksa

- `src/features/multi-desa/infrastructure/provisioning-repository.ts`
- `src/features/multi-desa/application/provisioning-use-cases.ts`
- `src/features/multi-desa/application/kelola-desa-use-cases.ts`
- `src/features/rbac/domain/role.ts`, `src/features/rbac/domain/permission.ts`
- `src/features/rbac/infrastructure/rbac-repository.ts`
- `src/features/rbac/application/authorization.ts`
- `src/db/schema/{rbac,village,auth,content,theme}.ts`
- `src/lib/auth.ts`, `src/app/(admin)/layout.tsx`, `src/features/navigation/**`
- `docs/MASTER_ROADMAP.md`, `docs/deployment/{README,DATABASE,OPERATIONS}.md`
- `scripts/visual-qa/seed.mjs` (pola skrip operasional), `vitest.integration.config.mts`

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/features/multi-desa/domain/template-tenant.ts` | Skema Zod template, validasi integritas (slug ganda, induk hilang, role `administrator` wajib, akses menunjuk entitas tak dikenal), dan `urutkanModulIndukDulu` |
| `src/features/multi-desa/domain/template-tenant.test.ts` | 11 test: template bawaan valid, penolakan template tidak konsisten, urutan induk-dulu, deteksi siklus |
| `src/db/templates/tenant-template.ts` | Template platform bawaan yang direview lewat repository |
| `src/features/multi-desa/infrastructure/template-tenant-repository.ts` | Pemuat template + penulis fondasi tenant di dalam transaksi |
| `src/features/multi-desa/infrastructure/provisioning-repository.ts` | Melepas ketergantungan desa pertama; memakai template; berhenti menyalin data master desa lain |
| `src/features/multi-desa/application/provisioning-use-cases.ts` | Mencatat audit `desa.create` setelah provisioning |
| `src/features/multi-desa/application/provisioning-use-cases.test.ts` | Test penolakan admin desa dan pencatatan audit |
| `src/features/multi-desa/provisioning-template.integration.test.ts` | Test integrasi: tenant baru tidak mewarisi konfigurasi desa sumber, role admin milik tenant sendiri, domain duplikat ditolak |
| `scripts/platform/bootstrap.mjs` | Bootstrap Super Admin pertama (guard, validasi, hash Better Auth, transaksi) |
| `package.json` | Skrip `platform:bootstrap` |
| `vitest.integration.config.mts`, `scripts/integration-test-map.json` | Mendaftarkan integration test baru agar dijalankan suite/CI |
| `docs/deployment/DATABASE.md`, `README.md`, `OPERATIONS.md` | Menghapus klaim "bootstrap belum tersedia", menambah prosedur dan batas template |
| `.env.example` | Mendokumentasikan variabel `PLATFORM_ADMIN_*` (hanya untuk bootstrap) |

## 5. Perubahan

**Bootstrap.** `npm run platform:bootstrap` membuat role platform `super-admin`
(`village_id NULL`) bila belum ada, lalu satu akun pengelola platform
(`village_id NULL`, `must_change_pin = 1`) beserta kredensial `credential`.
Tanpa `--yes` skrip hanya mencetak target database dan rencana. Bila sudah ada
akun platform, skrip berhenti dengan exit code 1 tanpa mengubah data.

**Provisioning.** Alur baru: validasi input → cek domain/username/email → muat
dan validasi template → transaksi (desa, domain utama, fondasi dari template,
akun administrator desa). Template rusak gagal sebelum ada penulisan.

**Audit.** `buatDesaBaru` mencatat `desa.create` dengan `villageId`, `actorId`,
`resourceId`, dan detail nama/kode/domain.

## 6. Security dan tenant

- Role platform tetap `village_id NULL`; akun platform tidak dibuat dengan
  `villageId`, dan `isSuperAdminUser` tidak berubah.
- Kredensial bootstrap dibaca dari environment (bukan argumen) dan di-hash
  dengan `better-auth/crypto`, bukan hash buatan sendiri.
- Skrip menolak menimpa akun platform yang sudah ada, sehingga tidak menjadi
  jalur reset akses.
- Provisioning tetap memeriksa keunikan domain, slug, username, dan email, dan
  menulis seluruh tenant dalam satu transaksi.
- Role administrator desa baru selalu dibuat di dalam tenant baru; integration
  test memverifikasi `roles.village_id` sama dengan `users.village_id`.
- Integration test membuktikan tenant baru tidak mewarisi modul/role/tema desa
  lain — kontrol lintas tenant untuk jalur provisioning.

## 7. Validasi

| Perintah | Hasil |
|---|---|
| `npx vitest run --config vitest.config.mts src/features/multi-desa` | **PASS** — 5 file, 32 test |
| `npm run test` | **PASS** — 204 file, 1802 test |
| `npm run typecheck` (`next typegen && tsc --noEmit`) | **PASS** |
| `npm run lint` | **PASS** — 0 error; 7 warning `no-img-element` yang sudah ada di `src/app/(auth)/masuk/page.tsx` |
| `npm run format:check` | **PASS** |
| `TEST_DATABASE_URL=…/desa_test TEST_DATABASE_ACK=1 npx vitest run --config vitest.integration.config.mts src/features/multi-desa/provisioning-template.integration.test.ts` | **PASS** — 3 test pada database disposable |
| Bootstrap pada database disposable (`desa_test_platform_bootstrap`, dibuat lalu dihapus) | **PASS** — run pertama exit 0 (role `super-admin` `village_id NULL`, user `village_id NULL`, `must_change_pin 1`, hash 161 karakter); run kedua exit 1 dengan pesan penolakan |
| `npm run build` | **SKIPPED** — tidak ada perubahan pada boundary build; typecheck sudah dijalankan |
| Pemeriksaan UI/browser | **SKIPPED** — tidak ada perubahan UI pada irisan ini |

Catatan: database `desa_dev` tidak disentuh. Database disposable
`desa_test_platform_bootstrap` dibuat khusus untuk smoke test bootstrap dan
dihapus setelah verifikasi; integration test berjalan pada `desa_test`.

## 8. Risiko dan hal yang belum terverifikasi

- **Belum ada UI/Server Action untuk membuat desa.** `buatDesaBaru` sudah teruji,
  tetapi belum ada halaman atau action yang memanggilnya; konsol pengelolaan
  tenant belum dibangun. Super Admin baru dapat masuk dan melihat dashboard
  kosong, belum dapat membuat tenant dari UI.
- **Template bawaan minimal.** Tenant baru hanya mendapat role `administrator`
  dan tema `esensi`; belum ada modul karena halaman admin yang ada baru
  `/beranda`. Katalog lengkap perlu ditambahkan ke template saat halaman tersedia.
- **Perubahan perilaku untuk instalasi lama.** Desa baru tidak lagi mewarisi
  katalog surat, buku bumindes, dan kategori inventaris dari desa pertama.
  Instalasi yang membutuhkan katalog kaya harus mengisinya sendiri atau
  mengekspor template (alat ekspor belum dibuat).
- **Bootstrap belum diuji pada MySQL production/staging**; hanya pada database
  disposable lokal dengan MySQL yang sama versinya dengan CI.
- **Belum ada uji login end-to-end** dengan akun hasil bootstrap (butuh server
  berjalan dan sesi browser).
- Lifecycle penghapusan (soft delete, retensi 90 hari, ekspor, purge) belum
  diimplementasikan; kebijakan default sudah disetujui tetapi belum ada kode.

## 9. Kesimpulan

Kriteria "provisioning bekerja pada instalasi baru tanpa desa sumber" terpenuhi
di lapisan data dan teruji, dan pembuatan tenant kini tercatat di audit trail.
Kriteria "Super Admin dapat membuat dan mengelola tenant" belum utuh karena
konsol UI belum ada. Langkah berikutnya: Server Action + halaman pembuatan dan
pengelolaan tenant, lalu lifecycle retensi/purge sesuai kebijakan yang disetujui.
