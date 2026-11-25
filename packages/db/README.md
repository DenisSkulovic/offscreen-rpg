# Database: connection, runtime and historical migrations

`@offscreen/db` owns generic PostgreSQL connection configuration, pools, bounded admission, managed `withClient` / `transaction` execution, redacted telemetry helpers, controlled migration running, and the historical ordered SQL assets under [migrations/](migrations). It does **not** declare domain business tables. For durable-record semantics start with [data and consistency](../../docs/technical/platform/data-and-persistence.md); for application command boundaries use [application operations](../application/README.md).

## Package navigation map

| Surface | What it is | Admission? |
| --- | --- | --- |
| `@offscreen/db` (package root) | Public runtime: `createDatabase`, `readDatabaseConfig`, transaction types/errors, telemetry factory, concurrency helpers — see [index.ts](src/index.ts) and [package.json](package.json) `exports["."]` | Managed paths only |
| `@offscreen/db/migrate` | `applyMigrations` and migrate CLI — [migrate.ts](src/migrate.ts), [migrate-cli.ts](src/migrate-cli.ts); post-DDL ledger assert + allowlisted CLI failure text ([diagnostics.ts](src/migrations/diagnostics.ts)) | Dedicated migration connection (session advisory lock) |
| `createDatabase(...).db` | Untyped Drizzle client on the shared pool — [database.ts](src/database.ts) | **Bypasses** managed admission; legacy or direct SQL |
| `withClient` / `transaction` | Bounded queue, deadlines, policy-driven retries — [connection/managed-client.ts](src/connection/managed-client.ts), [transaction/execute.ts](src/transaction/execute.ts) | **Yes** — the supported application seam |

| Migration artifact | Role |
| --- | --- |
| `migrations/meta/_journal.json` | Ordered deployment journal (tags, hashes); runner validates the applied prefix before DDL and again after verified migrate |
| Applied ledger (`__drizzle_migrations` in PostgreSQL) | Per-database record of which journal entries have run; success requires full prefix length match under lock |
| `tools/db-migrations` generator snapshots (`meta/*_snapshot.json`) | Synthetic schema-diff input for `check:schema` / `generate`; not deployment history |

Stale checked-in generator metadata (journal through idx 24 vs newest snapshot idx 4) is reconciled under **[DBOPS01](../../work/changes/backlog/platform-operations/2026-11-22--dbops01-safe-schema-migrations-and-release-compatibility/CHANGE.md)**; `@offscreen/db-migrations` `check:history` refuses tracked generation until that gate passes.

| Tests | Permission |
| --- | --- |
| `pnpm --filter @offscreen/db test` | Source/fixture only (fake pool, journal and runner units); no running PostgreSQL |
| `pnpm --filter @offscreen/db test:integration` | **Destructive**: requires disposable `offscreen_db_test`, drops fixture schema; never point at a real account or tenant |

Live transaction, migration recovery, telemetry workload, and replicated-topology proof belong to **[VER04](../../work/changes/open/2026-11-25--ver04-db-transaction-migration-recovery-programme/CHANGE.md)** and **[VER05](../../work/changes/open/2026-11-25--ver05-db-replicated-topology-programme/CHANGE.md)** (`pnpm verify package @offscreen/db` sections); see [verification programmes](../../docs/technical/platform/verification-programmes.md) and [database infrastructure](../../docs/technical/platform/database-infrastructure.md).

## Find the persisted record

| Need | Source |
| --- | --- |
| Connection and config | [database.ts](src/database.ts) `createDatabase`, [config.ts](src/config.ts) `readDatabaseConfig` |
| Managed admission / withClient | [connection/admission.ts](src/connection/admission.ts) (controller; reexports error/clock), [connection/admission-error.ts](src/connection/admission-error.ts), [connection/admission-deadline.ts](src/connection/admission-deadline.ts), [connection/managed-client.ts](src/connection/managed-client.ts) |
| Health probe | [connection/probe.ts](src/connection/probe.ts) `checkDatabaseConnection`; [database.ts](src/database.ts) `checkConnection` delegates with factory-computed timeout |
| Managed SQL transactions and errors | [database.ts](src/database.ts) `transaction`, [transaction/execute.ts](src/transaction/execute.ts), [transaction/errors.ts](src/transaction/errors.ts), [transaction/policy.ts](src/transaction/policy.ts) |
| Telemetry sink and snapshot | [telemetry/runtime.ts](src/telemetry/runtime.ts) `createDatabaseTelemetry` + explicit `AdmissionInstrumentation` options; [database.ts](src/database.ts) optional observer / `telemetrySnapshot` |
| Narrow concurrency helpers | [transaction/concurrency.ts](src/transaction/concurrency.ts) `expectOneAffected`, `acquireTransactionAdvisoryLock` |
| Controlled migration execution | [migrate.ts](src/migrate.ts), [migrate-cli.ts](src/migrate-cli.ts) (`packages/db/migrations` asset folder) |
| Schema registry / verification | `tools/db-migrations` (`check:schema`, guarded `generate`) — [package.json](../../tools/db-migrations/package.json) |
| Durable delivery (outbox) | `@offscreen/outbox` (`./schema`, `./enqueue`, `./relay`) |
| Identity / auth tables | `@offscreen/identity-persistence` |
| Story Engine durable schema | `@offscreen/story-persistence` (`drafts`, `generations`, `stories`, `launch`, `campaign`, `storyteller`) |
| Admin staff / audit tables | `@offscreen/admin/persistence/schema` |
| Lab QA run/stage tables | `@offscreen/lab-support/persistence/schema` |

`@offscreen/db` supplies the pool, Drizzle client factory, migrations runner, and low-level persistence helpers. Delivery table declaration, enqueue and relay live in `@offscreen/outbox`. It does not own domain business tables, campaign authorization, story-state mutation, Writer spend, or the transaction boundary those commands use. Table owners are mapped in [Story Engine SQL ownership](../story-engine/SQL-OWNERSHIP.md).

[Canonical files](../../docs/technical/storyteller/context-and-memory.md) also defines a **future/mixed** file-ownership target; do not infer live migration completion from that design alone.

## Side effects and verification

`build` and `typecheck` do not require a running DB. Schema generation lives in `@offscreen/db-migrations` (`check:schema`, guarded `generate`); `migrate` and `test:integration` have materially different effects. Read [development](../../docs/runbooks/local-development.md) and [verification policy](../../.agents/rules/verification.md) before invoking them. Never reset or migrate an arbitrary database for routine checking. SQL constraints are not proof of correct concurrent application commands; follow the transaction owner and one genuine failure/retry case.
