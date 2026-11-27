# AC05 | task queue
Base SHA: `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; latest: recheck target `implementation/agent-core-monorepo-map`.
Change state: Proposed; selected task: none; prerequisites: AC03, AC04.
Contract owners: [Agent Core](../../../../../docs/technical/platform/agent-core.md#concrete-mission-contract), [package map](../../../../../packages/README.md).
Tasks: T01 → T02. Serial within this Change; no parallel children required. Cross-Change concurrency in [group schedule](../README.md). Parent owns staging, closure and join. No live/paid operations. All cards are proposed for independent readiness, not dispatch authorization.

## T01 | Implement static registry and exact request envelope | PROPOSED

DEPTH=PATCH

Requires: None beyond Change prerequisites.
May write: `packages/ai/agent-core/src/tools/registry.ts`, `packages/ai/agent-core/test/registry.test.mjs`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: INTERFACES.md#capability-contract; packages/ai/agent-core/src/missions/contracts.ts; docs/technical/platform/agent-core.md#concrete-mission-contract.
Algorithm: Implement static capability binding names/description/schema; map using Map or null-prototype record, no dynamic string-to-function lookup, reject duplicate/invalid names. `selectCapabilities` returns exact admitted list in request order, throws stable planner-defined error if impossible unknown registry state (runtime maps denial). `validateToolInput` JSON serializes plain JSON-safe argument, checks length <=1024 before own safeParse, validates and checks normalized serialized result too; no coercive/transform schema used by fixture. Return discriminated `{ok:true,value}` / `{ok:false,code:'invalid-tool-input'|'tool-input-limit'}`. Add offline table cases. `SyntheticToolRequest` separates mission/definition/effective names from args, no payload-controlled function, routing, authority or file handles.
Test: Source gate; AC08 offline test.
Negative: Unknown/duplicate registry entries and oversize/malformed arguments never yield a dispatch envelope.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.

## T02 | Bind SDK tool wrappers to trusted Activity dispatch | PROPOSED

DEPTH=PATCH

Requires: T01 source.
May write: `packages/ai/agent-core/src/tools/dispatch.ts`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: INTERFACES.md#sdk-tool-wrapper; packages/ai/agent-core/src/tools/registry.ts (T01); packages/ai/agent-core/src/policy/limits.ts::MissionLedger; docs/technical/platform/agent-core.md#deterministic-fixture-and-result-rules.
Algorithm: `createSdkTools(admission, selected, ledger, dispatch)` builds only selected `tool({description,inputSchema,execute})` wrappers in a null-prototype tool dictionary. In execute: check cancellation, validate argument, record denial then throw stable Error if invalid; reserve synchronously before first await, throw stable Error if unavailable; construct request from trusted admission + binding name + validated input; await one dispatch. Verify returned string <=4096, non-string/oversize record failure and throw; catch ordinary dispatch failure set `tool-failed` and rethrow, but rethrow cancellation untouched (Temporal `isCancellation` / current scope state). No user callbacks, retry, remote I/O or telemetry. Fault code sticks even if SDK captures tool error and generates more text.
Test: Source gate; live/native and offline proof AC08.
Negative: 3rd parallel reservation rejected before dispatch; failed/malformed input cannot cause real or unauthorized effect.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.
