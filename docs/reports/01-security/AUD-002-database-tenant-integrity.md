# AUD-002 — Database-level Tenant Integrity

## Status

Initial schema review and implementation plan. No schema, migration, application behavior, or database was changed in this commit.

## Baseline

- Base branch: `main`
- Base commit: `5a3f7502be6a71d0809600fa14b07c9f4807f1e5`
- Working branch: `task/AUD-002-composite-tenant-integrity`
- Related work remains separate and unmerged:
  - AUD-003: https://github.com/fahmiorim/appdes/pull/3
  - AUD-007: https://github.com/fahmiorim/appdes/pull/5

## Initial schema findings

The following tenant-scoped relations were confirmed from the current schema files:

| Child table | Child reference | Candidate parent key | Existing delete behavior |
|---|---|---|---|
| residents | (family_id, village_id) | families (id, village_id) | family_id currently SET NULL |
| residents | (region_id, village_id) | regions (id, village_id) | region_id currently SET NULL |
| families | (region_id, village_id) | regions (id, village_id) | region_id currently SET NULL |
| resident_mutations | (resident_id, village_id) | residents (id, village_id) | resident_id currently SET NULL |
| resident_mutations | (from_region_id, village_id) | regions (id, village_id) | from_region_id currently SET NULL |
| resident_mutations | (to_region_id, village_id) | regions (id, village_id) | to_region_id currently SET NULL |

These are initial candidates, not a complete inventory. Every schema table and relation must be reviewed before deciding final coverage.

## Critical compatibility issue

The child `village_id` columns are NOT NULL. A composite foreign key with `ON DELETE SET NULL` across both the nullable reference and `village_id` may attempt to set both columns to NULL. That would violate the tenant column's NOT NULL constraint or make parent deletion impossible.

Do not blindly replace the current single-column foreign keys. For each relation, decide and test a safe deletion policy. A possible approach is RESTRICT/NO ACTION on the composite relation and an explicit transactional application workflow that clears nullable references before deleting a parent. This is only a candidate; it must be validated against all delete paths and the supported MySQL version.

## Required implementation sequence

1. Complete the inventory of tenant-scoped tables and tenant-bound foreign keys.
2. Inspect all parent deletion and update paths, including bulk deletes and administrative operations.
3. Run read-only preflight queries on disposable/test data to identify orphan and cross-tenant references.
4. Add parent unique keys for (id, village_id), plus supporting child indexes where needed.
5. Define per-relation ON DELETE and ON UPDATE semantics without changing behavior silently.
6. Update Drizzle schema and generate a migration.
7. Verify the migration from a clean schema and from a representative existing schema in a disposable database.
8. Add database-level integration tests that bypass application use cases and attempt direct cross-tenant inserts/updates.
9. Test NULL references, parent deletion, rollback, and all application delete paths.
10. Document production preflight, backup, deployment, and rollback steps. Do not run them against production in this task.

## Safety constraints

- No production database access or mutation.
- No automatic cleanup/backfill of legacy data.
- No merge or deployment.
- Do not modify PR #3 or PR #5.
- Do not assume unmerged AUD-003/AUD-007 code is present on `main`; coordinate follow-up integration after those PRs are merged.

## Review gate

Implementation must not proceed past schema/migration changes until the full relation inventory and deletion semantics are documented and covered by tests. Any preflight-detected legacy inconsistency must be reported with counts and remediation options, not silently modified.
