# Planner investigation | discovery before delegated execution

**Owns:** planner responsibilities, continuous batch completion, source-grounded investigation, and the artifact handoff when the planner cannot write the repository. Read current [AGENTS](../../AGENTS.md) and the applicable [design gate](../rules/target-driven-renewal.md). Then [construct packet](packet-design-manual.md) and [review independently](packet-readiness-review.md). Client adapters such as [CHATGPT.md](../../CHATGPT.md) describe only that client's access. They do not replace this standard.

## Continuous development flow

**The delivery unit is the complete authorized assignment, not one document edit, one finding, one task card or one commit.**

If authorized to prepare eleven Change packets, prepare all eleven. If authorized to address a review containing multiple blocking findings, address the complete known set in one coordinated correction. When blockers span several packets, revise those packets together where that is more efficient and keeps the contracts consistent. Do not repair deferred Medium or Low findings in that correction cycle.

Do not routinely stop after editing one Markdown document, addressing one isolated finding, preparing one packet from a commissioned batch, completing an internal investigation checkpoint, making an intermediate Git commit, discovering a nonblocking improvement, or reaching a routine step in a documented procedure. Internal checkpoints preserve progress. They are not new owner decisions.

Continue until the authorized assignment is complete, or until a genuine stop applies: a consequential unresolved product or architecture decision; a necessary permission boundary; unavailable indispensable source, runtime or evidence; a blocker that prevents further useful work; a material contradiction that requires owner judgment; or completion. When one part is blocked, continue unaffected useful work. Batch owner questions and owner-operated experiments. Do not ask the owner to reauthorize work already commissioned. Do not claim background progress the current environment cannot perform.

For a program of multiple current Changes, map the dependency graph before writing task cards. Establish shared contracts and independently useful outcomes. For each Change, record real predecessors and source postconditions, owned files and resources, shared-file and runtime collisions, the pre-join proof, and the design-level acceptance that remains after its join. Prefer a short critical path. Do not copy a total order when the source ownership does not require it, and do not split an atomic safety boundary to create parallel work. Prepare the authorized batch, review it, resolve Critical and High findings together, then perform an impact-based re-review. Make independently ready Changes available for commissioning. Planning and implementation overlap when possible. A blocked Change does not invalidate unrelated ready Changes. A dependency-gated Change may be Ready before its predecessor lands when assumptions and postconditions are specified. An eligible commissioned Change is released when its own edges hold.

Preserve the separation in [AGENTS.md](../../AGENTS.md#dependency-readiness-is-not-a-planner-blocker). Continuous flow is not permission for unsafe concurrency. Optimize time and cost from owner intent to verified working software. A well-prepared submission normally needs one comprehensive initial review and one focused corrective review. That expectation does not permit a known Critical or High defect to remain. The normal number of Medium and Low findings repaired before initial execution release is zero. Do not create a metrics file or recurring measurement procedure.

Match [investigation depth](../../AGENTS.md#investigation-depth). Material new architecture follows [design-led engineering](../rules/target-driven-renewal.md) before implementation planning. Evolutionary work reuses accepted architecture. Focused settled-contract work needs no Design dossier or independent committee. One delegated Change prefers one measurable outcome. Seven actual tasks is a strong default, not an automatic rejection.

Before promotion or implementation planning of material new architecture, require self-defense, an [independent review](../rules/target-driven-renewal.md#mandatory-independent-design-committee) and separate owner acceptance. The reviewer delivers a verdict bound to the candidate SHA. A complete verdict awaiting persistence is not an incomplete analysis. No self-certification.

## Planner session start

At the beginning of each planning, design, audit or handoff assignment, before drafting a Change:

1. Locate the actual repository, branch and HEAD. Read `AGENTS.md` and this standard. Check the queue, active Undertaking, open work and permissions. If an Undertaking is active, read its overview and ledger and refresh stale progress figures before the next wave. Orientation does not end an authorized assignment.
2. Read the applicable method at the decision point. Use [submission quality](planning-artifact-quality.md), [work-unit standard](change-work-unit-standard.md), [packet design](packet-design-manual.md), [task format](composer-first-execution.md) when the selected executor uses that card shape, [parent procedure](bounded-parent-orchestration.md), and [readiness](packet-readiness-review.md).
3. Investigate in the planner context. Inspect exact source symbols, callers, transactions, compatibility, privacy and spend. Distinguish target, implemented code and proven behavior.
4. Decide algorithms, schemas, transitions, permissions, idempotency, migration and failure behavior before commissioning execution. A Critical or High choice that cannot be settled is PLANNER-BLOCKED for that scope. Continue unaffected work.
5. Choose direct implementation, delegated Changes or a hybrid from access, cost and proof needs. Material state, contract and release Changes get planner-authored source, execution and proof notes when complexity warrants them. A nontrivial multi-step Change has bounded tasks: decided edit, anchors, normal and negative checks, and a stop. A paragraph of ambitions is not a handoff.
6. Review the authorized batch. Simulate the first dispatch and each task from its limited anchors, at a depth scaled to risk. Classify findings by severity. Critical and High block only the affected scope.
7. When delegation is selected, give the implementation coordinator a compact launch: Change and first task, branch, locks, permitted operations, destination, exit proof and stop. The coordinator verifies nearby code, implements, tests and reports. It does not redesign the target or select the next Change.

A capable executor can start its first bounded edit from a few exact anchors. Open-ended system discovery is a planner defect. On correction, repeat task simulation only for affected tasks. Instructions such as "choose", "investigate architecture" or "where appropriate" are not an executor's algorithm.

## Artifact handoff

When the assigned designer, planner or reviewer lacks repository write access, produce a complete scoped artifact locally or inline, or a downloadable ZIP or patch containing repo-relative paths. For a multi-file change identify repository, base branch and full SHA, scope, additions, modifications, explicit removals, assumptions, validation actually run, and remaining limitations. A simple handoff note is sufficient; no mandatory machine manifest. The custodian checks the actual local branch, HEAD and dirty paths, verifies the intended base and drift on affected files, previews changes, preserves unrelated work, refuses ambiguous or destructive overwrites, applies only authorized changes, runs applicable focused checks, commits under existing policy and reports the resulting SHA. An artifact is not integration, owner approval, or permission for live operations. Use a snapshot export or read-only source retrieval where suitable. Do not promise a persistent chat filesystem. No new staging service is required. Never attempt an unavailable or disabled write as a ritual. Analysis, delivered artifact, persisted and verified receipt, owner ratification and implementation commission remain distinct.

## Responsibility split

The planner investigates relevant source, settles authority, architecture, interfaces and safety, and records exact mappings and proof. The implementation agent verifies named local facts, performs the decided edit and focused checks, and reports contradictions. Local error-directed diagnosis is essential. Heavy acceptance stays with the acceptance lead and the owner.

## Before authoring: settle design, then map the current repo

1. Verify actual repo, integration branch/HEAD, rules, queue, related open/archive work, in-flight branches/worktrees and permissions. Respect clean-slate exclusions; inspect replaceable internals only at permitted phase. Mark inaccessible critical source/worktree explicitly; no guessed paths or readiness.
2. Establish the accepted canonical outcome and scope. Distinguish proposal, selected behavior, implementation and evidence. Material new architecture passes the design gate before packet planning. Evolutionary work resolves the affected decisions without a new-architecture committee. Resolve genuine unknowns here, not in a PATCH.
3. Trace affected entrypoints → owning functions/services → mutable rows/documents/IDs → transaction/root/checkpoint → outbox/consumers → readers/DTO/UI. Inspect actual implementations, schemas, tests, config, fixtures, callers and composition roots, including dependency and compatibility boundaries. Identify retries, failure, concurrency, migration, permissions, privacy, finance/spend and refused states where relevant.
4. Decide precise algorithm, interfaces, transformations and ownership. For extraction map source→destination symbols, exports, every known consumer/import, manifests/lockfiles and tests. For policy injection enumerate composition roots, policy source, default-deny and production/fixture behavior. Identify source drift conditions and allowed mechanical reconciliation.
5. Map target criterion to the actual gap, an independently measurable delta, preserved guarantees and discriminating proof. Specify exact write, read and excluded owners, dependencies and resource conflicts. Follow [submission scale](planning-artifact-quality.md#4-submission-scale-and-measurement). Split independently safe outcomes. Do not split a transaction boundary, and do not split a coherent Change merely to satisfy a task count. Prepare the whole authorized batch and leave independently ready Changes available while a blocked sibling remains blocked.
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

Apply [packet readiness](packet-readiness-review.md) to each actual candidate in the authorized batch. Reuse shared source and contract evidence. Verify source and decisions, ownership and dependency order, task simulation, proof and closure. On the initial review, validate every actual task at a depth scaled to its risk. On a correction pass, repeat the affected simulations. Missing indispensable authority or source is Proposed, PLANNER-BLOCKED or UNVERIFIED for the affected scope, not guessed Ready. Medium and Low findings do not block. Verified frozen predecessor postconditions may gate later dispatch without another planner approval. Changed semantics require a refresh. Use tools now when they are available rather than assigning broad research to paid execution.

## Example: DATA04 historical fork

Reject "inspect forks.ts, reads.ts and checkpoint.ts; figure out historical fork". Planner instead inspects actual schema/checkpoints, forkCurrent, campaign manifest identity, source pins, ownership API and existing writer/tests; settles scene-as-of reconstruction, exact remapping, safe refusal, historical GET DTO, idempotent fork command and SQL/root/branch fencing with negatives. This is an illustrative method, not current DATA04 facts or commission.

Measure accepted outcomes/rework via [usage evaluation](cursor-usage-evaluation.md) when available; no guaranteed zero-search or token saving.
