# K8S01 | Reproducible kind laboratory with isolated namespaces and infrastructure smoke tests

**State:** Done (2026-11-19)  
**Kind:** implementation  
**Approval and owner:** User endorsed Kubernetes + an eventual separately scalable, event-driven service architecture as an educational target. Cursor owns implementation **only when this specific Change is selected**; no blanket deployment authorization.  
**Parent:** [Distributed architecture lab queue](../../../../README.md)

## Cursor first-screen brief

> **Current-source map:** [Topological authority](../../../../../../docs/technical/platform/topology.md), [deployment contract](../../../../../../docs/technical/platform/deployment-and-compatibility.md), [documentation Change standard](../../../../../../.agents/references/change-work-unit-standard.md), inspected at `a00a5beb6b49`. Reinspect current HEAD and new changes before editing.
>
> **Primary governing contract:** The current implementation is a modular monolith with Temporal worker(s); the proposed distributed target is a deliberate educational evolution, not a description of working code. ARCH01 must first reconcile the canonical target.
>
> **Known trap:** A clean destroy/recreate cannot delete Docker Desktop volumes or another kubectl context; no traffic exposed to LAN; 12GB WSL cap remains usable.
>
> **Scope/permission:** Infrastructure-only, on a local disposable lab after scope selection. No product code, payment calls or provider spend.

## Target alignment

- **Outcome:** A repeatable, disposable kind cluster on Windows tower WSL2 with one control plane and initially one worker; optional second worker only after measured memory headroom. Recreate without touching old data.
- **Current-source baseline:** `a00a5beb6b49` from GitHub on 2026-11-19 and repo source owners above; tools/versions and actual machine state require reinspection.
- **End-state relationship:** This is one independently reviewable slice of an explicitly staged distributed architecture laboratory; not a full service extraction.
- **Alternative considered:** Keep current Compose/modular monolith. It remains the safe fallback and existing development/test route; educational lab progression justifies an additional environment, not its immediate deletion.
- **Readiness:** ARCH01 is Done. Preflight on 2026-11-19: Docker 29.9.3, kind v0.33.0, kubectl v1.37.2, no existing kubectl context, MemAvailable 9915544 KiB, MemTotal 12249872 KiB. The owner told Cursor to execute this queue one Change at a time.

## Outcome and motivation

A repeatable, disposable kind cluster on Windows tower WSL2 with one control plane and initially one worker; optional second worker only after measured memory headroom. Recreate without touching old data.

## Authority and baseline

- **Product:** [Vision](../../../../../../docs/product/foundations/vision.md) and existing product invariants unchanged. No new player mechanics or feature promises.
- **Technical:** [Current topology](../../../../../../docs/technical/platform/topology.md), [delivery](../../../../../../docs/technical/platform/deployment-and-compatibility.md), [data](../../../../../../docs/technical/platform/data-and-persistence.md), [execution](../../../../../../docs/technical/platform/execution-and-delivery.md). Follow the reconciled target from ARCH01 and do not override established game authority contracts.
- **Evidence:** Current repo Compose has PostgreSQL, Redis, Temporal start-dev and Adobe S3Mock; no RabbitMQ or separately deployed game microservices. Machine preflight is provided by the owner in chat and must be rechecked locally.
- **Open decisions:** Capacity, production/high-availability guarantees, versions, secrets and destructive testing policy require local validation. No live provider billing.

## Exact scope and exclusions

- **Implementation/design:** Add `infra/kubernetes/lab/kind.yaml`, `infra/kubernetes/lab/namespaces.yaml`, `infra/kubernetes/lab/local-path-storage.yaml`, `infra/kubernetes/lab/lib.sh`, `infra/kubernetes/lab/up.sh`, `infra/kubernetes/lab/smoke.sh`, `infra/kubernetes/lab/down.sh`, `infra/kubernetes/lab/probes/dns.yaml`, `infra/kubernetes/lab/probes/client.yaml`, `infra/kubernetes/lab/probes/cross-namespace.yaml`, `infra/kubernetes/lab/probes/pvc-writer.yaml`, and `infra/kubernetes/lab/probes/pvc-reader.yaml`. No game manifest and no Helm chart.
- **Documentation (first class):** Create `docs/runbooks/kubernetes-lab.md`. Link it from `docs/runbooks/README.md`, `docs/technical/platform/topology.md#distributed-learning-target`, and `docs/technical/platform/deployment-and-compatibility.md#kubernetes-as-a-deliberate-extension`. Update `STATUS.md` with the observed create, smoke, and delete. Update `work/changes/README.md` and `work/changes/ledger/2026-11.md`.
- **Exclude:** Game mechanics, Storyteller behavior, client rework, production deployment, Kubernetes cloud charges, shared-live data migrations, destructive operations on non-disposable assets.
- **Dependencies:** ARCH01; verified WSL/Docker/Desktop and safe resource budget.

## Acceptance and discriminating negative proof

- **Normal:** Clean cluster creation from source; all system pods Ready; probe DNS/network/PVC and cleanup; re-create test; log memory/disk and kube-context safety.
- **Negative:** A clean destroy/recreate cannot delete Docker Desktop volumes or another kubectl context; no traffic exposed to LAN; 12GB WSL cap remains usable.
- **Validation:** Capture commands/outputs, actual versions and resources; reproducible smoke and teardown tests; before/after authoritative claim inventory; doc link/anchor health and `pnpm wiki:change-guard --mode plan` / `--mode close` when applicable. Never invent green results.
- **Human gate:** Any deleting real volumes, changing machine-wide networking, provider spending, deploying outside local lab or amending product rules must return for approval.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because infrastructure lab adds no new player-facing behavior in `docs/product/foundations/vision.md` | `docs/product/README.md` | Negative: do not treat a service name as promised feature |
| Technical | changed: `docs/technical/platform/topology.md` and `docs/technical/platform/deployment-and-compatibility.md` for target/current/proven distinction; plus specific owner in Docs section above | `docs/technical/README.md`, `docs/technical/platform/execution-and-delivery.md`, `docs/technical/platform/data-and-persistence.md` | Source and safe proof from this packet |
| Code | changed: `infra/kubernetes/lab/kind.yaml` and the lab scripts beside it; negative: no application/business code migrations and no unbounded resource changes | `compose.yaml`, existing lab scripts | Controlled local smoke + failure test |
| Related | changed: `docs/runbooks/README.md`, relevant specific runbook and `work/changes/README.md` as needed; update `STATUS.md` only after source truth changes | Inbound links and source-to-target maps | Diff-backed evidence, link health |

## Handoff and next action

- Selection: owner must explicitly select this packet in `work/changes/README.md`; **Current change: none** remains until then.
- Executor: inspect current source, identify precise ownership, validate budget and guards; implement only this Change; review docs in same diff.
- Stop on any conflict with game authority, unsafe persistence, unsupported software or unverified version.
- After proof, complete ledger below, archive under `work/changes/archive/2026-11/other/`, fix inbound links, then stop. No automatic successor selection.

## Checks actually run

- `infra/kubernetes/lab/up.sh` created `offscreen-lab` with both nodes Ready and every `kube-system` pod Running. The API published `127.0.0.1:6443` only.
- `infra/kubernetes/lab/smoke.sh` passed: DNS for `kubernetes.default.svc.cluster.local` and `probe.lab-b.svc.cluster.local`, body `lab-b-ok`, and `lab-pvc-ok` from a second pod.
- `infra/kubernetes/lab/down.sh` deleted that cluster. `offscreen-rpg_postgres-data`, `offscreen-rpg_temporal-data`, and anonymous volume `4a4eb6ed5b672961f32560c6b1bd2de67acdf2102c4a168371b003aa3917b3ae` remained.
- The same up, smoke, and down sequence passed again after the writer was changed to retry a late volume mount. The first smoke on that recreated cluster failed before the retry existed. The smoke after the retry passed.
- After the final delete, `kubectl config get-contexts` printed no contexts. MemTotal stayed 12249872 kB. MemAvailable was 10067660 kB.
- No model call. No game package was edited. `compose.yaml` was not edited.

exception: ROADMAP.md because ARCH01 edited it in this same uncommitted worktree and K8S01 does not change that strategy page
exception: docs/README.md because ARCH01 added the laboratory question and K8S01 leaves that index page unchanged
exception: docs/decisions/D-0001--modular-engine.md because ARCH01 appended the continuity note and K8S01 does not revise the engine decision
exception: docs/decisions/README.md because ARCH01 indexed that continuity note and K8S01 does not revise the decision index
exception: docs/technical/README.md because ARCH01 added the laboratory route and K8S01 does not revise that technical index
exception: docs/technical/engine/selected-architecture.md because ARCH01 kept event-sourced microservices rejected and K8S01 does not revise the engine page
exception: work/changes/archive/2026-11/other/2026-11-19--arch01-distributed-target-contract/CHANGE.md because that packet is the archived ARCH01 predecessor in this same worktree
exception: work/changes/open/2026-11-19--arch01-distributed-target-contract/CHANGE.md because git still names the pre-move ARCH01 path in the uncommitted diff

## Reconciliation ledger (fill before Done)

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/topology.md#distributed-learning-target | Technical | changed: the kind procedure is the first exercised laboratory slice, and the game remains undeployed on Kubernetes | no source behavior changed in the game; cluster proof is docs/runbooks/kubernetes-lab.md; inspected compose.yaml at 91f45222 | fixture-tested | RabbitMQ, CloudNativePG, a production Temporal cluster, and a game service are still absent. The kind cluster was deleted | Points at docs/runbooks/kubernetes-lab.md |
| docs/technical/platform/deployment-and-compatibility.md#kubernetes-as-a-deliberate-extension | Technical | changed: the hosted-release advice stays, and the local procedure is the runbook rather than a production cluster | no source behavior changed in the game; inspected compose.yaml at 91f45222 | fixture-tested | The kind cluster does not satisfy the hosted release and publishes no workload port on the LAN | Points at docs/runbooks/kubernetes-lab.md |
| docs/technical/platform/deployment-and-compatibility.md#first-hosted-deployment | Technical | unchanged: the hosted release still requires managed PostgreSQL, a Temporal choice, and a demonstrated restore. This packet did not rewrite that requirement | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | A deleted kind cluster is not a demonstrated production restore | No new claim on that heading |
| docs/runbooks/kubernetes-lab.md#kubernetes-lab | Related | changed: the new runbook owns the create, probe, and delete commands and the 2026-11-19 observation | infra/kubernetes/lab/up.sh and infra/kubernetes/lab/smoke.sh and infra/kubernetes/lab/down.sh; no game source behavior changed | fixture-tested | down.sh left Compose volumes in place, left no kubectl context, and the API bind was 127.0.0.1:6443 | Linked from docs/runbooks/README.md |
| docs/product/foundations/vision.md | Product | unchanged: the lab adds no player-facing promise and this page was not edited | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | A kind node is not a new mechanic | No product edit |
| docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record | Technical | unchanged: PostgreSQL still owns committed story state. The lab volume is probe data inside a deleted cluster | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | The PVC marker is not a story record | No edit |
| docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery | Technical | unchanged: the game outbox bridge was not replaced by this cluster | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | The lab has no game worker and no Temporal game service | No edit |
| STATUS.md | Related | changed: status now records the observed create, smoke, and delete, and still denies a game deployment on Kubernetes | no game source behavior changed; inspected compose.yaml at 91f45222 | fixture-tested | Compose volumes remained and no game service was observed | Points at the runbook |
| docs/technical/README.md#technical-contracts | Technical | unchanged: the laboratory index route was added by ARCH01 and this packet does not add a new technical question | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | The index does not say the kind cluster is the game | No new row |
| docs/technical/engine/selected-architecture.md#alternatives-that-lose-for-now | Technical | unchanged: event-sourced microservices stay rejected. This packet does not select that row | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | A kind node does not make campaign state event-sourced | No edit by this packet |
