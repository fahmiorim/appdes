# Pemeriksaan klaim status `docs/TECHNICAL_AUDIT.md`

- **Tanggal:** 2026-11-19
- **Branch:** `task/technical-audit-status-check-2026-11-19`
- **Base commit:** `34c8cc5` (`origin/main`)
- **Task:** memeriksa apakah `docs/TECHNICAL_AUDIT.md` masih memuat klaim status yang bertentangan dengan kode terbaru.
- **Sifat task:** audit read-only. Tidak ada source code, schema, atau migration yang diubah. `TECHNICAL_AUDIT.md` juga tidak diubah karena dokumen itu baseline audit; koreksi diusulkan di §6.

## 1. Metode

- Menghitung ulang inventaris yang diklaim di header dan §2 dengan `find`, `ls`, dan `grep`.
- Membuka setiap bukti kode yang dirujuk tabel status §5 dan bagian AUD yang relevan.
- Membedakan tiga jenis masalah:
  1. **Bertentangan** — dokumen menyatakan A, kode menunjukkan B.
  2. **Kedaluwarsa** — klaim benar saat audit, sudah tertutup oleh pekerjaan setelahnya.
  3. **Tidak konsisten internal** — dua angka/status berbeda di dalam dokumen yang sama.
- Tidak menjalankan test atau migrasi; tidak mengakses database. Semua bukti berasal dari pembacaan kode.

## 2. File yang diperiksa

- `docs/TECHNICAL_AUDIT.md`
- `src/lib/auth.ts`, `src/lib/env.ts`, `src/lib/request-origin.ts`, `src/lib/sanitize.ts`, `src/lib/sanitize.test.ts`
- `src/features/rbac/application/authorization.ts`
- `src/features/keuangan/infrastructure/keuangan-repository.ts`
- `src/features/publik/infrastructure/media-storage.ts`, `src/features/publik/domain/media.ts`
- `src/features/layanan-mandiri/infrastructure/layanan-mandiri-repository.ts`, `application/ajukan-surat.ts`
- `src/features/kesehatan/application/kia-use-cases.ts`, `infrastructure/kesehatan-repository.test.ts`
- `src/features/keluarga/infrastructure/keluarga-repository.ts`, `src/features/penduduk/infrastructure/penduduk-repository.ts`
- `src/features/surat/domain/tte.ts`
- `src/app/api/webhooks/email/route.ts`
- `src/features/database/domain/database.ts`, `infrastructure/verifikasi-restore.ts`, `docs/deployment/BACKUP-RESTORE.md`
- `src/db/tenant-composite-fk.integration.test.ts`, `vitest.integration.config.mts`

## 3. Klaim yang terbukti masih akurat

Dihitung ulang pada `34c8cc5`, semuanya cocok dengan catatan 19 November 2026:

| Klaim | Hasil hitung |
| --- | --- |
| 48 halaman `page.tsx` | 48 |
| 19 halaman admin (12 Admin Desa + 7 konsol platform) | 19 total; 7 di `src/app/(admin)/super-admin` |
| 82 route handler | 82 |
| 52 direktori fitur | 52 |
| 16 migrasi `0000`–`0015` | 16 |
| 50 berkas `*.integration.test.ts` | 50 |
| 284 berkas test | 284 |
| 130 entri halaman/API | 48 + 82 = 130 |
| 79 berkas schema | 79 |
| Sesi 7 hari, update age 1 hari | `src/lib/auth.ts:120-121` |

Bukti status per temuan yang juga masih akurat: AUD-001 (`findRoleById(roleId, villageId)` dan pengecualian platform `villageId === null`), AUD-002 (test mengharapkan tepat 68 constraint `%_tenant_fk`), AUD-007 (`revokeSessionsOnPasswordReset: true`), AUD-011/012 (join keluarga, wilayah, dan agregasi memakai `villageId`), AUD-014 (kunci `media:<desa>`), AUD-016 (`affectedRows` → `conflict`), AUD-017 (magic bytes), AUD-019 (allowlist `TTE_ALLOWED_HOSTS`), AUD-020 (`TTE_SSL` tidak ada di `env.ts`), AUD-021 (`Host` saja + HMAC mengikat `host` dan `eventId`), AUD-025 (`konteksKia`), AUD-029 (`getRequestOrigin()` masih memakai `X-Forwarded-Host`). Kontrol positif §4 #1, #3, dan #8 juga terverifikasi.

## 4. Temuan — klaim yang bertentangan dengan kode

### F1. §3 menyebut cookie cache 5 menit; kode mematikannya (P1 untuk akurasi dokumen)

Dokumen: "Autentikasi | Better Auth; sesi 7 hari, update age 1 hari, **cookie cache 5 menit**."

Kode — `src/lib/auth.ts:119-128`:

```ts
session: {
  expiresIn: 60 * 60 * 24 * 7, // 7 hari
  updateAge: 60 * 60 * 24,
  // Sesi harus selalu diverifikasi ke database. Cookie cache stateless dapat
  // mempertahankan sesi yang sudah dicabut sampai cache kedaluwarsa.
  cookieCache: { enabled: false },
},
```

Dampak: pembaca bisa menyimpulkan sesi yang dicabut masih berlaku hingga 5 menit. Kenyataannya setiap permintaan memverifikasi sesi ke database — justru lebih kuat dari yang tertulis.

### F2. AUD-028 dinyatakan "tetap terbuka", padahal regression test XSS sudah ada (P1 untuk akurasi dokumen)

Dokumen menutup tabel dengan: "AUD-015 (backup media), AUD-022 (matriks endpoint publik), dan **AUD-028 (regression test XSS) tetap terbuka**."

Kode — `src/lib/sanitize.test.ts` memuat 9 test, termasuk:

- `<script>` beserta isinya dibuang,
- handler `onerror` dibuang,
- atribut `style` dengan `javascript:` dibuang,
- URI `javascript:` pada tautan ditolak,
- `<iframe>` dibuang,
- `data:` URI pada gambar ditolak.

Rekomendasi AUD-028 ("tambahkan regression test payload XSS") sudah terpenuhi. AUD-028 semestinya berstatus kontrol positif yang diuji, bukan temuan terbuka.

### F3. Tabel §5 mengklaim AUD-030 sudah mengassert filter `villageId`; test-nya tidak (P1 untuk akurasi dokumen)

Dokumen: "Test repository kini **mengassert filter `villageId`** (`kesehatan-repository.test.ts:66`)."

Kode — `src/features/kesehatan/infrastructure/kesehatan-repository.test.ts:66-71`:

```ts
it("listPosyandu memanggil dari tabel posyandu dengan filter villageId", async () => {
  const { listPosyandu } = await import("./kesehatan-repository");
  await listPosyandu(1);
  expect(from).toHaveBeenCalled();
  expect(where).toHaveBeenCalledWith(expect.anything());
});
```

Assertion hanya memeriksa bahwa `where` dipanggil, bukan bahwa predikat `villageId` ada di dalamnya; `expect.anything()` juga tidak membedakan argumen. Tidak ada assertion `villageId` lain di berkas itu (kata `villageId` hanya muncul pada mock schema dan judul test). Jadi AUD-030 tetap terbuka sesuai status "Sebagian", tetapi bukti yang dikutip menyesatkan dan klaim "kini mengassert" tidak benar.

### F4. Status AUD-013 dan rekomendasi §6 #6 kedaluwarsa (P2)

Tiga tempat menyatakan race condition keuangan belum tertutup:

- §AUD-013: "**Status:** risiko race condition … `saveKeuanganNilai()` … tanpa transaction yang terlihat".
- §6 #6: "**P2:** perbaiki race condition keuangan, kuota media, dan transisi status surat."
- Tabel §5 hanya menyebut `saveKeuanganNilai` berjalan dalam `db.transaction`, tanpa menyebut kunci.

Kode saat ini: `saveKeuanganNilai` berjalan di `denganKunciMysql('keuangan:<desa>:<tahun>')` + transaksi (AUD-034). Kuota media memakai `denganKunciMysql('media:<desa>')`, dan transisi permohonan memakai conditional update + `affectedRows`. Jalur impor APBDes (`upsertKeuanganBatch`) — yang tidak disebut sama sekali di dokumen — juga sudah diserialkan dan mengagregasi induk pada branch `task/AUD-013-apbdes-import-lock` (`86be91f`), belum di `main`.

Selain itu rujukan baris di tabel sudah bergeser: AUD-013 `keuangan-repository.ts:119` → fungsi mulai baris 109; AUD-014 `media-storage.ts:187` → kunci di baris 189.

### F5. AUD-015 hanya sebagian kedaluwarsa (P2)

Dokumen: "Status: belum terbukti ada/tidaknya backup eksternal", dan tetap didaftar sebagai terbuka.

Kode/dokumen operasi: `docs/deployment/BACKUP-RESTORE.md` kini memuat prosedur backup media (`tar` + checksum, §5), peringatan bahwa backup database **tidak** mencakup `storage/media`, serta prosedur restore media (§6.3). Yang belum ada tetap drill/otomatisasi dan verifikasi restore gabungan — persis yang dikatakan §7. Jadi AUD-015 lebih tepat "prosedur terdokumentasi; drill belum dijalankan" daripada "belum terbukti ada/tidaknya".

## 5. Temuan — inkonsistensi internal dokumen

| Lokasi | Klaim | Kondisi kode |
| --- | --- | --- |
| §2 butir 4 | "78 file schema TypeScript" | 79 (butir berikutnya di §2 dan header sudah menyebut 79) |
| §2 butir 2 | "sekitar 51 direktori fitur aktual" | 52; header menyebut 52 |
| §2 butir 3 | "sekitar 191 file test" | 284; butir yang sama menyebut 284 |
| AUD-031 | "11 integration test isolasi per modul plus `isolasi-village.integration.test.ts`" | 11 per-modul + 1 `isolasi-village` = 12 berkas; `kontak-tenant-isolation.integration.test.ts` tidak terhitung |
| Tabel §5 AUD-013 | "Diperbaiki" | Benar, tetapi §AUD-013 dan §6 #6 masih menyatakan sebaliknya |

Catatan: AUD-009/AUD-010/AUD-021/AUD-029 memang sudah memakai pola "status awal vs status kode terkini" yang benar. Pola itu belum diterapkan pada AUD-013, AUD-015, AUD-028, AUD-030, dan AUD-031.

## 6. Rekomendasi koreksi (belum diterapkan)

Usulan patch kecil, tanpa mengubah temuan baseline:

1. §3: ganti "cookie cache 5 menit" menjadi "cookie cache dimatikan; sesi diverifikasi ke database setiap permintaan".
2. AUD-028: hapus dari daftar "tetap terbuka"; catat regression test XSS ada di `src/lib/sanitize.test.ts`.
3. Tabel §5 AUD-030: ganti bukti menjadi "test belum mengassert predikat `villageId`; integration test dua tenant belum ada".
4. AUD-013: tambahkan catatan status kode (kunci + agregasi, termasuk impor) dan perbarui rujukan baris; §6 #6 menjadi "selesaikan sisa race condition di luar keuangan/media/surat" atau hapus butirnya.
5. AUD-015: ubah status menjadi "prosedur backup/restore media terdokumentasi; drill belum dijalankan".
6. §2: samakan angka schema (79), direktori fitur (52), dan berkas test (284) agar tidak berdampingan dengan angka lama.
7. AUD-031: perbarui jumlah menjadi 12 berkas isolasi dan sebut modul yang belum tercakup (`layanan-mandiri`, `surat`, `keuangan`, dan lainnya).

Setelah koreksi, tambahkan baris tanggal pembaruan di header agar snapshot tetap jelas.

## 7. Validasi

| Perintah | Hasil |
| --- | --- |
| `find src/app -name 'page.tsx' \| wc -l` dan varian admin/super-admin | **PASS** — 48 / 19 / 7 |
| `find src/app -name 'route.ts' \| wc -l` | **PASS** — 82 |
| `ls -d src/features/*/ \| wc -l` | **PASS** — 52 |
| `ls src/db/migrations/*.sql \| wc -l` | **PASS** — 16 |
| `find src -name '*.integration.test.ts' \| wc -l` | **PASS** — 50 |
| `find src -name '*.test.ts' -o -name '*.test.tsx' \| wc -l` | **PASS** — 284 |
| `ls src/db/schema/*.ts \| wc -l` | **PASS** — 79 |
| `grep -n ...` pada 15 berkas bukti (auth, rbac, keuangan, media, surat, webhook, kesehatan, database) | **PASS** — hasil sesuai §3–§5 |
| `npx prettier --check docs/reports/00-baseline/TECHNICAL-AUDIT-STATUS-CHECK-2026-11-19.md` | **PASS** |
| `npm run typecheck` / `npm run test:unit` / `npm run test:integration` | **SKIPPED** — tidak ada perubahan kode; task hanya audit dokumen |

## 8. Risiko dan keterbatasan

- Audit ini statis. Klaim yang menyangkut perilaku runtime (mis. apakah sanitasi benar-benar dipakai di semua jalur render) tidak diverifikasi di browser/server.
- Jumlah berkas dihitung pada `34c8cc5`; angka akan berubah bila ada PR yang di-merge.
- Branch `task/AUD-013-apbdes-import-lock` belum di-merge; klaim tentang impor APBDes baru berlaku di branch itu, bukan di `main`.
- Tidak ada klaim dokumen yang diperbaiki pada task ini. Bila tidak dikoreksi, pembaca tetap bisa menyimpulkan sesi punya cookie cache 5 menit, XSS tanpa regression test, dan AUD-030 sudah menguji filter tenant.

## 9. Kesimpulan

`docs/TECHNICAL_AUDIT.md` **masih memuat klaim yang bertentangan dengan kode**: konfigurasi cookie cache (§3, F1), status AUD-028 (F2), bukti AUD-030 (F3), serta status AUD-013/AUD-015 dan §6 #6 (F4–F5). Inventaris angka di header sudah akurat, tetapi tiga angka di §2 masih berdampingan dengan angka lama, dan hitungan AUD-031 kurang satu.

Temuan prioritas tinggi lainnya (AUD-001, 002, 007, 011, 012, 014, 016, 017, 019, 020, 021, 025, 029) masih sesuai dengan kode. Dokumen layak dipertahankan sebagai baseline dengan koreksi status di atas, bukan ditulis ulang.

## 10. Status

Siap review. Tidak ada perubahan kode; laporan ini hanya mencatat temuan dan usulan koreksi.
