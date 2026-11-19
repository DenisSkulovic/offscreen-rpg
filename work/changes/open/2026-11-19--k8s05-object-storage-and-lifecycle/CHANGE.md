# K8S05 | Real S3-compatible object storage with persistent testable lifecycle

**State:** Proposed (2026-11-19)  
**Kind:** implementation  
**Approval and owner:** User endorsed Kubernetes + an eventual separately scalable, event-driven service architecture as an educational target. Cursor owns implementation **only when this specific Change is selected**; no blanket deployment authorization.  
**Parent:** [Distributed architecture lab queue](../../README.md)

## Cursor first-screen brief

> **Current-source map:** [Topological authority](../../../../docs/technical/platform/topology.md), [deployment contract](../../../../docs/technical/platform/deployment-and-compatibility.md), [documentation Change standard](../../../../.agents/references/change-work-unit-standard.md), inspected at `a00a5beb6b49`. Reinspect current HEAD and new changes before editing.
>
> **Primary governing contract:** The current implementation is a modular monolith with Temporal worker(s); the proposed distributed target is a deliberate educational evolution, not a description of working code. ARCH01 must first reconcile the canonical target.
>
> **Known trap:** S3 compatibility cannot be asserted from successful container start alone; object storage volume deletion cannot masquerade as durable backup; no automatic production switch.
>
> **Scope/permission:** Infrastructure-only, on a local disposable lab after scope selection. No product code, payment calls or provider spend.

## Target alignment

- **Outcome:** Replace infrastructure-only S3Mock *in Kubernetes* with a documented S3-compatible object store after verifying current upstream maintenance/licensing and client compatibility.
- **Current-source baseline:** `a00a5beb6b49` from GitHub on 2026-11-19 and repo source owners above; tools/versions and actual machine state require reinspection.
- **End-state relationship:** This is one independently reviewable slice of an explicitly staged distributed architecture laboratory; not a full service extraction.
- **Alternative considered:** Keep current Compose/modular monolith. It remains the safe fallback and existing development/test route; educational lab progression justifies an additional environment, not its immediate deletion.
- **Readiness:** Proposed until named dependencies, exact resource budget and current source are verified. A later selected packet may be promoted Ready, not auto-selected.

## Outcome and motivation

Replace infrastructure-only S3Mock *in Kubernetes* with a documented S3-compatible object store after verifying current upstream maintenance/licensing and client compatibility.

## Authority and baseline

- **Product:** [Vision](../../../../docs/product/foundations/vision.md) and existing product invariants unchanged. No new player mechanics or feature promises.
- **Technical:** [Current topology](../../../../docs/technical/platform/topology.md), [delivery](../../../../docs/technical/platform/deployment-and-compatibility.md), [data](../../../../docs/technical/platform/data-and-persistence.md), [execution](../../../../docs/technical/platform/execution-and-delivery.md). Follow the reconciled target from ARCH01 and do not override established game authority contracts.
- **Evidence:** Current repo Compose has PostgreSQL, Redis, Temporal start-dev and Adobe S3Mock; no RabbitMQ or separately deployed game microservices. Machine preflight is provided by the owner in chat and must be rechecked locally.
- **Open decisions:** Capacity, production/high-availability guarantees, versions, secrets and destructive testing policy require local validation. No live provider billing.

## Exact scope and exclusions

- **Implementation/design:** Evaluate SeaweedFS or Garage against required S3 calls and minimum memory; select one with reproducible image/config, bucket bootstrap, local secret inputs, upload/download/delete smoke, PVC and no public endpoint. Retain existing Compose S3Mock as legacy local/test route until explicitly migrated.
- **Documentation (first class):** Record decision in docs/decisions and update docs/technical/platform/data-and-persistence.md, deployment and local test runbook; mark what is only target.
- **Exclude:** Game mechanics, Storyteller behavior, client rework, production deployment, Kubernetes cloud charges, shared-live data migrations, destructive operations on non-disposable assets.
- **Dependencies:** K8S01, K8S02 resource/storage proof; explicit implementation selection.

## Acceptance and discriminating negative proof

- **Normal:** SDK operation suite including restart persistence, missing object, bad credentials, object metadata and teardown.
- **Negative:** S3 compatibility cannot be asserted from successful container start alone; object storage volume deletion cannot masquerade as durable backup; no automatic production switch.
- **Validation:** Capture commands/outputs, actual versions and resources; reproducible smoke and teardown tests; before/after authoritative claim inventory; doc link/anchor health and `pnpm wiki:change-guard --mode plan` / `--mode close` when applicable. Never invent green results.
- **Human gate:** Any deleting real volumes, changing machine-wide networking, provider spending, deploying outside local lab or amending product rules must return for approval.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because infrastructure lab adds no new player-facing behavior in `docs/product/foundations/vision.md` | `docs/product/README.md` | Negative: do not treat a service name as promised feature |
| Technical | changed: `docs/technical/platform/topology.md` and `docs/technical/platform/deployment-and-compatibility.md` for target/current/proven distinction; plus specific owner in Docs section above | `docs/technical/README.md`, `docs/technical/platform/execution-and-delivery.md`, `docs/technical/platform/data-and-persistence.md` | Source and safe proof from this packet |
| Code | changed: infrastructure manifests/scripts under `infra/kubernetes/` (or existing canonical infrastructure owner after reinspection); negative: no application/business code migrations and no unbounded resource changes | `compose.yaml`, existing lab scripts | Controlled local smoke + failure test |
| Related | changed: `docs/runbooks/README.md`, relevant specific runbook and `work/changes/README.md` as needed; update `STATUS.md` only after source truth changes | Inbound links and source-to-target maps | Diff-backed evidence, link health |

## Handoff and next action

- Selection: owner must explicitly select this packet in `work/changes/README.md`; **Current change: none** remains until then.
- Executor: inspect current source, identify precise ownership, validate budget and guards; implement only this Change; review docs in same diff.
- Stop on any conflict with game authority, unsafe persistence, unsupported software or unverified version.
- After proof, complete ledger below, archive under `work/changes/archive/2026-11/other/`, fix inbound links, then stop. No automatic successor selection.

## Reconciliation ledger (fill before Done)

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/technical/platform/topology.md` target/current distinction | Technical | Pending bounded implementation/documentation | Pending executor SHA | Pending | S3 compatibility cannot be asserted from successful container start alone; object storage volume deletion cannot masquerade as durable backup; no automatic production switch. | Pending |
| `docs/technical/platform/deployment-and-compatibility.md` | Technical | Pending deployment evidence | Pending | Pending | No production claim without proof | Pending |
| `docs/product/foundations/vision.md` | Product | unchanged; infrastructure does not authorize mechanics | Pending no-source-behavior check | Pending | No invented mechanic | no-op if verified |
| Relevant operational runbook / `STATUS.md` | Related | Update only with factual proof | Pending | Pending | No fake completion | Pending |
