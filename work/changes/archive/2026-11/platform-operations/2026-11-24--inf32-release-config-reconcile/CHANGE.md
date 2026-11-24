# INF32 | Release configuration reconciliation

**Status: Done (2026-11-24). Kind: implementation. Profile: RELEASE.** Integrated on undertaking/storyteller-workshop from change/inf32-release-config-reconcile. Baseline 54f9261d; worktree start 001a2594. Dependency INF31 Done. Source-only. Live cluster NOT-RUN.

## Reconciliation ledger

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Selected apply | changed: digest match no longer omits a selected Deployment; selected Deployments carry the verified config digest and selected Services stay included | `infra/environments/release/rollout.mjs` | `node --test infra/environments/release/test/rollout.test.mjs` 16/16 | same digest with replica or env drift is still applied; web-only excludes API | N/A |
| Rollout replicas | changed: after rollout, observed generation, ready and updated replicas, owning ReplicaSet, and nonterminating main-container image ids are checked | `infra/environments/release/rollout.mjs` | same 16/16 run | wrong image, old ReplicaSet, foreign pod, and missing status refuse; chart minimum replicas is 1 so zero-replica success is not modeled | N/A |
| Product behavior | unchanged | no product page edited | source-inspected | N/A | N/A |

Owner: Release configuration reconciliation. [Program](../../../../../undertakings/storyteller-workshop/INF-MEDIUM.md) · [Tasks](TASKS.md) · [Execution](EXECUTION.md) · [Source map](SOURCE-MAP.md) · [Proof](PROOF.md).

Target undertaking/storyteller-workshop, reviewed snapshot 54f9261d699097835e6c97ad55612a02ae49e59c, owner commissioned 2026-11-24. Source-only, no live cluster/Docker/Tilt/registry mutation or tenant deletion. Personal dev platform: optimize daily flow, not enterprise adversarial security. Preserve existing data/credential/foreign-slot protections. No new frameworks, profile features or auto-retry. One linked Change worktree, branch guard node scripts/repo-tools/change-branch-guard.mjs --change ID --target undertaking/storyteller-workshop; parent Composer coordinates one bounded task at a time, shared docs/catalog joined by human custodian. Mechanical successor reconciliation permitted; material source contradiction stop. Focused tests from repo root, changed-file quality and docs health, receipt actual counts; no live acceptance credit.

Dispatch T01 after dependency receipt. Archive only after focused proofs and reconciliation. No successor auto-start.
