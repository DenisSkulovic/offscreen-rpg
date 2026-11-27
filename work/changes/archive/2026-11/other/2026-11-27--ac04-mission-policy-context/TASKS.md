# AC04 | task queue
Base SHA: `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; latest: recheck target `implementation/agent-core-monorepo-map`.
Change state: Proposed; selected task: none; prerequisites: AC03.
Contract owners: [Agent Core](../../../../../docs/technical/platform/agent-core.md#deterministic-fixture-and-result-rules), [package map](../../../../../packages/README.md).
Tasks: T01 → T02. Serial within this Change; no parallel children required. Cross-Change concurrency in [group schedule](../README.md). Parent owns staging, closure and join. No live/paid operations. All cards are proposed for independent readiness, not dispatch authorization.

## T01 | Implement admission and bounded text | PROPOSED

DEPTH=PATCH

Requires: None beyond Change prerequisites.
May write: `packages/ai/agent-core/src/missions/validate.ts`, `packages/ai/agent-core/src/context/assemble.ts`, `packages/ai/agent-core/test/admission.test.mjs`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: packages/ai/agent-core/src/missions/contracts.ts; packages/ai/agent-core/src/index.ts::missionWorkflowId; INTERFACES.md#admission-and-context; docs/technical/platform/agent-core.md#concrete-mission-contract.
Algorithm: Implement `admitMission(raw, actualWorkflowId, definitions, registeredToolNames)` exactly as interface; validate plain JSON-shaped object with required keys only, version=1, UUID missionId, actual Workflow ID equality, definition reference, text size, maxSteps integer 1..3, requested names unique and subset of immutable definition and static registry. Host definitions validate before use (no duplicate IDs, known/unique declared tools, valid version/instructions); no silent filtering. Return denied stable codes before any activity. `assembleContext(definition, mission)` returns `{instructions, prompt: mission.input}` without adding files/URLs or arbitrary context. Write table tests for valid/invalid shapes and code outcomes.
Test: Source gate; AC08 offline test.
Negative: Wrong workflow ID, unknown requested tool, oversized input, invalid bounds, unknown definition deny with zero effects.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.

## T02 | Implement deterministic limits and outcome policy | PROPOSED

DEPTH=PATCH

Requires: None beyond Change prerequisites.
May write: `packages/ai/agent-core/src/policy/limits.ts`, `packages/ai/agent-core/test/limits.test.mjs`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: INTERFACES.md#mission-ledger-and-outcome; docs/technical/platform/agent-core.md#deterministic-fixture-and-result-rules; packages/ai/agent-core/src/missions/contracts.ts.
Algorithm: Implement `createMissionLedger(maxSteps)` and `resolveOutcome(ledger, terminal)` as selected internal interface. Per-run local closure, counters initially zero, no wall-clock/random. Reserve tool synchronously: refuse if denied/limit/failed already sticky or 2 admitted attempts reached, mark limit only for ceiling. Step callback increments once for each completed SDK step; record first code per category. Select denial > limit > failure > valid normal stop text; ceiling with unfinished/tool-calls/empty answer => limit; nonnormal length/content-filter/error => failed (unless prior denial/limit), normal nonempty at exact maxSteps succeeds. Write pure unit tests with 3 reservations same tick and competing faults; no SDK or Activity imports.
Test: Source gate; AC08 offline test.
Negative: Third dispatch cannot be reserved; recorded denial dominates later text and limit/failure; successful last allowed normal step is not falsely limited.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.
