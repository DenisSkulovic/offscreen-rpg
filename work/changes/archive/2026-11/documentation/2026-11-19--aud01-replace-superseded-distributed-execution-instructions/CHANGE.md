# AUD01 | Replace stale RabbitMQ/Temporal execution instructions at their source

**State:** Done
**Kind:** documentation
**Approval and owner:** Owner authorized this documentation Change on baseline `4447114b7c951696576a50efe74aae5ecbdec9f2`. Canonical technical meaning is unchanged. The executor rewrote the named design notes and the DIST02 and DIST04 bodies.

## Cursor first-screen brief

> **Current-source map:** [distributed-turn design](../../../../../designs/open/distributed-turn-poc/README.md), inspected at `4447114b7c951696576a50efe74aae5ecbdec9f2`.
> **Primary governing heading:** [Commands, business events, and workflows](../../../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows).
> **Known trap / contrary case:** A lean snapshot that omits an archived file is not a source regression, and this rewrite must not move the scene checkpoint off the engine or put the story SSE stream on RabbitMQ.
> **Scope/permission:** Markdown named below only. No executable edit. The queue stays with the orchestrator.

## Outcome and motivation

An agent who reads D1, D4, D5, the design README, the execution reconciliation, DIST02, or DIST04 is told that a story-command wake is the PostgreSQL outbox delivered by a direct Temporal RPC. RabbitMQ is an optional post-commit fact for an independent consumer. Historical mentions of the broker wake are labelled superseded. DIST02 and DIST04 stay Proposed. Their acceptance matches that rule. Kubernetes laboratory proofs and the checkpoint implementation are not marked Done beyond the queue's existing record.

Before: D1 steps 4–5, D5 Gate A, and the DIST02 and DIST04 bodies told an agent to route the story command through RabbitMQ into Temporal. After: those instructions describe the direct RPC, and the old hop is labelled superseded.

## Authority and baseline

- **Product:** unchanged. No gameplay, scene, or commercial rule is rewritten. [Vision](../../../../../../docs/product/foundations/vision.md) stays the player-facing promise.
- **Technical:** [Commands, business events, and workflows](../../../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows) and [Proposed service ownership](../../../../../../docs/technical/platform/topology.md#proposed-service-ownership) were read and not edited. The engine remains the scene-checkpoint boundary. There is no Game Economy service. The story SSE hint stays off the broker.
- **Evidence / source:** Baseline `4447114b7c951696576a50efe74aae5ecbdec9f2`. `apps/worker/src/outbox/dispatch.ts` delivers a notice with the Temporal client. `packages/workflows/src/index.ts` `storytellerV1` calls one `completeStoryteller` Activity. No source behavior changed.
- **Proposals / unknowns:** A post-commit consumer is not selected. DATA02 is not Done. This Change does not ratify a new broker topic.

## Exact scope and exclusions

- **Edited:** `work/designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md`, `work/designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md`, `work/designs/open/distributed-turn-poc/D5-RELEASE-AND-ACCEPTANCE.md`, `work/designs/open/distributed-turn-poc/README.md`, `work/designs/open/distributed-turn-poc/EXECUTION-RECONCILIATION-2026-11-19.md`, `work/changes/open/2026-11-19--dist02-versioned-dispatch-bridge-contracts/CHANGE.md`, `work/changes/open/2026-11-19--dist04-rabbitmq-temporal-live-handoff/CHANGE.md`.
- **Executable source/tests/config:** unchanged because this is a documentation-only Change. No intended code diff.
- **Queue:** `work/changes/README.md` is not edited. The orchestrator dated the historical K8S03 and K8S09 sentence and retargeted the DIST04 row away from a live broker-to-Temporal relay.
- **Preserve:** engine checkpoint ownership, SSE off the broker, no Game Economy service, K8S06 as a deleted Temporal 1.32.2 laboratory rather than the Compose server or the game workflow.
- **Exclude:** AUD02, AUD03, canonical technical pages, STATUS, ROADMAP, packages, infra, scripts, cluster lock, kind, and kubectl. Packets outside the edit list that still describe the old hop, including DIST01, TURN02, and TURN03, were not rewritten. D4's pre-existing link to a STORY01 slug that does not exist is AUD02's link repair. This Change did not retarget it. The orchestrator archived this packet and retargeted the queue and audit links.

## Acceptance and discriminating negative proof

- **Normal:** D1's durable path, D4's handoff, D5 Gate A, and the DIST02 and DIST04 acceptance sections describe a direct Temporal RPC. A broker wake sentence that remains is labelled superseded.
- **Negative:** A missing archived file in a lean snapshot is not reported as a source regression. The rewrite does not reverse scene-checkpoint ownership and does not put the story SSE stream on RabbitMQ. It does not invent a mandatory broker consumer.
- **Verification:** `pnpm wiki:change-guard --mode plan` and `--mode close`, plus `python3 scripts/check_docs.py`. The pre-existing ROADMAP anchor mismatch is left for AUD02.
- **Human decision gate:** none for this wording. Selecting a real broker consumer remains a later decision.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no player rule, scene promise, or commercial term is rewritten | docs/product/foundations/vision.md | No product page is in the diff |
| Technical | unchanged: the merged execution contract and the proposed owners stay as already written | docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | Design notes now follow that heading |
| Code | unchanged because no executable modification is authorized. Negative: the edit must not move the scene checkpoint off the engine or place the story SSE stream on RabbitMQ | apps/worker/src/outbox/dispatch.ts | Inspected diff has no executable files |
| Related | changed: work/designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md#operative-execution-rule and the D4, D5, README, reconciliation, DIST02, and DIST04 bodies listed in scope | work/designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md#operative-handoff | Queue sentences stay with the orchestrator |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | technical | unchanged: the direct outbox wake and the separate post-commit fact stay on this heading, which was not edited | no source behavior changed; 4447114b7c951696576a50efe74aae5ecbdec9f2 | reviewed | A design note must not be read as a new broker hop in front of Temporal | Design pages link here with the corrected relative root |
| docs/technical/platform/topology.md#proposed-service-ownership | technical | unchanged: the engine remains the scene-checkpoint boundary and a Game Economy service stays rejected | no source behavior changed; 4447114b7c951696576a50efe74aae5ecbdec9f2 | reviewed | This Change does not hand the checkpoint to the Storyteller or to a broker | No topology edit |
| docs/product/foundations/vision.md | product | unchanged: no gameplay or commercial promise is altered by the delivery wording | no source behavior changed | reviewed | The rewrite does not add a mandatory inventory or economy service | No product page edited |
| apps/worker/src/outbox/dispatch.ts | code | unchanged: no executable modification is authorized; the inspected function still calls the Temporal client | no source behavior changed; apps/worker/src/outbox/dispatch.ts at 4447114b7c951696576a50efe74aae5ecbdec9f2 | reviewed | A documentation edit must not move the scene checkpoint off the engine or place the story SSE stream on RabbitMQ | No source map change |
| work/designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md#operative-execution-rule | evidence | changed: the operative path is the direct Temporal RPC, and the broker wake is labelled superseded | no source behavior changed; 4447114b7c951696576a50efe74aae5ecbdec9f2 | reviewed | Reading the durable-path steps does not produce a broker adapter | Replaced the old steps instead of stacking another banner |
| work/designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md#operative-handoff | evidence | changed: the handoff diagram wakes Temporal by a direct RPC | no source behavior changed; packages/workflows/src/index.ts at 4447114b7c951696576a50efe74aae5ecbdec9f2 | reviewed | The SSE hint stays on LISTEN/NOTIFY and the checkpoint stays with the engine writer | Same-page diagram updated |
| work/designs/open/distributed-turn-poc/D5-RELEASE-AND-ACCEPTANCE.md#gate-a--reproducible-application-release | evidence | changed: Gate A requires one direct wake route and does not require a broker on the story command | no source behavior changed | reviewed | A deleted Temporal 1.32.2 laboratory is not accepted as the game workflow | Scorecard hop no longer inserts a broker notice |
| work/designs/open/distributed-turn-poc/README.md#one-acceptance-target | evidence | changed: the acceptance split and the causal chain use the direct RPC, and this page does not declare an active batch | no source behavior changed | reviewed | A missing file in a lean export is described as an export exclusion, not a repository regression | Points at the queue instead of repeating a batch |
| work/designs/open/distributed-turn-poc/EXECUTION-RECONCILIATION-2026-11-19.md#corrected-architectural-position-three-different-deliveries | evidence | changed: the page dates the old laboratory wave as superseded and treats a consumer as optional | no source behavior changed | reviewed | The page does not mark DATA02 or a Kubernetes application release Done | Canonical links use the repository docs root |
| work/changes/open/2026-11-19--dist02-versioned-dispatch-bridge-contracts/CHANGE.md | evidence | changed: acceptance is a post-commit fact contract, and the packet stays Proposed | no source behavior changed | reviewed | A wake-shaped payload is a failing case, not a Temporal start from the broker | Title and goal match ARCH02; implementation ledger stays open |
| work/changes/open/2026-11-19--dist04-rabbitmq-temporal-live-handoff/CHANGE.md | evidence | changed: the body refuses a broker-to-Temporal adapter and stays Proposed | no source behavior changed; apps/worker/src/outbox/relay.ts at 4447114b7c951696576a50efe74aae5ecbdec9f2 | reviewed | A broker outage must not be treated as a stuck story command | Folder name remains historical because the queue link cannot be renamed here |
| work/changes/README.md#disturn--first-service-extraction-bundle-planned-2026-11-19 | evidence | unchanged: the orchestrator owns the queue, which still has two current-tense active-batch sentences | no source behavior changed | reviewed | This Change does not execute the stale K8S03 and K8S09 batch sentence | Left for the orchestrator, including the DIST04 row label on that heading |
