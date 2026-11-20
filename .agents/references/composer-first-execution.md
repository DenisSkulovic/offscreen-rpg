# Composer-ready execution | how to make implementation cheap without guessing

**Authority:** Composer T-ID assignments are **subordinate steps inside a Change**. They are not the standalone operational [Tasks](../../work/tasks/README.md). [Work taxonomy](../../work/WORK-TAXONOMY.md) and [central work selector](../../work/QUEUE.md) decide whether a new independent Task is warranted. This is an operational adjunct to [change packet profiles](change-packet-profiles.md), [planner investigation standard](planner-investigation-standard.md), [Cursor budget policy](cursor-model-budget-policy.md) and the established Change lifecycle. **One Change can contain many microtasks.** The Change is the unit of scope and acceptance; an executor task is a **very small code mutation**, not another backlog status or source of product truth.

## The two different documents

- **Planner's expensive material:** optional SOURCE-MAP.md, EXECUTION.md, PROOF.md. ChatGPT may inspect dozens of files to produce them, including SQL constraints, callers, state machines, and failure cases. The material belongs in the Change and is versioned with code. It is not mandatory preload for a child.
- **Executor's cheap material:** optional TASKS.md. Each task is a one-screen route to specific edits, named preconditions, exact command/negative proof, and a frozen source baseline. Cursor parent reads TASKS once and gives a child only its selected task plus 2–5 anchors. The child must not read the entire Change family by default.

A Change with two-line edits does **not** need TASKS.md; hand off one route card directly. A STATE/CONTRACT/RELEASE Change should usually have TASKS.md before a Composer worker is selected, because “implement the distributed Storyteller” is not a bounded assignment.

## Composer-ready quality gate (planner responsibility)

A task is **READY-FOR-COMPOSER** only if all are demonstrably supplied:

1. **Known target:** base SHA and exact existing symbol/field names, whether an edit is new or already landed, and whether conflicting agent branches touch its files.
2. **One observable delta:** ideally 1–3 write-owning files (plus targeted tests/docs) and a visible pass/fail; not a generic “wire service” or “make robust”.
3. **Fully settled algorithm:** precise expected inputs, outputs, validation, transaction/fencing identity, permissions, alternative rejection and retry behavior. For a DB transition, name the actual schema check, lock order, allowed state rows and CAS condition. For a worker, name Task Queue, version and crash replay behavior. If design is undecided, task is **PLANNER-BLOCKED**, not a Cursor investigation.
4. **Copyable steps:** sequential edits, not broad instructions such as “investigate the architecture then decide.” The writer may use ordinary judgment on syntax and local refactors, but not product authority or cross-service ownership.
5. **Proof route:** existing test anchor or exact new test file, executable command with cwd/disposable prerequisites, one normal and one **discriminating negative**. Avoid code review vibes as the only test.
6. **Resource authority:** selected Change, allowed file owner/branch, one writer for shared migrations/workflow/GA files, forbidden paid/destructive actions, an explicit rollback or stop.
7. **Permanent-doc consequences:** which canonical technical/product section changes *if code behavior changes*; no premature implemented claims.
8. **Receipt:** actual diff/status, exit/test counts, negative, unexpected source mismatch, cost/model when observable.

The task's **type** can be CODE, TEST, WIRING, DOCUMENT or VERIFY. These are task purposes, **not new Change kinds or special agent roles**. Do not create a novel specialist for each.

**Backlog evolution:** the 24-packet Composer audit preceded the subsequent WORK01 taxonomy/tooling Change, which also has its own TASKS.md and remains Implementing pending actual tests. The taxonomy does **not** convert existing embedded T-IDs into standalone Tasks.\n\n**Existing backlog adoption:** as of 2026-11-20 all 24 actual open Change folders provide**Existing backlog adoption:** as of 2026-11-20 all 24 actual open Change folders provide `TASKS.md` (including preexisting BOOT03, STORY02, STORY03, TURN02 and K8S10). Read the [one-screen parent handoff](../../work/changes/CURSOR-OPEN-BACKLOG-HANDOFF-2026-11-20.md), not the entire corpus; consult [full source audit](../../work/changes/COMPOSER-QUEUE-AUDIT-2026-11-20.md) only to resolve a selection conflict. The completed BOOK01 orphan `PLAN.md` was moved with its Done archive, restoring the invariant that `open/` contains an actual Change front door. No `TASKS.md` is an automatic selector.\n\n## TASKS.md format

Top:

```text
# <Change ID> | Composer task queue
Base SHA: <inspected>; latest: must recheck
Change state/selection: <Proposed or selected>
Contract owners: <direct canonical links>
Shared path lock: <owner>
Tasks: T01 → T02 → T03; selected task: none
```

For each microtask:

```text
## T01 | <small result> | PLANNER-READY / PLANNER-BLOCKED / LANDED
MODEL=Composer 2.5 Standard | DEPTH=PATCH
Requires: <specific evidence / task IDs>
May write: <exact paths> ; must not write: <other owner>
Read: <2-5 exact files and symbols, not an unbounded glob>
Algorithm: 1... 2... 3... (choice already made)
Test: cwd + exact command and expected positive
Negative: input/fault and expected refusal, not only another green build
Stop: <specific contradiction requiring planner refresh>
Receipt: <fields and docs touched>
```

**PLANNER-READY does not mean Change Ready or authorize execution.** Selection and guards remain with the central queue. A task's state may advance only with observed evidence. Do not mark it LANDED because a design file was committed.

## Good decomposition, without turning every statement into a task

A two-service workflow Change may decompose as:

- T01: versioned DTO definitions + parser unit tests (contract only);
- T02: narrow authenticated GA endpoint + wrong-role negative;
- T03: CAS saved-result adoption + constraint/idempotency integration test;
- T04: new versioned Temporal workflow and task queue + replay test;
- T05: separate worker composition and wiring + stopped-executor test;
- T06: integration and permanent-doc reconciliation.

This example is a **shape**, not an authorization to run these steps before prerequisites or assume the code already supports them. If each step is too small to test and review separately, combine two adjacent steps. A one-file fix is often better handled by the parent without a child at all.

**Example non-ready:** “add a Storyteller saga with correct retries, get it working in Kubernetes.” No defined saga compensation, writer, error states or test; even Grok Medium should not invent this in implementation. Ask ChatGPT to design the exact retry/hold contract first.

## Token and tool guidance (soft targets, not enforceable context-window settings)

- **Task dispatch:** target under 900 words, often far less. Links to a specific document heading instead of copying entire investigations. More detail may be necessary for correctness, but it should live in the file's targeted section.
- **Initial reads:** one route card + 2–5 direct anchors. Additional reads must solve a named contradiction. Context size is selected by the model/tool runtime; **the repository cannot actually cap a subagent's context window or billed tokens**.
- **Searches:** avoid repo-wide discovery unless a path/symbol from the packet is wrong. Parent asks ChatGPT to repair source maps.
- **Agent fanout:** start one Composer child, usually serial; a second child only if independent file ownership makes parallel work truly useful. A child never spawns children.
- **Reviews:** tests and parent diff inspection first. Use independent adversarial review only for a named high-risk failure mode; ask ChatGPT first. Grok is a discretionary, owner-approved exception.
- **Tests:** focus on affected package/test and one diagnostic negative; final packet integration/closure tests run once by coordinator, not independently in every child.

A strict word or read limit can be counterproductive if a source mismatch matters. Treat these as *default budgets*, not permission to ship unverified code.

## QA economics: cost per accepted correct change

For each representative task, WIKI18 should record:
- Task type, planned and actual model/variant, number of children, prompt/context approximations when available, reads/searches, tool invocations, elapsed wall time, billed usage, and any reruns.
- Correctness outcome: focused normal and negative tests, number of source mismatch escalations, review defects, rework commits and owner interventions.
- Normalized comparison: total cost **of reaching a correct accepted outcome**, not first-run cost or hypothetical per-token savings. Compare equivalent scope/difficulty before changing policy again.

If repeated Composer attempts fail for lack of a SQL invariant or request contract, **that is a planner failure to fix**, not proof that we should always use Grok. If it fails despite a complete specification, consider an explicitly approved one-task exception, and still measure total rework cost.

## Failure boundary and responsibilities

Composer is not an unthinking patch applier. It may refuse a dangerous command, protect user data, inspect exact code, and surface incompatibilities. The ChatGPT planner is responsible for deeper architectural reasoning, model-call policy and proof design; the Cursor parent is responsible for sequencing, branch/lock ownership, integration and factual evidence. A claim that “Cursor performs no investigations at all” is too absolute: it must still do **limited verification and error-directed diagnosis** to avoid blindly applying stale code.
