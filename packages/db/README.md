# Database: schemas, connection and migrations

`@offscreen/db` owns PostgreSQL/Drizzle schemas, connection creation and migration execution. It **does not** decide gameplay correctness, authorize an account or settle a Storyteller result. For intended semantics start with [data and consistency](../../docs/technical/data.md); for actual transactions use [application operations](../application/README.md).

## Find the persisted record

| Need | Source |
| --- | --- |
| Connection and config | [database.ts](src/database.ts) `createDatabase`, [config.ts](src/config.ts) `readDatabaseConfig` |
| Controlled migration execution | [migrate.ts](src/migrate.ts), [migrate-cli.ts](src/migrate-cli.ts) |
| Story, passage and item tables | [schema/stories.ts](src/schema/stories.ts) |
| Campaign clocks, actions and activities | [schema/campaign.ts](src/schema/campaign.ts) |
| Generation, provider attempt and financial records | [schema/generations.ts](src/schema/generations.ts), [schema/storyteller.ts](src/schema/storyteller.ts) |
| Authentication, drafts, outbox and QA | [schema/auth.ts](src/schema/auth.ts), [schema/drafts.ts](src/schema/drafts.ts), [schema/outbox.ts](src/schema/outbox.ts), [schema/qa.ts](src/schema/qa.ts) |

The named public exports are in [package.json](package.json). Baseline SQL/migration metadata are under [migrations/](migrations/). [Canonical files](../../docs/technical/canonical-files.md) also defines a **future/mixed** file-ownership target; do not infer live migration completion from that design.

## Side effects and verification

`build` and `typecheck` don't require a running DB. `generate`, `migrate` and `test:integration` have materially different effects. Read [development](../../docs/development.md) and [verification policy](../../.agents/rules/verification.md) before invoking them. Never reset or migrate an arbitrary database for routine checking. SQL constraints are not proof of correct concurrent application commands; follow the transaction owner and one genuine failure/retry case.
