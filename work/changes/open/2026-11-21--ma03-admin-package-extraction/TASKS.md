# MA03 | planner rework required before commissioning\n\n**ALL T-IDs BELOW ARE PLANNER-BLOCKED; DO NOT DISPATCH.** The approved direction remains extraction without permission behavior changes, but the current coarse cards do not supply file-level public API migration, test harness moves or enough bounded negative proofs. ChatGPT must republish with source→destination/exports/consumer/test manifest against the current Undertaking HEAD. CQ02 completion alone does not make this Ready.
**Commission on live `undertaking/storyteller-workshop` after CQ02.** Use `change/ma03-admin-package-extraction` linked worktree. Leave the primary checkout on its current branch. T01 → T02 → T03 → T04. Parent owns integration and test receipts. A separate modular-monolith branch would be the cleaner long-term home; this program stays on Storyteller Workshop.

## T01 | PLANNER-BLOCKED | Separate campaign hold schema
Read `application/src/campaign/holds.ts`, `application/src/admin/situation-reads.ts`, `contracts/package.json`. Write `contracts/src/campaign-holds.ts`, manifests, import/export compatibility and focused schema test. Positive unchanged valid holds. Negative duplicate/invalid holds rejected identically. Stop for actual schema mismatch, not routine import fix.

## T02 | PLANNER-BLOCKED | New Admin package with preserved public contract
Read all 13 `application/src/admin/*` modules, `packages/application/tsconfig.json` and `index.ts`. Create `packages/admin` package/tsconfig/src; move code with only relative import adjustment, explicit exports, no invented new roles. Positive new package builds. Negative no application or campaign implementation import from new package. Stop on hidden cross-module dependency not mapped.

## T03 | PLANNER-BLOCKED | Compatibility + consumers + tests
Read `apps/api/src/modules/admin/controller.ts`, `application/admin/index.ts`, old Admin unit/integration tests. Write exact compatibility exports, dependency manifests/lockfile, API import adjustments, migrated tests. Positive app/API compile and equivalent staff response. Negative no duplicate DI symbol/privilege behavior. Stop on weird runtime class identity change.

## T04 | PLANNER-BLOCKED | Focused proof and integrate
Run unit + authorized disposable Admin integration tests, ABI/public exported-name and package graph checks, changed-file lint/format. Archive per workflow, preserve evidence and request no additional ceremonial ChatGPT approval. Integration custodian serializes lockfile and Undertaking join.
