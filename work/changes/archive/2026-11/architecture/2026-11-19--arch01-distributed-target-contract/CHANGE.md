# ARCH01 | Ratify a distributed learning target without misrepresenting current runtime

**State:** Done (2026-11-19)  
**Kind:** documentation  
**Approval and owner:** User endorsed Kubernetes + an eventual separately scalable, event-driven service architecture as an educational target. Cursor owns implementation **only when this specific Change is selected**; no blanket deployment authorization.  
**Parent:** [Distributed architecture lab queue](../../../../README.md)

## Cursor first-screen brief

> **Current-source map:** [Topological authority](../../../../../../docs/technical/platform/topology.md), [deployment contract](../../../../../../docs/technical/platform/deployment-and-compatibility.md), [documentation Change standard](../../../../../../.agents/references/change-work-unit-standard.md), inspected at `a00a5beb6b49`. Reinspect current HEAD and new changes before editing.
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

- **Product:** [Vision](../../../../../../docs/product/foundations/vision.md) and existing product invariants unchanged. No new player mechanics or feature promises.
- **Technical:** [Current topology](../../../../../../docs/technical/platform/topology.md), [delivery](../../../../../../docs/technical/platform/deployment-and-compatibility.md), [data](../../../../../../docs/technical/platform/data-and-persistence.md), [execution](../../../../../../docs/technical/platform/execution-and-delivery.md). Resolve the conflict with [D-0001](../../../../../../docs/decisions/D-0001--modular-engine.md).
- **Evidence:** Current repo Compose has PostgreSQL, Redis, Temporal start-dev and Adobe S3Mock; no RabbitMQ or separately deployed game microservices. Machine preflight is provided by the owner in chat and must be rechecked locally.
- **Open decisions:** Capacity, production/high-availability guarantees, versions, secrets and destructive testing policy require local validation. No live provider billing.

## Exact scope and exclusions

- **Implementation/design:** Edit docs/technical/platform/topology.md#recommendation and #runtime-shape, plus the one new section docs/technical/platform/topology.md#distributed-learning-target. Append a dated continuity note on docs/decisions/D-0001--modular-engine.md and keep the historical decision. Edit docs/technical/platform/deployment-and-compatibility.md#first-hosted-deployment and #kubernetes-as-a-deliberate-extension so the hosted release and the laboratory are not rival contracts. Update ROADMAP.md, docs/technical/README.md, docs/README.md, docs/decisions/README.md, docs/technical/engine/selected-architecture.md, STATUS.md, and work/changes/README.md. docs/runbooks/README.md stays unchanged because no laboratory procedure exists until a later implementation Change. Preserve product invariants and source evidence.
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

## Checks actually run

- `pnpm wiki:change-guard --mode plan --change work/changes/open/2026-11-19--arch01-distributed-target-contract` returned `wiki.change-guard.v1 plan ok` with no findings.
- `node scripts/repo-tools/wiki-change-guard.mjs --mode close --change work/changes/open/2026-11-19--arch01-distributed-target-contract --base 91f452227f23add47aec529fdd20fcb3eafdadba` returned `wiki.change-guard.v1 close ok`. Remaining warnings are citation candidates on pages that already link STATUS or the engine and were not edited, because those pages do not claim a cluster exists.
- `compose.yaml` was read at `91f45222`: services are `postgres`, `temporal` (`server start-dev`), `redis` (`--save` empty, `--appendonly no`), and `s3mock`. No RabbitMQ service and no game microservice.
- No executable file was edited. No cluster was created. No model call.
- `work/changes/ledger/2026-11.md` receives the archive index row when this packet is retired. `docs/runbooks/README.md` was left unchanged.

## Reconciliation ledger (fill before Done)

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/topology.md#recommendation | Technical | changed: the starting table remains the modular monolith, and the laboratory is a separate section rather than a silent replacement of this table | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | The durable-execution row still denies an application broker. A laboratory broker is not this row | Heading stayed. docs/technical/README.md links the new section |
| docs/technical/platform/topology.md#runtime-shape | Technical | changed: the diagram stays the current application shape, and skeletons are not deployed by it | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | Hosting the same processes on Kubernetes would still be one modular application | Heading stayed |
| docs/technical/platform/topology.md#distributed-learning-target | Technical | changed: one new section owns the educational laboratory and separates current implementation, working engine, and unproven practice | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | A reader cannot treat RabbitMQ, six microservices, a production Temporal cluster, or Kubernetes as the deployed game. A process split does not move rule ownership | ROADMAP.md, docs/README.md, and docs/technical/README.md point here |
| docs/technical/platform/topology.md#what-handles-events-and-background-work | Technical | changed: the application outbox bridge stays, and a laboratory broker is not a committed story fact | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | Polling the outbox remains enough for the application bridge | Points at docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery |
| docs/technical/platform/deployment-and-compatibility.md#first-hosted-deployment | Technical | changed: the hosted release stays the production-shaped target and is not satisfied by the laboratory | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | A local cluster is not Temporal Cloud and is not a demonstrated restore | Points at the laboratory section |
| docs/technical/platform/deployment-and-compatibility.md#kubernetes-as-a-deliberate-extension | Technical | changed: hosted-release cluster advice and the educational laboratory now have separate owners | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | Operating PostgreSQL or Temporal inside the laboratory is not high availability for the hosted release | The laboratory contract stays on topology |
| docs/decisions/D-0001--modular-engine.md#choice | Technical | unchanged: the modular-engine choice, rejections, and revisit rule are still the text above the new note | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | Event-sourced microservices and LLM-led mechanical chat stay rejected | docs/decisions/README.md points at the continuity note |
| docs/decisions/D-0001--modular-engine.md#continuity-on-2026-11-19 | Technical | changed: the learning-environment deferral is lifted for a disposable laboratory only | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | The note does not deploy Kubernetes and does not supersede PostgreSQL story authority | Links to the laboratory section |
| docs/technical/engine/selected-architecture.md#alternatives-that-lose-for-now | Technical | changed: one sentence says the laboratory does not select event-sourced microservices. The alternatives table is otherwise the same | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | Campaign state stays a PostgreSQL projection | Points at the laboratory section |
| docs/product/foundations/vision.md | Product | unchanged: the laboratory adds no player-facing promise, and this page was not edited | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | A service name is not a new mechanic | No product edit |
| docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery | Technical | unchanged: the outbox-to-Temporal bridge remains the application delivery path, so this page was not edited | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | A laboratory broker does not replace that bridge | Topology cites this heading |
| docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record | Technical | unchanged: PostgreSQL and Temporal ownership stay on this heading, so this page was not edited | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | Object storage in the laboratory is not the story transaction | Topology cites this heading |
| docs/technical/platform/persistence-and-caching.md#redis-boundary | Technical | unchanged: Redis remains optional acceleration and not application authority, including inside the laboratory | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | A cache loss cannot become story authority | Topology cites this heading |
| docs/technical/admin/topology-and-authorization.md#7-dependency-and-trade-off-rationale | Technical | unchanged: staff access stays a logical control plane inside the application, so this page was not edited | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | A service skeleton is not a new admin fleet | Topology cites this heading |
| STATUS.md | Related | changed: one sentence records that the laboratory is selected and unobserved. Demonstrated coverage was not rewritten as if a cluster existed | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | No Kubernetes, RabbitMQ, CloudNativePG, or separate game service is claimed as observed | Points at the laboratory section |
| docs/runbooks/README.md | Related | unchanged: no operating procedure exists yet, so no runbook was added | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | A missing runbook is not a completed cluster | No runbook edit |
| ROADMAP.md | Related | changed: the laboratory is an additional selected target and not permission to extract services | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | The modular monolith remains the engine working target | Points at the laboratory section and D-0001 |
| docs/technical/README.md#technical-contracts | Technical | changed: one question route now lands on the laboratory section and says it is not a deployed cluster | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | The route does not replace the topology question or D-0001 | New row beside the topology question |
| docs/README.md#documentation | Related | changed: one question asks whether the laboratory is the game engine and answers that it is not | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | The engine question still points at D-0001 and the selected engine page | New row under the engine question |
| docs/decisions/README.md#formal-adrs | Related | changed: the D-0001 index row names the continuity note and says the laboratory does not replace the choice | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | The index does not add a new ADR | Same D-0001 row |
| docs/runbooks/release-restore-readiness.md | Related | unchanged: the hosted backup, Temporal history, and reconcile-before-resume requirements still stand, so this checklist was not edited | no source behavior changed; inspected compose.yaml at 91f45222 | reviewed | A laboratory cluster is not a demonstrated restore | Still cites docs/technical/platform/deployment-and-compatibility.md#first-hosted-deployment |
