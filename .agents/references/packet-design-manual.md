# Execution-first Change packet design | planner manual

**Owns:** construction of a bounded task DAG and execution routes after settled architecture. [Investigation](planner-investigation-standard.md) supplies source facts; [submission standard](planning-artifact-quality.md) sets scope, files and budgets; [readiness review](packet-readiness-review.md) independently tests the result.

## Dependency readiness is not a planner blocker

Follow [shared rule](../../AGENTS.md#dependency-readiness-is-not-a-planner-blocker). Freeze predecessor receipts and exact source postconditions. Dispatch after verified prerequisites and commission; changed material contract returns to planner. A specified future harness is not itself a blocker.

## 1. Plan backward from cheap execution, not forward from document completion

Imagine parent does branch guard, reads front door/index and dispatches; child opens card and 2–5 named anchors, applies decided edit, runs focused checks and returns receipt. If either must find architecture, authority, callers or invent fixture/algorithm, planner is unfinished. Targeted source verification and debugging are necessary; never optimize tokens at correctness expense.

## 2. Complete the expensive source investigation against the accepted target

Follow [planner source investigation](planner-investigation-standard.md#before-authoring-settle-design-then-map-the-current-repo) at the [selected depth](../../AGENTS.md#investigation-depth). Material new architecture must pass the [design gate](../rules/target-driven-renewal.md) before implementation planning. Evolutionary work reuses the accepted architecture and does not wait for a full committee. Record verified source and authority, the actual impact map, the exact algorithm and normal and negative semantics, the migration or composition map, and drift conditions. Keep facts, contracts and proof in their respective owners. Do not paste a duplicate source transcript.

## 3. Design the execution DAG before writing T-IDs

The Design's Change graph comes first. [Parallel scheduling](change-work-unit-standard.md#batch-execution-and-parallel-change-orchestration-2026-11-19) owns those edges. This section is the task DAG inside one Change, after that graph exists.

Apply [Change scale](planning-artifact-quality.md#4-submission-scale-and-measurement) first: one preferred measurable outcome, normally 5–10 minutes of active implementation. Seven actual executor assignments, including nested subcards, is a strong default. Exceeding it requires the narrow justification in that standard. Do not rename a many-task campaign as one Change, and do not split an atomic correctness boundary to satisfy the count.

Draw a DAG of *edits and validations*, not just document sections. Each node has: contract/input prerequisites, exact write ownership, allowed reads, expected proof and a result needed by downstream nodes. Put interface/types/schema first if later edits depend on them. Different tasks are parallel candidates only when they do **not** share write paths, build/generated outputs, mutable fixtures/database/schema, runtime ports, exclusive local services, or a dependency on another task's unlanded result. Merely naming two tasks T01/T02 does not make them independent.

**Parallel eligibility matrix** (record once in TASKS or EXECUTION for material Changes):

| Pair/wave | Why independent (contracts already frozen?) | Overlapping files, generated artifacts, tests, runtime resources? | Dispatch and join |
| --- | --- | --- | --- |
| T01 + T02 | exact independent outputs | none, or name conflicts | `parallel-safe` only when all relevant overlaps are absent |
| T03 | consumes T01/T02 outputs | integration ownership | `after T01,T02`; one parent joins and proves |

A coordinator may run **two** independent implementation workers concurrently under the existing bounded-orchestration default, only if a planner-provided matrix establishes nonoverlap and the execution environment supports safe isolated writes/joins. More candidates may form later waves but are not an invitation to a swarm. If children share a Change worktree, disjoint file sets alone may be insufficient: tests and Git-index/build-output collisions must also be absent; parent owns all staging, commit and final joins. Where isolation is not proven, dispatch serially. Parallelism is not a success metric in itself.

**Prefer a small critical path** without slicing atomic transaction or authority changes into contradictory parallel writers. Do not create artificial subagents for a single straightforward edit. If the Change exceeds the active implementation target, reconsider its scope under the submission standard. Some Changes have only serial tasks, and that is healthy.

## 4. Write two audiences, one source of truth

Parent: CHANGE + TASKS index, recorded reference/HEAD, scope, constraints, prerequisite DAG/waves and shared locks, first dispatch, assigned proof and acceptance handoff, closure. Child: [canonical task card](task-execution-standard.md#tasksmd-format) with precise permitted writes, anchors, selected edit, prerequisites, exact focused normal/negative and stop. Planner: [file roles](planning-artifact-quality.md#3-execution-packet-shape), current source facts and selected contracts, direct section anchors. No raw history, multiple normative owners or universal preload.

## 5. Test dispatchability while writing

For every task, perform a paper execution with **only** the task and listed anchors:
- Can I locate the exact code and apply the edit without searching the full repository?
- Does the first source read supply the types/fixtures promised? Are caller edits explicit rather than "find all uses"?
- Are outputs from dependencies available at dispatch time, including generated types?
- Is a normal and *diagnostic negative* test specified with expected outcome and a runnable command?
- Could two proposed parallel tasks race on files, generated output, DB fixtures, test ports, lockfile, Git or docs?
- Can a child know when to stop, rather than quietly changing architecture?
- Can the parent assess the child receipt and finish the **whole** Change without a new design meeting?

If any substantive answer is missing, repair the plan or declare **PLANNER-BLOCKED**. Do not equate a beautifully formatted packet with a dispatchable packet.

## 6. Example: MA02 is intentionally serial

Its selected neutral Contracts port must exist before Application re-exports and Cache import/typecheck can resolve it; T01 → T02 → T03 is appropriate. Running both code tasks concurrently just to get "parallel" would create compilation/import races. A future independent test task may run concurrently **only** if files/build artifacts and prerequisites are actually disjoint. The child routes must preserve compatibility and no Redis behavior changes.

## 7. Finish with an auditable launch statement

Only after [independent readiness](packet-readiness-review.md) passes, record first T-ID/wave, branch, prerequisites, permissions, model route, assigned cheap proof, heavy acceptance owner and stop/closure. Readiness does not commission; verify explicit commission before suggesting do ID. One parent owns one selected Change, no sibling or unassigned live proof. No fabricated cost or zero-debugging claims.
