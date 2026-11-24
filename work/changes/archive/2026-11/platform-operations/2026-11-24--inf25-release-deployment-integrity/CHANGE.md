# INF25 | Release migration and deployment integrity

**State: Done**

**Status: Done (source, 2026-11-24). Kind: implementation. Profile: CONTRACT.** Integrated on `undertaking/storyteller-workshop` after INF27. Dependency: INF18 Done; T03 after INF27 Done. Source-only. Live cluster NOT-RUN.

Owner: release installer and stack orchestration.

[Program](../../../../../undertakings/storyteller-workshop/INF-MEDIUM.md) · [TASKS](TASKS.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md).

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative proof | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Application workloads | docs/technical/platform/deployment-and-compatibility.md#application-workloads-inf08-selected | changed: release install fences projected Secrets and rolls a role only when the verified image config id changes; migration Job replacement is digest-gated | infra/environments/release/{credentials,migration,rollout}.mjs and install.sh | source-observed | credential conflict, URI drift, denied read, running/failed/foreign Job, mismatched pod imageID refuse with no mutation; web-only apply omits the API Deployment | N/A |
| Product behavior | docs/product | unchanged because no player-facing behavior was selected | no product source changed | source-observed | live install remains outside this Change | N/A |

Parent executed T01–T03, then archived. No successor auto-start.
