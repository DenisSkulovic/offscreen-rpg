# INF22 | Safe slot Secret projection

**Status: Done (2026-11-24). Kind: implementation. Profile: CONTRACT.** Baseline a0f299407467baba7fc339fafe398e18df45996b; integrated on undertaking/storyteller-workshop from change/inf22-dev-secret-projection. Dependency: INF21 Done. Source-only. Live cluster, Tilt, and Docker NOT-RUN.

## Reconciliation ledger

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Projected Secret reads | changed: present, absent, and unreadable stay distinct; UID and owner labels are mandatory | `tools/dev-environments/src/rendering/dev-slot-project.mjs` | dev-slot-project and startup tests 35 pass | denied read, malformed response, foreign namespace, and foreign Secret write nothing | developer-environments projected slot Secrets paragraph |
| Create-only projection | changed: secrets are created with kubectl create; a conflict is kept only when contents match | same projection module | same 35-test join | drift, partial key, and create race with different contents refuse; field names only | developer-environments projected slot Secrets paragraph |
| No implicit allocation | changed: projection requires a selected owner and INF21 schema proof | `dev-slot-project.mjs`, `dev-slot-startup.mjs` | same 35-test join | missing owner and bad schema proof issue zero kubectl calls | developer-environments projected slot Secrets paragraph |
| Product behavior | unchanged because this is developer infrastructure | no product page edited | source-inspected | N/A | N/A |

Owner: slot projection, exact Secret reads and create-only.

[Program](../../../../../undertakings/storyteller-workshop/INF-MEDIUM.md) · [TASKS](TASKS.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md).

Parent executes whole Change, integrates and archives after source acceptance; no live authorization.
