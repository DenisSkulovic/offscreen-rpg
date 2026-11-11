---
name: data-model-review
description: Choose or review persistent data models, relational versus documents, identities, constraints, query access paths and online PostgreSQL/Drizzle migration design before implementation. Read-only; never migrate a database.
---

# Data model and migration design

**Trigger:** new persistent entity or relationship, altered schema/index, versioned source record, history/retention, backfill, multi-version deployment or contested SQL/document ownership. Not for a harmless internal variable rename.

1. Find the accepted **product truth** and relevant [technical data contract](../../../docs/technical/data.md) or [canonical file owner](../../../docs/technical/canonical-files.md). Inspect the actual [DB schema/migration guide](../../../packages/db/README.md) only as needed. A proposed storage shape is not evidence that migration is complete.
2. Read the relevant sections of [Data modeling and online migrations](../../knowledge/data-modeling-and-migrations.md). Identify entities, identities, lifetimes, relationships, constraints, access patterns, history and authorization before drawing tables.
3. Compare at least two viable representation choices where the decision is consequential: normalized SQL, JSONB, immutable documents, event/receipt, derived read model, search/index. Include the credible simpler option and its future-change cost.
4. For schema evolution, specify app-version overlap, lock/scan impact, expand/backfill/validate/contract, idempotency, rollback/roll-forward and safe target environment. Check tool/server versions for PostgreSQL DDL and Drizzle capabilities. Do not assume a migration runner supports CREATE INDEX CONCURRENTLY inside a transaction.
5. Provide one adversarial access/concurrency/migration example that could reverse your choice; identify query plan or backfill evidence needed.
6. Output: `source and domain facts | options/decision criteria | chosen truth/identity/constraints | query/read plan | migration phases and reversibility | falsifying proof | unresolved approval`.

**Permission:** design/read-only by default. Never execute schema push, migrate, baseline, data repair or test-DB resets without explicit separate authorization. Cursor implementation comes only after approved technical docs.
