# K8S08 | Deploy isolated service skeletons and safe event contracts before real code extraction

**State:** Done (2026-11-19)  
**Kind:** implementation  
**Execution selection:** Owner authorized this Change in worktree `offscreen-rpg-k8s08` on branch `change/k8s08-service-skeletons`. Do not start another Change.  
**Program:** [Distributed architecture lab queue](../../../../README.md)

## Outcome

Deploy four synthetic placeholder workloads on the disposable kind cluster: web/API, the engine, the Storyteller, and notifications. One synthetic operation id is delivered once. A duplicate delivery of that same id does not record a second effect. An older scene's synthetic item holder does not change when a later scene transfers the item. That older-scene check is a contract assertion. It is not a historical fork.

These processes do not run the game, call a model, take a payment, or write the game database. There is no Game Economy container, no Cognee process, no WebSocket server, and no Next or Nest image. Every Service is ClusterIP. The API server stays on loopback. A ready pod is not a game service.

## Authority and prerequisites

- **Prerequisites:** ARCH02 is merged. The rows are web/API, the engine, the Storyteller, and notifications. The engine is the only checkpoint writer. The Storyteller proposes and does not commit. ARCH04 is merged: pages go to Next and `/api`, including the story stream, goes to Nest. These skeletons are not that deployment and not a second BFF. [ARCH05](../2026-11-19--arch05-storyteller-harness-and-context-packs/CHANGE.md) is the merged task-pack contract. These skeletons stay transport-only and do not hardwire a model process. K8S03 and K8S07 are merged. This Change does not install RabbitMQ or the collector again.
- **Baseline:** `24f0af40021ef030694a6fd2054c6854f48bbc15` on `change/k8s08-service-skeletons`.
- **Current implementation:** the modular monolith and Compose remain the application. This Change does not deploy them.
- **Authoritative owners left in place:** `docs/technical/platform/topology.md`, `docs/technical/platform/deployment-and-compatibility.md`, `docs/technical/platform/data-and-persistence.md`, `docs/technical/platform/execution-and-delivery.md`, `docs/technical/storyteller/`, `docs/technical/README.md`, `docs/runbooks/README.md`, `STATUS.md`, `ROADMAP.md`, `work/changes/README.md`, and `work/changes/ledger/2026-11.md`. Other work in this batch owns those pages. This Change must not edit them.
- **Lab contract owner for this Change:** `docs/runbooks/kubernetes-skeletons.md`.
- **Code owner:** `infra/kubernetes/lab/skeletons/`.
- **Risk permission:** no provider spend, no Docker volume deletion, no LAN publish, no deletion of a cluster this shell did not create.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Intended result | Proof |
| --- | --- | --- |
| Product | unchanged: player-facing rules stay on `docs/product/foundations/vision.md#scene-history-and-alternate-continuities` and this lab adds no player promise | Inspect the vision page and do not edit it |
| Technical | unchanged: selected topology, deployment, data, and execution headings stay written as they are. The placeholders are not copied onto those pages | `docs/technical/platform/topology.md#proposed-service-ownership` still names four rows and rejects a Game Economy service |
| Code | changed: `infra/kubernetes/lab/skeletons/install.sh` installs four synthetic placeholders. Negative: a duplicate operation id must not apply the effect twice, and a ready pod is not a game service | Disposable kind smoke |
| Related | changed: CREATE `docs/runbooks/kubernetes-skeletons.md#older-scene-assertion` records the synthetic delivery and the contract assertion | Runbook plus smoke |

## Document shape | shape-ops.v1

| Operation | Path | Heading migration | Conservation |
| --- | --- | --- | --- |
| CREATE | `docs/runbooks/kubernetes-skeletons.md` | new runbook, no heading moved | The four placeholders, the single operation id, the duplicate-delivery limit, and the older-scene contract assertion live on this new page. Selected topology pages stay as written. Historical forks are not implemented. |
| NO-OP | `docs/technical/platform/topology.md` | unchanged | The four service rows and the rejected Game Economy service stay on that page. |
| NO-OP | `docs/technical/platform/deployment-and-compatibility.md` | unchanged | The hosted deployment and the lab extension stay as written. |
| NO-OP | `docs/technical/platform/execution-and-delivery.md` | unchanged | Command delivery stays the application contract. |
| NO-OP | `docs/technical/platform/data-and-persistence.md` | unchanged | The scene checkpoint contract stays on that page. This skeleton does not write it. |
| NO-OP | `docs/runbooks/README.md` | unchanged | The runbook index is owned by another Change. |
| NO-OP | `STATUS.md` | unchanged | Status stays with the orchestrator. |
| NO-OP | `ROADMAP.md` | unchanged | The roadmap stays with the orchestrator. |
| NO-OP | `work/changes/README.md` | unchanged | The queue index is owned by the orchestrator. |
| NO-OP | `work/changes/ledger/2026-11.md` | unchanged | The queue ledger is owned by the orchestrator. |

## Implementation notes

The shared scripts `infra/kubernetes/lab/up.sh`, `infra/kubernetes/lab/down.sh`, and `infra/kubernetes/lab/lib.sh` are not edited. `infra/kubernetes/lab/kind.yaml` and `infra/kubernetes/lab/namespaces.yaml` are not edited. RabbitMQ, object storage, Temporal, and the collector manifests are not edited. No file under `packages/` or `apps/` is edited.

Files:

- `infra/kubernetes/lab/skeletons/namespace.yaml`
- `infra/kubernetes/lab/skeletons/workloads.yaml`
- `infra/kubernetes/lab/skeletons/placeholder.py`
- `infra/kubernetes/lab/skeletons/install.sh`
- `infra/kubernetes/lab/skeletons/smoke.sh`
- `docs/runbooks/kubernetes-skeletons.md`

The image is `python:3.12-alpine` at digest `sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89`. Each placeholder is limited to 64Mi and 100m CPU. The node pulls the image. `kind load docker-image` is not used.

Web/API returns HTTP 202 with `committed` false. The engine records one in-memory effect for the operation id. The Storyteller rejects `POST /commit`. Notifications keep `effectCount` at 0. `scene-older` stays on `holder-early` after `scene-later` moves `sword-a` to `holder-late`.

## Acceptance

- **Positive:** four placeholder pods ready, and one synthetic operation id recorded once by the engine.
- **Negative:** the duplicate delivery does not record a second effect. The Storyteller does not commit. An older scene holder does not change. That limit is a contract assertion, not a historical fork. No Game Economy, Cognee, WebSocket, Next, or Nest workload is present. Public ingress stays disabled.
- **Evidence:** the locked shell created the cluster, the smoke passed, and `down.sh` deleted the cluster. No provider call was made.

## Evidence

Commands that ran on 2026-11-19, in order:

- `python3 -m py_compile` and `bash -n` accepted the placeholder and the two scripts. A local four-process check on `127.0.0.1` then applied one operation id once. That process check is not the kind proof.
- `pnpm wiki:change-guard --mode plan --change work/changes/open/2026-11-19--k8s08-service-skeleton-and-event-contracts` reported `plan ok` and no findings.
- One locked shell found no `offscreen-lab` cluster, then ran `infra/kubernetes/lab/up.sh`, `infra/kubernetes/lab/skeletons/install.sh`, `infra/kubernetes/lab/skeletons/smoke.sh`, and `infra/kubernetes/lab/down.sh`. The smoke passed. `down.sh` deleted that cluster.
- No paid provider call was made.

Versions and results are in [Kubernetes service skeletons](../../../../../../docs/runbooks/kubernetes-skeletons.md). The operation id was `lab-op-63a4dfc2e42eb470`. The duplicate was seen and the effect count stayed 1. `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` were present after the delete. `kind get clusters` then listed none.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Scene history on docs/product/foundations/vision.md#scene-history-and-alternate-continuities | product | unchanged: this lab adds no player promise and does not implement a historical fork | docs/product/foundations/vision.md at 24f0af40021ef030694a6fd2054c6854f48bbc15 | source-observed | A contract assertion about a synthetic holder is not a fork a player can start, and the vision page was not edited | No product link was added |
| Service rows on docs/technical/platform/topology.md#proposed-service-ownership | technical | unchanged: the four rows and the rejected Game Economy service stay as written. These pods do not extract them | docs/technical/platform/topology.md at 24f0af40021ef030694a6fd2054c6854f48bbc15 | source-observed | A ready placeholder is not a deployed game service, and no Game Economy workload is installed | The new runbook links to the heading. The topology page was not edited |
| Lab extension on docs/technical/platform/deployment-and-compatibility.md#kubernetes-as-a-deliberate-extension | technical | unchanged: this skeleton is not the hosted deployment and that section was left as written | docs/technical/platform/deployment-and-compatibility.md at 24f0af40021ef030694a6fd2054c6854f48bbc15 | source-observed | No Next or Nest image is deployed, and public ingress stays disabled | The new runbook links to the heading. That page was not edited |
| Scene checkpoint on docs/technical/platform/data-and-persistence.md#scene-checkpoint-v1 | technical | unchanged: the engine remains the only checkpoint writer in the selected contract, and this placeholder does not write that record | docs/technical/platform/data-and-persistence.md at 24f0af40021ef030694a6fd2054c6854f48bbc15 | source-observed | The synthetic effect is in memory, the game database is not opened, and the Storyteller cannot commit | Page not edited |
| Command delivery on docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery | technical | unchanged: the placeholders do not replace the outbox or admit a player command | docs/technical/platform/execution-and-delivery.md at 24f0af40021ef030694a6fd2054c6854f48bbc15 | source-observed | HTTP 202 from the placeholder edge is not a commit | Page not edited |
| Older-scene assertion on docs/runbooks/kubernetes-skeletons.md#older-scene-assertion | technical | changed: the procedure records that an older synthetic holder does not follow a later transfer, and that this is not a historical fork | docs/runbooks/kubernetes-skeletons.md inspected in the worktree on baseline 24f0af40021ef030694a6fd2054c6854f48bbc15 | fixture-tested | The smoke kept scene-older on holder-early after the later transfer, and the log said historical forks are not implemented | docs/runbooks/README.md was not edited. Another Change owns that index |
| Synthetic delivery in infra/kubernetes/lab/skeletons/smoke.sh | code | changed: the smoke requires four ready pods, one operation id, and a duplicate that leaves the effect count at 1 | infra/kubernetes/lab/skeletons/smoke.sh and infra/kubernetes/lab/skeletons/placeholder.py inspected in the worktree on baseline 24f0af40021ef030694a6fd2054c6854f48bbc15 | fixture-tested | Operation lab-op-63a4dfc2e42eb470 was delivered once, the second attempt was seen, and the effect count stayed 1. The Storyteller commit was rejected | No application README was added |

## Handoff and next action

- The smoke passed and the cluster was deleted. Do not select the next Change.
- `work/changes/README.md` and `work/changes/ledger/2026-11.md` were not edited. Other Changes own them. The queue index still points at the open packet path until the owner of that index updates it.
- Baseline inspected: `24f0af40021ef030694a6fd2054c6854f48bbc15` on `change/k8s08-service-skeletons`.
