# VER06 | Owned Redis resource and CACHE07 harness migration

**Status: Ready (dependency-gated) / owner-commissioned source implementation. Kind: implementation. Profile: PROOF.** Baseline 816b9e6e447041e119b2208cca7d62a66827de0c; target main. VER01 joined. Reuse VER02 Docker ownership primitives when joined; if VER02 not joined, dependency-gated until it is. No overlapping CACHE08 source writes.

[Cache architecture](../../../../docs/technical/platform/persistence-and-caching.md) · [Verification contract](../../../../docs/technical/platform/verification-programmes.md) · [TASKS](TASKS.md).

Separate linked Change worktree from current main; branch guard --change VER06 --target main. One bounded Composer child at a time, parent serializes shared manifest/lockfile/catalog joins. Source implementation and focused tests commissioned; live resources only explicit operator --live through common runner. No shared Redis/SQL, production, provider, tenant, or deployment mutation. Preserve public API/domain authority and existing work. Record exact SHA, paths, command/cwd, positive/negative tests and tier. Source join does not confer live acceptance. Actual safety or semantic contradiction returns to planner with exact evidence; missing live permission not source blocker. No unselected successor.

## planned-impact.v1
| Plane | Disposition |
| --- | --- |
| Product | No gameplay/auth/spend change |
| Technical | Selected cache and verification guarantees |
| Source | TASKS named owners only |
| Proof | Source/fixture/live separated; no fabricated PASS |
| Related | Canonical docs, capability catalogue and receipts |

## Reconciliation ledger
| Claim | Authority | Source SHA | Evidence | Negative |
| --- | --- | --- | --- | --- |
| Owned Redis resource and CACHE07 harness migration | persistence-and-caching / verification-programmes | pending | NOT-RUN | TASKS |
