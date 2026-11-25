# Database: schemas, connection and migrations

`@offscreen/db` owns PostgreSQL/Drizzle schemas, connection creation and migration execution. It **does not** decide gameplay correctness, authorize an account or settle a Storyteller result. For intended semantics start with [data and consistency](../../docs/technical/platform/data-and-persistence.md); for actual transactions use [application operations](../application/README.md).

## Find the persisted record

| Need | Source |
| --- | --- |
| Connection and config | [database.ts](src/database.ts) `createDatabase`, [config.ts](src/config.ts) `readDatabaseConfig` |
| Managed admission / withClient | [connection/admission.ts](src/connection/admission.ts), [connection/managed-client.ts](src/connection/managed-client.ts) |
| Managed SQL transactions and errors | [database.ts](src/database.ts) `transaction`, [transaction/execute.ts](src/transaction/execute.ts), [transaction/errors.ts](src/transaction/errors.ts), [transaction/policy.ts](src/transaction/policy.ts) |
| Telemetry sink and snapshot | [telemetry/runtime.ts](src/telemetry/runtime.ts) `createDatabaseTelemetry`, [database.ts](src/database.ts) optional observer / `telemetrySnapshot` |
| Narrow concurrency helpers | [transaction/concurrency.ts](src/transaction/concurrency.ts) `expectOneAffected`, `acquireTransactionAdvisoryLock` |
| Controlled migration execution | [migrate.ts](src/migrate.ts), [migrate-cli.ts](src/migrate-cli.ts) |
| Durable delivery (outbox) | `@offscreen/outbox` (`./schema`, `./enqueue`, `./relay`) |
| Identity / auth tables | `@offscreen/identity-persistence` |
| Story Engine durable schema | `@offscreen/story-persistence` (`drafts`, `generations`, `stories`, `launch`, `campaign`, `storyteller`) |
| Admin staff / audit tables | `@offscreen/admin/persistence/schema` |
| Lab QA run/stage tables | `@offscreen/lab-support/persistence/schema` |

`@offscreen/db` owns the pool, the Drizzle client, migrations, and low-level persistence helpers. Delivery table declaration, enqueue and relay live in `@offscreen/outbox`. It does not own domain business tables, campaign authorization, story-state mutation, Writer spend, or the transaction boundary those commands use. Those owners are mapped in [Story Engine SQL ownership](../story-engine/SQL-OWNERSHIP.md) and [database infrastructure](../../docs/technical/platform/database-infrastructure.md).

The named public exports are in [package.json](package.json). Baseline SQL/migration metadata remain under [migrations/](migrations). [Canonical files](../../docs/technical/storyteller/context-and-memory.md) also defines a **future/mixed** file-ownership target; do not infer live migration completion from that design.

## Side effects and verification

`build` and `typecheck` don't require a running DB. Schema generation lives in `@offscreen/db-migrations` (`check:schema`, guarded `generate`); `migrate` and `test:integration` still have materially different effects. Read [development](../../docs/runbooks/local-development.md) and [verification policy](../../.agents/rules/verification.md) before invoking them. Never reset or migrate an arbitrary database for routine checking. SQL constraints are not proof of correct concurrent application commands; follow the transaction owner and one genuine failure/retry case.
