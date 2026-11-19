# DIST02 | Versioned RabbitMQ/Temporal dispatch contracts and provider-free adapters

**State:** Proposed; promote after DIST01 (2026-11-19)  
**Kind:** implementation  
**Execution:** Not automatically authorized; owner/coordinator selects after prerequisites are verified.  
**Program:** [Program](../../../designs/open/distributed-turn-poc/README.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md) · [D1 candidate contract](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md)

**Mandatory scope correction, 2026-11-19:** Previous broker→Temporal `dispatch-notice.v1` scope conflicts with merged ARCH02. This packet must be **revised before selection** to define versioned postcommit business fact envelope (candidate `scene.published.v1`: eventId, storyId, passageId, sceneSequence, committed root/revision, causation/correlation and visibility-safe references), plus independent derived read-model consumer inbox/dedup and ordering rules. RabbitMQ is NOT a workflow wake bridge. Preserve the direct outbox→Temporal path. Follow [execution reconciliation](../../../designs/open/distributed-turn-poc/EXECUTION-RECONCILIATION-2026-11-19.md). **Old sections below are historical draft, not implementation instructions where conflicting.**

## Goal / independently verifiable outcome

Versioned RabbitMQ/Temporal dispatch contracts and provider-free adapters. This Change is one bounded implementation outcome in the [distributed-turn POC](../../../designs/open/distributed-turn-poc/README.md), not authorization to implement the entire initiative.

## Current source owners and exact baseline

Source inspected on 2026-11-19 at GitHub `main`: [Work queue](../../README.md), [runtime](../../../../apps/worker/src/runtime/index.ts), [worker Activity adapter](../../../../apps/worker/src/activities/index.ts), [outbox](../../../../apps/worker/src/outbox/dispatch.ts), [application stories](../../../../packages/application/src/stories/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md), [canonical files](../../../../docs/technical/storyteller/canonical-documents-and-packages.md). Reinspect current HEAD and the user's active Cursor branches. The source currently combines work in `apps/worker`; this plan does **not** claim it is already distributed. Existing local Compose stays a working fallback.

**Prerequisites:** DIST01 ratified; K8S03 RabbitMQ installation may progress independently; no running cluster required for unit tests.

## Implementation / documentation delta

Extend `@offscreen/contracts` with a **new** Zod `dispatch-notice.v1` envelope: `schemaVersion,noticeId,topic,operationId,correlationId` with optional validated trace context. Never send leaseId or full story/player/model data. Introduce pure conversion/validation modules for existing `@offscreen/application/outbox` Notice and the stable `selectNoticeDispatch` mapping, and an injected transport facade `publishConfirmed` / `startWorkflowOnce` suitable for fakes. Design broker consumer ACK semantics: only after Temporal durable start/already-started; unknown result retries original workflow ID. Do not yet replace the existing operational relay or start any paid task. Keep stable ID calculation and existing `storytellerWorkflowId`/other workflow helpers. Implement bounded explicit allowlist, reject unknown version/topic and poison payloads to a documented disposition with no endless tight-loop.

**Specific owners/paths to touch:** `packages/contracts/src/` (new namespaced internal dispatch schema + package exports), `apps/worker/src/outbox/dispatch.ts` or small sibling pure adapter, isolated `apps/worker/test` / existing test owner, optional new `packages/messaging` only if existing package boundaries cannot host transport protocol cleanly. Update contracts, dispatch documentation and source maps in same diff.

**Hard exclusions:** No paid provider dispatch, no Stripe or customer billing, no image generator, no arbitrary new gameplay, no fictional Economy service, no live secrets or destructive data reset. Do not work around a missing architectural contract by claiming the service is 'blocked forever'; report one concrete mismatch with exact sources and revise the narrow contract.

## Acceptance: positive and discriminating negative

**Positive proof:** Provider-free tests verify Zod schema, legacy Notice→wire mapping, duplicate/AlreadyStarted, Temporal timeout/unknown, NACK/ack choice, poison disposition and exhaustive allowlisted topics; no broker required to prove adapter semantics.

**Negative proof:** Unrecognized notice, injected foreign topic, payload with lease token, malformed UUID, different operation with same ID, or lost ACK cannot trigger a new business effect or unbounded retry; legacy executor is unchanged in this slice.

**Evidence/report:** source and SHA inspected; intended/actual command and event state diagram; file diff; exact commands/tests and result counts; status of each normal/negative test; version/compatibility and resource evidence where relevant. Tests on fakes do not count as deployed Rabbit/Temporal proof. Never mark a contract satisfied merely because a Pod is Ready.

## Documentation is a required implementation plane

Update the **canonical** owning headings as part of the same code diff or ratifying documentation Change: [topology](../../../../docs/technical/platform/topology.md#distributed-learning-target), [execution/outbox](../../../../docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery), [data](../../../../docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record), [Storyteller](../../../../docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do), and the relevant source maps/runbooks/STATUS. Edit **only the owner headings materially changed**; leave reasoned no-ops. Do not copy this packet wholesale into every spec. Historical product promises on D&D, scene forking and canonical files remain intact. Run `pnpm wiki:change-guard --mode plan` and `--mode close`, source-relevant tests and doc link checks where available, report skipped checks honestly.

## Parallel orchestration

Independent worktree alongside DIST03 Game Authority contract scaffolding and K8S releases once DIST01 ratifies. No edits to shared root lockfile or `apps/worker/src/runtime/index.ts` while another agent touches it.

A user-approved Cursor orchestrator may distribute truly disjoint Ready Changes into isolated worktrees. It must integrate dependencies, shared canonical-doc headings and the same cluster itself. **A Proposed packet is not executable merely because another packet was authorized.**

## Planned-impact.v1 (complete receipt before archiving)

| Plane | Exact planned difference | Proof |
| --- | --- | --- |
| Product | unchanged; world-neutral D&D, text-first DM, admitted mechanical truth, forkable scenes | No new economy, mandatory inventory or invented rule |
| Technical | Preserve the selected single writer, pinned canonical roots and nonoverlapping Rabbit/Temporal roles; amend only source-proved gaps | Normal and negative sequence/contract check |
| Code | Scoped implementation in named file owners above; no unrelated monolith-wide refactor | Actual diff, tests and version compatibility |
| Related | Update affected source maps, docs index, runbooks, Change queue, dated STATUS only when runtime behavior is proven | Wiki/Change guards, links and evidence |

## Reconciliation ledger (fill with actual evidence)

| Owning claim/heading | Expected delta or reasoned no-op | Source SHA / diff | Test or semantic proof | Negative proof | Status/link |
| --- | --- | --- | --- | --- | --- |
| Technical runtime owner | Pending | Pending | Pending | Pending | Pending |
| Execution / outbox owner | Pending | Pending | Pending | Pending | Pending |
| Product/scene and Storyteller boundary | unchanged unless ratified | Pending | Pending | Pending | Pending |
| Source implementation / tests | pending | Pending | Pending | Pending | Pending |

**Closure:** Reconcile the ledger, archive Done/Cancelled per established workflow, repair inbound links, stop. No automatic successor selection.
