# Execution-first Change packet design | ChatGPT planner manual

**Owner:** ChatGPT planner. **Purpose:** design an implementation Change that a Cursor parent can dispatch after brief orientation, and Composer children can execute with small local reads. **Authority:** complements, does not replace, [change work-unit standard](change-work-unit-standard.md), [packet profiles](change-packet-profiles.md), [planner investigation](planner-investigation-standard.md), [Composer tasks](composer-first-execution.md), and [branch/integration policy](bounded-parent-orchestration.md). Product/technical docs remain the authority for behavior. This document sets a *planning technique*, not a new Change state or permission.

## 1. Plan backward from cheap execution, not forward from document completion

Imagine the parent has received `do ID`. The first useful actions should be branch/worktree guard, read the short front door and task queue, and **dispatch a ready task**, without surveying the architecture. Imagine the child sees only its T-ID and 2–5 named anchors. It should be able to open those anchors, write the planned edit, run an exact focused positive and negative proof, and return a short receipt. If either agent must first determine who owns a contract, which callers exist, what semantics are intended, or how to test the change, the *planner* is not finished.

**Important:** "small initial read" is a dispatch goal, not a prohibition on targeted debugging, inspecting real local code, or exercising engineering judgment. Do not mistake fewer tokens for correctness. Optimize accepted Changes per total spend including rework and safety failures.

## 2. Complete the expensive source investigation first

1. Inspect actual selected integration branch and HEAD, live source, tests, manifests, ownership and concurrent work. Read the repository's current instructions; memory/older packet claims are not proof. Record inspected SHA and any inaccessible worktree.
2. Set the accepted end state: what changes and what explicitly must not, and which selected product/technical owners authorize it. Distinguish proposed, ratified, observed and tested.
3. Trace the full impact surface (beyond a child's first 2–5 anchors): entrypoints, callers, consumers, schemas/types/exports, composition roots, tests, build/lockfiles, docs. For stateful work add rows/IDs, transaction boundaries, outbox, retries, failure and permission fences.
4. Decide the *one* interface/algorithm and failure semantics, including normal and discriminating negative path. Move genuine unresolved design to Proposed/PLANNER-BLOCKED, never to an implementation task's "investigate" step.
5. Create a **change manifest** when fanout makes ownership nontrivial. For migrations/extractions record source path/symbol → target path/symbol, export map, every known caller/import edit, dependency/lockfile edit, test move/addition, doc owner and invariants. For policy injection record **each composition root**, policy source, default-deny rule and fixture/production cases.
6. Identify source drift conditions. Exact stable symbols, not merely an old SHA, determine whether a task recipe can be trusted after another Change merges.

## 3. Design the execution DAG before writing T-IDs

Draw a DAG of *edits and validations*, not just document sections. Each node has: contract/input prerequisites, exact write ownership, allowed reads, expected proof and a result needed by downstream nodes. Put interface/types/schema first if later edits depend on them. Different tasks are parallel candidates only when they do **not** share write paths, build/generated outputs, mutable fixtures/database/schema, runtime ports, exclusive local services, or a dependency on another task's unlanded result. Merely naming two tasks T01/T02 does not make them independent.

**Parallel eligibility matrix** (record once in TASKS or EXECUTION for material Changes):

| Pair/wave | Why independent (contracts already frozen?) | Overlapping files, generated artifacts, tests, runtime resources? | Dispatch and join |
| --- | --- | --- | --- |
| T01 + T02 | exact independent outputs | none, or name conflicts | `parallel-safe` only when all relevant overlaps are absent |
| T03 | consumes T01/T02 outputs | integration ownership | `after T01,T02`; one parent joins and proves |

A parent may run **two** independent Composer children concurrently under the existing bounded-orchestration default, only if a planner-provided matrix establishes nonoverlap and the execution environment supports safe isolated writes/joins. More candidates may form later waves but are not an invitation to a swarm. If children share a Change worktree, disjoint file sets alone may be insufficient: tests and Git-index/build-output collisions must also be absent; parent owns all staging, commit and final joins. Where isolation is not proven, dispatch serially. Parallelism is not a success metric in itself.

**Prefer a small critical path** without slicing atomic transaction or authority changes into contradictory parallel writers. Do not split one straightforward 15-minute edit into four children; dispatch overhead can cost more than implementation. Some Changes have only serial tasks, and that is healthy.

## 4. Write two audiences, one source of truth

**Parent front door** (CHANGE.md + TASKS header): reference branch, baseline/current drift rule, chosen outcome, constraints, authorized scope, DAG/waves, shared owner/resource locks, first dispatch, final acceptance, stop/escalation and closure destination. One quick read, no mandatory whole-wiki preload.

**Child task card** (T-ID, preferably one screen): exact owned write paths/symbols, 2–5 initial read anchors, frozen API and edit algorithm, no-choice code expectations, prerequisite receipts, focused command/cwd and expected positive + discriminating negative result, bounded local repair permission, stop on *specific* contradiction, compact receipt. A child should not need to read every SOURCE-MAP/EXECUTION/PROOF page.

**Planner deep notes**: SOURCE-MAP contains inspected real graph and source assertions; EXECUTION settles algorithms and cross-boundary migration; PROOF fixes fixtures and failure observations. These pages are for planning provenance and debugging exceptional drift, not for universal child preload. Avoid duplicating and contradicting core decisions across five files: link to one canonical location and repeat only indispensable routing facts.

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

Only after an independent [packet readiness audit](packet-readiness-review.md) returns READY, specify first T-ID/wave, target branch, permitted model/permissions and the exact stop/closure policy. An accepted Change commission covers all T-IDs, acceptance, archive, squash join and push, not future sibling Changes. Do not invent model spend evidence or promise that a packet guarantees no debugging.
