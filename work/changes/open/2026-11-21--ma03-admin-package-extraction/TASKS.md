# MA03 | bounded Cursor execution
**Commission only on live `undertaking/modular-monolith` after CQ02.** Use `change/ma03-admin-package-extraction` linked worktree; no primary checkout branch switch. T01 → T02 → T03 → T04. Parent owns integration and test receipts.

## T01 | Separate campaign hold schema
Read `application/src/campaign/holds.ts`, `application/src/admin/situation-reads.ts`, `contracts/package.json`. Write `contracts/src/campaign-holds.ts`, manifests, import/export compatibility and focused schema test. Positive unchanged valid holds. Negative duplicate/invalid holds rejected identically. Stop for actual schema mismatch, not routine import fix.

## T02 | New Admin package with preserved public contract
Read all 13 `application/src/admin/*` modules, `packages/application/tsconfig.json` and `index.ts`. Create `packages/admin` package/tsconfig/src; move code with only relative import adjustment, explicit exports, no invented new roles. Positive new package builds. Negative no application or campaign implementation import from new package. Stop on hidden cross-module dependency not mapped.

## T03 | Compatibility + consumers + tests
Read `apps/api/src/modules/admin/controller.ts`, `application/admin/index.ts`, old Admin unit/integration tests. Write exact compatibility exports, dependency manifests/lockfile, API import adjustments, migrated tests. Positive app/API compile and equivalent staff response. Negative no duplicate DI symbol/privilege behavior. Stop on weird runtime class identity change.

## T04 | Focused proof and integrate
Run unit + authorized disposable Admin integration tests, ABI/public exported-name and package graph checks, changed-file lint/format. Archive per workflow, preserve evidence and request no additional ceremonial ChatGPT approval. Integration custodian serializes lockfile and Undertaking join.
