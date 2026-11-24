# INF26 | Canonical platform observations

**State: Done**

**Status: Done (source, 2026-11-24). Kind: implementation. Profile: CONTRACT.** Dependency: INF20 Done. Source-only. Live cluster NOT-RUN.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative proof | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Platform service readiness | infra/platform postgres, object-storage, and temporal readiness modules | changed: one read-only observation per service, composed by the shared dev core | infra/platform/{postgres,object-storage,temporal}/readiness.mjs and tools/dev-environments/src/application/dev-shared-core-readiness.mjs | source-observed | unreadable or foreign CNPG primary, nonzero kubectl with JSON stdout, failed Temporal schema Job, and partial legacy SQL refuse before writes | N/A |
| Application pod readiness | docs/technical/platform/developer-environments.md | unchanged because that heading still requires pod runtime identity, and this Change does not alter it | no edit to that document | source-inspected | live cluster remains outside this Change | N/A |
| Product behavior | docs/product | unchanged because no player-facing behavior was selected | no product source changed | source-observed | live cluster remains outside this Change | N/A |

Owner: service readiness and shared dev core.

[Program](../../../../../undertakings/storyteller-workshop/INF-MEDIUM.md) · [TASKS](TASKS.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md).

Parent executes whole Change, integrates and archives after source acceptance; no live authorization.
