# MA05B | exact old/new SQL ownership

**Remote inspected:** `undertaking/storyteller-workshop` `681c5fa910344551c5b4f40fd39dc1fdf87378ca`. No SQL tests run by planner.

| Existing source | Observed responsibility | Selected target |
| --- | --- | --- |
| `packages/application/src/outbox/index.ts:Transaction` | `Parameters<Parameters<Database['db']['transaction']>[0]>[0]` | `packages/db/src/outbox.ts`, `Database` type from `./database` |
| same `:Notice` | `id,topic,operationId,leaseId` strings | same DB port, re-export type via Application |
| same `:enqueue` | `INSERT ... ON CONFLICT DO NOTHING`, SELECT existing ID, exact topic/operation identity mismatch throws `Outbox identity conflict` | DB port **same function**, re-export via Application, not wrapper |
| same `:createOutbox` | claim/30s lease/ack with DB transaction and NOW clock | stay Application; no edits beyond type import + unused imports |
| `packages/db/src/database.ts` | `Database` typed Drizzle+pg pool; DB owns outbox schema | DB port depends on relative database/schema; no package cycle |
| `application/test/story03-notice-topic-freeze.test.mjs` | runs owner-independent notice-topic negative cases using disposable sandbox DB | add same-id different-payload transaction rollback negative |
| `packages/db/package.json` | explicit subpath exports, no `./outbox` currently | exact new subpath `./outbox`, no root barrel |

**Cross-package importers:** Dozens of `application/src/stories`, `campaign`, `storyteller` files still import `../outbox/index`, intentionally supported by the old re-export. They are **not** to be migrated in this Change; subsequent Story Authority extraction can adopt DB port incrementally. This avoids a 40-file migration and preserves existing notices/leases.
