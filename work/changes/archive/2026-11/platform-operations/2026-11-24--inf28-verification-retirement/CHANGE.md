# INF28 | Retire legacy fixture authorities

**Status: Done (2026-11-24). Kind: implementation. Profile: CONTRACT.** Baseline a0f299407467baba7fc339fafe398e18df45996b; integrated on undertaking/storyteller-workshop from change/inf28-verification-retirement. Dependencies INF24 and INF26 Done. Source-only. Live cluster NOT-RUN.

## Reconciliation ledger

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Duplicate SeaweedFS manifest | changed: document-access uses the release object-storage installer; `store.yaml` is gone | `infra/verification/fixtures/document-access/smoke.sh`, `infra/platform/object-storage/install.sh` | bootstrap-split 18/18, volume-guard 7/7, object-storage platform tests 14/14 | smoke does not apply `store.yaml` or `create secret generic object-store-s3` | INF15 successor row now empty for the retired path |
| Trial modules | changed: four tenant trials and SQL negative stubs live under verification | `infra/verification/dev-environments/` | trial-retirement, toy-breaker, and SQL executor tests 22/22 | runtime adapters no longer contain those trial paths; runtime does not import verification | N/A |
| Held safety gates | unchanged because `dev-object-store-s3-proof` and cutover preflight were not selected for deletion | those modules left in place | source-inspected | N/A | N/A |
| Product behavior | unchanged because this is developer infrastructure | no product page edited | source-inspected | live cluster remains outside this Change | N/A |

Owner: document-access storage fixture and trial boundaries.

[Program](../../../../../undertakings/storyteller-workshop/INF-MEDIUM.md) · [TASKS](TASKS.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md).
