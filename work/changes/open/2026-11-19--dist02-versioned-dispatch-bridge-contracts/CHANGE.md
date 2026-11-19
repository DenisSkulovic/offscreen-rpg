# DIST02 | Versioned post-commit fact contracts; the Temporal wake stays a direct RPC

**State:** Proposed. Not Ready and not selected (2026-11-19). AUD01 corrected this body to merged ARCH02. That correction is not implementation.
**Kind:** implementation
**Execution:** Not authorized. Select only after a consumer is actually wanted and DIST01's remaining writer notes are settled.
**Program:** [Program](../../../designs/open/distributed-turn-poc/README.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md) · [D1](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md)

The folder name still says "dispatch bridge." That name is historical. This packet does not bridge RabbitMQ into Temporal.

## Goal

Define a versioned contract for one post-commit business fact and for the inbox of one independent consumer. The story-command wake stays the existing PostgreSQL outbox delivered by a direct Temporal RPC in [dispatch](../../../../apps/worker/src/outbox/dispatch.ts). RabbitMQ is not that wake. If no consumer is selected, this contract stays unused and the broker stays laboratory-only. This packet does not add a broker requirement to the turn.

## Prerequisites

ARCH02 is merged. The normative classes are [Commands, business events, and workflows](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows). K8S03 proved one disposable RabbitMQ replica and deleted the cluster. That laboratory is not an application producer. No cluster is required for these contract tests. K8S06's deleted Temporal 1.32.2 laboratory is not a prerequisite, because this packet must not start Temporal from a broker. DATA02's checkpoint work is not Done and is not this packet.

## Scope

A candidate fact envelope carries an event id, story id, passage id, committed revision and root, causation, and visibility-safe references. A type name ends in a version. The consumer records the event id in its inbox before any local effect. Replaying the event does not mint a command id, does not start a workflow, does not set the canon root, does not rewrite a passage, and does not apply mechanics.

The wake notice already handled by `selectNoticeDispatch` stays on the Temporal client. `leaseId` never leaves SQL. Superseded, and not a schema to build: a broker envelope whose job was to carry `operationId` into Temporal, including the old dispatch-notice draft and a `startWorkflowOnce` facade aimed at that hop.

## Paths

Later implementation, only if selected, may add a pure schema and validator under `packages/contracts/src/` and a pure mapping beside [dispatch.ts](../../../../apps/worker/src/outbox/dispatch.ts). It must not retarget wake topics. It must not add a broker consumer that calls Temporal. It must not edit the scene-checkpoint writer. Canonical headings are updated in that later diff, and only the headings that actually change. This documentation pass does not edit them.

## Migration and rollback

No dual route. Wake topics remain on the direct relay. A fact topic, if added later, is additive. Rollback is to stop publishing the fact. Workflow ids, the SSE hint, and the engine checkpoint are untouched. There is nothing to drain from a Rabbit-to-Temporal adapter because that adapter is not part of this packet.

## Acceptance

**Positive:** a provider-free test accepts one known fact version, rejects an unknown version, and shows that a second delivery of the same event id does not create a second command or a second workflow start. The existing wake mapping in `selectNoticeDispatch` still calls Temporal directly when this schema is loaded.

**Negative:** a payload shaped like a workflow wake is rejected by this contract. A missing broker does not block the Temporal wake, scene publication, or the SSE GET. A consumer lag does not change the committed root. The test does not require Kubernetes, and it does not claim a paid provider result.

## Exclusions

No paid provider, payments, image generation, Game Economy service, live secrets, or destructive data reset. Do not move the story SSE stream onto RabbitMQ. Do not move scene-checkpoint ownership off the engine.

## Parallelism

This packet is not executable because another packet was authorized. It does not share the cluster lock. It does not edit `apps/worker/src/runtime/index.ts` while another agent owns that file.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no player rule, inventory system, or economy service is introduced | docs/product/gameplay/rules.md | World-neutral play stays as written |
| Technical | unchanged because this packet follows the merged execution contract and does not edit it | docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | Direct Temporal wake stays the authority |
| Code | changed: apps/worker/src/outbox/dispatch.ts only after a later selection, and only to keep wake topics on the Temporal client. Negative: a wake-shaped payload must not start Temporal from RabbitMQ | apps/worker/src/outbox/dispatch.ts | Not selected. No code diff in AUD01 |
| Related | unchanged because D1 already states the optional consumer and this packet does not declare a new batch | work/designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md#operative-execution-rule | Proposed, not a queue edit |

## Reconciliation ledger (implementation has not started)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | technical | unchanged: this Proposed packet does not edit the merged wake rule | no source behavior changed | reviewed | A broker fact must not be read as the Temporal start | Left for the implementation Change if one is later selected |
