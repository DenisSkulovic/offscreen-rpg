# DBOPS03 | Database operations catalog and local target guard

**Status: Ready / owner-commissioned source only.**

Baseline main 182efaf9563307636f993a66fb4e0bd158d14fcb. Integration target main. Profile STANDARD. No predecessor. Own new tools/db-operations workspace, root db:ops script and lockfile. No existing DB runtime edits.

## Outcome
Database operations catalog and local target guard. Selected authority: [database operations](../../../../docs/technical/platform/database-operations.md). [Programme](../../../undertakings/storyteller-workshop/DB-OPERATIONS.md) · [Tasks](TASKS.md).

## Execution
Dedicated change branch and linked worktree; node scripts/repo-tools/change-branch-guard.mjs --change DBOPS03 --target main before edits. Composer Standard, one bounded T-ID at a time. Parent owns changed-file quality/format review, focused tests, archive/ledger/STATUS reconciliation and squash join. DBOPS03 parent coordinates shared joins until its join, then sole remaining agreed custodian; coordinate other active parents, no unsynchronized shared document or lockfile writes. No live DB, Docker, Kubernetes, providers, protected resources or destructive Git. No global queue change.

## planned-impact.v1
| Plane | Disposition |
|---|---|
| Product | No domain behavior or authority changes |
| Source | Operational tooling, separate from app runtime |
| Data | No live mutation commissioned; existing migration history preserved |
| Proof | Source tests, positive and negative; live NOT RUN |
| Security | Local accidental-target protection, not authenticated enterprise governance |

## Acceptance
Selected source tests pass, actual negative receipt, build/typecheck where applicable, module graph and migration-byte preservation. Stop on precise contract contradiction; no broader redesign. No live/outcome credit. Parent reconciles documentation at closure.
