# B-02 — Transaksi penyimpanan preferensi menu dan pintasan

- **Task:** B-02 (temuan audit 17 November 2026) — hapus lalu sisip ulang preferensi pengguna harus atomik.
- **Tanggal:** 17 November 2026
- **Branch:** `task/AUD-034-b2-preference-transaction-2026-11-17`
- **Base commit:** `07b13ab6260e8c2d30ac067727e3ce84b2473711` (`main`)
- **Commit pekerjaan:** `22fde60df37a6caed7bb600fc912ccf45281b806`
- **Tujuan:** kegagalan `insert` setelah `delete` tidak boleh menghapus preferensi lama pengguna.

## 1. Kondisi awal

`simpanUrutanMenu` dan `simpanShortcut` menjalankan dua operasi tulis terpisah pada `db`:

```ts
await db.delete(...).where(eq(..., userId));
if (slugs.length === 0) return;
await db.insert(...).values(...);
```

Bila `delete` berhasil tetapi `insert` gagal (koneksi putus, lock, pelanggaran constraint, proses mati), preferensi lama sudah hilang dan pengguna kembali ke urutan/pintasan bawaan. Tidak ada cara memulihkan pilihan sebelumnya dari aplikasi.

Schema terkait memakai `uniqueIndex` pada `(user_id, slug)` dan `(user_id, href)`, dengan `user_id` mereferensikan `users.id` (`ON DELETE CASCADE`). Tidak ada perubahan schema pada task ini.

## 2. File yang diperiksa

- `src/features/navigation/infrastructure/urutan-menu-repository.ts` — sumber temuan.
- `src/features/navigation/infrastructure/shortcut-repository.ts` — sumber temuan.
- `src/features/navigation/application/urutan-menu-use-cases.ts` — pemanggil `simpanUrutanMenu`.
- `src/features/navigation/application/shortcut-use-cases.ts` — pemanggil `simpanShortcut`.
- `src/db/schema/pengguna-menu-urutan.ts`, `src/db/schema/pengguna-shortcut.ts` — unique key dan foreign key.
- `src/db/index.ts` — `db` Drizzle dengan pool MySQL.
- `src/features/multi-desa/infrastructure/kelola-desa-repository.ts` dan test-nya — pola `db.transaction` dan mock transaksi yang sudah dipakai repository lain.
- `src/features/warga/infrastructure/warga-repository.ts` — contoh lain pemakaian `db.transaction`.

## 3. File yang diubah

| File | Alasan |
| --- | --- |
| `src/features/navigation/infrastructure/urutan-menu-repository.ts` | `delete` + `insert` dibungkus `db.transaction`, memakai `tx`. |
| `src/features/navigation/infrastructure/shortcut-repository.ts` | Sama untuk pintasan. |
| `src/features/navigation/infrastructure/urutan-menu-repository.test.ts` | Test baru: operasi dalam satu transaksi, daftar kosong, kegagalan insert. |
| `src/features/navigation/infrastructure/shortcut-repository.test.ts` | Test baru dengan cakupan yang sama. |

Tidak ada perubahan pada use case, route, UI, schema, migration, atau dependency.

## 4. Perubahan

Kedua fungsi sekarang berbentuk:

```ts
await db.transaction(async (tx) => {
  await tx.delete(...).where(eq(..., userId));
  if (slugs.length === 0) return;
  await tx.insert(...).values(...);
});
```

- Kedua operasi memakai `tx`, bukan `db`, sehingga tidak ada tulisan yang lolos di luar transaksi.
- Daftar kosong tetap hanya menghapus preferensi (kembali ke bawaan) di dalam transaksi.
- Bila `insert` melempar error, callback transaksi ikut gagal dan Drizzle melakukan rollback; error diteruskan ke pemanggil.
- `hapusShortcut` tidak diubah karena hanya satu operasi `delete`.

## 5. Test

Perintah dan hasil sebenarnya (Windows, Node v26.2.0, tanpa database):

| Perintah | Hasil |
| --- | --- |
| `npx vitest run src/features/navigation/infrastructure/urutan-menu-repository.test.ts src/features/navigation/infrastructure/shortcut-repository.test.ts` | **PASS** — 2 file, 6 test |
| Test yang sama terhadap implementasi lama (stash sementara) | **FAIL** — 6/6 gagal, membuktikan test menangkap regresi |
| `npm run test:unit` | **PASS** — 202 file, 1.781 test |
| `npm run typecheck` (`next typegen && tsc --noEmit`) | **PASS** — exit 0 |
| `npm run lint` (`eslint .`) | **PASS dengan warning** — 0 error; 7 warning lama `@next/next/no-img-element` di `src/app/(auth)/masuk/page.tsx` |
| `npm run test:integration` | **SKIPPED** — membutuhkan MySQL disposable; tidak ada perubahan schema |
| `npm run build` | **SKIPPED** — typecheck dan unit test mencakup perubahan |
| Uji browser | **SKIPPED** — tidak ada perubahan UI |

Test memakai mock `@/db` yang hanya menyediakan `transaction`; bila kode kembali menulis langsung ke `db`, test gagal. Objek `tx` mencatat urutan operasi `delete` → `insert`, nilai `urut`, dan `userId`.

## 6. Risiko dan keterbatasan

1. **Rollback tidak diuji pada MySQL nyata.** Unit test membuktikan kedua operasi memakai transaksi yang sama dan kegagalan insert diteruskan, tetapi perilaku rollback sebenarnya bergantung pada Drizzle/InnoDB dan belum dijalankan di database disposable.
2. **Transaksi tetap bisa gagal.** Bila database menolak `delete`/`insert` secara permanen, preferensi lama dipertahankan (rollback), tetapi pengguna menerima error dan harus mencoba lagi.
3. **Tidak ada retry.** Task ini hanya menutup kehilangan data; retry atau pesan khusus belum diperlukan karena kegagalan jarang dan bersifat sementara.
4. **Tidak ada batas ukuran baru.** Jumlah slug/href tetap dibatasi validasi domain di use case (`validasiUrutanMenu`, `validasiShortcut`), bukan di repository.
5. **Tidak ada pengujian integration/DB**, sesuai scope dan aturan AGENTS.md.

## 7. Kesimpulan

B-02 selesai: penyimpanan urutan menu dan pintasan kini atomik dalam satu transaksi, dengan test regresi yang gagal pada implementasi lama.

**Status: siap review.** Commit hanya lokal; belum di-push, belum di-merge, dan tidak ada perubahan database atau deployment.
