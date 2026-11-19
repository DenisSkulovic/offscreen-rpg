# ARCH01 | Ratify a distributed learning target without misrepresenting current runtime

**State:** Ready (2026-11-19)  
**Kind:** documentation  
**Approval and owner:** User endorsed Kubernetes + an eventual separately scalable, event-driven service architecture as an educational target. Cursor owns implementation **only when this specific Change is selected**; no blanket deployment authorization.  
**Parent:** [Distributed architecture lab queue](../../README.md)

## Cursor first-screen brief

> **Current-source map:** [Topological authority](../../../../docs/technical/platform/topology.md), [deployment contract](../../../../docs/technical/platform/deployment-and-compatibility.md), [documentation Change standard](../../../../.agents/references/change-work-unit-standard.md), inspected at `a00a5beb6b49`. Reinspect current HEAD and new changes before editing.
>
> **Primary governing contract:** The current implementation is a modular monolith with Temporal worker(s); the proposed distributed target is a deliberate educational evolution, not a description of working code. Reconcile the selected decision first.
>
> **Known trap:** A reader must NOT conclude RabbitMQ, six microservices, a production Temporal cluster, or Kubernetes are already deployed; game truth and deterministic rule ownership do not move merely because processes are split.
>
> **Scope/permission:** Docs-only; no executable files or deployments.

## Target alignment

- **Outcome:** Create a selected, explicitly staged distributed-platform technical target while retaining source-observed modular monolith as CURRENT implementation. Reconcile D-0001 rather than silently replacing its rationale.
- **Current-source baseline:** `a00a5beb6b49` from GitHub on 2026-11-19 and repo source owners above; tools/versions and actual machine state require reinspection.
- **End-state relationship:** This is one independently reviewable slice of an explicitly staged distributed architecture laboratory; not a full service extraction.
- **Alternative considered:** Keep current Compose/modular monolith. It remains the safe fallback and existing development/test route; educational lab progression justifies an additional environment, not its immediate deletion.
- **Readiness:** The owner has chosen the new learning target; docs-only reconciliation can proceed and must preserve all historical rationale.

## Outcome and motivation

Create a selected, explicitly staged distributed-platform technical target while retaining source-observed modular monolith as CURRENT implementation. Reconcile D-0001 rather than silently replacing its rationale.

## Authority and baseline

- **Product:** [Vision](../../../../docs/product/foundations/vision.md) and existing product invariants unchanged. No new player mechanics or feature promises.
- **Technical:** [Current topology](../../../../docs/technical/platform/topology.md), [delivery](../../../../docs/technical/platform/deployment-and-compatibility.md), [data](../../../../docs/technical/platform/data-and-persistence.md), [execution](../../../../docs/technical/platform/execution-and-delivery.md). Resolve the conflict with [D-0001](../../../../docs/decisions/D-0001--modular-engine.md).
- **Evidence:** Current repo Compose has PostgreSQL, Redis, Temporal start-dev and Adobe S3Mock; no RabbitMQ or separately deployed game microservices. Machine preflight is provided by the owner in chat and must be rechecked locally.
- **Open decisions:** Capacity, production/high-availability guarantees, versions, secrets and destructive testing policy require local validation. No live provider billing.

## Exact scope and exclusions

- **Implementation/design:** Edit docs/technical/platform/topology.md#recommendation and #runtime-shape, docs/decisions/D-0001--modular-engine.md (append dated supersession/continuity note; retain historical decision), docs/technical/platform/deployment-and-compatibility.md#first-hosted-deployment, ROADMAP.md and docs/technical/README.md links. Preserve product invariants and source evidence; use one new platform target section instead of multiple rival documents.
- **Documentation (first class):** Selected topology, architecture decision record, technical index, roadmap. Keep code unchanged.
- **Exclude:** Game mechanics, Storyteller behavior, client rework, production deployment, Kubernetes cloud charges, shared-live data migrations, destructive operations on non-disposable assets.
- **Dependencies:** None; execute first.

## Acceptance and discriminating negative proof

- **Normal:** Claim map before/after; owner ratification recorded as 2026-11-19 exploratory distributed learning direction; wiki links and doc health; check STATUS remains actual evidence.
- **Negative:** A reader must NOT conclude RabbitMQ, six microservices, a production Temporal cluster, or Kubernetes are already deployed; game truth and deterministic rule ownership do not move merely because processes are split.
- **Validation:** Capture commands/outputs, actual versions and resources; reproducible smoke and teardown tests; before/after authoritative claim inventory; doc link/anchor health and `pnpm wiki:change-guard --mode plan` / `--mode close` when applicable. Never invent green results.
- **Human gate:** Any deleting real volumes, changing machine-wide networking, provider spending, deploying outside local lab or amending product rules must return for approval.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because infrastructure lab adds no new player-facing behavior in `docs/product/foundations/vision.md` | `docs/product/README.md` | Negative: do not treat a service name as promised feature |
| Technical | changed: `docs/technical/platform/topology.md` and `docs/technical/platform/deployment-and-compatibility.md` for target/current/proven distinction; plus `docs/decisions/D-0001--modular-engine.md` | `docs/technical/README.md`, `docs/technical/platform/execution-and-delivery.md`, `docs/technical/platform/data-and-persistence.md` | Source and safe proof from this packet |
| Code | unchanged because this is an authoritative documentation-only Change; no executable modification is authorized | `compose.yaml`, existing lab scripts | Review markdown diff contains no executable files |
| Related | changed: `docs/runbooks/README.md`, relevant specific runbook and `work/changes/README.md` as needed; update `STATUS.md` only after source truth changes | Inbound links and source-to-target maps | Diff-backed evidence, link health |

## Handoff and next action

- Selection: owner must explicitly select this packet in `work/changes/README.md`; **Current change: none** remains until then.
- Executor: inspect current source, identify precise ownership, validate budget and guards; implement only this Change; review docs in same diff.
- Stop on any conflict with game authority, unsafe persistence, unsupported software or unverified version.
- After proof, complete ledger below, archive under `work/changes/archive/2026-11/other/`, fix inbound links, then stop. No automatic successor selection.

## Reconciliation ledger (fill before Done)

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/technical/platform/topology.md` target/current distinction | Technical | Pending bounded implementation/documentation | Pending executor SHA | Pending | A reader must NOT conclude RabbitMQ, six microservices, a production Temporal cluster, or Kubernetes are already deployed; game truth and deterministic rule ownership do not move merely because processes are split. | Pending |
| `docs/technical/platform/deployment-and-compatibility.md` | Technical | Pending deployment evidence | Pending | Pending | No production claim without proof | Pending |
| `docs/product/foundations/vision.md` | Product | unchanged; infrastructure does not authorize mechanics | Pending no-source-behavior check | Pending | No invented mechanic | no-op if verified |
| Relevant operational runbook / `STATUS.md` | Related | Update only with factual proof | Pending | Pending | No fake completion | Pending |
