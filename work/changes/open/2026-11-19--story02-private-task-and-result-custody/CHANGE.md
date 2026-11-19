# STORY02 | Implement typed private Storyteller task/result custody facade

**State:** Proposed after STORY01 (2026-11-19)  
**Kind:** implementation  
**Selection:** Not included in active Kubernetes batch; explicit approval required.  
**Design:** [D4 Storyteller handoff](../../../designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md) · [D1 service choreography](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md) · [DISTURN](../../../designs/open/distributed-turn-poc/README.md)

## Outcome / prerequisites

**Outcome:** Implement typed private Storyteller task/result custody facade.  
**Preconditions:** STORY01 selected, DIST03 private GA boundary; scripted source path available without running Rabbit/Temporal.

**Source observed on main 2026-11-19:** `packages/application/src/storyteller/runtime.ts::createStorytellerRuntime.complete` combines generation and publication; `execution.ts::createStorytellerExecution` reads/writes generation and attempt ledger and may call provider; `publication.ts::publishStorytellerResult` validates/canon-stages then locks/adopts game state; `packages/workflows/src/index.ts::storytellerV1` uses a single retryable `completeStoryteller` Activity; `apps/worker/src/activities/index.ts` still shares Storyteller and game collaborators. Durable funding/attempt and uncertainty schema already exists in `packages/db/src/schema/storyteller.ts`. Reinspect latest HEAD, active Cursor branches and test scripts before changing any file.

## Concrete scope / contract

Add narrow versioned private API/service facade to obtain a committed Storyteller task by generationId with pinned revision/root/capture SHA and permitted source handles, idempotently claim execution, record bounded attempt/usage state, and submit a validated result plus stable output hash. Reuse existing generation, storytellerAttempt, funding and execution-stage records; do not add duplicate charge schema. Update createStorytellerExecution seams to accept injected custody operations rather than freely writing game tables. Keep fake/scripted provider first, no paid wire permission. A persistent idempotent CAS/claim is required across two worker processes, not the in-memory activeGenerationIds Set. Service credentials must prevent arbitrary users and one task from accessing another story.

**Intended source and documentation owners:** packages/application/src/storyteller/{execution,runtime,budget,dispatch-review,dispatch-authority}.ts as necessary, apps/game-authority private handler, packages/contracts internal storyteller contract, packages/db schema only if an actual missing fence is demonstrated, provider-free unit/integration tests; docs/technical/storyteller and execution source maps.

**Exclusions:** No direct arbitrary Storyteller writes to `story`/`campaign`/`story_passage`/`story_document_commit`; no separate invented attempt/charge ledger; no extra model round or automatically billed retry; no Cognee/Code Mode dependency; no image/Stripe/production HA; no fictional Economy subsystem.

## Acceptance and negative tests

Two independent executors race on generation ID: one owns dispatch; repeated same result/hash returns same status; different hash conflicts; frozen root/branch mismatch refused; unknown provider wire cannot accidentally dispatch. Existing scripted tests pass; no GA story/item/root mutation occurs from executor identity.

Required receipt: source SHA and diff, exact versioned request/task/result schema, stable IDs, credential/read scopes, retry/uncertain/resume state diagram, tests/run commands/actual results and negative cases, docs impact, proof tier (pure, local compose or real multi-Pod). Unit tests alone never establish Kubernetes operation. Scripted provider test never implies paid provider correctness.

## Parallel scheduling

Can run in independent worktree alongside DATA02 and BOOT02 once STORY01 settled. Shared GA auth DTO or storyteller execution files coordinate with DIST03/DIST05.

Only disjoint Ready Changes may run concurrently in isolated worktrees under an owner-approved batch. Shared workflow files, ledger migrations, authentication, canonical doc headings and the kind cluster have one integration owner. No automatic successor selection.

## planned-impact.v1

| Plane | Expected result | Required evidence |
| --- | --- | --- |
| Product | unchanged; text-first D&D-like game, Storyteller DM plus mechanically authoritative engine | No new gameplay or unapproved agent role |
| Technical | Update exactly affected Storyteller/Temporal/game authority owners with proven process boundary | Disposition matrix, false-success/duplicate-send negatives |
| Code | Bounded API, activity and test implementation in named owners | Source tests; actual runtime evidence where requested |
| Related | Index, runbook, causal logging and STATUS only as evidenced | Link guards, Change reconciliation |

## Reconciliation ledger (fill before closure)

| Authority | Planned delta / no-op | Source SHA/diff | Positive / negative proof | Link/status |
| --- | --- | --- | --- | --- |
| Product | unchanged | Pending | Pending | Pending |
| Storyteller input + attempt custody | implement | Pending | Pending | Pending |
| Game Authority publication + canon | review or bounded update | Pending | Pending | Pending |
| Workflow / runtime / docs | versioned implementation | Pending | Pending | Pending |

Run `pnpm wiki:change-guard --mode plan` and `--mode close` where supported, repair inbound links and archive actual outcome. No unverified Done.
