# INF03 | Cluster, workload and environment layout

**Status: Done (2026-11-24). Kind: implementation. Profile: CONTRACT.** Baseline b01a68b4e91fbbb68f4e67c91427db7435e44738; integrated on undertaking/storyteller-workshop from change/inf03-application-workload-layout. Live cluster NOT-RUN. User starts INF04.

[Selected atlas](../../../../../../infra/README.md) · [Exact execution contract](../../../../../../work/undertakings/storyteller-workshop/INF-PARALLEL.md) · [Move map](../../../../../../work/undertakings/storyteller-workshop/INF-MOVE-MAP.json) · [TASKS](TASKS.md)

## Outcome and acceptance

Relocate exactly the 19 baseline files assigned to INF03, update mechanical callers, preserve behavior and integrate source proof. Preserve runtime context names, resource IDs, existing tenant data, CLI semantics and build/receipt safety. No new lab catch-all path, no blind runtime name substitution, no Helm/GitOps/HA redesign. Run focused tests in TASKS; live proof separately NOT-RUN. Only actual semantic/ownership/safety contradiction blocks. Separate worktree and Change branch; pre-edit guard node scripts/repo-tools/change-branch-guard.mjs --change INF03 --target undertaking/storyteller-workshop. One child at a time. Parent integrates and retires, user starts successor.

## Reconciliation

| Claim | Target | Result | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Cluster, workload, and environment layout | 19 INF03 files at the move-map destinations | changed | infra/clusters/kind, infra/workloads, infra/environments | bash -n PASS; volume-guard 5/5; stack-lifecycle 9/9; T02 node --test 48/48 | install.sh not executed; live cluster NOT-RUN; context names still kind-offscreen-lab | INF-MOVE-MAP.json unchanged as the historical from→to map |
| Product behavior | no new player behavior | unchanged because relocation and path references only | moved YAML byte-identical aside from path strings | source-inspected | secrets and migration Job behavior not edited | N/A |
| Operator paths | current runbooks and the stack command paragraph name the new files | changed | docs/runbooks; docs/technical/platform/deployment-and-compatibility.md | source-inspected path strings | dated receipts now use the new paths so a copy-paste does not call a removed file | N/A |

Pre-existing failures left unfixed: `dev-tiltfile-api-authority.test.mjs` k8s_resource marker whitespace; `dev-tiltfile-workers.test.mjs` missing `--env-file-if-exists`. Primary checkout still has an uncommitted pipefail edit on the old install.sh path; it was not absorbed.
