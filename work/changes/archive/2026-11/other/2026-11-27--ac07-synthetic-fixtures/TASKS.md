# AC07 | task queue
Base SHA: `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; latest: recheck target `implementation/agent-core-monorepo-map`.
Change state: Proposed; selected task: none; prerequisites: AC03.
Contract owners: [Agent Core](../../../../../docs/technical/platform/agent-core.md#deterministic-fixture-and-result-rules), [package map](../../../../../packages/README.md).
Tasks: T01 → T02 → T03. Serial within this Change; no parallel children required. Cross-Change concurrency in [group schedule](../README.md). Parent owns staging, closure and join. No live/paid operations. All cards are proposed for independent readiness, not dispatch authorization.

## T01 | Create fixture definitions and scenario table | PROPOSED

DEPTH=PATCH

Requires: None beyond Change prerequisites.
May write: `packages/ai/agent-core/test/fixtures/definitions.ts`, `packages/ai/agent-core/test/fixtures/scenarios.mjs`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: docs/technical/platform/agent-core.md#e1-acceptance-grouped-at-integrationqualification; INTERFACES.md#fixture-identity-and-scenarios; packages/ai/agent-core/src/missions/contracts.ts.
Algorithm: Use two definitions researcher and arithmetic, version 1, fixed instructions containing distinct marker. `scenarios.mjs` exports frozen JSON-like definition data and exact fixture constants/scenario names including `E1_UNGRANTED_TOOL`; no Node imports, shared by Workflow-safe definitions.ts and Worker-side fixtures. `definitions.ts` exposes readonly AgentDefinitionV1[] and schemas (`z.strictObject({path:z.literal('history/promise.md')})`, `z.strictObject({a:z.number().int().min(-1000).max(1000),b:...,op:z.literal('add')})`); fixture registry description and names match shared constants. Fixture tests can import shared pure scenario data; no credentials, model SDK or Activity import in definitions.ts. Test adapter supplied by AC08. Do not expose test fixture via root exports.
Test: Source gate; AC08 build/bundle.
Negative: Two definitions expose distinct tools only, fixed scenario markers and exact outputs, no production import.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.

## T02 | Build stateless synthetic model and plugin | PROPOSED

DEPTH=PATCH

Requires: T01 source.
May write: `packages/ai/agent-core/test/fixtures/model.mjs`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: INTERFACES.md#model-response-rules; packages/ai/agent-core/test/fixtures/scenarios.mjs (T01); work/designs/open/agent-core-monorepo-map/technology-selection/experiments/p0-p1/vercel.model.mjs (historical specimen); docs/technical/platform/agent-core.md#review-findings-and-follow-through.
Algorithm: Implement `createFixturePlugin(observations)` fresh per Worker, provider V4 named `e1-synthetic` only; embedding/image/doStream throw, supportedUrls {}, plugin download async throws stable `download-disabled` and records refusal; no MCP factories. `decideFixture(options)` pure deterministic decisions from system definition marker, exact user scenario marker, actual structured prior tool results, never invocation counter. Emit V4 content/usage as original specimen; bounded text/args, stable toolCallId unique per scenario/tool, no repair. `doGenerate` records actual Activity context/ID and increments independent observation after validation; handles scripted failure/hold and deliberately ungranted `readDocument` call as interface, even when no tools are advertised. Validate structured tool result ID/name/content; no marker-in-user spoof. Throw unknown mode/model/shape, refuse files and nontext outside expected tool parts. For cancellation mode await abort-aware 8s maximum delay with `options.abortSignal`, record abort; do not use ambient timer for Workflow logic. No provider wire calls.
Test: Source gate; AC08 fixture tests/native qualification.
Negative: Model called with recorded result in fresh plugin instance produces same text; no process-local decision; wrong model or nontext rejected; download hook rejects.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.

## T03 | Guard synthetic Activity and offline fixture cases | PROPOSED

DEPTH=PATCH

Requires: T01/T02 source.
May write: `packages/ai/agent-core/test/fixtures/tools.mjs`, `packages/ai/agent-core/test/fixtures.test.mjs`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: INTERFACES.md#synthetic-tool-activity; packages/ai/agent-core/test/fixtures/scenarios.mjs (T01); packages/ai/agent-core/test/fixtures/model.mjs (T02); docs/technical/platform/agent-core.md#concrete-mission-contract.
Algorithm: Export pure `evaluateFixtureTool(request, actualWorkflowId)` and `createFixtureActivities(observations)` => fixed `runSyntheticTool`. Validate UUID and expected `agent-core-e1-${missionId}`, definition version and permitted effective names, requested tool name is in both immutable definition and effective list, exact argument object shape; return fixed historical string or decimal addition string. No eval, fs, DB, network. For explicit tool-failure scenario choose bounded negative argument fixture permitted by schema (e.g. arithmetic a=-999,b=0,op=add) throws stable `synthetic-tool-failure` after guard, before successful result; record admitted invocation and outcome independently. Context.current().info identity and cancellation signal used by Activity; no untrusted caller. Offline `node:test` pure guards and stateless decisions; use exact structured model prompt fixtures for normal tool call and prior result, wrong/missing result, wrong identity, foreign capability, malformed args, unknown model/download rejection; include researcher with no advertised tools requesting the valid but ungranted readDocument, and pure tool guard rejection when effective list is empty. No client connections; no Worker start in tests.
Test: Source gate; AC08 `pnpm ... test`.
Negative: Foreign definition/effective list or wrong actual Workflow ID cannot execute a capability; model receipt counters not authority.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.
