# STORY04 | Prove remote bounded canonical reads and one validated Storyteller publication

**State:** Proposed end-to-end gate (2026-11-19)  
**Kind:** implementation  
**Selection:** Not included in active Kubernetes batch; explicit approval required.  
**Design:** [D4 Storyteller handoff](../../../designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md) · [D1 service choreography](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md) · [DISTURN](../../../designs/open/distributed-turn-poc/README.md)

## Outcome / prerequisites

**Outcome:** Prove remote bounded canonical reads and one validated Storyteller publication.  
**Preconditions:** STORY02/03, DATA03/05/06, DIST03/04/05, working K8S05/06/K8S11 and root-pinned fixture.

**Source observed on main 2026-11-19:** `packages/application/src/storyteller/runtime.ts::createStorytellerRuntime.complete` combines generation and publication; `execution.ts::createStorytellerExecution` reads/writes generation and attempt ledger and may call provider; `publication.ts::publishStorytellerResult` validates/canon-stages then locks/adopts game state; `packages/workflows/src/index.ts::storytellerV1` uses a single retryable `completeStoryteller` Activity; `apps/worker/src/activities/index.ts` still shares Storyteller and game collaborators. Durable funding/attempt and uncertainty schema already exists in `packages/db/src/schema/storyteller.ts`. Reinspect latest HEAD, active Cursor branches and test scripts before changing any file.

## Concrete scope / contract

Exercise one frozen scene2 task from Nest admitted choice through GA capture, Rabbit/Temporal, separate executor, bounded ask_memory/read_memory or automatically prepacked source, saved typed fake-model proposal with a descriptive canon revision, and GA publication with current state+canon root+checkpoint. Prove exact source hashes through real S3 across distinct Pods; do not read from a Pod-local fallback. Browser must GET committed state after SSE. Make fixture include one unchanged canon and one accepted descriptive patch, plus a later-parent scene leakage negative on historical branch. Record causal IDs and actual trace; stop if any upstream package is not yet consistent, report gap rather than fabricate green proof.

**Intended source and documentation owners:** connected test fixture and infra/kubernetes integration scripts, source app wiring only as justified, docs/technical/storyteller/{generation-and-publication,context-selection-and-recall}, docs/runbooks + dated evidence report, no new product mechanics.

**Exclusions:** No direct arbitrary Storyteller writes to `story`/`campaign`/`story_passage`/`story_document_commit`; no separate invented attempt/charge ledger; no extra model round or automatically billed retry; no Cognee/Code Mode dependency; no image/Stripe/production HA; no fictional Economy subsystem.

## Acceptance and negative tests

One provider-free end-to-end scene with 1 proposal, 1 authoritative passage, 1 root and immutable checkpoint. Wrong branch/root, stale task, invalid document patch, duplicate result, S3 outage and executor restart do not create half-published scene or second billable request. All source and runtime versions logged, no paid model.

Required receipt: source SHA and diff, exact versioned request/task/result schema, stable IDs, credential/read scopes, retry/uncertain/resume state diagram, tests/run commands/actual results and negative cases, docs impact, proof tier (pure, local compose or real multi-Pod). Unit tests alone never establish Kubernetes operation. Scripted provider test never implies paid provider correctness.

## Parallel scheduling

Read-only fixture work can overlap STORY03 and DATA06, but actual cluster proof is a single integration gate after prerequisites. Coordinate DIST06 to avoid two competing end-to-end harnesses.

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
