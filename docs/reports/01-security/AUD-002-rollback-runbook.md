# AUD-002 — Rollback Runbook

**Status:** Drafted; SQL has not been executed against MySQL.  
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
7. Confirm all 8 AUD-002 unique keys and 3 AUD-002 composite indexes are absent.
8. Run the application's typecheck, unit tests, integration tests, and build
   against the rolled-back schema and the chosen application version.
9. Exercise deletes for family, RTM, resident, letter, and region records using
   fixtures that cover nullable references, cascade, and restrict behavior.
10. Re-run the AUD-002 preflight. Any cross-tenant result after rollback is
    expected to be detectable and must be treated as a security finding.
11. Restore the clone from backup and verify application connectivity.

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

## Current validation status

- Inverse DDL authored by comparing the forward migration with the baseline
  migration definitions.
- Object names and original `ON DELETE` rules cross-checked against
  `0000_baseline.sql`.
- MySQL execution, forward-then-inverse rehearsal, failure injection, lock
  measurement, and restore drill: **NOT RUN**.
- Production: **NOT ACCESSED**.

Do not mark rollback readiness as complete until the required rehearsal passes.
