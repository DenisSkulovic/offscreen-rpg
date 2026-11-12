# Data modeling and schema evolution: choose a truth model that survives change

**Roles:** data architect, backend engineer, API architect, database reviewer, migration/release planner and test strategist. **Trigger:** a persistent entity or relation, authority/identity decision, new query pattern, schema change, document-versus-relational choice, history/retention or migration. Not necessary for an isolated query typo.

**Navigate:** [domain model](#1-model-the-domain-and-identities-before-tables) · [representation choices](#2-choose-how-facts-are-represented-and-owned) · [constraints](#3-model-invariants-relationships-and-time) · [access paths](#4-design-queries-indexes-and-read-models-together) · [online change](#5-online-schema-evolution-is-a-multi-version-protocol) · [PostgreSQL/Drizzle mechanics](#6-postgresql-and-drizzle-migration-mechanics) · [proof](#7-review-and-verification-contract).

## Engineering premise

A schema is an encoded model of **identity, relationships, validity, history, authority, and access patterns**. Normalization and denormalization are tools, not grades; a JSON column and a separate table can both be excellent or terrible depending on how the data is read, changed, joined, retained and protected.

A migration is not merely a sequence of SQL statements. In a deployed system, old and new app versions, existing records, new writes and background backfills may coexist. The schema evolves as a **protocol across versions**. The safest design is conditional on traffic, data size, compatibility window and rollback requirements.

## 1. Model the domain and identities before tables

First identify the facts and their lifecycle. A persistent entity needs more than an ID:

| Dimension           | Decision to make                                                        | Why it changes the design                                                          |
| ------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Entity identity     | Surrogate ID, business key, composite scoped key, versioned document ID | Whether duplicate inputs and cross-tenant references are possible                  |
| Business uniqueness | What is actually unique, over what interval and owner scope?            | Two equal titles may be distinct objects; a room can be booked on different nights |
| Cardinality         | One-to-one, one-to-many, many-to-many, optional relationship            | Join table vs embedded array, and delete/retention semantics                       |
| Mutation            | Mutable in place, append-only, event log, immutable revision            | Audit, dedup, history reconstruction and write contention                          |
| Temporal meaning    | Instant, local date, effective interval, recorded-at, observed-at       | Backdated corrections and future rules cannot share one timestamp blindly          |
| Visibility          | Owner, tenant, member, public projection, private proposal              | RLS/app authz and document placement must match exposure                           |
| Retention           | Deleted, archived, anonymized, preserved as evidence                    | Hard delete vs tombstone vs historical snapshot                                    |
| Access paths        | Lookup by owner/id, filter, range, search, chronology, aggregation      | Indexes and query plan drive schema and derived views                              |
| Evolution           | How old persisted versions are interpreted                              | Schema versioning, migration/backfill, compatibility or adapters                   |

**Separate an entity from its present value.** Story identity, a published passage, its current selected descriptive document, and an internal model _proposal_ have different authority and historical semantics. Treating them all as one mutable row may erase evidence; treating them all as independent databases may create needless distributed consistency.

### Natural versus surrogate identity

Natural keys encode real-world meaning and can prevent certain duplicates, but business identifiers may change, merge or be reused. Surrogate keys improve stable references, but require explicit unique constraints for true business uniqueness. Composite keys (tenant + resource) can make ownership visible to schema and joins, but may increase FK/index complexity. Decide based on change frequency, scope, interoperability and audit.

### Historical snapshots are often intentional

A price at booking time should survive later catalog price changes. A snapshot is not automatically “bad denormalization.” It is an **immutable fact of an earlier decision**. Name which data is a current catalog reference versus the committed historical evidence.

## 2. Choose how facts are represented and owned

| Representation                    | Useful for                                                                                       | Principal cost / selection boundary                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Normalized relational tables      | Frequent joins, integrity constraints, multi-record transactional commands                       | Query complexity, migration effort, transaction contention if modeled poorly                   |
| PostgreSQL JSONB                  | Flexible bounded substructure attached to an owner, changing schema, infrequent targeted queries | Validation, indexes, partial updates, version interpretation and opaque query costs            |
| Immutable versioned documents     | Canonical narrative/source content, audit/provenance, reproducible reads                         | Manifest/root selection, current-version resolution, atomic publication and garbage collection |
| Event/append-only ledger          | Durable business transitions, replay/audit and idempotent receipt evidence                       | Projection rebuilding, event compatibility, large history and schema evolution                 |
| Materialized view/read projection | Expensive read shape with acceptable lag, independent access patterns                            | Rebuild/invalidation, divergence and tenant visibility                                         |
| Dedicated search index            | Ranking/fuzzy retrieval over lots of content                                                     | Freshness, version/canonical-source references, eventual convergence                           |
| Cache                             | Derived fast read when DB remains authority                                                      | TTL, eviction, stampede, privacy, invalidation and stale publication                           |

**A common false dilemma:** “relational database versus documents.” The same product can use SQL as transaction/identity owner and immutable documents as long-form source content, with a **single atomic selected root**. That doesn't authorize a second mechanical-state writer. See [canonical files](../../docs/technical/canonical-files.md) and [data contract](../../docs/technical/data.md).

### Normalization versus denormalization

Normalization helps avoid update/insert/delete anomalies and hidden coupling of unrelated facts. Denormalization can support a high-value read projection, but then the design must specify **who updates it, which source version it reflects, how stale it may be and how to rebuild it**. A JSON document that duplicates a SQL field without a version relation is not an innocuous optimization.

Don't introduce event sourcing because “auditability matters.” A simple immutable receipt table or versioned document may suffice. Event sourcing earns its cost when transition history itself is the source of truth and projections/replays are manageable.

## 3. Model invariants, relationships and time

A database constraint can be the strongest and cheapest guard for an invariant, but first express that invariant precisely.

| Guarantee                | Common DB mechanism                                 | Limit                                                                     |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------- |
| Stable business identity | Unique index/constraint on correct scope            | Case-folding, soft-delete, race or natural-key reuse need explicit policy |
| Valid relation           | Foreign key, often composite by tenant              | Cross-tenant safety still depends on every write/query respecting scope   |
| Valid local value        | CHECK/NOT NULL, enum or typed JSON validation       | Cannot guarantee arbitrary cross-row/time invariants                      |
| Nonoverlapping intervals | Appropriate PostgreSQL exclusion/range constraint   | Workload, lock/index strategy and period semantics matter                 |
| Single claim of capacity | Conditional atomic update or locked coordinator row | Must represent the shared resource and recheck affected rows              |
| No stale overwrite       | Expected version with compare-and-swap              | Doesn't protect a separate predicate if not covered                       |
| Historical audit         | Append-only receipt/versioned event with FK         | Data provenance and correction policy still need design                   |

**Ownership and time interact:** Was a relationship true at story time, known by the player at that time, or entered into the database later? “createdAt,” “effectiveAt,” “observedAt,” and “publishedAt” are different coordinates. The right model depends on gameplay and product semantics; don't invent bitemporal storage unless required.

**Deletion:** soft delete is not free. It changes unique keys, filtering, child relationships, analytics, privacy and retention. A boolean deleted flag without query discipline may accidentally expose archived records. Consider hard delete, tombstone, archive and legal/evidence retention separately.

## 4. Design queries, indexes and read models together

A perfect logical schema with terrible access paths can still be a bad production design.

**Start from real query shapes:** predicates, join keys, sort order, limit, tenant scope, read/write ratio, pagination depth and actual sizes. Then decide indexes and projection strategy. Don't add indexes for every column: indexes consume storage, write amplification, vacuum work and migration/maintenance effort.

Options and when they win:

- **B-tree** for equality, ordered/range scans and sorting. Composite column order and selectivity matter; use the actual query.
- **GIN/GiST / specialized indexes** for JSONB, full-text, ranges or spatial queries when operator support warrants them.
- **Partial index** for stable subsets (e.g. active rows), provided predicates match query semantics.
- **Covering/index-only opportunities** when relevant columns and visibility patterns justify write/storage cost.
- **Partitioning** for genuinely large lifecycle/time/tenant distributions; it complicates indexes, uniqueness, migrations and routing.
- **Materialized read projection** if expensive queries dominate and freshness can be defined; not an automatic answer to one slow endpoint.

Use `EXPLAIN (ANALYZE, BUFFERS)` thoughtfully on representative safe data, and examine latency, row estimates, scanned rows, joins, sort/spill and plans across parameter variants. **An index is an optimization hypothesis**, not proof that the real query became fast. Never run expensive EXPLAIN ANALYZE against uncontrolled production data as part of routine agent investigation.

### One important cross-layer point

A paginated UI may request records sorted by publish time, while SQL uses a nonunique timestamp. Under concurrent inserts, pages can skip or duplicate rows. Stable order and cursor identity belong to **the API contract and the data model together**. See [API/network knowledge](api-and-network-contracts.md).

## 5. Online schema evolution is a multi-version protocol

For durable deployments, use an **expand → transition/backfill → validate → contract** mindset:

| Phase       | Typical action                                                     | Safety condition                                              |
| ----------- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| Expand      | Add nullable/new field or table, compatible read/write path        | Old app version continues working                             |
| New writers | Deploy app that writes new representation (possibly dual write)    | Cross-version semantics and idempotency defined               |
| Backfill    | Populate historical rows in bounded, resumable batches             | No clobber of concurrent new writes; progress and checks      |
| New readers | Prefer new representation once coverage is complete                | Can compare or fall back during rollout                       |
| Validate    | Check consistency, enforce constraints, verify read/error behavior | Data errors and rejected rows handled                         |
| Contract    | Stop old writes/reads; drop old schema only when safe              | Old clients/workers/rollback artifacts no longer depend on it |

**This is not always six deployments.** For an empty pre-POC database, a single migration may be enough. For large active tables with old app versions in flight, a one-shot destructive rename is unacceptable. The contract is what matters, not ritual phases.

### Why rollback is not time travel

Rolling back the application binary does **not** reverse migrated data. A database restore can lose legitimate new writes. Plan forward correction, backward-compatible schema and rollback of _behavior_ separately. A rollback target must understand already-persisted values. Feature flags can decouple activation from deployment, but flags and dual paths are also maintenance costs.

### Backfills are production workloads

- Bound batches and concurrency; long transactions hold locks, grow WAL/replication lag and consume buffers.
- Make progress durable and retryable with exact version/source identity.
- Avoid overwriting newer writes with old backfill snapshots; use expected revision or conditional update.
- Decide deletion/tombstone behavior while backfill is in progress.
- Verify the **semantic mapping**, not merely “all rows have non-null value.”
- Define restart, partial-run, throttling and failure recovery. Don't infer “transactional migration” means a huge data transformation is operationally safe.

### The lock queue surprise

A DDL command can be fast **once it gets a lock** but wait behind a long transaction; new queries may then queue behind the waiting DDL. This can make a millisecond catalog change look like an outage. Evaluate PostgreSQL lock mode, duration, lock_timeout/statement_timeout and staged operations for the installed version.

## 6. PostgreSQL and Drizzle migration mechanics

**Official PostgreSQL facts:** `CREATE INDEX CONCURRENTLY` permits concurrent writes but performs more work, may wait for transactions, cannot run within a transaction block and can leave an **invalid index** after failure. Check index validity before simply retrying. `NOT VALID` then `VALIDATE CONSTRAINT` can separate enforcement for new rows from verifying old rows for supported CHECK/FK constraints; it is **not** a blanket “add every constraint online” option. These details depend on server version and command form. See [CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html) and [ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html).

**Drizzle choices:** [Drizzle migrations](https://orm.drizzle.team/docs/migrations) documents DB-first, schema push, generated SQL migrations and external migration tooling. `generate` creates versioned SQL from TS schema, `migrate` applies pending changes, `push` can apply schema diffs directly. For a persistent, reviewed release train, generated SQL plus deliberate review usually gives better audit/rollback reasoning. For disposable prototypes, schema push may reduce friction. Never assume a tool-generated rename or type alteration preserves data semantics without inspection.

**Critical integration detail:** a migration runner that wraps **every migration in a transaction** is not automatically compatible with PostgreSQL's concurrent index build. Confirm the actual runner contract; split operations or use a supported mode deliberately. Do not work around the PostgreSQL rule by inventing unsupported SQL.

**Offscreen RPG ownership:** [DB package](../../packages/db/README.md), migration files and [development safety](../../docs/development.md) are the local implementation maps. The current project may intentionally use destructive disposable-db operations for POC testing. Those procedures **do not transfer to a live or non-disposable DB**.

## 7. Review and verification contract

**Before a model recommends schema design**, it should present a compact decision packet: entity identities/uniqueness, relationship constraints, temporal meaning, likely queries, 2–3 representation options, authoritative ownership, evolution/retention and one constraint that reverses the chosen approach.

**Before authorizing migration execution**, the responsible role needs: current schema version, DB size/traffic, app/version overlap, migration method and transactional behavior, lock expectations, old/new writer semantics, backfill/retry plan, validation, rollback/forward-fix and an explicitly safe target environment.

Three discriminating exercises:

1. **Concurrent writes during backfill:** a newer V2 write happens before an old-row V1 backfill reaches that row. Assert the backfill never overwrites the new canonical value.
2. **Online index failure:** concurrent index creation aborts halfway. Can the operator discover invalid-index state, avoid unsafe duplicate work and recover without blocking all writes?
3. **Rolling compatibility:** old reader and new writer coexist. Does the old reader still interpret the data correctly until deprecation is approved?

**Deep source material:** [CS330 relational design](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/CS/CS330-relational-databases/CS330-L01-relational-database-design.md), [CS350 online migrations](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/CS/CS350-advanced-postgresql/CS350-L04-online-migrations-and-the-database-incident-studio.md), [CS340 data architecture workshop](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/CS/CS340-data-systems-beyond-relational/CS340-L07-the-data-architecture-workshop.md).

**Safety boundary:** this is professional knowledge, not a migration command. Reading it does not authorize generating/applying SQL, modifying data or running a test DB reset.
