# K8S03 | RabbitMQ operator, durable queue baseline and failure demonstration

**State:** Proposed (2026-11-19)  
**Kind:** implementation  
**Approval and owner:** User endorsed Kubernetes + an eventual separately scalable, event-driven service architecture as an educational target. Cursor owns implementation **only when this specific Change is selected**; no blanket deployment authorization.  
**Parent:** [Distributed architecture lab queue](../../README.md)

## Cursor first-screen brief

> **Current-source map:** [Topological authority](../../../../docs/technical/platform/topology.md), [deployment contract](../../../../docs/technical/platform/deployment-and-compatibility.md), [documentation Change standard](../../../../.agents/references/change-work-unit-standard.md), inspected at `a00a5beb6b49`. Reinspect current HEAD and new changes before editing.
>
> **Primary governing contract:** The current implementation is a modular monolith with Temporal worker(s); the proposed distributed target is a deliberate educational evolution, not a description of working code. ARCH01 must first reconcile the canonical target.
>
> **Known trap:** A consumer crash must not silently become proof of exactly-once effects; single broker must not be labeled high availability; no default guest/public credentials.
>
> **Scope/permission:** Infrastructure-only, on a local disposable lab after scope selection. No product code, payment calls or provider spend.

## Target alignment

- **Outcome:** Runnable broker with declarative users, queues and reproducible publish/consume smoke; distinguish at-least-once delivery from processing exactly once.
- **Current-source baseline:** `a00a5beb6b49` from GitHub on 2026-11-19 and repo source owners above; tools/versions and actual machine state require reinspection.
- **End-state relationship:** This is one independently reviewable slice of an explicitly staged distributed architecture laboratory; not a full service extraction.
- **Alternative considered:** Keep current Compose/modular monolith. It remains the safe fallback and existing development/test route; educational lab progression justifies an additional environment, not its immediate deletion.
- **Readiness:** Proposed until named dependencies, exact resource budget and current source are verified. A later selected packet may be promoted Ready, not auto-selected.

## Outcome and motivation

Runnable broker with declarative users, queues and reproducible publish/consume smoke; distinguish at-least-once delivery from processing exactly once.

## Authority and baseline

- **Product:** [Vision](../../../../docs/product/foundations/vision.md) and existing product invariants unchanged. No new player mechanics or feature promises.
- **Technical:** [Current topology](../../../../docs/technical/platform/topology.md), [delivery](../../../../docs/technical/platform/deployment-and-compatibility.md), [data](../../../../docs/technical/platform/data-and-persistence.md), [execution](../../../../docs/technical/platform/execution-and-delivery.md). Follow the reconciled target from ARCH01 and do not override established game authority contracts.
- **Evidence:** Current repo Compose has PostgreSQL, Redis, Temporal start-dev and Adobe S3Mock; no RabbitMQ or separately deployed game microservices. Machine preflight is provided by the owner in chat and must be rechecked locally.
- **Open decisions:** Capacity, production/high-availability guarantees, versions, secrets and destructive testing policy require local validation. No live provider billing.

## Exact scope and exclusions

- **Implementation/design:** Deploy pinned RabbitMQ operator and one-instance broker in messaging namespace; durable quorum semantics only when cluster size and safety permit, otherwise explicitly label single-node limitation. Test publish/ack/nack, consumer crash/redelivery, readiness, credentials and metrics. No game integration.
- **Documentation (first class):** Create messaging technical contract under docs/technical/platform or extend execution-and-delivery; record producer/consumer responsibility and limits; link from platform index.
- **Exclude:** Game mechanics, Storyteller behavior, client rework, production deployment, Kubernetes cloud charges, shared-live data migrations, destructive operations on non-disposable assets.
- **Dependencies:** K8S01, ARCH01; resource budget after PostgreSQL.

## Acceptance and discriminating negative proof

- **Normal:** Run ordered IDs through durable queue; kill consumer before ack; demonstrate redelivery and duplicate-handling requirement; broker outage behavior documented.
- **Negative:** A consumer crash must not silently become proof of exactly-once effects; single broker must not be labeled high availability; no default guest/public credentials.
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
| `docs/technical/platform/topology.md` target/current distinction | Technical | Pending bounded implementation/documentation | Pending executor SHA | Pending | A consumer crash must not silently become proof of exactly-once effects; single broker must not be labeled high availability; no default guest/public credentials. | Pending |
| `docs/technical/platform/deployment-and-compatibility.md` | Technical | Pending deployment evidence | Pending | Pending | No production claim without proof | Pending |
| `docs/product/foundations/vision.md` | Product | unchanged; infrastructure does not authorize mechanics | Pending no-source-behavior check | Pending | No invented mechanic | no-op if verified |
| Relevant operational runbook / `STATUS.md` | Related | Update only with factual proof | Pending | Pending | No fake completion | Pending |
