# INF04 | Image build and Tilt ownership

**Status: Done (2026-11-24). Kind: implementation. Profile: CONTRACT.** Baseline b01a68b4e91fbbb68f4e67c91427db7435e44738; integrated on undertaking/storyteller-workshop from change/inf04-image-and-tilt-ownership. Live cluster and Docker build NOT-RUN. User starts INF05.

[Selected atlas](../../../../infra/README.md) · [Exact execution contract](../../../undertakings/storyteller-workshop/INF-PARALLEL.md) · [Move map](../../../undertakings/storyteller-workshop/INF-MOVE-MAP.json) · [TASKS](TASKS.md)

## Outcome and acceptance

Relocate exactly the 44 baseline files assigned to INF04, update mechanical callers, preserve behavior and integrate source proof. Preserve runtime context names, resource IDs, existing tenant data, CLI semantics and build/receipt safety. No new lab catch-all path, no blind runtime name substitution, no Helm/GitOps/HA redesign. Run focused tests in TASKS; live proof separately NOT-RUN. Only actual semantic/ownership/safety contradiction blocks. Separate worktree and Change branch; pre-edit guard node scripts/repo-tools/change-branch-guard.mjs --change INF04 --target undertaking/storyteller-workshop. One child at a time. Parent integrates and retires, user starts successor.

## Reconciliation

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Image recipes and Tilt graph live at the selected paths | changed: `infra/images/{development,release}`, `infra/dev`, `infra/environments/release/Tiltfile` | this integration SHA | source-inspected; focused node tests | no executable `lab-nest-service-origin` import outside historical work/evidence | `infra/README.md` already named this layout |
| Runtime identities and Tilt as sole image writer | unchanged because no cluster rename or second image writer was introduced | same | source-inspected | live Tilt/Docker NOT-RUN | N/A |
| Product behavior | unchanged because this is a source path relocation | no product page edited | source-inspected | N/A | N/A |

Current navigation updated in developer-environments, deployment-and-compatibility, topology, selected-architecture, and the dev/local/kubernetes runbooks. Historical packets keep dated paths.
