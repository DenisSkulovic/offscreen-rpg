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

**Required non-DB:** contracts build/test; Admin build/test; Application build plus the one focused `admin-compat.test.mjs` only; API build; api-integration build; changed-file Prettier/quality ESLint and graph check. **DB proof:** only authorized disposable SQL env, run seven named `test:admin-*` scripts plus `node --test tools/api-integration/dist/test/admin-situation.integration.js` where actual compiled suite exists. If unavailable, mark NOT RUN and do not claim fully verified security. Never relax permissions or replay tests merely to close packet.

**Scope limit:** no logic, SQL query, cookie, audit or grant changes. ABI compatible through Application re-export; new package identity must be singular. Validate actual tests and diff before marking Done. New public packages require manifest/importer lockfile update.

## Local execution prerequisites (not a new planner decision)

Admin API-only integration helpers at `tools/api-integration/test/helpers/api-only-auth.ts` require `DATABASE_TEST_URL` with pathname **exactly `/offscreen_auth_test`**, apply migrations on that disposable DB and bind **127.0.0.1:3199**. Do not point at production, `offscreen`, `offscreen_chamber` or a remotely shared database; do not run these suites concurrently with another owner of that test database or port. The `admin-situation` case uses its own helper; inspect the named test's existing connection precondition but do not redesign it. Check disposable URL/service availability before the final test wave; if unavailable, mark the DB evidence NOT RUN and report the exact missing prerequisite rather than pretending the permission/privacy negatives passed. Normal non-DB builds/units may proceed, but **do not claim verified security acceptance without required denial proofs**. No real provider call is authorized. See `docs/runbooks/local-integration-tests.md`.

**Focused-test budget:** The Application package's generic `test` script includes unrelated `*.live.test.mjs` files and is **not** the MA03 default. Build Application and run the single new compatibility test directly; run the seven moved Admin tests via `@offscreen/admin test`. SQL API suites remain explicitly named, sequential and disposable. Do not launch the full Application unit/live corpus to close this package move.

## Independent G0–G7 planner-readiness audit (2026-11-21)

**Target:** `undertaking/storyteller-workshop`, inspected source snapshot `dac6b69813b52ecb1f202158791deaa3b7ea89d7` plus remote critical source at `0a52a9a3991732bb1003eb7bdf83899e7a798c83`. Static inventory check verified exactly **13 old Admin modules**, **7 direct compiled-path unit tests**, **4 API Admin consumer modules**, **one cross-domain campaign schema import**. **Verdict: READY WITH EXPLICIT LIMITS** for *commission after MA02 integration* and target-HEAD source refresh. No actual compiler/SQL tests were run by ChatGPT; local worktrees inaccessible.

| Gate | Result | Source-specific rationale |
| --- | --- | --- |
| G0 | PASS with local preflight | selected Admin technical target now names `@offscreen/admin`; undertaking target, CQ02 Done |
| G1 | PASS at inspected source | complete old→new 13-file map, 7 tests, 4 API imports and contracts schema exception |
| G2 | PASS | CommonJS NodeNext compatibility, exact old index export preservation, same class/token identity, no SQL behavior changes |
| G3 | PASS T01–T05 | T01 schema; T02 exact mechanical 13-file copy; T03 7-test relocation; T04 all consumer/shim/deletion/lock edits; T05 verification |
| G4 | PASS | first dispatch T01 immediately after branch/lock checks |
| G5 | PASS, conditional parallel | T01 → (T02 + T03) → T04 → T05. T02/T03 source writes disjoint; parallel only without Git-index/build-output collision |
| G6 | PASS as plan, **SQL NOT RUN** | Zod duplicate/single-decision negatives, identical Admin singleton exports, 7 preserved unit tests, staff denial/private-read SQL fixtures |
| G7 | PASS | focused Admin tests and one App compatibility test, explicit disposable DB/port, no broad Application `test` glob, integration custodian owns lock |

**Limits:** local `DATABASE_TEST_URL` must target exactly `/offscreen_auth_test`, and API-only suite uses 3199. If unavailable, recorded negative security acceptance remains NOT RUN; do not claim security tests passed. MA02's Contracts/lockfile delta must already be integrated; do not run both owners' lockfile edits concurrently. No provider permission.
