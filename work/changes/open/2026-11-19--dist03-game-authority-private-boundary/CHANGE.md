# DIST03 | Introduce independently deployable Game Authority boundary without migrating all gameplay

**State:** Proposed; promote after DIST01 (2026-11-19)  
**Kind:** implementation  
**Execution:** Not automatically authorized; owner/coordinator selects after prerequisites are verified.  
**Program:** [Program](../../../designs/open/distributed-turn-poc/README.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md) · [D1 candidate contract](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md)

## Goal / independently verifiable outcome

Introduce independently deployable Game Authority boundary without migrating all gameplay. This Change is one bounded implementation outcome in the [distributed-turn POC](../../../designs/open/distributed-turn-poc/README.md), not authorization to implement the entire initiative.

## Current source owners and exact baseline

Source inspected on 2026-11-19 at GitHub `main`: [Work queue](../../README.md), [runtime](../../../../apps/worker/src/runtime/index.ts), [worker Activity adapter](../../../../apps/worker/src/activities/index.ts), [outbox](../../../../apps/worker/src/outbox/dispatch.ts), [application stories](../../../../packages/application/src/stories/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md), [canonical files](../../../../docs/technical/storyteller/canonical-documents-and-packages.md). Reinspect current HEAD and the user's active Cursor branches. The source currently combines work in `apps/worker`; this plan does **not** claim it is already distributed. Existing local Compose stays a working fallback.

**Prerequisites:** DIST01 selected writer/method ownership. Does not need broker, Temporal or paid LLM for local HTTP tests.

## Implementation / documentation delta

Add an `apps/game-authority` entrypoint or an explicitly separate app composition (do **not** duplicate a monolith under a new label). Initially migrate **one** approved operation seam: owned story snapshot read and one admitted existing scripted story resolution with persisted operation receipt. Reuse `createStoryApplication` / `createStoryResolution` and `lockOwnedStory` logic rather than reproducing policies in controllers. Introduce versioned private endpoint(s) or equivalent narrow transport defined by DIST01, with service authentication and actor provenance, strong internal DTO validation, exact 200/202/409/404 semantics, bounded timeouts and no browser-visible route. Nest remains the browser-facing auth/CSRF authority but must call GA instead of directly mutating the migrated story operation in distributed mode. Old Compose mode remains unchanged. Start/full campaign commands and canonical publication are **not** implicitly migrated by this slice.

**Specific owners/paths to touch:** Likely `apps/game-authority/src/{bootstrap,routes,application}` or other source-conforming layout; `apps/api/src/modules/stories/controller.ts` with injection seam, `packages/contracts/src` for private DTO; `packages/application/src/stories/{index,resolution,reads,resolution-receipt}.ts` only when necessary and no duplicate SQL writer; tests in existing API integration owners; runbook and topology/HTTP contract updates.

**Hard exclusions:** No paid provider dispatch, no Stripe or customer billing, no image generator, no arbitrary new gameplay, no fictional Economy service, no live secrets or destructive data reset. Do not work around a missing architectural contract by claiming the service is 'blocked forever'; report one concrete mismatch with exact sources and revise the narrow contract.

## Acceptance: positive and discriminating negative

**Positive proof:** Provider-free integration with two process entrypoints: browser-facing Nest accepted operation → GA SQL transaction → stable receipt, repeat exact request returns same outcome, different body same operation ID conflicts, owner switch denied, local Compose route still passes baseline tests.

**Negative proof:** Two GA instances accept same operation concurrently → only one admitted receipt; forged service credential/owner or wrong story → 401/403/404 as appropriate; Nest cannot keep legacy writer active for migrated route; no API->GA routing from public gateway.

**Evidence/report:** source and SHA inspected; intended/actual command and event state diagram; file diff; exact commands/tests and result counts; status of each normal/negative test; version/compatibility and resource evidence where relevant. Tests on fakes do not count as deployed Rabbit/Temporal proof. Never mark a contract satisfied merely because a Pod is Ready.

## Documentation is a required implementation plane

Update the **canonical** owning headings as part of the same code diff or ratifying documentation Change: [topology](../../../../docs/technical/platform/topology.md#distributed-learning-target), [execution/outbox](../../../../docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery), [data](../../../../docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record), [Storyteller](../../../../docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do), and the relevant source maps/runbooks/STATUS. Edit **only the owner headings materially changed**; leave reasoned no-ops. Do not copy this packet wholesale into every spec. Historical product promises on D&D, scene forking and canonical files remain intact. Run `pnpm wiki:change-guard --mode plan` and `--mode close`, source-relevant tests and doc link checks where available, report skipped checks honestly.

## Parallel orchestration

After DIST01, separate worktree from DIST02 transport adapter; no change to worker runtime, docs shared headings coordinated in integration. Cluster deploy later with DIST06.

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
