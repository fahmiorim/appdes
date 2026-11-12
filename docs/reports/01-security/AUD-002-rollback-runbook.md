# AUD-002 — Rollback Runbook

**Status:** Rehearsed on disposable MySQL 8.0.30; see
`AUD-002-rollback-verification.md`.
**Scope:** Recovery from a fully and successfully applied
`0001_aud002_composite_tenant_fk.sql` back to the original single-column
foreign keys from `0000_baseline.sql`.

## Artifacts

- Inverse DDL: `docs/reports/01-security/AUD-002-rollback.sql`
- Forward migration: `src/db/migrations/0001_aud002_composite_tenant_fk.sql`
- Baseline definitions: `src/db/migrations/0000_baseline.sql`

## Safety boundary

This inverse script is **not** a safe repair tool for a partially applied
forward migration. It assumes all 19 composite foreign keys, all 8 parent
unique keys, and all 3 composite indexes exist exactly as created by the
forward migration. If the forward migration failed midway, stop and inspect
`information_schema`; do not run this script unchanged.

MySQL DDL implicitly commits. A failure halfway through the inverse script
leaves a partially rolled-back schema. Execute statement-by-statement with
stop-on-error, record the last successful statement, and reconcile the live
schema before resuming. Never blindly rerun the complete script.

After rollback, database-level tenant ownership enforcement introduced by
AUD-002 is removed. The old single-column FKs only validate parent existence;
they do not prevent cross-tenant references. Treat rollback as a temporary
security regression and restrict writes / access until the forward migration
is repaired or reapplied.

The application cleanup changes in AUD-002 may remain compatible with the
restored `SET NULL` behavior, but application rollback must be decided
separately. Do not assume reverting SQL alone restores the complete prior
application behavior.

## Required rehearsal

Run this only on a disposable MySQL 8.0 clone with the same schema version and
representative data volume as the target. Do not use production or a shared
development database for the first rehearsal.

1. Create a full backup of the clone and prove it can be restored.
2. Record the current FK definitions, indexes, and unique keys from
   `information_schema`.
3. Confirm the clone is fully at AUD-002 state (all expected objects present).
4. Run the inverse SQL with stop-on-error and capture per-statement duration.
5. Confirm exactly 19 original FK names exist, and no `*_tenant_fk` names
   remain for the AUD-002 relations.
6. Confirm the original `ON DELETE` actions match `0000_baseline.sql`.
7. Confirm all 8 AUD-002 unique keys, 3 explicitly-created composite indexes,
   and 14 implicit MySQL FK-support indexes are absent. `DROP FOREIGN KEY` does
   not remove those implicit indexes; the inverse SQL drops them by name.
8. Compare all affected-table columns, indexes, and FK definitions against a
   fresh baseline schema; inspect all schema objects for unintended changes.
9. Run the application's typecheck, unit tests, integration tests, and build
   against the rolled-back schema and the chosen application version.
10. Exercise deletes for family, RTM, resident, letter, and region records using
    fixtures that cover nullable references, cascade, and restrict behavior.
11. Re-run the AUD-002 preflight. Any cross-tenant result after rollback is
    expected to be detectable and must be treated as a security finding.
12. Restore the clone from backup and verify application connectivity.

A rehearsal is **PASS** only when all checks succeed and the backup restore is
proven. Record MySQL version, dataset size, elapsed time for each DDL statement,
lock waits, test output, and restore duration in the task report.

## Operational rollback sequence

1. Declare maintenance and stop writes to the affected application/database.
2. Confirm the exact schema state. If anything differs from the fully applied
   forward migration, stop and prepare a state-specific recovery script.
3. Verify the latest backup and restore point.
4. Run the inverse script statement-by-statement, with an operator recording
   each completed statement.
5. Verify the 19 original FKs, delete actions, and absence of the 8 unique keys
   and 3 indexes.
6. Deploy only the application version explicitly approved for the rolled-back
   schema; run smoke tests.
7. Keep tenant-sensitive write paths disabled or otherwise protected until
   database tenant enforcement is restored.
8. Document the incident, exact schema state, commands, durations, and follow-up.

## Reference SQL for verification

Inspect foreign keys and delete rules:

```sql
SELECT
  kcu.TABLE_NAME,
  kcu.CONSTRAINT_NAME,
  kcu.COLUMN_NAME,
  kcu.REFERENCED_TABLE_NAME,
  kcu.REFERENCED_COLUMN_NAME,
  rc.DELETE_RULE,
  rc.UPDATE_RULE
FROM information_schema.KEY_COLUMN_USAGE AS kcu
JOIN information_schema.REFERENTIAL_CONSTRAINTS AS rc
  ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
 AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
 AND rc.TABLE_NAME = kcu.TABLE_NAME
WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
  AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
  AND (
    kcu.CONSTRAINT_NAME LIKE '%_tenant_fk'
    OR kcu.CONSTRAINT_NAME IN (
      'families_region_id_regions_id_fk',
      'bulanan_anak_posyandu_id_posyandu_id_fk',
      'bulanan_anak_kia_id_kia_id_fk',
      'ibu_hamil_posyandu_id_posyandu_id_fk',
      'ibu_hamil_kia_id_kia_id_fk',
      'kia_ibu_id_residents_id_fk',
      'kia_anak_id_residents_id_fk',
      'letters_type_id_letter_types_id_fk',
      'letters_resident_id_residents_id_fk',
      'permohonan_surat_resident_id_residents_id_fk',
      'permohonan_surat_letter_type_id_letter_types_id_fk',
      'permohonan_surat_letter_id_letters_id_fk',
      'residents_family_id_families_id_fk',
      'residents_rtm_id_rtm_id_fk',
      'residents_region_id_regions_id_fk',
      'resident_mutations_resident_id_residents_id_fk',
      'resident_mutations_from_region_id_regions_id_fk',
      'resident_mutations_to_region_id_regions_id_fk',
      'rtm_region_id_regions_id_fk'
    )
  )
ORDER BY kcu.TABLE_NAME, kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION;
```

Inspect the AUD-002 unique keys and indexes:

```sql
SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME
  ORDER BY SEQ_IN_INDEX) AS columns_in_order
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND INDEX_NAME IN (
    'families_village_id_uq', 'kia_village_id_uq',
    'posyandu_village_id_uq', 'letter_types_village_id_uq',
    'letters_village_id_uq', 'regions_village_id_uq',
    'residents_village_id_uq', 'rtm_village_id_uq',
    'resident_mutations_village_resident_idx',
    'resident_mutations_village_from_region_idx',
    'resident_mutations_village_to_region_idx'
  )
GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;
```

Expected result for the second query after a complete rollback: **zero rows**.

Also inspect all indexes on the affected tables (do not restrict to the 11
explicit names above), because InnoDB creates supporting indexes for composite
FKs when no existing index has the required leading columns. AUD-002 creates 14
such implicit indexes whose names match the composite FK constraints. They must
be absent after rollback; compare full `information_schema.STATISTICS` output
with the baseline to ensure no baseline index was lost.

## Rehearsal result

See `AUD-002-rollback-verification.md` for command-level output and full
comparison. On disposable MySQL 8.0.30, forward migration, inverse migration,
controlled stop-on-error failure, and full backup restore were exercised. A
fresh baseline database was compared with the restored-and-inversed database:
all table columns, all FK names/columns/referenced columns/delete/update actions,
and all indexes matched exactly. The rehearsal used an empty baseline schema
plus one small synthetic fixture; production-scale lock duration remains
unmeasured.

## Current validation status

- Inverse DDL executed on a disposable database and compared against baseline:
  **PASS**.
- Controlled mid-script failure and stop-on-error behavior: **PASS**.
- Full database backup restore into a fresh disposable database: **PASS**.
- Production: **NOT ACCESSED**.

Rollback DDL has passed this rehearsal, but it is still non-atomic and must only
be run against the fully applied AUD-002 schema with a verified backup.
