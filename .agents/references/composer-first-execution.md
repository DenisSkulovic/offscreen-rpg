# Composer-ready execution | how to make implementation cheap without guessing

**Owns:** task-card contract. Embedded T-IDs are subordinate to one Change, not standalone [Tasks](../../work/tasks/README.md) or new authority. [Submission standard](planning-artifact-quality.md) owns size/scale. [Parent procedure](bounded-parent-orchestration.md) owns dispatch/Git/acceptance.

## The two different documents

Planner investigates actual source and records SOURCE-MAP, selected execution contracts and PROOF for material multi-task work. Executor reads TASKS index/card with direct anchors, not entire investigation. Tiny single-route work can use CHANGE.md alone. No manufactured companion.

## Hard requirement: pay for reasoning upstream, not in Cursor

[Planner investigation](planner-investigation-standard.md) settles decisions and ownership; [packet design](packet-design-manual.md) constructs DAG. STATE/CONTRACT/RELEASE tasks need exact source/contract/proof, not broad cross-package missions. Verified predecessor receipts and frozen postconditions allow dependency-gated dispatch; changed material semantics require planner refresh. Missing architecture stops, ordinary local errors permit bounded debugging. [Code craftsmanship](../rules/code-quality.md) remains required.

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

## Mechanical task readiness audit

Before commission, simulate every actual T-ID using only its required card, anchors and sections. Scale the depth to task risk and reuse shared facts. Apply the [child and parent checks](packet-readiness-review.md#audit-sequence). Fail the affected task for open-ended caller discovery, authorization composition, export or schema choice, or migration or fixture invention. Require exact extraction and composition mappings from the planner. PATCH is a decided edit. VERIFY is specified evidence. INVESTIGATE is a tightly bounded factual question, not delegated design. On a correction pass, repeat the affected simulations. A precise material contradiction blocks the affected scope and does not discard unaffected tasks.

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

Illustrative bounded contract Change: T01 versioned DTO/parser and tests; T02 authenticated endpoint with wrong-role negative; T03 consumer compatibility check. Only if these form one measurable outcome and fit active implementation budget. Broader transaction/replay/workflow/worker integration may require separate Changes under one Design; do not infer that a distributed redesign fits one six-task queue. Combine truly tiny adjacent edits when safe; one-file authorization/state/test changes may still be substantive. [Parent delegation default](bounded-parent-orchestration.md#0a-budget-first-composer-dispatcher-contract-2026-11-21) owns direct-edit exception.

Reject "add saga with correct retries, get it working in Kubernetes": no owner, compensation, refusal or bounded proof.

## Token and tool guidance (soft targets, not enforceable context-window settings)

[Submission budgets](planning-artifact-quality.md#4-submission-scale-and-measurement): 150–350 words per card normally; above 500, reconsider. The child mandatory packet-authored route stays below 1,000 words by default. One Change prefers one outcome. Seven actual tasks is a strong default. Initial reads are 2–5 direct anchors, plus focused reads for necessary facts. Do not prohibit debugging or safety verification. The parent normally uses one child, and up to two with proven isolation. No nested swarms. No model upgrade without approval. Focused normal and negative checks per task, one assigned cheap join, and heavy proof by ChatGPT and the owner.

## QA economics: cost per accepted correct change

Use [usage evaluation](cursor-usage-evaluation.md) for actual model, read/search/tool count, elapsed time, billed usage, failures and rework where available. Compare equivalent accepted outcomes; absent measurement is unknown. Repeated failures due to omitted SQL/authority contracts are planner defects, not evidence to upgrade models automatically.

## Failure boundary and responsibilities

A child may refuse unsafe work, protect user data, check real code and diagnose local errors. Report precise contradiction and reproducer, not redesign. Parent owns sequencing, branch/lock, diff review and factual receipts; ChatGPT owns design, proof architecture and material decisions.
