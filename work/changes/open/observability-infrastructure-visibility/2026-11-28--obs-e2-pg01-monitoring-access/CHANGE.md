# OBS-E2-PG01 | Dedicated CNPG monitoring connectivity

**Kind:** implementation. **Standing:** PROPOSED, source-determined owner correction, independent readiness review pending; no live permission. **Baseline:** `main` `497176baa34c868107399936f16c432137bbab3e`. Owner accepted narrow CONNECT evolution after the recorded failed collector and denied CONNECT on all five existing databases. [Native evidence](../NATIVE-INPUTS.md) and [group register](../README.md).

## Outcome and boundaries

Dev only: restore the existing CNPG-managed `cnpg_metrics_exporter` role's ability to execute default monitoring queries without restoring PUBLIC, elevating roles, granting table/schema privileges or changing existing data/service ownership. Retain the pinned CNPG 1.30.2 and its default query definitions. PostgreSQL owner implements; observability only consumes the endpoint. Release behavior unchanged. Existing allowed ACLs still admitted; exactly one narrowly defined monitoring exception is permitted on dev Temporal and tenant databases, not arbitrary grants. Do not alter initdb hooks: role creation ordering and frozen bootstrap identity make those the wrong occupied-repair mechanism.

**Requires:** no OBS-E2 source predecessor. Review and commission independently of 01/02. Explicit live permission separately required for the occupied ACL operation.

**Exclusive ownership:** `infra/platform/postgres/monitoring-access.mjs` and focused test; `temporal-persistence/prepare.mjs` and its test; `tools/dev-environments/src/adapters/dev-sql-tenant-executor.mjs`, `dev-sql-tenant-live-adapter.mjs` and focused tests. Canonical database, Temporal and developer-environment contracts. No changes to Helm, operator, app schemas, migration history, observability values, unrelated DB identities.

**Collisions:** no concurrent baseline/topology/Temporal/tenant provisioning or competing database owner mutation in occupied proof; explicit maintenance quiescence plus PostgreSQL owner lock, not a claim that the lock covers noncooperating writers. No shared source writes with 01/02/05.

**Closure:** source construction can join after focused fixture gate. Native proof transfers to the Design as a named PG01 owner-qualification obligation before 04 full statistics freeze and 13. Archive the source Change before joining if its assigned focused source gate and reconciliation pass; the Design remains acceptance-pending. No claim that native repair is complete.

## Execution

[Tasks](TASKS.md) · [Source map](SOURCE-MAP.md) · [Proof](PROOF.md). No grant by this document.
