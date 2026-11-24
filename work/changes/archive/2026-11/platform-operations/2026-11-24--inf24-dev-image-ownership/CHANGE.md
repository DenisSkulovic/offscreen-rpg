# INF24 | Image identity and compatibility retirement

**Status: Done (2026-11-24). Kind: implementation. Profile: CONTRACT.** Baseline a0f299407467baba7fc339fafe398e18df45996b; integrated on undertaking/storyteller-workshop from change/inf24-dev-image-ownership. Dependencies INF22 and INF26 Done. Source-only. Live cluster, Tilt, and Docker NOT-RUN.

## Reconciliation ledger

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Image plan owner | changed: fingerprint and alias planning lives under the image factory | `infra/images/development/image-plan.mjs` | development image and sync-plan tests 43 pass | release-only path returns no rebuild images | developer-environments image fingerprint row |
| Build-critical sync | changed: Dockerfile, runtime helper, and lockfile select every runtime image | `infra/images/development/sync-plan.mjs` | same 43-test join | release-only script stays mode none | N/A |
| Bootstrap shims | changed: callers import cluster, postgres, object storage, and Temporal owners directly | `infra/clusters/kind/manager`, `infra/platform/{postgres,object-storage,temporal}` | focused bootstrap, tenant, graph, and platform-plan tests 98 pass | active import scan of the eight retired shim paths is zero | INF-MOVE-MAP INF24 rows |
| Product behavior | unchanged because this is developer infrastructure | no product page edited | source-inspected | N/A | N/A |

Owner: image plan owner and bootstrap wrappers.

[Program](../../../../../undertakings/storyteller-workshop/INF-MEDIUM.md) · [TASKS](TASKS.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md).

Parent executes whole Change, integrates and archives after source acceptance; no live authorization.
