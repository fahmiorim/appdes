# B-01 — Error masking pada ubah PIN warga

- **Task:** B-01 (temuan audit 17 November 2026) — kegagalan `changePassword` selain PIN salah tidak boleh dilaporkan sebagai "PIN lama tidak sesuai".
- **Tanggal:** 17 November 2026
- **Branch PR:** `task/AUD-034-b1-pin-error-masking-pr-2026-11-17`
- **Base commit:** `07b13ab6260e8c2d30ac067727e3ce84b2473711` (`main`)
- **Commit pekerjaan:** `87b900db865f0cd979cc1289731fa0a827ea983b`
- **Tujuan:** memetakan hanya `INVALID_PASSWORD` ke pesan PIN lama salah; kegagalan lain diteruskan dengan kode yang sesuai dan error tak terduga tercatat di log.

> **Catatan branch PR:** branch asli `task/AUD-034-b1-pin-error-masking-2026-11-17` dibangun di atas branch dokumentasi dan membawa empat commit dokumentasi lain. Branch PR ini dibuat dari `main` dan hanya berisi perbaikan kode + laporan B-01. Perubahan status audit pada `docs/reports/00-baseline/audit-klaim-dokumentasi-2026-11-17.md` tidak disertakan karena file tersebut belum ada di `main`; pembaruan itu tetap berada di branch dokumentasi.

## 1. Kondisi awal

`ubahPinWarga` memanggil `auth.api.changePassword()` di dalam `try` dengan `catch` tanpa parameter:

```ts
} catch {
  throw validationError("PIN lama tidak sesuai. Pastikan PIN yang Anda masukkan benar.", {
    pinLama: ["PIN lama tidak sesuai."],
  });
}
```

Semua kegagalan — PIN lama salah, kebijakan panjang sandi, sesi tidak segar, akun tanpa kredensial, rate limit, hingga database tidak tersedia — menjadi `VALIDATION` dengan pesan yang sama. Dampaknya:

- warga mengulang percobaan yang tidak mungkin berhasil;
- kegagalan server tidak pernah masuk log;
- Server Action `toErrorState` menampilkan pesan yang salah, tetapi tetap "aman" sehingga tidak ada indikator untuk operator.

## 2. File yang diperiksa

- `src/features/warga/application/ubah-pin-use-case.ts` — sumber temuan.
- `src/features/warga/application/ubah-pin-use-case.test.ts` — test lama memakai `new Error("invalid password")`, bukan bentuk error better-auth.
- `src/app/(warga)/layanan-mandiri/ubah-pin/actions.ts` — pemanggil; memakai `toErrorState`.
- `src/lib/action-state.ts` — `AppError` diteruskan pesannya, error lain dicatat dan diganti pesan generik.
- `src/lib/errors.ts` — kode `AppError` dan status HTTP.
- `node_modules/better-auth/dist/api/routes/update-user.mjs` — `changePassword` melempar `APIError` dengan kode `INVALID_PASSWORD`, `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`, `CREDENTIAL_ACCOUNT_NOT_FOUND`, `FAILED_TO_GET_SESSION`.
- `node_modules/better-auth/dist/api/routes/session.mjs` — sesi tidak segar dilempar sebagai `FORBIDDEN` + `SESSION_NOT_FRESH`.
- `node_modules/better-auth/dist/api/rate-limiter/index.mjs` — rate limit memakai status 429.

## 3. File yang diubah

| File | Alasan |
| --- | --- |
| `src/features/warga/application/ubah-pin-use-case.ts` | Menambahkan `lemparKesalahanGantiPin` dan mengganti `catch` kosong. |
| `src/features/warga/application/ubah-pin-use-case.test.ts` | Test PIN salah memakai `APIError` asli; menambah test untuk error tak terduga, panjang PIN, sesi tidak segar, rate limit, dan akun tanpa kredensial. |

Tidak ada perubahan UI, schema, migration, route, dependency, atau konfigurasi.

## 4. Perubahan

`lemparKesalahanGantiPin(error)` memeriksa `isAPIError` dari `better-auth/api`, mengambil `body.code`, dan memetakan:

| Kondisi better-auth | Hasil |
| --- | --- |
| `INVALID_PASSWORD` | `VALIDATION` — "PIN lama tidak sesuai…" + `details.pinLama` (perilaku lama dipertahankan) |
| `PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG` | `VALIDATION` — pesan pada field `pinBaru` |
| `SESSION_NOT_FRESH` | `UNAUTHENTICATED` — minta masuk ulang lalu ubah PIN |
| `SESSION_EXPIRED` | `UNAUTHENTICATED` |
| `CREDENTIAL_ACCOUNT_NOT_FOUND` | `CONFLICT` — akun tidak punya PIN; hubungi administrator desa |
| HTTP 429 | `RATE_LIMITED` |
| Lainnya (termasuk error non-API) | `logger.error` + `INTERNAL` |

Status HTTP dibaca dari `statusCode`, bukan `status`: pada `APIError` better-auth, `status` dapat berupa nama status (`"TOO_MANY_REQUESTS"`) sedangkan `statusCode` selalu numerik. Penanganan 429 ditempatkan sebelum `switch` karena rate limiter tidak menyertakan kode error yang dapat diandalkan.

Pembersihan `mustChangePin` tetap hanya berjalan setelah `changePassword` sukses; seluruh jalur gagal tidak menyentuhnya.

## 5. Test

Perintah dan hasil sebenarnya (Windows, Node v26.2.0, tanpa database):

| Perintah | Hasil |
| --- | --- |
| `npx vitest run src/features/warga/application/ubah-pin-use-case.test.ts` | **PASS** — 9 test |
| `npm run test:unit` | **PASS** — 200 file, 1.780 test |
| `npm run typecheck` (`next typegen && tsc --noEmit`) | **PASS** — exit 0 |
| `npm run lint` (`eslint .`) | **PASS dengan warning** — 0 error; 7 warning lama `@next/next/no-img-element` di `src/app/(auth)/masuk/page.tsx` |
| `npm run test:integration` | **SKIPPED** — tidak ada perubahan database/schema |
| `npm run build` | **SKIPPED** — typecheck dan unit test sudah mencakup perubahan |
| Uji browser | **SKIPPED** — tidak ada perubahan UI |

Test yang ditambahkan:

1. PIN lama salah (`INVALID_PASSWORD`) → `VALIDATION`, pesan dan `details.pinLama` tetap.
2. Error tak terduga (`Error` biasa) → `INTERNAL`, `logger.error` sekali, bukan pesan PIN salah.
3. `PASSWORD_TOO_SHORT` → `VALIDATION` pada field `pinBaru`.
4. `SESSION_NOT_FRESH` → `UNAUTHENTICATED` dengan pesan masuk ulang.
5. Rate limit 429 → `RATE_LIMITED`.
6. `CREDENTIAL_ACCOUNT_NOT_FOUND` → `CONFLICT`.

Semua jalur gagal juga memastikan `clearMustChangePin` tidak dipanggil.

## 6. Risiko dan keterbatasan

1. **Belum diuji runtime.** Pemetaan diverifikasi lewat unit test dengan `APIError` asli dari better-auth, bukan percobaan login/ubah PIN pada server berjalan.
2. **Sesi tidak segar tetap memblokir ubah PIN.** Perilaku ini berasal dari `sensitiveSessionMiddleware` better-auth; perbaikan hanya membuat pesannya akurat, bukan menghapus batas `freshAge`.
3. **Kode error better-auth dapat berubah saat upgrade.** Kode yang tidak dikenal akan menjadi `INTERNAL` dan tercatat di log; tidak pernah lagi menjadi "PIN lama salah".
4. **`details` tetap dipakai sebagai `fieldErrors`.** `CONFLICT` dan `UNAUTHENTICATED` tidak mengirim `details`, sehingga form hanya menampilkan pesan umum.
5. **Tidak ada pengujian integration/DB**, sesuai scope dan aturan AGENTS.md.

## 7. Kesimpulan

B-01 selesai pada level unit test: hanya PIN lama salah yang dilaporkan sebagai PIN salah, kegagalan lain memakai kode yang sesuai, dan error tak terduga tercatat di log sebelum pesan generik dikembalikan.

**Status: siap review.** Commit hanya lokal; belum di-push, belum di-merge, dan tidak ada perubahan database atau deployment.
