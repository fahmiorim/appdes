# AUD-021-02 — Private response cache control

## Status

Implemented on branch `task/AUD-021-02-private-no-store`. Draft PR #21; CI passed after the final route reconciliation.

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
- The Bantuan export route also retains the safe shared `toCsv()` serializer from AUD-021-01, so applying no-store headers does not restore the old unsafe CSV builder.
- Added helper coverage in `src/lib/response-headers.test.ts`.
- Extended NIK route tests to assert the cache policy for 401, 400, 404, 200, and 403 responses.

## Validation

- Automated CI: PASS — [run 43308154639](https://github.com/fahmiorim/appdes/actions/runs/43308154639), all jobs successful after the final route reconciliation.
- No database changes or migrations.
- No merge or deployment performed.

## Scope note

This is an HTTP cache-control hardening change. It does not replace authentication, authorization, tenant isolation, or server-side data-access controls.
