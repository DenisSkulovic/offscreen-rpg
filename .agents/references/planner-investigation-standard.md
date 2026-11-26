# Planner-first investigation | move discovery upstream of Cursor execution

> **Cold-start and readiness enforcement (2026-11-21):** ChatGPT must read current-branch `AGENTS.md` and `CHATGPT.md` **before** writing plans. Follow [ChatGPT cold-start contract](../../CHATGPT.md#mandatory-cold-start-contract-for-chatgpt-planning). This document is a planning **gate**, not optional inspiration. Inspect branch/HEAD/queue first. For material design, follow [design-led renewal](../rules/target-driven-renewal.md) before packet planning; source inspection of replaceable internals follows the independent target when clean-slate mode is selected. A complex `STATE` Change with only a broad `CHANGE.md` and bare `TASKS.md` but no verified ownership/state map, chosen transaction algorithm, and discriminating proof is **not yet low-investigation Ready**. Either supply substantive source-grounded mapping in `SOURCE-MAP.md`/`EXECUTION.md`/`PROOF.md` or equivalent precise canonical owners, or hold it as Proposed with a named planner blocker. Audit **each** packet before handoff and never infer readiness from the existence of documents alone.


**Selected owner direction, 2026-11-19.** This is an **authoring standard for ChatGPT and other architecture/design planners** preparing Offscreen RPG Changes for lower-cost Cursor executors. It is NOT an instruction for every executor to reread the wiki. See [the bounded Change standard](change-work-unit-standard.md), [template](../skills/change-workflow/assets/CHANGE.md) and [Cursor handoff skill](../skills/cursor-handoff/SKILL.md).

**Required follow-through:** Use [execution-first packet design](packet-design-manual.md) to generate the task DAG and [adversarial readiness review](packet-readiness-review.md) to independently challenge it before any Ready claim. A self-authored checklist is not itself evidence that Composer can dispatch. [Audit worksheet](packet-review-checklist.md) captures the verdict without creating a permanent parallel dossier.

## Responsibility split

**Planner (especially ChatGPT):** own the broad investigation, reconcile product/technical authority against the *actual current source*, make supported design decisions, inspect dependencies and integration seams, and hand off **verified, small source routes plus concrete behavior and failure tests**. Use its own tooling, time and context to settle expensive unknowns *before* asking Cursor to burn usage rediscovering them. Research is not itself proof of code execution, and a planner must not make unsupported claims.

**Cursor parent:** verify that source refs still fit the current checkout/worktrees, choose ready noncolliding Changes and file/resource owners, and issue task-specific `DEPTH=VERIFY|PATCH|INVESTIGATE` + allowed model instructions. It should *not* redesign a fully planned Change unless implementation evidence contradicts it.

**Cursor child:** inspect `git status`, load the route card and a few exact source/test anchors, implement or verify within the selected scope, test normal/negative cases, reconcile changed permanent docs, and report discrepancies. **No broad architecture investigation as an assumed prerequisite.** If a source claim is stale, stop with the exact mismatch and ask the parent/planner for a corrected packet instead of wandering for 60 files.

**Important tradeoff:** a large, correctness-critical Change may genuinely require wide source understanding. Put that source analysis in the planner's recorded research or accepted technical contract, not implicitly in the executor's private deliberations. The planner cannot guarantee a zero-search implementation, and the child must remain free to investigate a specific contradiction. Avoid both reflexive exploration and blind obedience to stale paths.

## Before authoring: settle design, then map the current repo

The packet-authoring steps below begin after the material-design gate. Do not treat this source-map workflow as the architecture design workflow. Respect owner-selected legacy source exclusions; boundary evidence and explicit unknowns replace guesses. Direct planner implementation may be selected without Cursor handoff. Material designs must already establish the [verification architecture and acceptance matrix](../rules/target-driven-renewal.md#design-verification-with-the-system); this applies equally to direct and delegated execution.

1. **Name the desired outcome and authorization.** Is the request a new architecture decision, a documentation contract, a concrete implementation slice, or merely verification? Don't multiply open Changes for speculation or tests without an authoritative target. Check the existing queue and related Changes first, including merged/archived work and in-flight Cursor ownership; deduplicate or transfer scope.
2. **Inspect exact current source, not just the wiki.** On connected GitHub/attached ZIP/full checkout, record inspected commit/date, relevant path **and symbol/function**; read real implementation boundaries, callers, types/DB tables/transactions, tests, runtime/config and existing fixture. Validate package paths and anchors. If access is limited to an old snapshot or running Cursor branches are unavailable, clearly mark what is unverified and do not assert readiness based on assumptions.
3. **Resolve the architecture at the appropriate level.** Distinguish documented future target, current code behavior and tested evidence. For material choices, decide rather than offering three competing options to Cursor; record WHY and which alternatives were rejected. Ensure product authority and technical ownership remain coherent.
4. **Trace the complete change surface.** Identify upstream command/entrypoint, downstream consumers, state or document ownership, source→sink path, retries/failure, test and affected permanent docs. Inspect integration points beyond the first five files **on the planning side**. For stateful changes identify each mutable table/ID, checkpoint or root pin, transaction/order fence, cross-service ownership and migration behavior; explicitly identify out-of-scope/unsupported states.
5. **Produce one bounded, executable outcome.** Turn the resolved design into a Change/PLAN with a narrow owner, approved behavior, no overlapping writers, one normal and one discriminating negative path, commands/fixtures, expected results and known rollback or refusal. A Complex Change may need a detailed source-to-state mapping appendix in `PLAN.md` or canonical technical doc, **not** twenty duplicate explanatory packets.
6. **Handoff and honest residual unknowns.** The Cursor route card names 2–5 *initial* files/test anchors, but the planner's investigation can and should cover many more affected components. Give exact symbols and the integration map so the executor doesn't have to reconstruct it. Mark unresolved facts as explicit `PLANNER BLOCKER` or bounded research question and keep the packet Proposed, rather than disguising architectural design as an implementation detail. A blocker is real when evidence or authority is missing, not just inconvenient.

## Depth proportional to task

| Task | Planner investigation | Executor expectation |
| --- | --- | --- |
| **VERIFY** exact named command | Check correct cwd, command, disposable prerequisites, permission and receipt destination. No architecture sweep. | Run once, collect PASS/FAIL/NOT-RUN; one error-directed diagnostic if necessary |
| **PATCH-S** mechanical edit, test path, links | Inspect exact owner file(s), API/symbol and one negative/focused test. Resolve path/cwd traps. | Edit named files and run named checks; minimal discovery |
| **PATCH-M** bounded feature/refactor | Trace consumers/callers and selected technical guarantees; specify data/control flow and failure edge | Verify 2–5 anchors, implement and test; only widen for contradiction |
| **PATCH-L** persistence, fork, distributed workflow, money/permissions | **Precompute source-grounded state/ID migration map, SQL ownership and transaction fences, canonical root/branch rules, API DTO changes, retry/crash matrix, test harness and integration owner.** Split into smaller Changes if the contract still requires novel architectural decisions. | Patch per approved mapping; stop on specific gap, not general exploration |
| **INVESTIGATE** deliberate unknown | Define question, diagnostic evidence, competing hypotheses and decision criteria; research broadly here, then narrow outcome | Research that one unknown; no unsolicited coding |

*Complexity is not determined by file count or lines. Security/irreversible effects can require deep planner reasoning for a tiny diff.* Do not demand a verbose state map for a one-line link fix, or force an obvious smoke test into an additional planning ceremony.

## Mandatory planner-to-executor contract (for material implementation)

Write a concise **Planner Source Map** in the Change or `PLAN.md`:

- **Baseline:** inspected Git SHA or ZIP revision + date; live worktree/branches unknown or known; current behavior backed by specific function paths/symbols.
- **Authority:** exact canonical product/technical heading and what is selected vs currently implemented.
- **Call and data path:** entrypoint → owner function/service → source tables/documents → writes/outbox/consumers → reads/DTO/UI, with file/symbol references.
- **Decisions already settled:** algorithms, state or ID remapping, invariants, concurrency/fence, version/attempt identity, error/negative behavior, supported and refused cases, resource effects.
- **Change surface:** files **to edit**, files **to read** and files **not to touch**; shared worktree/cluster/migration owner, relevant independent Changes and prerequisites.
- **Tests:** exact command + cwd + test fixture, expected normal result, **discriminating negative** result, no paid/destructive test without authorization, and truthful NOT-RUN conditions.
- **Short route card for child:** `DEPTH`, approved model/role if Cursor, goal, exact 2–5 starting anchors, named heading, concise safety/negative, verification command, stop/escalation condition and receipt. Do not paste the entire investigation into the child's prompt.
- **Residual uncertainty:** every unresolved issue has an explicit owner and stop condition. Do not label `Ready` when the executor must discover an unchosen persistence/authority strategy.

**Richer design documentation is for the planner and future maintainers; a cheaper executor should not be required to read it all.** Large research artifacts belong in one linked source-map appendix, not inside every child handoff. When ChatGPT can access current GitHub, it should do these investigations *now* instead of writing “Cursor should investigate X/Y/Z” as the actual plan. If a tool cannot inspect a source path, mark it and narrow/hold readiness. Never invent file contents, test outcomes or repository modifications.

## Readiness gate and audit

**READY for low-investigation execution** only if all are true:
1. Source/authority refs verified against an identified baseline, with actual dependencies and concurrent work identified.
2. Core behavior, interface, data transformations and known failure cases decided; the executor isn't being asked to invent architecture.
3. Disjoint file/resource ownership, relevant docs reconciliation and test fixtures are specified.
4. One falsifiable normal and discriminating negative, exact verification route and bounded stop condition exist; required proof tiers, environment/fixture ownership, authorization, setup/cleanup and any extended assurance are explicit in the acceptance matrix.

If not, do **planner research or a separate, explicitly selected INVESTIGATE** and label the Change Proposed / design-dependent. Avoid false `Blocked` status when the planner can resolve the question itself.

**Observe outcomes:** WIKI18 records actual tool/read count, search-before-first-edit, reported tokens/price when visible, correctness and rework. If a child reads dozens of files on a material Change, inspect whether the planner omitted a genuinely essential data/authority mapping before blaming the child or adding arbitrary quotas. A cheaper model with repeated retries is not a savings claim.

## Example: DATA04 historical fork

**Bad:** “Read forks.ts, reads.ts, checkpoint.ts; implement historical fork and safe canon inheritance; investigate how.” This leaves root identity, complete mechanics restoration, remapping, SQL ownership and client API to the executor.

**Good:** planner inspects schema, checkpoint, `forkCurrent`, document manifest campaign ID, canonical source pins, story/ownership API, existing tests and the published DATA03 writer **before authoring DATA04**, specifies scene-as-of reconstruction and safe refusal states, historical GET DTO and fork command idempotency, defines SQL/root/branch fencing plus exact negative tests, and tells Cursor where to edit. Cursor confirms source hasn't drifted, follows that mapping, and reports any new contradiction.

**Separate experiment, not a guarantee:** planning cost moves to ChatGPT-side investigation; real total time may increase for small tasks. Measure *correctness plus billable Cursor cost* rather than promising zero investigation or a particular percentage saved.
