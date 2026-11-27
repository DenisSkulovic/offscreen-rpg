# Composer-ready execution | how to make implementation cheap without guessing

**Owner decision 2026-11-26: implementation and heavy acceptance have different owners.** Cursor implements the selected design, constructs specified deterministic proof tools, runs focused unit/contract tests, changed-file quality checks and proportionate cheap local integration checks, and commits a coherent implementation receipt. The design/planning ChatGPT and human owner own heavy acceptance: broad builds/suites, infrastructure lifecycle and fault/recovery runs, multi-service/browser/end-to-end exercises, release upgrades, long-running or costly probes and other substantial operational proof. ChatGPT selects exact commands, target, prerequisites, expected outcomes, timeouts, stop/cleanup and evidence; the human runs the bounded batch in their terminal and returns results for ChatGPT to interpret and record. Prefer one reproducible scripted batch over repeated paid-agent terminal orchestration. No heavy acceptance by Cursor unless the owner explicitly delegates that named proof; elapsed time alone is not a hard cutoff, and essential focused negative tests are not skipped to save tokens. The planner partitions the existing acceptance matrix by executor before commission (or at the next checkpoint of an in-flight Change). This changes who runs proof, not its required tier, safety, or integration gate.

See [shared execution, acceptance and integration policy](../../AGENTS.md).

**Authority:** Composer T-ID assignments are **subordinate steps inside a Change**. They are not the standalone operational [Tasks](../../work/tasks/README.md). [Work taxonomy](../../work/WORK-TAXONOMY.md) and [central work selector](../../work/QUEUE.md) decide whether a new independent Task is warranted. This is an operational adjunct to [change packet profiles](change-packet-profiles.md), [planner investigation standard](planner-investigation-standard.md), [Cursor budget policy](cursor-model-budget-policy.md) and the established Change lifecycle. **One Change can contain many microtasks.** The Change is the unit of scope and acceptance; an executor task is a **very small code mutation**, not another backlog status or source of product truth.

## The two different documents

- **Planner's expensive material:** SOURCE-MAP.md and PROOF.md for material multi-task delegation, EXECUTION.md or exact task-scoped contracts as needed. ChatGPT may inspect dozens of files to produce them, including SQL constraints, callers, state machines, and failure cases. The material belongs in the Change and is versioned with code. It is not mandatory preload for a child.
- **Executor's cheap material:** TASKS.md for material multi-task delegation; tiny single-route work can use CHANGE.md alone. Each task is a one-screen route to specific edits, named preconditions, exact command/negative proof, and a frozen source baseline. Cursor parent reads the dispatch index and selected cards, and gives a child only its selected task plus 2–5 anchors and precisely named necessary contract sections. The child must not read the entire Change family by default.

A Change with two-line edits does **not** need TASKS.md; hand off one route card directly. A STATE/CONTRACT/RELEASE Change should usually have TASKS.md before a Composer worker is selected, because “implement the distributed Storyteller” is not a bounded assignment.

## Hard requirement: pay for reasoning upstream, not in Cursor

For complex stateful Changes, ChatGPT must deliver a **verified SOURCE-MAP + decided EXECUTION + falsifiable PROOF + narrow TASKS** or equivalent equally exact canonical references **before** the executor begins. A vague `CHANGE.md`, even accompanied by a `TASKS.md` containing four enormous cross-package missions, is **NOT** Composer-ready. `TASKS.md` tasks are small edits with named owner paths and exact test outcomes, not sub-Changes that secretly require architecture. `PLANNER-READY AFTER predecessor` conveys a planned recipe that must be checked by ChatGPT against landed predecessor code, not carte blanche for Cursor to invent missing interfaces. If a task discovers a missing schema/lock/transport design, the Cursor parent stops after one precise contradiction and sends it to ChatGPT; no autonomous multi-agent redesign. Avoid arbitrary blind application: focused cheap checks and error-directed debugging remain the executor's responsibility; heavy live verification belongs to ChatGPT/owner unless explicitly delegated.

**Code craftsmanship during dispatch:** [code-quality rule](../rules/code-quality.md) applies to every new/modified source file. Each Composer T-ID should produce understandable named responsibilities, explicit trust-boundary types and concise comments for non-obvious invariants, with changed-file Prettier and ESLint quality checks at the parent checkpoint. No giant single-function controller as a default implementation tactic; no blanket style refactors.\n\n**Authoring/review split:** [Packet design manual](packet-design-manual.md) makes the source→task DAG and parallel eligibility matrix; [independent readiness review](packet-readiness-review.md) tests every T-ID and the first parent dispatch. Passing this checklist alone does not establish readiness. Use [review worksheet](packet-review-checklist.md) for source-backed verdicts.

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

**Backlog evolution:** the 24-packet Composer audit preceded WORK01, which is Done: first-class Tasks and `work/QUEUE.md` as the sole selector. The taxonomy does **not** convert existing embedded T-IDs into standalone Tasks.\n\n**Existing backlog adoption:** as of 2026-11-20 all 24 actual open Change folders provide**Existing backlog adoption:** as of 2026-11-20 all 24 actual open Change folders provide `TASKS.md` (including preexisting BOOT03, STORY02, STORY03, TURN02 and K8S10). Read the [one-screen parent handoff](../../work/changes/CURSOR-OPEN-BACKLOG-HANDOFF-2026-11-20.md), not the entire corpus; consult [full source audit](../../work/changes/COMPOSER-QUEUE-AUDIT-2026-11-20.md) only to resolve a selection conflict. The completed BOOK01 orphan `PLAN.md` was moved with its Done archive, restoring the invariant that `open/` contains an actual Change front door. No `TASKS.md` is an automatic selector.\n\nThe [planning artifact quality standard](planning-artifact-quality.md) is mandatory. Size/context smells, obsolete repair layers and actual transitive mandatory reads are checked by independent reviewers before commission.

## Mechanical task readiness audit

Before commissioning, the ChatGPT planner must simulate each T-ID using only its route and named anchors. A task fails readiness if it requires finding unknown production callers, selecting an authorization/DI composition, choosing or inventing export contracts, deciding which tests to transplant, or reconstructing a migration across dozens of sources. For a package extraction, attach an explicit **source→destination + export + consumer + test** table and break the move into independently testable owners. For a policy injection, supply a **complete caller/composition matrix** with opt-in, default-deny and negative cases. Do not promote `Ready` based only on a plausible top-level architectural intent.

Distinguish **VERIFY** (precisely named expected evidence), **PATCH** (fully decided change) and **PLANNER-BLOCKED** (ChatGPT must settle and republish). Do not use a Cursor `INVESTIGATE` task to quietly resolve planner-owned contract design. Small local tool or compiler discovery is ordinary PATCH debugging, not a planning failure. A stale baseline is only safe to continue when the *named symbols and ownership contracts* remain unchanged; otherwise hand back the exact mismatch. Parent should dispatch one worker without a preliminary design review, and should not re-read the entire source map unless an identified mismatch requires it.

## TASKS.md format

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

This example is a **shape**, not an authorization to run these steps before prerequisites or assume the code already supports them. If each step is too small to test and review separately, combine two adjacent steps. A **truly tiny mechanical** one-file fix already understood by the parent may be cheaper to do directly; a one-file authorization, state or nontrivial negative-test edit is still substantive and defaults to Composer delegation inside a multi-task Change. The canonical [one-time delegation decision](bounded-parent-orchestration.md#0a-budget-first-composer-dispatcher-contract-2026-11-21) resolves this exception. Parent should not chain substantive direct edits under the guise of saving dispatch overhead.

**Example non-ready:** “add a Storyteller saga with correct retries, get it working in Kubernetes.” No defined saga compensation, writer, error states or test; even Grok Medium should not invent this in implementation. Ask ChatGPT to design the exact retry/hold contract first.

## Token and tool guidance (soft targets, not enforceable context-window settings)

**Do not optimize children while leaving the parent unbounded.** The [parent integration-batch contract](bounded-parent-orchestration.md) limits default dispatch to 2–5 T-IDs (or one risky join), requires a checkpoint/commit and explicit Change closure decision, and stops rather than launching the next unrelated batch. Child receipts are short; **the parent**, not each child, owns Git staging, archive routing and canonical docs at integration.

- **Task dispatch:** normally 150–350 words; >500 reconsider. Total mandatory packet-authored child context below 1,000 words by default, including linked excerpts. [Submission scale](planning-artifact-quality.md#4-submission-scale-and-measurement): 1–5 tasks normally, seven absolute maximum per Change. No hiding count/context in nested headings.
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
