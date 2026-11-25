# DB13 | Migration runner postcondition and failure reporting

**Status: Ready (dependency-gated) / owner-commissioned source only.**

Baseline main 630f70bb0d2bf1f4de0304dc3bd6bde5c6e696d0. Integration target main. Profile STANDARD. After DB11. Own migrate.ts, migrate-cli.ts, migrations/runner.ts, migrations/journal.ts, test/migration-runner.test.ts and migration-journal.test.ts. Independent of DB12.

## Outcome
Migration runner postcondition and failure reporting; retain domain authority, SQL history, public exports, pool limits and compatibility. DB12 deliberately repairs cleanup and narrow definitive COMMIT classification; DB13 adds final ledger verification. [Programme](../../../undertakings/storyteller-workshop/DB-CRAFT.md) · [Tasks](TASKS.md) · [Technical owner](../../../../docs/technical/platform/database-infrastructure.md).

## Execution
Dedicated change branch and linked worktree; run node scripts/repo-tools/change-branch-guard.mjs --change DB13 --target main before edits. Composer Standard, one bounded T-ID at a time. Parent owns final proof, code-craft review, changed-file Prettier/quality lint, typecheck, archive/ledger/STATUS reconciliation and squash join. DB11 parent coordinates shared joins until its join, then DB12 parent (or agreed remaining single custodian); coordinate active VER/INF/cache parents. No concurrent writes to shared catalogs. No live PostgreSQL, Docker, cluster, migrations, provider calls or destructive Git. No global queue change.

## planned-impact.v1
| Plane | Disposition |
|---|---|
| Product | No domain behavior or authority changes |
| Runtime | Selected generic safety fixes only, otherwise preserve semantics |
| History | Existing SQL and journal/meta bytes unchanged |
| Proof | Source tests with negative cases; live NOT RUN |

## Acceptance
All focused tests pass, full package source suite and typecheck run after build, explicit negative receipts and readable invariant comments. Confirm historical migrations unchanged, no new dependency or public export drift. Stop on exact semantic contradiction, not predecessor ordering. Reconcile technical docs at closure with actual results; no live/outcome credit.
