# MA03 | discriminating proof matrix

All commands from repo root except where noted. Build packages in dependency order, or use Turbo graph with equivalent output. Real provider and production DB calls forbidden.

| Boundary | Positive | Negative | Source/test anchor |
| --- | --- | --- | --- |
| Zod holds | four valid kinds accepted; prior schemas same ref/export | duplicate owner, second decision, >20, unknown kind rejected | `contracts/test/campaign-holds.test.ts`; `application/src/campaign/holds.ts` |
| Admin exports | same named public exports via `@offscreen/admin` and old alias | `AdminSessionError` and token/session/class factories must be `===`, no duplicate implementation | `application/test/admin-compat.test.mjs` |
| Admin unit behavior | seven original unit suites run relocated | original negative grant/session/projection tests still execute, not merely compile | `packages/admin/test/admin-*.test.mjs` |
| HTTP composition | app/controller/actor/errors import Admin directly | exception mapping, stale session and tenant privacy denial unchanged | `apps/api/src/modules/admin/*`; existing disposable integration suites |
| Situation read | `campaignHoldsSchema` via Contracts | forbidden private story body still not selected, READ ONLY remains, 404 for cross-owner | `admin/src/situation-reads.ts`; `admin-situation.integration.ts` |
| Ownership graph | Admin→DB/contracts; API/Application→Admin | no Admin→Application/campaign implementation, no new package cycles | `pnpm repo:module-graph --json` |

**Required non-DB:** contracts build/test; Admin build/test; Application build/test; API build; api-integration build; changed-file Prettier/quality ESLint and graph check. **DB proof:** only authorized disposable SQL env, run seven named `test:admin-*` scripts plus `node --test tools/api-integration/dist/test/admin-situation.integration.js` where actual compiled suite exists. If unavailable, mark NOT RUN and do not claim fully verified security. Never relax permissions or replay tests merely to close packet.

**Scope limit:** no logic, SQL query, cookie, audit or grant changes. ABI compatible through Application re-export; new package identity must be singular. Validate actual tests and diff before marking Done. New public packages require manifest/importer lockfile update.
