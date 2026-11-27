# Task execution standard | implementation-ready work without guessing

**Owns:** the portable task-card contract. Embedded T-IDs are subordinate to one Change, not standalone [Tasks](../../work/tasks/README.md) or new authority. [Submission standard](planning-artifact-quality.md) owns size and scale. [Implementation coordination](bounded-parent-orchestration.md) owns dispatch, Git and acceptance. A client's model policy owns model identifiers. This file does not name an AI client or a commercial model.

## The two different documents

The planner investigates actual source and records SOURCE-MAP, selected execution contracts and PROOF for material multi-task work. The implementation coordinator and worker read the TASKS index and one card with direct anchors, not the entire investigation. Tiny single-route work can use CHANGE.md alone. No manufactured companion.

## Hard requirement: settle reasoning before implementation

[Planner investigation](planner-investigation-standard.md) settles decisions and ownership; [packet design](packet-design-manual.md) constructs the dependency graph. STATE, CONTRACT and RELEASE tasks need exact source, contract and proof, not broad cross-package missions. Verified predecessor receipts and frozen postconditions allow dependency-gated dispatch. Changed material semantics require a planner refresh. Missing architecture stops. Ordinary local errors permit bounded debugging. [Code craftsmanship](../rules/code-quality.md) remains required.

An implementation agent may be capable of planning. During a commissioned implementation assignment it follows the settled architecture, the packet scope and the escalation rules. It does not silently take design authority.

## Task readiness (planner responsibility)

A task is **PLANNER-READY** only if all of the following are demonstrably supplied. There is no separate client or model gate. Change readiness, selection and commission remain distinct and are not granted by a task card.

1. **Known target:** base SHA and exact existing symbol or field names, whether an edit is new or already landed, and whether conflicting agent branches touch its files.
2. **One observable delta:** ideally 1–3 write-owning files (plus targeted tests or docs when this boundary owns them) and a visible source or check outcome. Not a generic "wire the service" or "make it robust".
3. **Fully settled algorithm:** precise expected inputs, outputs, validation, transaction and fencing identity, permissions, rejected alternatives and retry behavior. For a database transition, name the actual schema check, lock order, allowed state rows and compare-and-swap condition. For a worker, name the task queue, version and crash replay behavior. If the design is undecided, the task is **PLANNER-BLOCKED**.
4. **Ordered steps:** sequential edits, not "investigate the architecture and then decide." The writer may use ordinary judgment on syntax and local refactors, and may not take product authority or cross-service ownership.
5. **Proof boundary:** either the assigned executable check, with command, working directory, disposable prerequisites, one normal case and one discriminating negative where that negative discriminates, or an explicit statement that this task has no executable check. In the second case name the source postcondition and the downstream owner of the behavioral obligation. Do not invent a test to make the card look complete. Source inspection is not a test result. [Staged verification](../rules/verification.md) owns when a check is required early.
6. **Resource authority:** the selected Change, the allowed file owner and branch, one writer for shared migrations, workflow and Game Authority files, forbidden paid or destructive actions, and an explicit rollback or stop.
7. **Permanent-doc consequences:** which canonical technical or product section changes if code behavior changes. No premature implemented claims.
8. **Receipt:** actual diff and status, any assigned command with its real result, NOT RUN when a required check did not run, any unexpected source mismatch, and cost or model when the client can observe them. Do not report an unassigned or unrun test as PASS.

The task **type** can be CODE, TEST, WIRING, DOCUMENT or VERIFY. These are task purposes, not new Change kinds or specialist agent roles. Do not create a novel specialist for each. **DEPTH** is `PATCH` (a decided edit), `VERIFY` (specified evidence) or `INVESTIGATE` (a tightly bounded factual question, not delegated design). Add an execution responsibility only when the card must distinguish implementation, evidence, investigation or utility work. Do not add a mandatory role field when type and depth already say that.

## Mechanical task readiness audit

Before commission, simulate every actual T-ID using only its required card, anchors and sections. Scale the depth to task risk and reuse shared facts. Apply the [worker and coordinator checks](packet-readiness-review.md#audit-sequence). Fail the affected task for open-ended caller discovery, authorization composition, export or schema choice, or migration or fixture invention. Require exact extraction and composition mappings from the planner. On a correction pass, repeat the affected simulations. A precise material contradiction blocks the affected scope and does not discard unaffected tasks.

## TASKS.md format

Top:

```text
# <Change ID> | task queue
Base SHA: <inspected>; latest: must recheck
Change state/selection: <Proposed or selected>
Contract owners: <direct canonical links>
Shared path lock: <owner>
Tasks: T01 → T02 → T03; selected task: none
```

For each task:

```text
## T01 | <small result> | PLANNER-READY / PLANNER-BLOCKED / LANDED

DEPTH=PATCH

Requires: <specific predecessor evidence>
May write: <exact permitted paths>
Must not write: <excluded ownership>
Read: <2-5 exact files and symbols, not an unbounded glob>
Algorithm: <settled implementation recipe>
Test: <assigned command, cwd, and expected result; or none — source gate only>
Negative: <discriminating negative; or none assigned, with the downstream proof owner>
Stop: <material contradiction or unsafe condition>
Receipt: <required implementation evidence>
```

The coordinator translates that card into the selected client's native execution parameters. A client may attach its own dispatch metadata, including a concrete model identifier, beside the card. That metadata is not part of the universal Change or Task contract, and it is not required for PLANNER-READY.

**PLANNER-READY does not mean Change Ready and does not authorize execution.** Selection and guards remain with the central queue. A task's state may advance only with observed evidence. Do not mark it LANDED because a design file was committed.

## Good decomposition, without turning every statement into a task

Illustrative bounded contract Change: T01 versioned DTO and parser with tests; T02 authenticated endpoint with a wrong-role negative; T03 consumer compatibility check. Only if these form one measurable outcome and fit the active implementation budget. Broader transaction, replay, workflow or worker integration may require separate Changes under one Design. Do not infer that a distributed redesign fits one six-task queue. Combine truly tiny adjacent edits when that is safe. One-file authorization, state or test changes may still be substantive. [Coordinator delegation](bounded-parent-orchestration.md#0a-budget-first-composer-dispatcher-contract-2026-11-21) owns the direct-edit exception.

Reject "add a saga with correct retries and get it working in Kubernetes": no owner, compensation, refusal or bounded proof.

## Token and tool guidance (soft targets, not enforceable context-window settings)

[Submission budgets](planning-artifact-quality.md#4-submission-scale-and-measurement): 150–350 words per card normally; above 500, reconsider. The worker's mandatory packet-authored route stays below 1,000 words by default. One Change prefers one outcome. Seven actual tasks is a strong default. Initial reads are 2–5 direct anchors, plus focused reads for necessary facts. Do not prohibit debugging or safety verification. Where the client supports delegation, the coordinator normally uses one worker, and up to two with proven isolation. No nested swarms. No model upgrade without the client's explicit exception path. Run only assigned checks. A construction task may have none. One assigned inexpensive join where the packet requires it, and heavy proof by the acceptance lead and the owner at the boundary that owns it. A client without native subagents executes the same bounded task directly.

## Cost of an accepted correct change

Use the selected client's usage evidence for actual model, read and search and tool count, elapsed time, billed usage, failures and rework where that evidence exists. Compare equivalent accepted outcomes. Absent measurement is unknown. Repeated failures caused by omitted SQL or authority contracts are planner defects. They are not evidence to upgrade models automatically.

## Failure boundary and responsibilities

A worker may refuse unsafe work, protect user data, check real code and diagnose local errors. Report the precise contradiction and reproducer. Do not redesign. The coordinator owns sequencing, branch and lock, diff review and factual receipts. The planner owns design, proof architecture and material decisions. Model defaults, when a client has them, live only in that client's execution policy.
