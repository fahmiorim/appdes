# AUD-021-02 — Private response cache control

## Status

Implemented on branch `task/AUD-021-02-private-no-store`. Draft PR and CI validation pending.

## Finding

Four authenticated/private Route Handlers did not explicitly set a cache policy preventing browser or intermediary storage of private responses:

- `src/app/(admin)/bantuan/ekspor/route.ts`
- `src/app/(admin)/kelompok/ekspor/route.ts`
- `src/app/(admin)/pembangunan/buku/ekspor/route.ts`
- `src/app/api/penduduk/nik/route.ts`

## Remediation

- Added `privateNoStore()` in `src/lib/response-headers.ts`.
- Set `Cache-Control: private, no-store` on successful responses and error/authentication responses from all four handlers.
- Preserved existing authentication, authorization, tenant scoping, response bodies, status codes, and download metadata.
- Added helper coverage in `src/lib/response-headers.test.ts`.
- Extended NIK route tests to assert the cache policy for 401, 400, 404, 200, and 403 responses.

## Validation

- Automated CI: pending.
- No database changes or migrations.
- No merge or deployment performed.

## Scope note

This is an HTTP cache-control hardening change. It does not replace authentication, authorization, tenant isolation, or server-side data-access controls.
