# Database: schemas, connection and migrations

`@offscreen/db` owns PostgreSQL/Drizzle schemas, connection creation and migration execution. It **does not** decide gameplay correctness, authorize an account or settle a Storyteller result. For intended semantics start with [data and consistency](../../docs/technical/platform/data-and-persistence.md); for actual transactions use [application operations](../application/README.md).

## Find the persisted record

| Need | Source |
| --- | --- |
| Connection and config | [database.ts](src/database.ts) `createDatabase`, [config.ts](src/config.ts) `readDatabaseConfig` |
| Controlled migration execution | [migrate.ts](src/migrate.ts), [migrate-cli.ts](src/migrate-cli.ts) |
| Story, passage, item, and scene-checkpoint selector | [schema/stories.ts](src/schema/stories.ts) `story`, `storyPassage`, `storyItem`, `storySceneCheckpoint` |
| Launch admission ledger, reserved ids, no story row | [schema/launch.ts](src/schema/launch.ts) `storyLaunch` |
| Campaign clocks, actions and activities | [schema/campaign.ts](src/schema/campaign.ts) |
| Generation, provider attempt and financial records | [schema/generations.ts](src/schema/generations.ts), [schema/storyteller.ts](src/schema/storyteller.ts) barrel over [capture](src/schema/storyteller/capture.ts), [funding](src/schema/storyteller/funding.ts), [execution](src/schema/storyteller/execution.ts), [policy](src/schema/storyteller/policy.ts), and [writer](src/schema/storyteller/writer.ts) |
| Authentication, drafts, outbox and QA | [schema/auth.ts](src/schema/auth.ts), [schema/drafts.ts](src/schema/drafts.ts), [schema/outbox.ts](src/schema/outbox.ts), [schema/qa.ts](src/schema/qa.ts) |

`@offscreen/db` owns the pool, the Drizzle client, migrations, table definitions, the generic outbox relay, and low-level persistence helpers. It does not decide campaign authorization, story-state mutation, Writer spend, or the transaction boundary those commands use. Those owners are mapped in [Story Engine SQL ownership](../story-engine/SQL-OWNERSHIP.md). Splitting the Storyteller declarations into lifecycle files does not change table identity or SQL behavior.

The named public exports are in [package.json](package.json). `./storyteller-schema` still resolves to the barrel. Baseline SQL/migration metadata are under [migrations/](migrations). [Canonical files](../../docs/technical/storyteller/context-and-memory.md) also defines a **future/mixed** file-ownership target; do not infer live migration completion from that design.

## Side effects and verification

`build` and `typecheck` don't require a running DB. Schema generation lives in `@offscreen/db-migrations` (`check:schema`, guarded `generate`); `migrate` and `test:integration` still have materially different effects. Read [development](../../docs/runbooks/local-development.md) and [verification policy](../../.agents/rules/verification.md) before invoking them. Never reset or migrate an arbitrary database for routine checking. SQL constraints are not proof of correct concurrent application commands; follow the transaction owner and one genuine failure/retry case.
