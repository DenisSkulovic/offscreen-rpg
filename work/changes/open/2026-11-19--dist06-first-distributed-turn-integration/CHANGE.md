# DIST06 | Run one provider-free published scene across the real distributed runtime

**State:** Proposed; integration gate (2026-11-19)  
**Kind:** implementation  
**Execution:** Not automatically authorized; owner/coordinator selects after prerequisites are verified.  
**Program:** [Program](../../../designs/open/distributed-turn-poc/README.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md) · [D1 candidate contract](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md)

## Goal / independently verifiable outcome

Run one provider-free published scene across the real distributed runtime. This Change is one bounded implementation outcome in the [distributed-turn POC](../../../designs/open/distributed-turn-poc/README.md), not authorization to implement the entire initiative.

## Current source owners and exact baseline

Source inspected on 2026-11-19 at GitHub `main`: [Work queue](../../README.md), [runtime](../../../../apps/worker/src/runtime/index.ts), [worker Activity adapter](../../../../apps/worker/src/activities/index.ts), [outbox](../../../../apps/worker/src/outbox/dispatch.ts), [application stories](../../../../packages/application/src/stories/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md), [canonical files](../../../../docs/technical/storyteller/canonical-documents-and-packages.md). Reinspect current HEAD and the user's active Cursor branches. The source currently combines work in `apps/worker`; this plan does **not** claim it is already distributed. Existing local Compose stays a working fallback.

**Prerequisites:** DIST01–DIST05, K8S05 S3, K8S06 Temporal, K8S09 edge, K8S11 Next/Nest, required K8S07 signals; ARCH03 scene target for checkpoint semantics. Existing K8S08 skeleton may be reused but never counted as proof.

## Implementation / documentation delta

Build a reproducible lab composition / release profile for actual Nest, Next, GA, Rabbit dispatcher, Temporal control and Storyteller execution deployments with CloudNativePG and S3 object store, avoiding new global scripts that clash with existing K8S manifests. Establish stable Secrets/config, schema-migration Job, image tag/digest, probes, bounded memory and safe teardown. Use an authored package/solo start, one committed supported choice/effect, a fake Storyteller proposal, S3-staged passage and guarded scene publication, SSE→GET. Save operation-level evidence trace across every hop, restart API/Storyteller and replay broker without duplicate effect. **Arbitrary historical fork requires a separate checkpoint/fork Change before calling the complete DISTURN POC Done**, so record this as a pre-fork vertical slice only.

**Specific owners/paths to touch:** Use `infra/kubernetes/lab/` overlays and existing K8S Change owners, `tools/api-integration/test` for connected fixture, `apps/web` existing Story page, release scripts. Cross-service causal ID and docs/runbook/evidence.

**Hard exclusions:** No paid provider dispatch, no Stripe or customer billing, no image generator, no arbitrary new gameplay, no fictional Economy service, no live secrets or destructive data reset. Do not work around a missing architectural contract by claiming the service is 'blocked forever'; report one concrete mismatch with exact sources and revise the narrow contract.

## Acceptance: positive and discriminating negative

**Positive proof:** Cold create cluster, migrate disposable app DB, build/load image digests, create/start, choose, trace stable operation ID through broker/workflow/model fake/SQL/S3, view new scene from GET and SSE; repeat after restart and record actual RAM and limitations.

**Negative proof:** A 202 never displays uncommitted scene; any-SSE failure doesn't POST again; S3 down holds publication; duplicate Rabbit or Temporal work cannot duplicate effect; no pod-local canonical files, no live provider by default.

**Evidence/report:** source and SHA inspected; intended/actual command and event state diagram; file diff; exact commands/tests and result counts; status of each normal/negative test; version/compatibility and resource evidence where relevant. Tests on fakes do not count as deployed Rabbit/Temporal proof. Never mark a contract satisfied merely because a Pod is Ready.

## Documentation is a required implementation plane

Update the **canonical** owning headings as part of the same code diff or ratifying documentation Change: [topology](../../../../docs/technical/platform/topology.md#distributed-learning-target), [execution/outbox](../../../../docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery), [data](../../../../docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record), [Storyteller](../../../../docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do), and the relevant source maps/runbooks/STATUS. Edit **only the owner headings materially changed**; leave reasoned no-ops. Do not copy this packet wholesale into every spec. Historical product promises on D&D, scene forking and canonical files remain intact. Run `pnpm wiki:change-guard --mode plan` and `--mode close`, source-relevant tests and doc link checks where available, report skipped checks honestly.

## Parallel orchestration

Independent image build and test-fixture work may start after stable contracts; cluster deployments and shared integration are serialized. Never launch load/chaos before POC golden path is stable.

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
