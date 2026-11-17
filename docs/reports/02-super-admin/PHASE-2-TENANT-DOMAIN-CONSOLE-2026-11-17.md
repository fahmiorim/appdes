# PHASE-2 — Pengelolaan domain alias tenant di konsol Super Admin

- **Task:** mengekspos pengelolaan domain alias tenant pada konsol Super Admin.
- **Tanggal:** 17 November 2026
- **Branch:** `task/phase-2-tenant-domain-console`
- **Base commit:** `e9ae293` (di atas branch `task/phase-2-tenant-console`)
- **Commit implementasi:** lihat SHA pada penyerahan

## 1. Tujuan

Use case domain (`tambahDomain`, `hapusDomain`, `jadikanDomainUtamaDesa`,
`daftarDomainDesa`) sudah ada, tetapi belum bisa dipakai dari UI: operator hanya
melihat satu kolom domain dari `villages.domain`. Konsol sekarang menampilkan
seluruh domain/alias per desa dan menyediakan aksi tambah, jadikan utama, dan
hapus.

## 2. Kondisi awal dan analisis

- `listSemuaDomain()` sudah tersedia di repository tetapi belum dipakai; cocok
  untuk satu query bagi seluruh tenant (menghindari N+1).
- `villages.domain` adalah cermin domain utama; penggantian utama harus
  memperbarui keduanya (sudah dilakukan repository dalam transaksi).
- Aturan domain pertama otomatis utama, alias non-utama boleh dihapus, dan
  domain unik lintas tenant sudah ada di repository — konsol tidak boleh
  menduplikasi aturan itu, hanya menampilkannya.

## 3. File yang diperiksa

- `src/features/multi-desa/application/kelola-desa-use-cases.ts`
- `src/features/multi-desa/infrastructure/kelola-desa-repository.ts`
- `src/features/multi-desa/domain/kelola-desa.ts`
- `src/features/multi-desa/presentation/tenant-console.tsx`
- `src/app/(admin)/super-admin/actions.ts`, `page.tsx`
- `src/features/multi-desa/isolasi-host.integration.test.ts` (pola uji host/domain)

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/features/multi-desa/application/kelola-desa-use-cases.ts` | Use case `daftarSemuaDomain()` (guard `requireSuperAdmin` + satu query) |
| `src/features/multi-desa/application/kelola-desa-use-cases.test.ts` | Test penolakan non-platform untuk daftar domain dan tambah domain, plus jalur sah + audit |
| `src/app/(admin)/super-admin/actions.ts` | Server Action `tambahDomainAction`, `hapusDomainAction`, `jadikanUtamaAction` |
| `src/features/multi-desa/presentation/tenant-console.tsx` | Seksi "Domain dan alias" di panel kelola: daftar domain, badge utama, tambah/utama/hapus |
| `src/app/(admin)/super-admin/page.tsx` | Mengambil `daftarSemuaDomain()` dan meneruskan ke konsol |
| `src/app/globals.css` | Gaya daftar domain dan seksi panel lebar |
| `src/features/multi-desa/kelola-domain.integration.test.ts` | Uji repository domain pada database disposable |
| `vitest.integration.config.mts`, `scripts/integration-test-map.json` | Mendaftarkan test integrasi baru |
| `docs/deployment/DATABASE.md` | Menyebut pengelolaan domain tersedia di konsol |

## 5. Perubahan

- Seksi baru **Domain dan alias** pada panel **Kelola** setiap desa:
  - daftar seluruh domain desa, domain utama diberi badge "Utama";
  - domain non-utama memiliki tombol **Jadikan utama** dan **Hapus**;
  - form **Tambah domain atau alias** (normalisasi + validasi hostname tetap di
    `domainDesaSchema` pada use case).
- Domain dimuat satu kali untuk semua tenant lalu dikelompokkan per desa di
  client, sehingga membuka panel tidak memicu query tambahan.
- Aksi dinonaktifkan untuk desa yang sudah di-purge; penolakan sebenarnya tetap
  terjadi di server.
- Setiap aksi memanggil `revalidatePath("/super-admin")`, sehingga daftar dan
  `villages.domain` langsung mencerminkan perubahan.

## 6. Security dan tenant

- `daftarSemuaDomain` memanggil `requireSuperAdmin`; data yang dikembalikan
  hanya hostname/ID domain, bukan data pribadi.
- `villageId` dan `domainId` dari form divalidasi sebagai id positif dan
  kepemilikannya diperiksa repository (`domainId` harus milik `villageId` itu),
  sehingga ID domain tenant lain menghasilkan `NOT_FOUND`.
- Keunikan domain lintas tenant ditegakkan repository (`CONFLICT`), bukan hanya
  validasi UI.
- Perubahan domain dicatat sebagai audit `desa.domain` (use case lama, tidak
  diubah); konsol tidak menambah jalur audit baru.

## 7. Validasi

| Perintah | Hasil |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run check` (typegen, tsc, eslint, prettier, unit test) | PASS — 0 error, 7 warning lama (`<img>`); 207 file, 1832 test |
| `TEST_DATABASE_URL="mysql://root:@127.0.0.1:3306/desa_test" TEST_DATABASE_ACK=1 NODE_ENV=test npx vitest run --config vitest.integration.config.mts src/features/multi-desa/kelola-domain.integration.test.ts` | PASS — 7 test |
| `npm run build` | PASS |

Test integrasi membuktikan: domain utama tercermin ke `villages.domain`, alias
tidak mengubah utama, domain utama tidak bisa dihapus, penggantian utama
memindahkan badge dan `villages.domain`, alias lama bisa dihapus, domain tenant
lain ditolak saat ditambah, dan ID domain tenant lain ditolak untuk
jadikan-utama/hapus.

### Koreksi setelah CI (18 November 2026)

CI pada PR menolak `Unit test dan quality check`:
`src/app/(admin)/super-admin/page.test.ts` ternyata menjalankan query domain
asli (`village_domains`), karena mock `daftarSemuaDomain` belum ditambahkan saat
halaman mulai memuat domain. Di mesin lokal hal ini lolos selama database dapat
diakses (atau hanya terlihat saat kredensial salah), sehingga pemeriksaan PASS
di atas bergantung pada lingkungan.

Perbaikan: mock `daftarSemuaDomain` ditambahkan ke test dan mock `tenant-table`
yang sudah dihapus dibersihkan. Test halaman kini lulus tanpa database:

| Perintah | Hasil |
|---|---|
| `npx vitest run "src/app/(admin)/super-admin/page.test.ts"` | PASS — 3 test, tanpa koneksi database |

## 8. Risiko dan batasan

- Interaksi form domain belum diuji otomatis di browser; verifikasi terbatas
  pada typecheck, lint, unit/integration test, dan build.
- Bila desa belum punya domain sama sekali (provisioning tanpa domain), daftar
  kosong dan domain pertama yang ditambahkan otomatis menjadi utama.
- Perubahan domain utama langsung berlaku untuk resolusi host; tidak ada masa
  transisi/DNS check, sama seperti perilaku use case sebelumnya.
- Konsol menampilkan seluruh domain tenant; jumlah besar tetap satu query tanpa
  paginasi.

## 9. Kesimpulan

Domain alias kini dapat dikelola dari konsol dengan aturan yang sama seperti
use case/repository, termasuk penolakan lintas tenant. Langkah berikutnya yang
disarankan: jadwal pembersihan berkas ekspor kedaluwarsa.
