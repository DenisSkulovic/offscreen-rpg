# WR04 | bounded Composer execution queue (planner revision 2026-11-21)

**Branch:** `undertaking/storyteller-workshop` ONLY. **Code baseline inspected:** `f2e0b237` committed remote source; Cursor local dirty tree unknown. **Current selection:** not selected; Proposed, dependent on predecessors. **Model:** Composer 2.5 Standard; `DEPTH=PATCH` for one task only. **Read:** this T-ID, named 2–4 source files and exact relevant [EXECUTION](EXECUTION.md) section. Parent may consult [SOURCE-MAP](SOURCE-MAP.md), [PROOF](PROOF.md) only when needed. **No full-repo exploration, redesign, provider spending, destructive DB, live cluster or automatically selecting successor Change.**

**Execution sequence:** T01 → T02 → T03 → T04 → T05. Dispatch only one planner-ready T-ID with dependencies met. Each task is one cohesive mutation + focused test; parent owns integration, cross-task reconciliation, docs, archive. **If a path/algorithm contradicts the live worktree, STOP and report file:symbol + exact failed assumption; ChatGPT repairs the plan.** Do not 'investigate architecture' in Cursor. Task status reflects planning, not landed code or execution authorization.

## T01 | Define child read-only DTO and capability intersection | PLANNER-READY AFTER WR03

**MODEL=Composer 2.5 Standard | DEPTH=PATCH.** **Initial read/write anchors:** `packages/storyteller/src/tasks/task-contracts.ts; packages/storyteller/src/tasks/resources.ts`. Limit edits to those owner files, a narrowly necessary helper, and focused tests. **Steps:** Add writer-child-task.v1 with stable parent/child ID, ordinal, question, pinned root, capped budgets, explicit read-only tool allowlist. Child grant = intersection(parent grant, requested subset); no stage/submit/delegate.

**Positive test:** focused contract parser tests. **Discriminating negative:** child requesting wider scope/budget or recursion rejected. **Stop:** source drift, unsupported authority, unowned migration, missing predecessor, unsafe operation or two focused attempts failing for an architectural reason; return exact evidence instead of changing design. **Receipt:** actual paths/commit, positive+negative test command/result, task IDs, source SHA, NOT-RUN, remaining risk and model/provider spend (zero unless separately authorized).

## T02 | Reserve total child funds before dispatch | PLANNER-BLOCKED UNTIL WR03 MISSIONS LAND

**MODEL=Composer 2.5 Standard | DEPTH=PATCH.** **Initial read/write anchors:** `packages/application/src/storyteller/budget.ts; packages/db/src/schema/storyteller.ts`. Limit edits to those owner files, a narrowly necessary helper, and focused tests. **Steps:** Planner refresh must name actual WR03 mission/step foreign keys and reservation method. Then add child reservation under parent budget lock, stable child ID and at-most-once dispatch admission; never unreserve uncertain spent budget on timeout.

**Positive test:** disposable-DB two-child concurrency test. **Discriminating negative:** second reserve over remaining cap denied without provider call. **Stop:** source drift, unsupported authority, unowned migration, missing predecessor, unsafe operation or two focused attempts failing for an architectural reason; return exact evidence instead of changing design. **Receipt:** actual paths/commit, positive+negative test command/result, task IDs, source SHA, NOT-RUN, remaining risk and model/provider spend (zero unless separately authorized).

## T03 | Execute independent child contexts | PLANNER-BLOCKED UNTIL T02

**MODEL=Composer 2.5 Standard | DEPTH=PATCH.** **Initial read/write anchors:** `packages/application/src/storyteller/execution.ts; WR03 writer tool runtime and its new step table`. Limit edits to those owner files, a narrowly necessary helper, and focused tests. **Steps:** Instantiate WR03 step engine with separate child transcript/attempt and read-only tool registry; child cannot stage/publish/delegate. Preserve unknown delivery and settled response.

**Positive test:** two distinct child context IDs and attempt hashes test. **Discriminating negative:** same parent transcript reuse or child stage call fails. **Stop:** source drift, unsupported authority, unowned migration, missing predecessor, unsafe operation or two focused attempts failing for an architectural reason; return exact evidence instead of changing design. **Receipt:** actual paths/commit, positive+negative test command/result, task IDs, source SHA, NOT-RUN, remaining risk and model/provider spend (zero unless separately authorized).

## T04 | Join typed cited findings in request order | PLANNER-READY AFTER T03

**MODEL=Composer 2.5 Standard | DEPTH=PATCH.** **Initial read/write anchors:** `packages/application/src/storyteller/execution.ts; packages/application/src/storyteller/library-navigation.ts`. Limit edits to those owner files, a narrowly necessary helper, and focused tests. **Steps:** Order results by captured child request ordinal; reauthorize and validate each cited root/document/object hash against parent pinned membership; report contradictions/gaps. Required missing child→held unless capture permits partial.

**Positive test:** join reversal and sourced evidence test. **Discriminating negative:** fabricated citation/sibling note/failed required child not asserted as fact. **Stop:** source drift, unsupported authority, unowned migration, missing predecessor, unsafe operation or two focused attempts failing for an architectural reason; return exact evidence instead of changing design. **Receipt:** actual paths/commit, positive+negative test command/result, task IDs, source SHA, NOT-RUN, remaining risk and model/provider spend (zero unless separately authorized).

## T05 | Exercise two-child restart/failure matrix | PLANNER-READY AFTER T04

**MODEL=Composer 2.5 Standard | DEPTH=PATCH.** **Initial read/write anchors:** `packages/application/test/long-story-memory-evaluation.test.mjs; new focused child lifecycle test`. Limit edits to those owner files, a narrowly necessary helper, and focused tests. **Steps:** Two independent 200-scene research questions, parent reopens original sources, restart between child deliveries, ensure exactly one child settle/join and aggregate spend cap. Update docs only from actual evidence.

**Positive test:** pnpm --filter @offscreen/application test. **Discriminating negative:** cancellation, uncertain model and budget exhaustion cannot duplicate dispatch. **Stop:** source drift, unsupported authority, unowned migration, missing predecessor, unsafe operation or two focused attempts failing for an architectural reason; return exact evidence instead of changing design. **Receipt:** actual paths/commit, positive+negative test command/result, task IDs, source SHA, NOT-RUN, remaining risk and model/provider spend (zero unless separately authorized).

## Closure gate

Task completion does not close Change. Parent must run designated [PROOF](PROOF.md) matrix, reconcile actual canonical docs/status/ledger, integrate into `undertaking/storyteller-workshop`, delete temporary worktree only after successful reconciliation and archive when accepted. Do **not** merge to `main` or launch adjacent WR Changes automatically. **Planner-ready is not proof of implementation correctness.**
