# Developer observability | operational source inspection, 2026-11-27

**Scope:** read-only targeted inspection of operational upgrade, connect, inventory, readiness and custody seams; not a full independent amendment defense or certification. Main `a99aebb31b27f3bf7008714c83f7f1b1d7d47ed2`. Initial integrated candidate [`7a4ede6da9d2716ecede7beb98cba3eae62fd199`](https://github.com/DenisSkulovic/offscreen-rpg/tree/7a4ede6da9d2716ecede7beb98cba3eae62fd199); first repair [`5134b9aa28a43e1cb93687bc897f2dc8a5b7be8c`](https://github.com/DenisSkulovic/offscreen-rpg/tree/5134b9aa28a43e1cb93687bc897f2dc8a5b7be8c). Original candidate contracts OBS-D05/D06 and Design ACCEPTANCE remain binding. Observations below do not ratify amendments or waive pending proof.

## Initial findings and first repair

At `7a4ede6d`, `infra/platform/observability/upgrade.mjs` lacked the production command runner for `readMemory`, used placeholder inventory collection, called `openForwards` with `ports` instead of `bindings`, and compared only Grafana Secret UID rather than full preservation. `connect.mjs` lacked direct executable invocation, real inventory/default transport/credential composition and foreground supervision. These were High findings for the respective operational routes; injected fixture success could not establish real CLI behavior.

First repair at `5134b9aa` supplied real memory/inventory defaults, the actual bindings argument, expanded preservation, owned-pending checks and a foreground CLI. Agent reported 109/109 offline tests; no native operation. Inspection of actual repaired source and owner inventory disclosed remaining defects rather than establishing full closure.

## Remaining findings at `5134b9aa`

Paths relative to `infra/platform/observability/`. The owner dispatched a narrow second repair; its completion has not been verified at collection.

| Severity / scope | Source anchor and concrete concern | Required correction / evidence |
| --- | --- | --- |
| High, dev upgrade admission | `upgrade.mjs::projectUpgradePreservation` uses `Pod/${workloadName}-0` for all backends. Actual Deployment Pods use generated names | Resolve active ready Pod through exact workload ownership (Deployment/ReplicaSet/Pod or StatefulSet/Pod); reject missing/ambiguous ownership and compare preservation. Exercise actual-shaped names in fixtures |
| High, post-upgrade classification | `readiness.mjs::verifyHelmStorageBijection` expects only current revision storage; `upgrade.mjs::upgradeHistoryPreserved` makes retained rev1 UID optional | Admit exact rev1 superseded + rev2 deployed Collector history/storage in upgraded dev shape only. Require rev1 original UID and distinct rev2 UID; reject unrelated history/objects. Do not delete old Helm storage to make status green |
| High, bounded upgrade observation | `upgrade.mjs::collectObserved` caps subsequent inventory deadlines at operation start +120s, including after Helm; final identity check precedes transport rather than confirmed closure | Fresh bounded inventory phase within overall accepted deadline; final full identity recheck after forwarding closure and before compare-and-clear. Preserve pending on uncertainty |
| High, foreground connection | `connect.mjs::checkSession` uses `deadline: now + PREFLIGHT_BUDGET_MS` instead of invoking the clock. Exit paths omit some owned forward/snapshot cleanup, including credential-read failure | Correct clock invocation and close owned children, snapshot and custody on every path; failed cleanup nonzero. Exercise failures in offline tests |

The actual starting inventory is in [the run receipt](../runs/2026-11-27-observability-developer.md). It includes the old Collector revision-1 storage UID and real Deployment Pod names that exposed the fixture mismatch. The current known preservation defects block occupied dev upgrade, not a claim that the existing cluster is unhealthy. Fresh release installation is a separate route with its own safety, feasibility and authorization requirements. No commands bypassing the platform admission/custody path were selected.

## Disposition and durable owners

No full candidate PASS. Complete the bounded source corrections, retain failed proof and review affected paths at the corrected SHA; verify old-version exclusion, remaining amended safety/feasibility gates and live-operation authority before executing. The permanent [technical owner](../../docs/technical/platform/observability-native-infrastructure.md) and [operational runbook](../../docs/runbooks/kubernetes-observability.md) must retain still-relevant limitations at qualification/retirement. Preserve OBS-D01–D03 receipts and reconcile their archive status; the initial integrated group recorded 11 source joins but these three packets remained open. Do not manufacture a new design or reopen the accepted architecture for the listed ordinary implementation defects.
