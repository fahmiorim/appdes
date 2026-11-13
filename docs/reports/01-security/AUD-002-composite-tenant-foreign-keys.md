# AUD-002 — Composite Tenant Foreign Key Assessment

**Status:** Investigation completed; implementation intentionally not applied yet.  
**Branch base:** `main` at the current repository baseline.  
**Scope:** `resident.ts`, `family.ts`, `region.ts`, `permohonan-surat.ts`, `letter-types.ts`, `letters.ts`, `rumah-tangga.ts`, plus KIA relations discovered during impact review.

## Executive summary

The schema uses single-column foreign keys for several references between tenant-owned tables. Application-level guards have been added in the AUD-003/004/005/006/025 work, but those checks alone do not close the race between validation and write. Composite keys of the form `(village_id, id)` on parent tables and `(village_id, foreign_id)` on child tables are the intended database-level control.

A blanket migration is unsafe without a deliberate deletion-semantics change. Several existing references use `ON DELETE SET NULL`. A composite FK that includes the non-null child `village_id` cannot safely use `ON DELETE SET NULL`: the action applies to the composite referencing columns and would attempt to null the tenant key as well. Replacing it with `RESTRICT` changes existing behavior and may break normal delete flows.

No schema or migration files were changed in this assessment branch. This is deliberate: applying a partial constraint set and calling AUD-002 closed would give a false assurance.

## Relationship inventory

| Child reference | Parent | Existing delete behavior | Assessment |
|---|---|---|---|
| `families(village_id, region_id)` | `regions(village_id, id)` | SET NULL | Requires coordinated delete behavior |
| `residents(village_id, family_id)` | `families(village_id, id)` | SET NULL | Requires coordinated delete behavior |
| `residents(village_id, rtm_id)` | `rtm(village_id, id)` | SET NULL | Requires coordinated delete behavior |
| `residents(village_id, region_id)` | `regions(village_id, id)` | SET NULL | Requires coordinated delete behavior |
| `permohonan_surat(village_id, resident_id)` | `residents(village_id, id)` | CASCADE | Composite FK can preserve behavior |
| `permohonan_surat(village_id, letter_type_id)` | `letter_types(village_id, id)` | CASCADE | Composite FK can preserve behavior |
| `permohonan_surat(village_id, letter_id)` | `letters(village_id, id)` | SET NULL | Requires coordinated delete behavior |
| `letters(village_id, type_id)` | `letter_types(village_id, id)` | RESTRICT | Composite FK can preserve behavior |
| `letters(village_id, resident_id)` | `residents(village_id, id)` | SET NULL | Requires coordinated delete behavior |
| `rtm(village_id, region_id)` | `regions(village_id, id)` | SET NULL | Requires coordinated delete behavior |
| `kia(village_id, ibu_id/anak_id)` | `residents(village_id, id)` | NO ACTION | Composite FK can preserve behavior |
| `ibu_hamil(village_id, posyandu_id/kia_id)` | `posyandu/kia(village_id, id)` | NO ACTION / CASCADE | Composite FK can preserve behavior |
| `bulanan_anak(village_id, posyandu_id/kia_id)` | `posyandu/kia(village_id, id)` | NO ACTION / CASCADE | Composite FK can preserve behavior |

## Required implementation sequence

1. **Data preflight:** run read-only queries to detect cross-tenant references and orphan references for every relationship above. Export counts and sample IDs for remediation; do not silently rewrite records.
2. **Deletion behavior:** choose and implement explicit application transactions for references currently using SET NULL. For example, clear nullable references in the same transaction before deleting a region, family, RTM, resident, or letter. Confirm all delete call sites and cascades first.
3. **Parent candidate keys:** add unique indexes `(village_id, id)` to parent tables. Existing primary keys do not provide the exact composite candidate key required by MySQL composite FKs.
4. **Child composite constraints:** add composite FKs preserving the agreed delete semantics. Keep simple FKs only where they are still needed for a different lifecycle rule; avoid duplicate/conflicting cascades.
5. **Migration:** add a forward-only migration after preflight is clean. Do not use `db:push` against production. Test migration and rollback/recovery on a disposable MySQL 8 database with representative tenant data.
6. **Tests:** include negative cross-tenant inserts/updates at DB level, same-tenant success, nullable-reference behavior, and deletion/cascade regression tests.

## Read-only preflight examples

Run these on a disposable copy or read-only production connection before migration. Each query should return zero rows for a clean relation.

```sql
-- Family -> region
SELECT f.id, f.village_id, f.region_id
FROM families f JOIN regions r ON r.id = f.region_id
WHERE f.village_id <> r.village_id;

-- Resident -> family / RTM / region
SELECT p.id, p.village_id, p.family_id, f.village_id AS parent_village_id
FROM residents p JOIN families f ON f.id = p.family_id
WHERE p.village_id <> f.village_id;

SELECT p.id, p.village_id, p.rtm_id, r.village_id AS parent_village_id
FROM residents p JOIN rtm r ON r.id = p.rtm_id
WHERE p.village_id <> r.village_id;

SELECT p.id, p.village_id, p.region_id, r.village_id AS parent_village_id
FROM residents p JOIN regions r ON r.id = p.region_id
WHERE p.village_id <> r.village_id;

-- Letter requests -> resident / type / letter
SELECT p.id, p.village_id, p.resident_id
FROM permohonan_surat p JOIN residents r ON r.id = p.resident_id
WHERE p.village_id <> r.village_id;

SELECT p.id, p.village_id, p.letter_type_id
FROM permohonan_surat p JOIN letter_types t ON t.id = p.letter_type_id
WHERE p.village_id <> t.village_id;

SELECT p.id, p.village_id, p.letter_id
FROM permohonan_surat p JOIN letters l ON l.id = p.letter_id
WHERE p.village_id <> l.village_id;

-- Letters -> type / resident
SELECT l.id, l.village_id, l.type_id
FROM letters l JOIN letter_types t ON t.id = l.type_id
WHERE l.village_id <> t.village_id;

SELECT l.id, l.village_id, l.resident_id
FROM letters l JOIN residents r ON r.id = l.resident_id
WHERE l.resident_id IS NOT NULL AND l.village_id <> r.village_id;

-- RTM -> region
SELECT t.id, t.village_id, t.region_id
FROM rtm t JOIN regions r ON r.id = t.region_id
WHERE t.village_id <> r.village_id;

-- KIA -> mother / child
SELECT k.id, k.village_id, k.ibu_id
FROM kia k JOIN residents r ON r.id = k.ibu_id
WHERE k.village_id <> r.village_id;

SELECT k.id, k.village_id, k.anak_id
FROM kia k JOIN residents r ON r.id = k.anak_id
WHERE k.anak_id IS NOT NULL AND k.village_id <> r.village_id;
```

## Validation status

- Static schema and baseline migration inspection: PASS.
- Migration generation/application: SKIPPED — no migration authored pending deletion-semantics decision and data preflight.
- Unit/integration, typecheck, lint/format, build: SKIPPED.
- No production database accessed or modified.
- No PR, merge, or deploy.

## Decision needed before implementation

The safe next implementation unit is to preserve the current SET NULL behavior explicitly in application transactions, then add the matching composite constraints. This is larger than a mechanical schema edit and must be validated against the actual deletion use cases. AUD-002 remains OPEN until all listed tenant-owned references have DB enforcement and migration tests.
