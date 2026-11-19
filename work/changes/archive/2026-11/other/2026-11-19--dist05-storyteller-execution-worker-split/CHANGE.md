# DIST05 | Split model execution and scene publication into separately deployed owners

**State:** Cancelled/superseded (2026-11-19). Not Done. Acceptance cases moved to STORY03. The split is not implemented.  
**Supersession:** HK09 archived this packet as Cancelled/superseded, not Done. The unique acceptance cases and negative tests now live in [STORY03](../../../../open/2026-11-19--story03-separate-temporal-executor-and-publication/CHANGE.md#absorbed-dist05-cases-2026-11-19). No provider was called.
  
**Kind:** implementation  
**Execution:** Not automatically authorized; owner/coordinator selects after prerequisites are verified.  
**Program:** [Program](../../../../../designs/open/distributed-turn-poc/README.md) · [Gap register](../../../../../designs/open/distributed-turn-poc/GAPS.md) · [D1 candidate contract](../../../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md)

## Goal / independently verifiable outcome

Split model execution and scene publication into separately deployed owners. This Change is one bounded implementation outcome in the [distributed-turn POC](../../../../../designs/open/distributed-turn-poc/README.md), not authorization to implement the entire initiative.

## Current source owners and exact baseline

Source inspected on 2026-11-19 at GitHub `main`: [Work queue](../../../../README.md), [runtime](../../../../../../apps/worker/src/runtime/index.ts), [worker Activity adapter](../../../../../../apps/worker/src/activities/index.ts), [outbox](../../../../../../apps/worker/src/outbox/dispatch.ts), [application stories](../../../../../../packages/application/src/stories/README.md), [Storyteller publication](../../../../../../docs/technical/storyteller/generation-and-publication.md), [canonical files](../../../../../../docs/technical/storyteller/canonical-documents-and-packages.md). Reinspect current HEAD and the user's active Cursor branches. The source currently combines work in `apps/worker`; this plan does **not** claim it is already distributed. Existing local Compose stays a working fallback.

**Prerequisites:** DIST01 + DIST03; DIST02/DIST04 for live distributed dispatch; ARCH03/ARCH05 source and task requirements before real canon publication.

## Implementation / documentation delta

Split `createStorytellerRuntime.complete()` at the **existing durable attempt/proposal boundary** into (A) a model-execution-only Temporal Activity on a dedicated Storyteller task queue and (B) Game Authority guarded publication against saved proposal. Reuse `createStorytellerExecution`, existing provider-dispatch gates, `publishStorytellerResult`, task capture, and document staging, refactoring ownership instead of reimplementing them. The Storyteller worker receives only operation/task reference + pinned authorized context, scoped document reads and fake/live provider configuration; cannot independently write story, item, passage or canon-root tables. If existing execution persistence requires write access to generation/usage tables, define a **narrow attempt-recording service boundary** rather than granting broad game write authority. Use versioned Temporal workflow/task-queue route, retaining old recorded workflow histories. The Game Authority owns validation and final publication only. Deliver one provider-free continuation from committed choice to saved proposal to published scene, without yet claiming historical any-scene forks.

**Specific owners/paths to touch:** `packages/application/src/storyteller/{runtime,execution,publication,context-capture}.ts`; `apps/worker/src/{activities/index,runtime/index,bootstrap}` split or companion `apps/storyteller-worker` entrypoint; `packages/workflows/src/{contracts,index}.ts` with replay-safe workflow version; private contract schema and tests. Update Storyteller operation, publication and runtime source maps.

**Hard exclusions:** No paid provider dispatch, no Stripe or customer billing, no image generator, no arbitrary new gameplay, no fictional Economy service, no live secrets or destructive data reset. Do not work around a missing architectural contract by claiming the service is 'blocked forever'; report one concrete mismatch with exact sources and revise the narrow contract.

## Acceptance: positive and discriminating negative

**Positive proof:** Fake-provider full harness test with separate execution/publication service adapters, saved attempt/proposal artifacts, Task Queue isolation, worker interruption and stale-root refusal; optionally one local cluster run after DIST04, but mark tests and environment precisely.

**Negative proof:** Storyteller process has no SQL permissions to mutate mechanical state or published root; stale proposal does not publish; crash after provider response doesn't rerun paid call; one exact proposal is published once despite workflow replay. No model call while SQL lock held.

**Evidence/report:** source and SHA inspected; intended/actual command and event state diagram; file diff; exact commands/tests and result counts; status of each normal/negative test; version/compatibility and resource evidence where relevant. Tests on fakes do not count as deployed Rabbit/Temporal proof. Never mark a contract satisfied merely because a Pod is Ready.

## Documentation is a required implementation plane

Update the **canonical** owning headings as part of the same code diff or ratifying documentation Change: [topology](../../../../../../docs/technical/platform/topology.md#distributed-learning-target), [execution/outbox](../../../../../../docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery), [data](../../../../../../docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record), [Storyteller](../../../../../../docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do), and the relevant source maps/runbooks/STATUS. Edit **only the owner headings materially changed**; leave reasoned no-ops. Do not copy this packet wholesale into every spec. Historical product promises on D&D, scene forking and canonical files remain intact. Run `pnpm wiki:change-guard --mode plan` and `--mode close`, source-relevant tests and doc link checks where available, report skipped checks honestly.

## Parallel orchestration

Can research application split alongside DIST03, but code edits to `apps/worker/src/runtime/index.ts` conflict with DIST04 and require serial integration or separate new entrypoint. ARCH03/05 docs independent research can overlap.

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
