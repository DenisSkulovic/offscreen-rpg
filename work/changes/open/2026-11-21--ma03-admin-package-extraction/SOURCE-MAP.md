# MA03 | source-backed migration inventory

**Inspected:** `dac6b69813b52ecb1f202158791deaa3b7ea89d7` checkout (2026-11-21); remote `0a52a9a3991732bb1003eb7bdf83899e7a798c83` key App exports/source manifests reconfirmed. No typecheck or SQL proof executed by ChatGPT.

## Exact one-to-one module move (13 files)
All paths below are relative to `packages/`. Each `application/src/admin/<name>.ts` → `admin/src/<name>.ts`, **no filename renames**:
`access`, `audit-reads`, `case-writes`, `cookie`, `diagnostics-reads`, `index`, `player-reads`, `policy`, `registry`, `session`, `situation-reads`, `token`, `usage-reads`.
Only cross-domain relative source import found: `situation-reads.ts:campaignHoldsSchema` from `../campaign/holds.js`; T01 changes it to `@offscreen/contracts/campaign-holds` before the move. Other Admin relative imports are among the 13. External imports use DB's explicit schema exports, `@offscreen/contracts/admin`, `drizzle-orm`, and built-in crypto. Existing `index.ts` defines the exact public named export list; copy **verbatim**.

## Export/manifest table
| Old public import | New owner | Compatibility / consumer |
| --- | --- | --- |
| `@offscreen/application/admin` | `@offscreen/admin` root `.` | Keep old subpath, Application `src/admin/index.ts` = `export * from '@offscreen/admin'` |
| `@offscreen/contracts/campaign-holds` | new pure Zod schema | `application/campaign/holds.ts` imports/re-exports both schema symbols; Admin situation reads new subpath |
| `@offscreen/db/{admin,campaign,story,generation,storyteller}-schema` | stays DB | unchanged direct imports; Admin never imports Application |
| `apps/api/src/app.ts` | direct `@offscreen/admin` | Admin DI providers retained unchanged |
| `apps/api/src/modules/admin/controller.ts` | direct `@offscreen/admin` | preserve controller handlers and HTTP grant/error mapping |
| `apps/api/src/modules/admin/admin-actor-service.ts` | direct `@offscreen/admin` | preserve class identity |
| `apps/api/src/modules/admin/admin-http-errors.ts` | direct `@offscreen/admin` | preserve `instanceof AdminSessionError` |
| `tools/api-integration/test/admin-*.integration.ts` | remains old Application alias | meaningful compatibility/denial regression without duplicating Admin implementation |

**New manifests:** `packages/admin/package.json` exports root to `dist/index`, deps DB/contracts/drizzle (not Application), dev config/typescript/node; `packages/admin/tsconfig.json` NodeNext/rootDir src/outDir dist. `packages/application/package.json` and `apps/api/package.json` add Admin workspace dependency. Shared `pnpm-lock.yaml` updates once in T04, never in parallel.

## Test migration (7 files)
`packages/application/test/admin-{audit,cases,diagnostics,player-reads,policy,session,usage}.test.mjs` → identical `packages/admin/test/` names. In every file replace only `../dist/admin/index.js` with `../dist/index.js`. No other relative test import found in these files. Application gets one `admin-compat.test.mjs` to prove strict identity of new and old exports. API integration tests remain as-is and exercise the old alias.

## Critical invariants
No changes to staff grant/session expiry, JWT/token crypto, READ ONLY snapshots, safe SELECT column lists, tenant isolation, privacy 404, audit writes, holds SQL transaction controls or provider calls. `campaignHoldSchema` four-kind validation, 20-count and unique/solo-decision checks must remain byte-equivalent. Source inspection maps are not runtime proof; test failures stop closure.
