# DIST04 | Use RabbitMQ as the sole selected transport for one existing outbox notice

**State:** Proposed; depends on contracts and broker (2026-11-19)  
**Kind:** implementation  
**Execution:** Not automatically authorized; owner/coordinator selects after prerequisites are verified.  
**Program:** [Program](../../../designs/open/distributed-turn-poc/README.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md) · [D1 candidate contract](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md)

## Goal / independently verifiable outcome

Use RabbitMQ as the sole selected transport for one existing outbox notice. This Change is one bounded implementation outcome in the [distributed-turn POC](../../../designs/open/distributed-turn-poc/README.md), not authorization to implement the entire initiative.

## Current source owners and exact baseline

Source inspected on 2026-11-19 at GitHub `main`: [Work queue](../../README.md), [runtime](../../../../apps/worker/src/runtime/index.ts), [worker Activity adapter](../../../../apps/worker/src/activities/index.ts), [outbox](../../../../apps/worker/src/outbox/dispatch.ts), [application stories](../../../../packages/application/src/stories/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md), [canonical files](../../../../docs/technical/storyteller/canonical-documents-and-packages.md). Reinspect current HEAD and the user's active Cursor branches. The source currently combines work in `apps/worker`; this plan does **not** claim it is already distributed. Existing local Compose stays a working fallback.

**Prerequisites:** DIST01 + DIST02, K8S03 working RabbitMQ; K8S06 Temporal reachable for cluster proof. Can build/test locally against fakes before all deployment.

## Implementation / documentation delta

Refactor `apps/worker/src/outbox/relay.ts` so one topic-selectable dispatcher chooses either existing **legacy direct Temporal** or the new broker publisher **not both**. Retain SQL lease/ack; broker publisher waits for actual publish confirm before SQL ACK, with explicit uncertain-publish replay rules. Add separate broker→Temporal adapter process/entrypoint that validates `dispatch-notice.v1`, maps the existing `selectNoticeDispatch` topic to the same stable workflow type/ID, starts/wakes Temporal and ACKs Rabbit only after durable confirmation or AlreadyStarted; NACK/retry otherwise, poison quarantine/DLQ as specified. Migrate just `storytellerTopic` or a **safe scripted nonpaid topic after evidence review**; other topics stay legacy until separate changes. Emit causal redacted metrics. Keep Temporal existing history/task queue backward compatible.

**Specific owners/paths to touch:** `apps/worker/src/outbox/{relay,dispatch}.ts`, isolated new `apps/worker/src/broker` or separate `apps/dispatch-bridge` entrypoint for adapter, `packages/contracts` from DIST02, controlled config under `apps/worker/src/bootstrap`; operational manifests in existing K8S03/K8S06 ownership only after dependency join; event runbook.

**Hard exclusions:** No paid provider dispatch, no Stripe or customer billing, no image generator, no arbitrary new gameplay, no fictional Economy service, no live secrets or destructive data reset. Do not work around a missing architectural contract by claiming the service is 'blocked forever'; report one concrete mismatch with exact sources and revise the narrow contract.

## Acceptance: positive and discriminating negative

**Positive proof:** Test with disposable Rabbit+Temporal and existing SQL fixture, plus injected failures at each acknowledgment boundary, count workflow starts and game effects; deterministic fake provider only; no success claim from publish/consume alone.

**Negative proof:** Crash before broker confirm leaves SQL notice retryable; crash after broker confirm before SQL ACK causes duplicate broker notice but exactly one Temporal start; Temporal down → Rabbit retry; no dual legacy and broker dispatch for same topic; bad envelope never loops forever.

**Evidence/report:** source and SHA inspected; intended/actual command and event state diagram; file diff; exact commands/tests and result counts; status of each normal/negative test; version/compatibility and resource evidence where relevant. Tests on fakes do not count as deployed Rabbit/Temporal proof. Never mark a contract satisfied merely because a Pod is Ready.

## Documentation is a required implementation plane

Update the **canonical** owning headings as part of the same code diff or ratifying documentation Change: [topology](../../../../docs/technical/platform/topology.md#distributed-learning-target), [execution/outbox](../../../../docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery), [data](../../../../docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record), [Storyteller](../../../../docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do), and the relevant source maps/runbooks/STATUS. Edit **only the owner headings materially changed**; leave reasoned no-ops. Do not copy this packet wholesale into every spec. Historical product promises on D&D, scene forking and canonical files remain intact. Run `pnpm wiki:change-guard --mode plan` and `--mode close`, source-relevant tests and doc link checks where available, report skipped checks honestly.

## Parallel orchestration

Worktree independent from DIST03 HTTP extraction once DIST02 delivered. **Shared worker outbox files** single owner. Deployments touching the shared kind cluster need lock/integration scheduling.

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
