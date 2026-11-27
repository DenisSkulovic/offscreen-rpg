# Planner-first investigation | move discovery upstream of Cursor execution

**Owns:** source-grounded investigation and the facts/decisions needed before delegated implementation. Read current [AGENTS](../../AGENTS.md), [ChatGPT cold start](../../CHATGPT.md#mandatory-cold-start-contract-for-chatgpt-planning) and applicable [design gate](../rules/target-driven-renewal.md). Then [construct packet](packet-design-manual.md) and [review independently](packet-readiness-review.md).

## Responsibility split

Planner investigates broad relevant source, settles authority, architecture, interfaces and safety, records exact mappings and proof. Cursor verifies named local facts, performs decided edit and focused checks, reports contradictions. No claim of zero-search execution; local error-directed diagnosis is essential. Heavy acceptance stays with ChatGPT/owner.

## Before authoring: settle design, then map the current repo

1. Verify actual repo, integration branch/HEAD, rules, queue, related open/archive work, in-flight branches/worktrees and permissions. Respect clean-slate exclusions; inspect replaceable internals only at permitted phase. Mark inaccessible critical source/worktree explicitly; no guessed paths or readiness.
2. Establish accepted canonical outcome and scope; distinguish proposal, selected behavior, implementation and evidence. Material decisions/verification architecture must pass design gate before packet planning. Resolve genuine unknowns here, not in PATCH.
3. Trace affected entrypoints → owning functions/services → mutable rows/documents/IDs → transaction/root/checkpoint → outbox/consumers → readers/DTO/UI. Inspect actual implementations, schemas, tests, config, fixtures, callers and composition roots, including dependency and compatibility boundaries. Identify retries, failure, concurrency, migration, permissions, privacy, finance/spend and refused states where relevant.
4. Decide precise algorithm, interfaces, transformations and ownership. For extraction map source→destination symbols, exports, every known consumer/import, manifests/lockfiles and tests. For policy injection enumerate composition roots, policy source, default-deny and production/fixture behavior. Identify source drift conditions and allowed mechanical reconciliation.
5. Map target criterion → actual gap → independently measurable delta → preserved guarantees → discriminating proof. Specify exact write/read/excluded owners, dependencies and resource conflicts. Follow [submission scale](planning-artifact-quality.md#4-submission-scale-and-measurement); split independently safe outcomes, not transaction boundaries.
6. Specify exact normal/negative commands, cwd, fixtures, expected state, proof tier/owner, setup/cleanup and authorization. Unresolved decisions or unavailable indispensable evidence block affected execution; ordinary dependency-gated work is not a design defect.

## Depth proportional to task

| Task | Necessary planner depth |
| --- | --- |
| VERIFY | Named question/command, expected evidence, cwd, prerequisites, permissions, receipt |
| PATCH-S | Exact owner/symbol, focused change and test |
| PATCH-M | Affected callers, data/control flow, contracts, failure and test route |
| PATCH-L | Full relevant state/ID map, SQL ownership, transaction/root/fence, API, replay/crash/migration and harness; repartition until bounded |
| INVESTIGATE | One factual question, diagnostic evidence and stop. Architecture decisions stay in Design/planner. |

A one-line authorization edit may require deep investigation; file count is not risk. Do not make a link fix an architecture exercise.

## Mandatory planner-to-executor contract (for material implementation)

Use [file roles](planning-artifact-quality.md#3-execution-packet-shape): SOURCE-MAP records verified SHA, actual graph and affected source facts; EXECUTION/INTERFACES or exact canonical section records chosen behavior, authority and failure semantics; PROOF records falsifiable commands and outcomes by executor; TASKS records bounded assignments. A tiny route may combine roles in CHANGE.md; never require material multi-task work to reconstruct them from PLAN or history.

Record relevant source facts by path and symbol, authority/selected versus implemented, exact data/control and owner mapping, prerequisites, preserved invariants, permitted edits, negatives, rollback/refusal and explicit residual unknowns. The child gets 2–5 initial anchors plus precise mandatory contract sections; broad planner reads are not child preload.

## Readiness gate and audit

Apply [packet readiness](packet-readiness-review.md) to each actual candidate. Verify source and decisions, ownership and dependency order, task simulation, proof and closure. Missing material authority/source is Proposed/PLANNER-BLOCKED or UNVERIFIED, not guessed Ready. Verified frozen predecessor postconditions may gate later dispatch without repeat planner approval; changed semantics require refresh. Use tools now when available rather than assigning broad research to paid execution.

## Example: DATA04 historical fork

Reject "inspect forks.ts, reads.ts and checkpoint.ts; figure out historical fork". Planner instead inspects actual schema/checkpoints, forkCurrent, campaign manifest identity, source pins, ownership API and existing writer/tests; settles scene-as-of reconstruction, exact remapping, safe refusal, historical GET DTO, idempotent fork command and SQL/root/branch fencing with negatives. This is an illustrative method, not current DATA04 facts or commission.

Measure accepted outcomes/rework via [usage evaluation](cursor-usage-evaluation.md) when available; no guaranteed zero-search or token saving.
