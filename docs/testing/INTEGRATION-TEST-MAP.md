# Peta Integration Test per Modul

Peta ini menghubungkan setiap integration test dengan modul atau kelompok
lintas modul yang diuji. Sumber datanya adalah
`scripts/integration-test-map.json`; daftar test di
`vitest.integration.config.mts` harus sama persis dengan peta.

## Ringkasan

- **53** integration test
- **20** modul
- **21** test lintas modul:
  - 20 test schema/migration/composite FK di `src/db/`
  - 1 test isolasi `villageId` untuk enam modul

## Modul

| Modul | Jumlah | Test |
|---|---:|---|
| agenda | 1 | `agenda-repository.integration.test.ts` |
| bantuan | 1 | `integrasi-warga.test.ts` |
| database | 1 | `verifikasi-restore.integration.test.ts` |
| gis | 1 | `gis-repository.integration.test.ts` |
| inventaris | 1 | `inventaris-tenant-isolation.integration.test.ts` |
| kehadiran | 1 | `rekap-kehadiran-tenant-isolation.integration.test.ts` |
| kelompok | 1 | `kelompok-tenant-isolation.integration.test.ts` |
| keluarga | 1 | `keluarga-tenant-isolation.integration.test.ts` |
| keuangan | 1 | `keuangan-concurrency.integration.test.ts` |
| kontak | 1 | `kontak-tenant-isolation.integration.test.ts` |
| konten | 1 | `dokumen-publik.integration.test.ts` |
| layanan-mandiri | 3 | `permohonan-status-concurrency`, `integrasi-warga`, `permohonan-tenant-relations` |
| multi-desa | 7 | `isolasi-host`, `kelola-domain`, `lifecycle-tenant`, `provisioning-template`, `template-ekspor`, `cleanup-ekspor`, `platform-konsol` |
| penduduk | 4 | `dtks-tenant-isolation`, `penduduk-tenant-references`, `riwayat-penduduk-tenant-isolation`, `suplemen-tenant-isolation` |
| pesan-warga | 1 | `integrasi-pesan-warga.test.ts` |
| publik | 2 | `pengumuman-publik`, `media-quota-concurrency` |
| rbac | 1 | `rbac-tenant-isolation.integration.test.ts` |
| rumah-tangga | 1 | `rumah-tangga-tenant-isolation.integration.test.ts` |
| statistik | 1 | `statistik-tenant-isolation.integration.test.ts` |
| surat | 1 | `penomoran-archive.integration.test.ts` |

## Kelompok lintas modul

| Kelompok | Jumlah | Cakupan |
|---|---:|---|
| `database-schema` | 20 | Schema, composite FK, migration guard, cascade, restrict, set null, rollback |
| `tenant-isolation-lintas-modul` | 1 | `anjungan`, `arsip`, `buku-tamu`, `kehadiran`, `keuangan`, `lapak` |

## Kebijakan seleksi yang disarankan

| Perubahan | Integration test yang dijalankan |
|---|---|
| Dokumentasi atau UI murni | Tidak ada; CI sudah melewati job integration |
| Satu modul fitur | Test modul tersebut; tambah `tenant-isolation-lintas-modul` bila modul tercakup |
| `src/db/**` atau migration | Semua `database-schema`, ditambah test modul yang berubah |
| RBAC, auth, atau permission | Test `rbac`; pertimbangkan seluruh suite bila menyentuh sesi/tenant |
| Shared code, API, action, dependency, atau path tidak dikenal | **Seluruh 53 test** sebagai fail-safe |

Prinsipnya: seleksi hanya boleh mempersempit test bila path perubahan dapat
dipetakan dengan yakin. Path yang tidak dikenal harus menjalankan seluruh suite,
bukan menebak modul.

## Status integrasi ke CI

Peta dan validator sudah tersedia, tetapi **seleksi per modul belum diaktifkan
di CI**. CI saat ini baru memilih job (quality/integration/build) berdasarkan
kategori file. Seleksi per modul memerlukan perubahan runner dan harus diuji
dengan MySQL disposable sebelum dipakai sebagai gate.

## Perintah

```bash
node scripts/integration-test-map.mjs --check
node scripts/integration-test-map.mjs --markdown
```

Validator memastikan:

- semua file test benar-benar ada;
- tidak ada test yang terdaftar ganda;
- setiap test modul berada di direktori modulnya;
- daftar peta sama persis dengan include Vitest;
- direktori `coversModules` benar-benar ada.

Validator juga dijalankan sebagai langkah kecil di job quality CI agar peta
tidak tertinggal saat integration test ditambah atau dihapus.
