# B2 — Rollback Runbook (DTKS & Suplemen Composite Tenant FK)

**Status:** Rehearsed on disposable MySQL 8.0 (`desa_test_b2_rollback_*`) by
`src/db/migration-guard-rollback.integration.test.ts`; the inverse schema is
compared object-by-object with a fresh `0000 + 0001` baseline database.
**Scope:** Recovery from a fully and successfully applied
`0002_b2_dtks_suplemen_composite_fk.sql` back to the schema produced by
`0000_baseline.sql` + `0001_aud002_composite_tenant_fk.sql`.

## Artifacts

- Inverse DDL: `docs/reports/01-security/B2-rollback.sql`
- Forward migration: `src/db/migrations/0002_b2_dtks_suplemen_composite_fk.sql`
- Read-only preflight: `docs/reports/01-security/B2-preflight.sql`
- Baseline definitions: `src/db/migrations/0000_baseline.sql`,
  `src/db/migrations/0001_aud002_composite_tenant_fk.sql`

## What the forward migration changes

1. Reads-only preflight into `_b2_preflight_findings`, then a fail-closed trigger
   statement that aborts with
   `B2 preflight gagal: <relasi> <orphan|cross-tenant> = <n> baris` when any
   legacy row violates tenant ownership. No domain data is modified by the
   preflight.
2. Replaces nine single-column FKs with `(village_id, <parent>_id)` composite
   FKs: DTKS → RTM/Keluarga, DTKS anggota → DTKS/penduduk, junction lampiran →
   DTKS/lampiran, Suplemen terdata → Suplemen/penduduk/keluarga.
3. Adds `dtks_ref_lampiran.village_id` in three steps
   (`NULL` → backfill from parent DTKS → `NOT NULL`), plus a cascade FK to
   `villages`.
4. Adds parent unique keys `(village_id, id)` on `dtks`, `dtks_lampiran`,
   `suplemen` and composite child indexes.

Delete rules after migration: `RESTRICT` for optional references
(`dtks.keluarga_id`, `suplemen_terdata.penduduk_id`,
`suplemen_terdata.keluarga_id`) because `SET NULL` would also try to clear
`village_id NOT NULL`. The application transaction in `deleteKeluarga` and
`deletePenduduk` performs the explicit `NULL` update instead.

## Safety boundary

- The inverse script is **not** a repair tool for a partially applied forward
  migration. It assumes all nine composite FKs, one villages FK, three unique
  keys, and eight explicit indexes exist exactly as created by 0002.
- MySQL DDL implicitly commits. A failure halfway through leaves a partially
  rolled-back schema. Execute statement-by-statement with stop-on-error, record
  the last successful statement, and reconcile `information_schema` before
  resuming. Never blindly rerun the complete script.
- If `_b2_preflight_findings` exists, a forward attempt aborted. Inspect it,
  decide the data correction, drop it, then retry the forward migration. Do not
  run the inverse script as a shortcut.
- After rollback, database-level tenant enforcement for DTKS/Suplemen is gone:
  the restored single-column FKs only prove parent existence, not ownership.
  Treat rollback as a temporary security regression and restrict writes/access.
- `dtks_ref_lampiran.village_id` is dropped, so the per-junction desa is lost.
  Re-applying 0002 derives it again from the DTKS parent; any manual correction
  made to that column after 0002 is lost.

## Required rehearsal (operator)

1. Create a full backup of the target clone and prove it can be restored.
2. Record FK definitions, indexes, unique keys, and columns for `dtks`,
   `dtks_anggota`, `dtks_lampiran`, `dtks_ref_lampiran`, `suplemen`,
   `suplemen_terdata` from `information_schema`.
3. Confirm the clone is fully at 0002 state.
4. Run `B2-rollback.sql` with stop-on-error.
5. Confirm the nine baseline FK names exist again with the original
   `ON DELETE` actions (`RESTRICT`, `SET NULL`, `CASCADE`), and no
   `*_tenant_fk` from B2 remains.
6. Confirm `dtks_ref_lampiran` has no `village_id`, and the three `*_village_id_uq`
   keys plus eight B2 indexes are absent.
7. Confirm `suplemen_terdata_village_id_villages_id_fk` exists again; MySQL
   re-creates its auto index with the constraint name. 0002 had made the
   composite indexes the supporting indexes for this FK, so the FK is dropped
   before the composite indexes and added back afterwards.
8. Compare all six affected tables against a fresh `0000 + 0001` database.
   The integration test does this automatically and fails on any difference.
9. Run typecheck, lint, unit tests, and integration tests against the
   rolled-back schema with the chosen application version.

## Deploy / rollback ordering

1. Keep application writes stopped for the duration of DDL.
2. Deploy the application code that tolerates both shapes (it sets `NULL`
   explicitly; that is valid under both `RESTRICT` and `SET NULL`) **before**
   applying 0002, or roll the application back **after** the inverse script.
3. Apply 0002, or run the inverse script first when recovering.
4. Verify with the preflight (forward) / schema comparison (inverse).

## Evidence from rehearsal

`src/db/migration-guard-rollback.integration.test.ts`:

- creates `desa_test_b2_guard_<run>`, migrates to 0001, seeds orphan and
  cross-tenant legacy rows with `FOREIGN_KEY_CHECKS=0`, proves the read-only
  preflight reports all 11 expected `(relasi, jenis)` findings and does not
  change row counts, then proves the full migration aborts with the relation and
  row count in the message **without** installing any B2 constraint or column;
- creates `desa_test_b2_rollback_<run>`, migrates to 0002, runs
  `B2-rollback.sql`, and asserts the resulting columns, indexes, and foreign
  keys of all six affected tables are identical to
  `desa_test_b2_baseline_<run>` (fresh 0000 + 0001);
- drops all temporary databases in `afterAll`.

Result on 12 November 2026: PASS (see
`docs/reports/01-security/B2-DTKS-SUPLEMEN-COMPOSITE-FK.md`).
