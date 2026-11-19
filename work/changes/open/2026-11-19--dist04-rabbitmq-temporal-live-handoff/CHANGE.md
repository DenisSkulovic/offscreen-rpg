# DIST04 | Optional post-commit fact relay; the Temporal wake stays a direct RPC

**State:** Proposed. Not Ready and not selected (2026-11-19). AUD01 replaced the old implementation semantics. That replacement is not implementation and is not Done.
**Kind:** implementation
**Execution:** Not authorized. Select only if a consumer is wanted after DIST02's contract, and only with the cluster lock held by one owner.
**Program:** [Program](../../../designs/open/distributed-turn-poc/README.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md) · [D1](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md)

The folder name still says "RabbitMQ Temporal live handoff." That name is historical. Superseded: using RabbitMQ as the transport for an existing outbox wake, and any adapter that consumes a broker message in order to start or signal Temporal.

## Goal

If a consumer is separately selected, relay one committed business fact from the SQL outbox to RabbitMQ and let one idempotent subscriber rebuild a disposable projection. The workflow wake stays the direct Temporal RPC already implemented in [relay.ts](../../../../apps/worker/src/outbox/relay.ts) and [dispatch.ts](../../../../apps/worker/src/outbox/dispatch.ts). This packet does not make the broker part of the story command.

## Prerequisites

ARCH02 is merged. Read [Commands, business events, and workflows](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows) before any edit. DIST02's fact contract is the schema source if this work is selected. K8S03's broker proof deleted its cluster. K8S06's Temporal 1.32.2 proof deleted its cluster and is not the Compose development server, not the game workflow, and not a reason to wake Temporal from RabbitMQ. No checkpoint Change is Done because of this packet.

## Scope

Classify outbox topics. Wake and start notices keep the existing Temporal client call. A fact topic, only when selected, is published with publisher confirm, and the SQL notice is acknowledged only after that confirm. The subscriber has its own inbox. It may rebuild a derived projection from the committed root. It does not call Temporal. It does not write the scene checkpoint. It does not publish the story SSE stream. The first Storyteller turn still completes from SQL and object storage when the projection is behind or absent.

Superseded steps, not to be carried out: choosing the broker instead of the direct relay for one wake topic; adding a broker-to-Temporal process; acknowledging RabbitMQ only after Temporal accepts a start; treating Temporal downtime as a reason to requeue a story command on the broker.

## Paths

A later selected diff may classify topics in [relay.ts](../../../../apps/worker/src/outbox/relay.ts) and [dispatch.ts](../../../../apps/worker/src/outbox/dispatch.ts), and may add a separate consumer entrypoint that cannot import the Temporal workflow start. It does not add that consumer under the wake path. Operational manifests wait until the cluster owner is free. This documentation pass edits none of those source files.

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
