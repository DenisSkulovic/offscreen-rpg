# AC08 | task queue
Base SHA: `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; latest: recheck target `implementation/agent-core-monorepo-map`.
Change state: Proposed; selected task: none; prerequisites: AC01, AC02, AC03, AC04, AC05, AC06, AC07.
Contract owners: [Agent Core](../../../../../../docs/technical/platform/agent-core.md#residual-e1-proof-not-yet-run-for-maintained-source), [package map](../../../../../../packages/README.md).
Tasks: T01 → T02 → T03 → T04 → T05. Serial within this Change; no parallel children required. Cross-Change concurrency in [group schedule](../../../../open/agent-core-monorepo-map/README.md). Parent owns staging, closure and join. No live/paid operations. All cards are proposed for independent readiness, not dispatch authorization.

## T01 | Bind test Workflow and pure preflight | PROPOSED

DEPTH=PATCH

Requires: None beyond Change prerequisites.
May write: `packages/ai/agent-core/test/mission.workflow.ts`, `packages/ai/agent-core/tsconfig.test.json`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: EXECUTION.md#workflow-adapter; packages/ai/agent-core/src/workflow.ts::executeMission; packages/ai/agent-core/test/fixtures/definitions.ts; docs/technical/platform/agent-core.md#acceptance-scheduling-and-owners.
Algorithm: Test-only Workflow `mission(raw, testControl?)` obtains trusted static fixture definitions/schemas, proxyActivities runSyntheticTool with 10s startToClose/maxAttempts1/heartbeat 2s/WAIT_CANCELLATION_COMPLETED; call generic executeMission(raw,bindings). No Worker/client import. For testControl restart hold only after read Activity completes and before next model, setHandler on fixed signal `e1-release`, wait condition; test-only deterministic wrapper after successful read, never core logic. For timeout proof testControl `hold-before-loop` waits condition never signalled under 30s execution timeout; no effects. Implement `unknown-model` testControl using trusted fixed bad model ID; reject unrecognized test control with stable error. Add tsconfig.test.json extending ./tsconfig.json, rootDir ., noEmit true, allowJs true, checkJs false, include test/mission.workflow.ts and test/fixtures/definitions.ts (imports resolve compiled core after build). control isn't user input/API, harness-owned only. T02 owns pure preflight/environment refusal tests; no cluster calls in ordinary tests.
Test: Source gate until T02; AC08 build/offline gate.
Negative: No production imports, only fixture capabilities; restart gate is deterministic and external signal controlled; bad env refused before connection.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.

## T02 | Build bounded qualification launcher | PROPOSED

DEPTH=PATCH

Requires: T01 source (shared test file serial: T02 final owner).
May write: `packages/ai/agent-core/test/qualification.mjs`, `packages/ai/agent-core/test/qualification.test.mjs`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: EXECUTION.md#host-lifecycle; packages/ai/agent-core/test/mission.workflow.ts (T01); packages/ai/agent-core/test/fixtures/model.mjs and tools.mjs; docs/technical/platform/agent-core.md#acceptance-scheduling-and-owners.
Algorithm: Implement `validateQualificationEnv(env)` pure: explicit opt-in `E1_QUALIFY=1`, exact loopback address regex valid port, isolated namespace `offscreen-agent-poc-` with 8–35 lowercase safe chars, reject ambient credential/exporter names. No default values. `qualification.mjs` guarded direct invocation; imports used by offline tests must not start connection. Use explicit `randomUUID` host mission IDs/taskQueue, native/client connection, static plugin with rejecting download and no MCP, fixed activities, workflowsPath test adapter; create fresh Worker/observations, start run() and handle rejected promise, shutdown only owned Worker finally then close connections. Export small harness functions consumed by scenario/recovery modules (fixed interfaces in EXECUTION). Log one JSON result receipt with per-scenario counts/IDs/failures/history, no raw protected data. Bounded outer owner timeout, per-scenario deadlines, no deletion/provision. Offline preflight test invalid env/refusal and no connection on import; do not execute live here.
Test: Source gate; AC08 offline gate.
Negative: Missing/unsafe namespace/endpoint, credentials or absent opt-in refused before connection; ordinary package tests cannot run live.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.

## T03 | Implement happy-path and adverse native scenarios | PROPOSED

DEPTH=PATCH

Requires: T02 source.
May write: `packages/ai/agent-core/test/qualification-scenarios.mjs`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: EXECUTION.md#scenario-matrix; packages/ai/agent-core/test/qualification.mjs (T02); packages/ai/agent-core/test/fixtures/scenarios.mjs; docs/technical/platform/agent-core.md#e1-acceptance-grouped-at-integrationqualification.
Algorithm: Implement `runScenarios(harness)` exact cases in matrix: both definitions P0/P1, admission denial, unknown model via native `unknown-model` test control (not serialized mission), unknown/bad tool, known-but-ungranted tool (researcher `E1_UNGRANTED_TOOL`, requestedTools `[]`), three parallel, step ceiling, model/tool failure, partial output, cancellation and timeout. Use actual model/tool invocation receipts and Temporal history scheduled activity types/IDs, not inferred counters. Assert native completed/failed/cancelled/timed-out states as specified. Duplicate mission start/reuse negative with same Workflow ID, ensure no extra Activity; never auto retry. Use bounded wait for held Activity observation, cancel owned handle, await result, verify abort/no successful later effect. Unknown model native case must fail without synthetic model generation or tool dispatch; no production route. No external I/O beyond local Temporal client.
Test: Source gate; owner executes live batch.
Negative: Every matrix row fails on false success, unauthorized effect, count mismatch, duplicate dispatch or wrong terminal state.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.

## T04 | Implement replay and fresh Worker continuation | PROPOSED

DEPTH=PATCH

Requires: T01/T02 source.
May write: `packages/ai/agent-core/test/qualification-recovery.mjs`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: EXECUTION.md#replay-and-restart; packages/ai/agent-core/test/qualification.mjs (T02); packages/ai/agent-core/test/mission.workflow.ts (T01); docs/technical/platform/agent-core.md#deterministic-fixture-and-result-rules.
Algorithm: Implement `runRecovery(harness, completedP1)` fetch completed P1 history and replay using same workflowsPath/plugin with fresh observations; assert no model/tool events. Restart scenario: start researcher E1_RESTART with hold-after-tool control; poll history until completed runSyntheticTool and subsequent WorkflowTaskCompleted, no second model scheduled; stop owned Worker via shutdown+await run; construct new Worker on same queue with fresh plugin/observations; signal e1-release, await exact answer, verify history 2 model +1 tool, completed tool Activity ID occurs once; first Worker observed model+tool, second only final model, no repeated completed activity. No cluster fault injection, no SIGKILL unrelated process. Timeouts/finally cleanup. No exactly-once external effect claim.
Test: Source gate; owner runs live.
Negative: Replay no effects; restart cannot pass if model relies on previous local counters or repeats completed tool.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.

## T05 | Integrate offline proof and durable acceptance route | PROPOSED

DEPTH=PATCH

Requires: T01–T04 source.
May write: `packages/ai/agent-core/README.md`, `docs/technical/platform/agent-core.md`, `packages/README.md`, `scripts/repo-tools/README.md`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: PROOF.md#offline-integration-gate; PROOF.md#joint-acceptance-matrix; docs/technical/platform/agent-core.md#review-findings-and-follow-through; packages/README.md#known-limitations-and-next-triggers.
Algorithm: After T01–04, parent runs assigned offline checks once. Release test command is only `node --test infra/images/release/test/warm-path.test.mjs`; never invoke image-closure.test.mjs, Docker or reuse existing images as candidate proof. Preserve exact closure comparison and four-app build/typecheck at the joint gate. Record actual commands/exit/results and source SHA; README exact build/test/qualify prerequisites and no ordinary live tests. Update known findings only with observed evidence; joint live, audit, closure and heavy builds remain NOT RUN until acceptance lead runs matrix. Preserve baseline Zod note separately. Produce no fake runtime claim. No new runtime dependency, production app/config, deployment or provider change. If offline gate fails, stop affected join. Once source gate passes archive packet before joining isolated design branch; acceptance lead later records live joint evidence in permanent owner and existing evidence path on exact implementation SHA, then owner authorizes design-level merge. No extra no-diff Change.
Test: Assigned offline integration gate in PROOF; owner owns joint qualification.
Negative: Routine tests have no Temporal env, no provider or Docker operations; exported root/workflow build; any remaining mandatory proof explicitly NOT RUN and prevents main merge.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.
