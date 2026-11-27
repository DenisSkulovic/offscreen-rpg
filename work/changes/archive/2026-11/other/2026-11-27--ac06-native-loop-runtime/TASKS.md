# AC06 | task queue
Base SHA: `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; latest: recheck target `implementation/agent-core-monorepo-map`.
Change state: Proposed; selected task: none; prerequisites: AC03, AC04, AC05.
Contract owners: [Agent Core](../../../../../docs/technical/platform/agent-core.md#deterministic-fixture-and-result-rules), [package map](../../../../../packages/README.md).
Tasks: T01 → T02. Serial within this Change; no parallel children required. Cross-Change concurrency in [group schedule](../README.md). Parent owns staging, closure and join. No live/paid operations. All cards are proposed for independent readiness, not dispatch authorization.

## T01 | Implement native generation and sticky step classification | PROPOSED

DEPTH=PATCH

Requires: None beyond Change prerequisites.
May write: `packages/ai/agent-core/src/loop/generate.ts`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: INTERFACES.md#native-loop; packages/ai/agent-core/src/policy/limits.ts::MissionLedger; packages/ai/agent-core/src/tools/dispatch.ts::createSdkTools; docs/technical/platform/agent-core.md#concrete-mission-contract.
Algorithm: Construct new TemporalLanguageModel with trusted modelId, Activity retry maximumAttempts=1, startToClose=10s, heartbeatTimeout=2s, cancellationType WAIT_CANCELLATION_COMPLETED. Call generateText once with instructions, prompt, tools, maxRetries:0, no repair/streaming/providerOptions, stopWhen `[isStepCount(ledger.maxSteps), () => hasStickyFault]`, disable telemetry/export. onStepEnd increment exactly once; inspect invalid/unknown/unallowed or providerExecuted calls, tool-error parts, unresolved tool outputs; record deny on invalid/unknown, fail on ordinary error, never permit hidden repair. Inspect final result.steps for consistency (no double-count); terminal normal `stop`, text from final step, pending if final has any tool calls without corresponding results or tool-calls finish. Use actual SDK types/step fields; if callback semantics cannot enforce required observation, stop. Re-throw observed Temporal cancellation ahead of ordinary failure; return only Terminal summary, no raw prompt or SDK objects.
Test: Source gate; AC08 native proof.
Negative: Partial text with length/content-filter, invalid tool then text, tool error then text, pending call or exceeded step limit cannot complete.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.

## T02 | Compose workflow entrypoint and lifecycle summary | PROPOSED

DEPTH=PATCH

Requires: T01 source.
May write: `packages/ai/agent-core/src/runtime/execute.ts`, `packages/ai/agent-core/src/telemetry/summary.ts`, `packages/ai/agent-core/src/workflow.ts`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: INTERFACES.md#runtime-entrypoint; packages/ai/agent-core/src/missions/validate.ts::admitMission; packages/ai/agent-core/src/tools/registry.ts and dispatch.ts; packages/ai/agent-core/src/loop/generate.ts (T01).
Algorithm: `executeMission(raw, bindings)` obtains actual workflowInfo().workflowId, validates registry and mission, returns denied with zero steps/calls on bad input/config. Construct ledger, exact selected tools, context; call generateMission once and resolveOutcome. Catch ordinary SDK failure => bounded `execution-failed` if no prior fault, preserve precedence; rethrow cancellation with `isCancellation` and current scope cancellation request rather than returning failed/completed. No retry/restart. `telemetry/summary` returns typed IDs/status/step/tool counts; use replay-safe Temporal workflow log, no prompt/arguments/text/raw exception, log start and terminal completion/failure/cancel; log failures must not change result. `workflow.ts` exports only executeMission + trusted bindings type (and capability request types for adapter if necessary); root remains pure. No test/Worker/client/plugin root imports.
Test: Source gate; AC08 build and bundle/replay.
Negative: Rejected mission => no loop call; cancellation must remain Workflow cancelled not application failed/completed; no raw prompt or second progress state.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.
