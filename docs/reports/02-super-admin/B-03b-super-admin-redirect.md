# B-03b — Redirect pengguna tanpa hak dari halaman /super-admin

- **Task:** lanjutan B-03 — non-super-admin tidak boleh melihat error boundary saat membuka `/super-admin`.
- **Tanggal:** 17 November 2026
- **Branch:** `task/AUD-034-b3b-super-admin-redirect-2026-11-17` (di atas branch B-03)
- **Base commit:** `c3eb3185b1daccd037a8b13676415b4c353b7aad` (commit guard B-03)
- **Commit pekerjaan:** `43428c42683bbb8d02db0ce82c5b7e43489e54e1`
- **Tujuan:** Admin Desa dialihkan ke `/beranda` dan pengguna tanpa sesi ke `/masuk`, bukan menerima halaman error.

> **Status revisi (17 November 2026):** perilaku redirect untuk pengguna yang sudah login tanpa hak **digantikan oleh [B-03c](./B-03c-forbidden-page.md)**. Pengguna tersebut kini menerima halaman 403 berisi penjelasan melalui `forbidden()`, sedangkan pengguna tanpa sesi tetap diarahkan ke `/masuk`. Laporan ini dipertahankan sebagai catatan keputusan B-03b; jangan memakai redirect `FORBIDDEN` → `/beranda` sebagai perilaku terkini.

## 1. Kondisi awal

Setelah B-03, halaman menjalankan `await requireSuperAdmin();` sebelum memuat data. Guard berhasil menolak akses, tetapi `requireSuperAdmin()` melempar `AppError` `FORBIDDEN` (atau `UNAUTHENTICATED`) dari Server Component. Repository belum memiliki `forbidden.tsx` maupun `error.tsx` khusus, sehingga hasilnya error boundary generik — bukan penolakan yang dapat dipahami pengguna.

## 2. Pilihan pendekatan

| Pendekatan | Alasan tidak dipilih / dipilih |
| --- | --- |
| `forbidden.tsx` + `forbidden()` | Memerlukan `experimental.authInterrupts` di `next.config.ts`; belum diaktifkan dan mengubah konfigurasi framework untuk satu halaman. |
| `error.tsx` di segmen admin | Menangkap semua error (termasuk bug server) dan tidak dapat membedakan `FORBIDDEN` dari kegagalan lain secara andal di client. |
| **Redirect di gerbang halaman** | **Dipilih** — memakai API stabil, tidak mengubah konfigurasi, dan langsung memberi tujuan yang benar: beranda untuk Admin Desa, halaman masuk untuk pengguna tanpa sesi. |

## 3. File yang diperiksa

- `src/app/(admin)/super-admin/page.tsx` — guard dan pemuatan data.
- `src/app/(admin)/super-admin/page.test.ts` — test guard dari B-03.
- `src/features/multi-desa/application/provisioning-use-cases.ts` — kode `AppError` yang dilempar `requireSuperAdmin`.
- `src/lib/errors.ts` — `isAppError`, `forbidden`, `unauthenticated`.
- `src/app/(admin)/layout.tsx` — perilaku redirect yang sudah ada untuk konteks admin.
- `next.config.ts` — memastikan `authInterrupts` tidak aktif.

## 4. File yang diubah

| File | Alasan |
| --- | --- |
| `src/app/(admin)/super-admin/page.tsx` | Menambahkan `pastikanSuperAdmin()` yang menerjemahkan `FORBIDDEN` → `/beranda` dan `UNAUTHENTICATED` → `/masuk`; error lain tetap dilempar. |
| `src/app/(admin)/super-admin/page.test.ts` | Test negatif memverifikasi tujuan redirect dan memastikan data tenant tidak dimuat; test positif tetap ada. |

Tidak ada perubahan pada guard use case, layout, route API, schema, dependency, atau konfigurasi Next.

## 5. Perubahan

```tsx
async function pastikanSuperAdmin(): Promise<void> {
  try {
    await requireSuperAdmin();
  } catch (error) {
    if (isAppError(error) && error.code === "FORBIDDEN") {
      redirect("/beranda");
    }

    if (isAppError(error) && error.code === "UNAUTHENTICATED") {
      redirect("/masuk");
    }

    throw error;
  }
}
```

- `redirect()` melempar `NEXT_REDIRECT` sehingga halaman berhenti sebelum `daftarDesaSuperAdmin()` dipanggil.
- Error non-`AppError` (mis. database mati) tetap naik ke error boundary; tidak disamarkan sebagai redirect.
- Guard `requireSuperAdmin()` di use case tetap ada sebagai lapisan kedua.

## 6. Test

Perintah dan hasil sebenarnya (Windows, Node v26.2.0, tanpa database):

| Perintah | Hasil |
| --- | --- |
| `npx vitest run "src/app/(admin)/super-admin/page.test.ts"` | **PASS** — 3 test |
| Test yang sama tanpa perubahan halaman (stash sementara) | **FAIL** — 2 gagal, 1 lulus; test negatif menangkap tidak adanya redirect |
| `npm run test:unit` | **PASS** — 201 file, 1.778 test |
| `npm run typecheck` (`next typegen && tsc --noEmit`) | **PASS** — exit 0 |
| `npm run lint` (`eslint .`) | **PASS dengan warning** — 0 error; 7 warning lama `@next/next/no-img-element` di `src/app/(auth)/masuk/page.tsx` |
| `npm run test:integration` | **SKIPPED** — tidak ada perubahan database |
| `npm run build` | **SKIPPED** — typecheck dan unit test mencakup perubahan |
| Uji browser | **SKIPPED** — tidak diminta; redirect diverifikasi lewat test |

Test memakai mock `next/navigation` untuk memastikan `redirect("/beranda")` dan `redirect("/masuk")` dipanggil, serta `daftarDesaSuperAdmin` tidak dipanggil pada kedua jalur penolakan.

## 7. Risiko dan keterbatasan

1. **Redirect terjadi di Server Component.** Belum diuji pada browser/Next runtime nyata; test memverifikasi pemanggilan `redirect`, bukan respons HTTP akhir.
2. **Tidak ada halaman 403 yang dapat dibaca.** Pengguna hanya melihat beranda tanpa penjelasan. **Ditindaklanjuti di B-03c:** `forbidden.tsx` dengan `authInterrupts` dipilih sehingga penolakan kini menampilkan halaman 403 yang menjelaskan.
3. **Halaman `/beranda` harus dapat diakses Admin Desa.** Layout admin mensyaratkan izin baca dashboard; akun desa tanpa izin tersebut akan diteruskan ke `/masuk` oleh layout, bukan loop ke halaman ini.
4. **Role lookup tetap ganda** (`requireSuperAdmin` di halaman dan di use case), sama seperti B-03.
5. **Tidak ada pengujian integration/DB**, sesuai scope dan aturan AGENTS.md.

## 8. Kesimpulan

Non-super-admin kini dialihkan ke beranda dan pengguna tanpa sesi ke halaman masuk sebelum data tenant dimuat, sehingga tidak lagi melihat error boundary karena masalah otorisasi.

**Status: digantikan B-03c.** Perilaku redirect `FORBIDDEN` pada laporan ini tidak lagi berlaku; lihat [B-03c](./B-03c-forbidden-page.md). Branch B-03b tetap dipertahankan sebagai riwayat keputusan, dan commit hanya lokal (belum di-push atau di-merge).
