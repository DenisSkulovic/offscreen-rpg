# DIST04 | Cancelled: no reader for optional RabbitMQ projection

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) is the one-task-at-a-time Cursor route; [all-open audit](../../../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) separates observed source, missing code and optional work. **Default parent/child: Composer 2.5 Standard.** optional Rabbit derived projection; never broker-to-Temporal transport. Existing Change state and explicit selection/cluster/spending gates remain in force; task authorship alone is neither implementation nor verification. Grok is not the normal executor.

**State:** Cancelled (2026-11-20), **not Done**. Original RabbitMQ→Temporal wake rejected by ARCH02; optional postcommit projection has no identified read-model owner, subscriber or accepted event contract. No DIST04 runtime code was implemented. Terminal documentation-only disposition below.
**Kind:** implementation
**Execution:** Terminal: do not select, implement or deploy T01–T03. A future consumer requires a new, independently justified scoped Change. This cancellation does not delete the K8S03 educational lab or modify any live cluster.
**Program:** [Program](../../../../../designs/open/distributed-turn-poc/README.md) · [Gap register](../../../../../designs/open/distributed-turn-poc/GAPS.md) · [D1](../../../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md)

The folder name still says "RabbitMQ Temporal live handoff." That name is historical. Superseded: using RabbitMQ as the transport for an existing outbox wake, and any adapter that consumes a broker message in order to start or signal Temporal.

**Historical dependency cleanup (before cancellation):** [DIST02 cancelled](../2026-11-19--dist02-versioned-dispatch-bridge-contracts/CHANGE.md). No existing source contract is available or required. This Change remains **Proposed and unselected** pending its own disposition, not executable under an imagined prerequisite.

## Terminal decision and evidence | 2026-11-20

**Decision: CANCELLED, not Done or postponed.** DIST04 was originally a RabbitMQ→Temporal live handoff. ARCH02 explicitly rejected RabbitMQ as the Storyteller/Temporal wake transport. DIST04 was then redefined as a speculative postcommit fact publisher/inbox/rebuildable projection. Following [DIST02's cancellation](../2026-11-19--dist02-versioned-dispatch-bridge-contracts/CHANGE.md), it has neither an accepted fact schema nor a *named* independent consumer, supported query or product requirement. No reason exists to build a producer, new broker runtime service or extra failure mode for the zero-provider playable TURN02/TURN03 application.

**Actual inspected runtime:** `apps/worker/src/outbox/dispatch.ts:deliverOutboxNotice` dispatches existing start/wake topics through Temporal client RPC, and `apps/worker/src/outbox/relay.ts:relayOne` acknowledges a SQL notice only after send completes. `apps/worker/src/runtime/index.ts` uses this direct path. `apps/worker/package.json` has Temporal dependencies but no AMQP/Rabbit client. `packages/contracts/package.json` has no exported postcommit broker envelope. GitHub tree shows RabbitMQ implementation files only under `infra/kubernetes/lab/rabbitmq`, with its standalone operations guide; these are **educational infrastructure** and remain. Ratified [delivery classes](../../../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows) already make broker facts optional and prohibit broker-to-Temporal wakes. Source inspected at `5f76bdf737`.

**Current choice:** no Rabbit publisher, Rabbit subscriber, broker-backed game read model, or `scene.published.v1` contract is authorized. Do **not** make RabbitMQ a default `pnpm dev` dependency. Future independent analytics/search/projection requirements can warrant a new Change after naming consumer, event visibility, exact query, SQL commit source, inbox/idempotency and broker-outage independence. That hypothetical later Change is not unimplemented DIST04 work.

**Negative evidence boundary:** this is a **source and product-necessity audit**, not a live Rabbit outage or Temporal test. Existing K8S03 lab acceptance is not application integration. No runtime/code diff, providers, SQL writes, Pods or tests were executed to cancel DIST04. No historical proof is relabeled Done.

**Dependency cleanup:** DIST04 and cancelled DIST02 are not TURN02, TURN03 or STORY03 prerequisites. Historical DISTURN diagrams describing RabbitMQ→Temporal are superseded, not a current mandate. `work/QUEUE.md` continues to select TURN02; this terminal archive is not an execution handoff.

## Goal (historical, never implemented)

If a consumer is separately selected, relay one committed business fact from the SQL outbox to RabbitMQ and let one idempotent subscriber rebuild a disposable projection. The workflow wake stays the direct Temporal RPC already implemented in [relay.ts](../../../../../../apps/worker/src/outbox/relay.ts) and [dispatch.ts](../../../../../../apps/worker/src/outbox/dispatch.ts). This packet does not make the broker part of the story command.

## Prerequisites

ARCH02 is merged. Read [Commands, business events, and workflows](../../../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows) before any edit. The former DIST02 fact contract was Cancelled (2026-11-20), not implemented. A future named consumer would need its own accepted schema/design first. K8S03's broker proof deleted its cluster. K8S06's Temporal 1.32.2 proof deleted its cluster and is not the Compose development server, not the game workflow, and not a reason to wake Temporal from RabbitMQ. No checkpoint Change is Done because of this packet.

## Scope

Classify outbox topics. Wake and start notices keep the existing Temporal client call. A fact topic, only when selected, is published with publisher confirm, and the SQL notice is acknowledged only after that confirm. The subscriber has its own inbox. It may rebuild a derived projection from the committed root. It does not call Temporal. It does not write the scene checkpoint. It does not publish the story SSE stream. The first Storyteller turn still completes from SQL and object storage when the projection is behind or absent.

Superseded steps, not to be carried out: choosing the broker instead of the direct relay for one wake topic; adding a broker-to-Temporal process; acknowledging RabbitMQ only after Temporal accepts a start; treating Temporal downtime as a reason to requeue a story command on the broker.

## Paths

A later selected diff may classify topics in [relay.ts](../../../../../../apps/worker/src/outbox/relay.ts) and [dispatch.ts](../../../../../../apps/worker/src/outbox/dispatch.ts), and may add a separate consumer entrypoint that cannot import the Temporal workflow start. It does not add that consumer under the wake path. Operational manifests wait until the cluster owner is free. This documentation pass edits none of those source files.

## Migration and rollback

There is one wake route, the direct RPC. Adding a fact publisher later does not create a second route for the same notice. Rollback disables the fact publisher and leaves the relay's Temporal calls as they are. In-flight wake notices are retried from SQL. They are not drained from a broker queue. No dual-write period.

## Acceptance

**Positive:** with fakes, one committed fact is published once, a duplicate delivery leaves one projection row, and the count of Temporal workflow starts does not change when the fact is published or withheld. The scene commit and the authoritative GET succeed while the consumer is stopped.

**Negative:** a test that routes a Storyteller wake topic onto RabbitMQ fails. A Temporal outage does not requeue that wake onto the broker. A broker outage does not block the direct wake, the scene commit, or SSE recovery by GET. The consumer cannot insert a checkpoint row. No Pod-Ready result counts as success. No paid provider call is claimed.

## Exclusions

No paid provider, payments, image generation, Game Economy service, live secrets, or destructive reset. Do not reverse engine ownership of the scene checkpoint. Do not put the story SSE stream on RabbitMQ. Do not mark Kubernetes release work Done.

## Parallelism

Shared worker outbox files have one owner. This Proposed packet is not executable because a neighbour was authorized. Cluster use takes the existing lock. This correction does not take that lock.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no player-facing rule or economy service changes | docs/product/gameplay/rules.md | Checkpoint and SSE behaviour stay with their current owners |
| Technical | unchanged because the merged wake contract is the constraint, not a page this packet rewrites | docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | Broker delivery is still not a commit |
| Code | changed: apps/worker/src/outbox/relay.ts only after a later selection, and only to keep wake delivery on the Temporal client. Negative: publishing a wake topic to RabbitMQ must fail the test | apps/worker/src/outbox/relay.ts | Not selected. No code diff in AUD01 |
| Related | unchanged because the optional consumer is already described on the execution reconciliation page | work/designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md#operative-execution-rule | Proposed. The queue is not edited here |

## Reconciliation ledger (implementation has not started)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | technical | unchanged: this Proposed packet does not replace the direct Temporal wake | no source behavior changed | reviewed | A broker outage must not be treated as a stuck story command | Left for a later selected implementation |

## Final reconciliation ledger | terminal cancellation

| Plane | Source finding | Decision and proof boundary |
| --- | --- | --- |
| Product | No selected independent read-model user or consumer for proposed business fact | No new player capability is removed; optional projection rejected for this program |
| Technical | ARCH02's direct SQL-outbox→Temporal RPC is current; broker facts only for a future independent consumer | No code, broker route, workflow ID, SQL notice or canonical ownership changed |
| Code | Worker package/runtime/dispatch contain no application RabbitMQ publisher or subscriber; only K8S03 lab stands alone | No implementation to delete; T01–T03 never executed; runtime tests NOT RUN for this cancellation |
| Related documentation | DIST02 already Cancelled; DISTURN GAPS, POC references, work roadmap/catalog/ledger updated | Future reader needs new proposed Change, not false blocker or resurrection |
| Archive | `work/changes/open/` → `archive/2026-11/other/` | **Cancelled, not Done**; selected work remains TURN02 |
