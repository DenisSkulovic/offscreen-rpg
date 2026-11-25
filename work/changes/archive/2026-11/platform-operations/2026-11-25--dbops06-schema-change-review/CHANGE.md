# DBOPS06 | Lightweight schema change review workflow

**State: Done / source-only.** Kind: implementation. Profile: STANDARD. Baseline main 182efaf9563307636f993a66fb4e0bd158d14fcb; execution from main `3eaf941cfff9749f1e54a52bd176ccaaeb62c5d5`. T01–T02 accepted. Live PostgreSQL NOT RUN. No outcome credit beyond offline schema-change review tooling.

## Outcome
Lightweight schema change review workflow. Selected authority: [database operations](../../../../docs/technical/platform/database-operations.md). [Programme](../../../undertakings/storyteller-workshop/DB-OPERATIONS.md) · [Tasks](TASKS.md).

## Execution
Dedicated change branch and linked worktree; run node scripts/repo-tools/change-branch-guard.mjs --change DBOPS06 --target main before edits. Composer Standard, one bounded T-ID at a time. Parent owns changed-file quality/format review, focused tests, archive/ledger reconciliation and squash join. DBOPS03 parent coordinates shared joins until its join; no unsynchronized shared lockfile writes. No live DB, Docker, Kubernetes, providers, protected resources or destructive Git. No global queue change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, authorization or spend promise moves | none | no product edit |
| Technical | changed: docs/technical/platform/database-operations.md#lightweight-team-practices names source-tested `review:change`; absence of hints ≠ safe; DBOPS01 still owns metadata repair | packages/db/README.md; tools/db-migrations/README.md; work/undertakings/storyteller-workshop/DB-OPERATIONS.md | source realization only |
| Code | changed: tools/db-migrations/scripts/review-change.mjs (+test), package.json `review:change`, tools/db-migrations/README.md PR template — read-only Git journal/SQL inventory, lexical hints, exit 0/1/2; negative: rewritten history, orphan/missing SQL, bad refs | packages/db/README.md | fixture-tested review script |
| Related | changed: archive/catalog/ledger/DB-OPERATIONS/OVERVIEW after Done; DBOPS03–05 remain open | work/changes/README.md; work/changes/ledger/2026-11.md | catalog reconciled |

## Diff paths

tools/db-migrations/scripts/review-change.mjs tools/db-migrations/scripts/review-change.test.mjs tools/db-migrations/package.json tools/db-migrations/README.md packages/db/README.md docs/technical/platform/database-operations.md work/undertakings/storyteller-workshop/DB-OPERATIONS.md work/undertakings/storyteller-workshop/OVERVIEW.md work/changes/README.md work/changes/open/README.md work/changes/ledger/2026-11.md work/changes/archive/2026-11/platform-operations/2026-11-25--dbops06-schema-change-review/CHANGE.md work/changes/archive/2026-11/platform-operations/2026-11-25--dbops06-schema-change-review/TASKS.md

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Lightweight team practices / schema review | docs/technical/platform/database-operations.md | changed: document source-tested `pnpm --filter @offscreen/db-migrations review:change`; absence of lexical hints never means safe; DBOPS01 still owns generator metadata repair | docs/technical/platform/database-operations.md tools/db-migrations/scripts/review-change.mjs @ 3eaf941cfff9749f1e54a52bd176ccaaeb62c5d5+dbops06 | source-tested (`node --test tools/db-migrations/scripts/review-change.test.mjs` 16/16; `review:change --base HEAD` exit 0 with terminal-snapshot warning) | rewritten historical SQL/journal, orphan/missing SQL, non-ancestor/option-like refs → exit 1/2; empty hints never marked safe; human/JSON output omits SQL bodies | tools/db-migrations/README.md; packages/db/README.md |
| Generator metadata / tracked generation guard | tools/db-migrations/scripts/check-history.mjs; work/changes/backlog/platform-operations/2026-11-22--dbops01-safe-schema-migrations-and-release-compatibility/CHANGE.md | unchanged because this Change does not repair journal/snapshot misalignment | tools/db-migrations/scripts/check-history.mjs @ 3eaf941cfff9749f1e54a52bd176ccaaeb62c5d5+dbops06 | source-observed (`pnpm --filter @offscreen/db-migrations check:history` exit 1 expected) | claiming metadata fixed would be the failure | DBOPS01 backlog path preserved |
| Migration history bytes | packages/db/migrations | unchanged because review is read-only Git inventory and never rewrites historical SQL | packages/db/migrations @ 3eaf941cfff9749f1e54a52bd176ccaaeb62c5d5+dbops06 | source-observed (`git diff --exit-code -- packages/db/migrations` clean) | no drizzle-kit or live DB invoked | N/A |
| Product gameplay/auth/spend | none | no product/technical behavior impacted because offline review tooling only | no product source changed @ 3eaf941cfff9749f1e54a52bd176ccaaeb62c5d5+dbops06 | source-observed | no product page rewrite authorized | N/A |
| Live PostgreSQL / ops execution proof | docs/technical/platform/database-operations.md#proof | unchanged because live disposable proof remains separately authorized; DBOPS03–05 own ops catalog/ledger/batches | no live harness ownership changed @ 3eaf941cfff9749f1e54a52bd176ccaaeb62c5d5+dbops06 | source-observed | claiming live PASS from fake Git fixtures would be the failure | work/undertakings/storyteller-workshop/DB-OPERATIONS.md; no QUEUE change |
