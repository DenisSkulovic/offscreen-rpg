# K8S08 | Deploy isolated service skeletons and safe event contracts before real code extraction

**State:** Proposed (2026-11-19)  
**Kind:** implementation  
**Approval and owner:** User endorsed Kubernetes + an eventual separately scalable, event-driven service architecture as an educational target. Cursor owns implementation **only when this specific Change is selected**; no blanket deployment authorization.  
**Parent:** [Distributed architecture lab queue](../../README.md)

## Cursor first-screen brief

> **Current-source map:** [Topological authority](../../../../docs/technical/platform/topology.md), [deployment contract](../../../../docs/technical/platform/deployment-and-compatibility.md), [documentation Change standard](../../../../.agents/references/change-work-unit-standard.md), inspected at `a00a5beb6b49`. Reinspect current HEAD and new changes before editing.
>
> **Primary governing contract:** The current implementation is a modular monolith with Temporal worker(s); the proposed distributed target is a deliberate educational evolution, not a description of working code. ARCH01 must first reconcile the canonical target.
>
> **Known trap:** An event redelivery cannot roll dice or apply a game effect twice; no fictional Economy service; no component advertised as migrated gameplay; public ingress disabled unless secured/explicitly approved.
>
> **Scope/permission:** Infrastructure-only, on a local disposable lab after scope selection. No product code, payment calls or provider spend.

## Target alignment

- **Outcome:** Named independently scalable placeholder workloads for web/API and ARCH02-ratified game-rule authority, Storyteller, and genuinely justified optional media/delivery/real SaaS billing components, with independent resource boundaries; existing application remains unchanged until later Changes.
- **Current-source baseline:** `a00a5beb6b49` from GitHub on 2026-11-19 and repo source owners above; tools/versions and actual machine state require reinspection.
- **End-state relationship:** This is one independently reviewable slice of an explicitly staged distributed architecture laboratory; not a full service extraction.
- **Alternative considered:** Keep current Compose/modular monolith. It remains the safe fallback and existing development/test route; educational lab progression justifies an additional environment, not its immediate deletion.
- **Readiness:** Proposed until named dependencies, exact resource budget and current source are verified. A later selected packet may be promoted Ready, not auto-selected.

## Outcome and motivation

Named independently scalable placeholder workloads for web/API and ARCH02-ratified game-rule authority, Storyteller, and genuinely justified optional media/delivery/real SaaS billing components, with independent resource boundaries; existing application remains unchanged until later Changes.

## Authority and baseline

- **Product:** [Vision](../../../../docs/product/foundations/vision.md) and existing product invariants unchanged. No new player mechanics or feature promises.
- **Technical:** [Current topology](../../../../docs/technical/platform/topology.md), [delivery](../../../../docs/technical/platform/deployment-and-compatibility.md), [data](../../../../docs/technical/platform/data-and-persistence.md), [execution](../../../../docs/technical/platform/execution-and-delivery.md). Follow the reconciled target from ARCH01 and do not override established game authority contracts.
- **Evidence:** Current repo Compose has PostgreSQL, Redis, Temporal start-dev and Adobe S3Mock; no RabbitMQ or separately deployed game microservices. Machine preflight is provided by the owner in chat and must be rechecked locally.
- **Open decisions:** Capacity, production/high-availability guarantees, versions, secrets and destructive testing policy require local validation. No live provider billing.

## Exact scope and exclusions

- **Implementation/design:** After ARCH02 has ratified each process boundary, deploy only those justified skeletons as minimal containers/Deployments/Services with readiness/liveness probes. Explicit demo-only paths; no real auth, real payments, or model/provider calls. Exercise synthetic D&D-relevant command/event (e.g., permitted action → deterministic synthetic recorded outcome → Storyteller delivery notification), unique operation ID, versioned contract and consumer dedup. Keep game facts and dice separate from narrative proposals. Pin resource ceilings; no fictional Economy service, universal inventory simulation, fake playable modules, or arbitrary shared DB writes.
- **Documentation (first class):** Reconcile topology, API/execution contract, STATUS and service ownership pages; write truthfully what is skeletal vs implemented.
- **Exclude:** Game mechanics, Storyteller behavior, client rework, production deployment, Kubernetes cloud charges, shared-live data migrations, destructive operations on non-disposable assets.
- **Web-edge integration boundary:** ARCH04 specifies Next SSR, Nest HTTP and EventSource invalidation as **already selected and partially source-observed**; K8S08 skeletons are not a second BFF, WebSocket server, or replacement for existing live client logic. Follow [ARCH04](../2026-11-19--arch04-web-edge-and-live-interaction-contract/CHANGE.md) for this architectural design and leave actual Kubernetes web/API integration to [K8S11](../2026-11-19--k8s11-next-nest-live-edge-integration/CHANGE.md). Synthetic `/api` routes should preserve the eventual gateway ownership and not reinterpret a 202 or SSE hint as committed story state.
- **Storyteller harness boundary:** [ARCH05](../2026-11-19--arch05-storyteller-harness-and-context-packs/CHANGE.md) is a proposed *design* for role-selected context and intent-level memory calls; K8S08 must not hardwire a monolithic model process, allow arbitrary filesystem/SQL/code execution, or assert a deployed search specialist. Its skeletons remain transport-only until ARCH02/ARCH03/ARCH05 are reconciled.
- **Branch-scoped knowledge constraint:** Follow [ARCH03](../2026-11-19--arch03-branch-scoped-storyteller-knowledge/CHANGE.md) and ARCH02 before freezing any future Storyteller boundary. Skeletons do not adopt Cognee, mount a global mutable lore directory or create an unversioned `latest` knowledge API. Synthetic event flow must carry task/scene/root identity where relevant, and future retrieval must be branch- and scene-scoped. Demonstrating a broker delivery is not evidence of months-long DM recall.
- **Scene checkpoint/fork constraint:** This skeleton lab must not claim arbitrary past-scene fork support. Its synthetic events and service ownership must preserve a plausible future atomic/versioned scene-state boundary. Add a regression fixture/contract assertion that reading an older scene cannot silently show an item transferred in a later scene, and a proposed fork cannot inherit later-timeline state; if no stateful implementation exists yet, record this as contract-only, not a passing end-to-end test.
- **Dependencies:** ARCH01, **ARCH02 ratified domain-aligned ownership**, K8S01 K8S03 K8S07, plus K8S09 for HTTP edge exposure; service skeleton names and count cannot be frozen in advance.

## Acceptance and discriminating negative proof

- **Normal:** Scale one service 1→3 without others changing; kill pod; redelivery; old/new schema compatibility fixture; resource inventory.
- **Negative:** An event redelivery cannot apply test side effects twice; no component advertised as a migrated business service; public ingress disabled unless secured/explicitly approved.
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
| `docs/technical/platform/topology.md` target/current distinction | Technical | Pending bounded implementation/documentation | Pending executor SHA | Pending | An event redelivery cannot apply test side effects twice; no component advertised as a migrated business service; public ingress disabled unless secured/explicitly approved. | Pending |
| `docs/technical/platform/deployment-and-compatibility.md` | Technical | Pending deployment evidence | Pending | Pending | No production claim without proof | Pending |
| `docs/product/foundations/vision.md` | Product | unchanged; infrastructure does not authorize mechanics | Pending no-source-behavior check | Pending | No invented mechanic | no-op if verified |
| Relevant operational runbook / `STATUS.md` | Related | Update only with factual proof | Pending | Pending | No fake completion | Pending |
