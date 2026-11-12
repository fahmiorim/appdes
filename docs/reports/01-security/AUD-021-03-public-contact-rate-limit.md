# AUD-021-03 — Public contact read endpoint rate limiting

## Status

Implemented on branch `task/AUD-021-03-public-contact-rate-limit`. Draft PR and CI validation pending.

## Finding

The static audit identified two public read handlers without request throttling:

- `src/app/api/publik/kontak/statistik/route.ts`
- GET handler in `src/app/api/publik/kontak/komentar/route.ts`

## Remediation

- Reused the existing shared `batasiPermintaan()` sliding-window rate limiter and the trusted-proxy-aware `alamatIp()` helper.
- Added a limit of 60 requests per minute per client IP for each endpoint, using separate keys so the quotas do not interfere with one another.
- Enforced the limit before tenant resolution and database-backed reads to reject excess traffic early.
- Preserved existing tenant resolution, pagination, response payloads, and POST comment submission throttling (20 requests per minute).
- Added route tests for allowed requests, 429 responses, endpoint-specific keys, and ensuring tenant/data reads are skipped when throttled.

## Validation

- Automated CI: pending.
- No database schema changes or migrations; existing rate-limit persistence is reused.
- No merge or deployment performed.

## Scope note

The new GET limits are per client IP as resolved by the application's existing trusted-proxy configuration. If proxy trust is disabled, the helper intentionally returns the shared fallback identity; production deployments should configure trusted proxy handling correctly for per-client attribution.
