# INF05 | Platform and verification separation

**Status: Done (2026-11-24). Kind: implementation. Profile: CONTRACT.** Baseline b01a68b4e91fbbb68f4e67c91427db7435e44738; integrated on undertaking/storyteller-workshop from change/inf05-platform-and-verification-separation. Live cluster NOT-RUN. `fixture-pins.test.mjs` NOT-RUN because `packages/documents/dist/schema.js` is absent. No successor in this batch.

[Selected atlas](../../../../../../infra/README.md) · [Exact execution contract](../../../../../undertakings/storyteller-workshop/INF-PARALLEL.md) · [Move map](../../../../../undertakings/storyteller-workshop/INF-MOVE-MAP.json) · [TASKS](TASKS.md)

## Outcome and acceptance

Relocate exactly the 118 baseline files assigned to INF05, update mechanical callers, preserve behavior and integrate source proof. Preserve runtime context names, resource IDs, existing tenant data, CLI semantics and build/receipt safety. No new lab catch-all path, no blind runtime name substitution, no Helm/GitOps/HA redesign. Run focused tests in TASKS; live proof separately NOT-RUN. Only actual semantic/ownership/safety contradiction blocks. Separate worktree and Change branch; pre-edit guard node scripts/repo-tools/change-branch-guard.mjs --change INF05 --target undertaking/storyteller-workshop. One child at a time. Parent integrates and retires, user starts successor.

## Reconciliation

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Platform services and verification source live at the selected paths | changed: `infra/platform/*`, `infra/verification/*`, `infra/environments/release/content-bootstrap` | this integration SHA | source-inspected; 118/118 destinations tracked; `infra/kubernetes/lab` empty | `bash -n` of removed `infra/kubernetes/lab/cnpg/install.sh` ENOENT; volume-guard disappearing-volume case PASS | `infra/README.md` already named this layout |
| Runtime identities | unchanged because namespaces, secrets, database names, image tags and `kind-offscreen-lab` were not renamed | same | source-inspected | live cluster NOT-RUN | N/A |
| Product behavior | unchanged because this is a source path relocation | no product page edited | source-inspected | N/A | N/A |

Current navigation updated in architecture ownership/runtime pages and `docs/technical/platform/deployment-and-compatibility.md`. Historical packets and dated runbook observations keep old paths. `pnpm repo:docs-health` still fails on pre-existing knowledge-health links outside this move.
