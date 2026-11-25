# CACHE11 | Redis envelope and bounded command executor

**Status: Ready (dependency-gated) / owner-commissioned source only.**

Baseline main 9c2c29513a94e1ff6d1ad6a24f9baf939cfc33a6. Integration target main. Profile STANDARD. After CACHE09 source joined. Own Redis-specific modules and cache-adapter.ts; CACHE10 independent.

## Outcome
Readable and navigable code without changing cache authority, public contracts, wire format, limits or runtime guarantees (CQ06 adds advisory diagnostics only). See [source map and wave](../../../undertakings/storyteller-workshop/CACHE-CRAFT.md) and [TASKS](TASKS.md).

## Execution
Dedicated change branch and linked worktree; before edits run node scripts/repo-tools/change-branch-guard.mjs --change CACHE11 --target main. Composer Standard, one bounded T-ID at a time. Parent owns closure, focused proof, changed-file Prettier/quality lint, typecheck, archive/ledger/STATUS reconciliation and squash join under current repository rules. CACHE09 parent coordinates shared joins while active, then remaining parents agree a single custodian before touching shared records; coordinate active INF60/VER parents. No live resources, provider calls, destructive Git or unrelated work. No global queue change.

## planned-impact.v1
| Plane | Disposition |
|---|---|
| Product/authority | Unchanged |
| Source | Exclusive paths in TASKS |
| Public contracts | Unchanged |
| Proof | Source tests, positive and negative; live NOT RUN |
| Documentation | Local README/canonical quality rule as applicable |

## Acceptance
All selected focused tests pass; retain existing behavioral claims and cache failure safeguards. Review diff for readable phase ownership and no new hidden coupling. Stop on exact contract contradiction, not ordinary dependency order. No live or outcome credit from source tests. Record actual SHA, test commands/counts and negative proof at closure.
