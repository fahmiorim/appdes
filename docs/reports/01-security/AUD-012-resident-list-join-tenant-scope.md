# AUD-012 — Resident List Join Tenant Scope

**Status:** Implementasi selesai; validasi runtime menunggu.  
**Base:** branch `task/AUD-003-penduduk-tenant-references` (membawa perbaikan AUD-003 yang belum di-merge).

## Perubahan
File: `src/features/penduduk/infrastructure/penduduk-repository.ts`

Pada query daftar penduduk dan query total count:
- Join keluarga membatasi `families.villageId = villageId`.
- Join wilayah membatasi `regions.villageId = villageId`.
- Filter utama penduduk tetap mensyaratkan `residents.villageId = villageId`.

Kondisi tenant ditempatkan pada klausa JOIN agar relasi yang tidak valid tidak menghilangkan penduduk dari daftar; kolom relasi tampil null, bukan mengambil data tenant lain.

## Validasi
- Review statis perubahan: PASS.
- Unit/integration, typecheck, lint/format, build: SKIPPED — belum dijalankan.
- Tidak ada migrasi skema.
- Belum ada PR, merge, atau deploy.

Catatan: branch ini diturunkan dari branch AUD-003 agar perbaikan foreign reference sebelumnya tetap ada. Integrasikan AUD-003 terlebih dahulu sebelum branch ini digabungkan ke main.
