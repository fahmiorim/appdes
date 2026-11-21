# ADMIN-PEMERINTAHAN — PR #211 (2026-11-21)

- **Task:** Menyelesaikan PR #211 `feature/admin-pemerintahan-desa` (Pemerintahan Desa management + integrasi publik) agar dapat direview dan lolos CI.
- **Tanggal:** 2026-11-21
- **Branch:** `feature/admin-pemerintahan-desa`
- **Base commit:** `c34d7b68`
- **Commit pekerjaan:** `8ca3233c` (merge `origin/main` `336b2fa8`), `25ff4632` (merge `origin/main` `3f1c0091` setelah #209), commit laporan ini.

## Kondisi awal

- PR masih draft, status `CONFLICTING` terhadap `main`, dan belum pernah menjalankan CI.
- Branch memakai migrasi `0027`, yang sudah dipakai PR #209 (surat) sehingga nomor dan snapshot bertabrakan.
- `npm run typecheck` gagal: `</section>` ganda, aksi RBAC `"create"` yang tidak ada, dan kolom `sortOrder` area tidak ikut di-select.
- `lapisan-publik.test.ts` gagal karena route `api/pemerintahan/dokumen/[id]` dan dua berkas application mengimpor `@/db`/Drizzle langsung.

## Perubahan

| File | Alasan |
| --- | --- |
| `src/db/migrations/0032_pemerintahan_desa.sql` | Migrasi pemerintahan dinomori ulang dari `0027` agar tidak bentrok dengan #209; SQL digenerate ulang lewat drizzle-kit (95 baris) sehingga lolos guard paritas. |
| `src/db/migrations/meta/0032_snapshot.json` | Snapshot baru, `prevId` = `0031_pengajuan_layanan_hasil` setelah #209 masuk `main`; `id` mengikuti gaya `0032_pemerintahan_desa`. |
| `src/db/migrations/meta/_journal.json` | Entri idx 32 untuk migrasi pemerintahan, dipertahankan bersama entri 0027–0031 dari #209. |
| `src/db/templates/tenant-template.ts` | Menu dan grant operator pemerintahan digabung dengan menu/ grant surat dari `main` (tidak ada yang hilang). |
| `next.config.ts` | Komentar `serverActions.bodySizeLimit` disatukan; nilainya tetap `25mb`. |
| `src/app/globals.css` | Blok CSS pemerintahan digabung dengan CSS kependudukan dari `main`. |
| `src/features/pemerintahan/infrastructure/pemerintahan-repository.ts` | Baru. Semua query tenant-scoped modul pemerintahan (dashboard, perangkat, jabatan, riwayat, lembaga, anggota, wilayah/area/polygon, profil desa, publik, status pemilik dokumen). |
| `src/features/pemerintahan/application/use-cases.ts` | Hanya memanggil repository; aturan bisnis (validasi status, siklus atasan, GeoJSON, slug jabatan) tetap di application layer. Ditambah `unduhDokumenPemerintahanData` untuk route unduhan. |
| `src/features/pemerintahan/application/publik.ts` | Membaca data publik lewat repository, bukan Drizzle. |
| `src/app/api/pemerintahan/dokumen/[id]/route.ts` | Tidak lagi mengimpor `@/db` atau media storage; memanggil use case application dan tetap mengembalikan 404 untuk semua kegagalan. |
| `src/features/wilayah/application/use-cases.ts` | Aksi RBAC `"create"` diganti `"update"`. |
| `src/app/perangkat/[id]/page.tsx` | `</section>` ganda dihapus. |

## Security / tenant

- Semua query repository memfilter `village_id` dari tenant yang sudah diverifikasi (`requirePermission` + `resolveVillageId`).
- FK lintas tenant (jabatan, atasan, lembaga/anggota, layer polygon, perangkat/lembaga pemilik dokumen) diverifikasi berada di desa aktif sebelum create/update.
- Unduhan dokumen: dokumen publik hanya terbuka bila pemiliknya masih `aktif`/tampil publik; dokumen privat wajib permission `read` dan desa sesi sama. Kegagalan selalu 404 agar keberadaan dokumen tenant lain tidak bocor.
- Menghapus perangkat membersihkan `atasan_id` yang menunjuk ke perangkat tersebut dan menghapus media terkait.

## Migrasi

`0032_pemerintahan_desa.sql` menambah tabel `jabatan_perangkat`, `perangkat_desa`, `perangkat_riwayat_jabatan`, `lembaga_desa`, `lembaga_anggota`, `pemerintahan_dokumen`, `areas`, `polygons`, kolom wilayah pada `profil_desa`, serta seed menu/grant pemerintahan. Urutan deploy: migrasi `0027`–`0031` (#209) lebih dulu, lalu `0032`. Tidak ada backfill; rollback berarti drop objek baru dan kolom `profil_desa` yang ditambahkan.

Catatan operasional: halaman publik yang membaca `profil_desa` (mis. `getProfilDesa` di `content-repository.ts`) sekarang men-select kolom wilayah baru. Database yang belum menjalankan `0032` akan gagal dengan error kolom tidak dikenal; jalankan `npm run db:migrate` pada database non-production sebelum menguji branch ini.

## Validasi

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` | PASS |
| `npx eslint .` | PASS (0 error, 2 warning lama di `scripts/wilayah/generate-wilayah.mjs`) |
| `npm run format:check` | PASS |
| `npx vitest run src/db/migrasi-paritas.test.ts` | PASS (9 test) |
| `npx vitest run src/features/publik/application/lapisan-publik.test.ts` | PASS (4 test) |
| `npm run test:unit` | PASS (245 file, 2078 test) |
| `npm run build` | PASS |
| Integration test MySQL | SKIPPED — Docker/MySQL tidak tersedia di mesin lokal; dijalankan oleh CI. |

## Risiko tersisa

- Integration test dan Visual QA baru diverifikasi di CI.
- Migrasi belum dijalankan pada database lokal sehingga halaman publik yang membaca kolom profil baru akan gagal sampai `npm run db:migrate` dijalankan.
- Perubahan ini belum di-merge; keputusan merge menunggu reviewer.

## Kesimpulan

PR #211 sudah sinkron dengan `main` (termasuk #209), memakai migrasi `0032` yang berurutan, dan lolos seluruh pemeriksaan lokal. Status: siap review setelah CI hijau.
