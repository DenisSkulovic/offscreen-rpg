# STORY01 | Ratify remote Storyteller task, attempt and publication ownership

**State:** Ready for owner-selected design reconciliation (2026-11-19)  
**Kind:** documentation  
**Selection:** Not included in active Kubernetes batch; explicit approval required.  
**Design:** [D4 Storyteller handoff](../../../designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md) · [D1 service choreography](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md) · [DISTURN](../../../designs/open/distributed-turn-poc/README.md)

## Outcome / prerequisites

**Outcome:** Ratify remote Storyteller task, attempt and publication ownership.  
**Preconditions:** DIST01 + ARCH03/ARCH05 source designs, while DIST05 remains proposed and overlapping source is inspected.

**Source observed on main 2026-11-19:** `packages/application/src/storyteller/runtime.ts::createStorytellerRuntime.complete` combines generation and publication; `execution.ts::createStorytellerExecution` reads/writes generation and attempt ledger and may call provider; `publication.ts::publishStorytellerResult` validates/canon-stages then locks/adopts game state; `packages/workflows/src/index.ts::storytellerV1` uses a single retryable `completeStoryteller` Activity; `apps/worker/src/activities/index.ts` still shares Storyteller and game collaborators. Durable funding/attempt and uncertainty schema already exists in `packages/db/src/schema/storyteller.ts`. Reinspect latest HEAD, active Cursor branches and test scripts before changing any file.

## Concrete scope / contract

Inspect createStorytellerRuntime.complete, createStorytellerExecution, provider budgeting/dispatch review, generation/stage schema, publishStorytellerResult and existing storytellerV1. Specify frozen reference, exact context branch/root/visibility, response/proposal states, private GA task and candidate endpoints, persistent attempt claim/retry correctness and Temporal two-step transition. Map current attempt records and avoid new billing ledger. Choose replay-safe workflow evolution (new named workflow or safe versioning) and one long-lived operation identity. Reconcile canonical docs, preserving current model-task roles and public scene snapshot authority.

**Intended source and documentation owners:** docs/technical/storyteller/{generation-and-publication,operation-and-controller,prompts-and-tools,request-context-and-cost}.md, docs/technical/platform/{execution-and-delivery,data-and-persistence,topology}.md, docs/technical/README.md; no code changes.

**Exclusions:** No direct arbitrary Storyteller writes to `story`/`campaign`/`story_passage`/`story_document_commit`; no separate invented attempt/charge ledger; no extra model round or automatically billed retry; no Cognee/Code Mode dependency; no image/Stripe/production HA; no fictional Economy subsystem.

## Acceptance and negative tests

Detailed mapping of every storytellerAttempt state and generation/publication disposition, role/task versions and where SQL writes live. Show retry after possible paid send, stale root, duplicate callback, script and provider-disabled paths. Demonstrate the existing Temporal activity cannot safely be treated as two independent operations without redesign.

Required receipt: source SHA and diff, exact versioned request/task/result schema, stable IDs, credential/read scopes, retry/uncertain/resume state diagram, tests/run commands/actual results and negative cases, docs impact, proof tier (pure, local compose or real multi-Pod). Unit tests alone never establish Kubernetes operation. Scripted provider test never implies paid provider correctness.

## Parallel scheduling

Read-only mapping with DATA01/BOOT packages and K8S infrastructure; shared Storyteller/technical headings serialized with ARCH03/05 and DIST01.

Only disjoint Ready Changes may run concurrently in isolated worktrees under an owner-approved batch. Shared workflow files, ledger migrations, authentication, canonical doc headings and the kind cluster have one integration owner. No automatic successor selection.

## planned-impact.v1

| Plane | Expected result | Required evidence |
| --- | --- | --- |
| Product | unchanged; text-first D&D-like game, Storyteller DM plus mechanically authoritative engine | No new gameplay or unapproved agent role |
| Technical | Reconcile Storyteller custody and remote publication contract | Disposition matrix, false-success/duplicate-send negatives |
| Code | No executable diff | Source tests; actual runtime evidence where requested |
| Related | Index, runbook, causal logging and STATUS only as evidenced | Link guards, Change reconciliation |

## Reconciliation ledger (fill before closure)

| Authority | Planned delta / no-op | Source SHA/diff | Positive / negative proof | Link/status |
| --- | --- | --- | --- | --- |
| Product | unchanged | Pending | Pending | Pending |
| Storyteller input + attempt custody | ratify | Pending | Pending | Pending |
| Game Authority publication + canon | review or bounded update | Pending | Pending | Pending |
| Workflow / runtime / docs | documentation only | Pending | Pending | Pending |

Run `pnpm wiki:change-guard --mode plan` and `--mode close` where supported, repair inbound links and archive actual outcome. No unverified Done.
