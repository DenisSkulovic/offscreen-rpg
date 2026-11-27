# Agent Core | R10 E1 freeze candidate

Generic bounded agent execution, independent of Storyteller. R8 and R10 support Vercel AI SDK 7.0.183 with @temporalio/vercel-ai-sdk 2.0.0 and aligned Temporal SDK 1.24.0; the E1 candidate pins Zod 4.6.7 (patched, rerun and replay passed), @ai-sdk/provider 4.0.39 and @ai-sdk/mcp 2.0.66 wherever directly required. Keep aligned Temporal resolution and reconcile exact peer closure in pnpm. This is the designer selection for review and owner acceptance. No production dependency adoption or live inference is authorized. The other candidates remain research, not runtime-selectable backends.

## E1 source shape

```text
packages/ai/agent-core/
  README.md
  package.json
  tsconfig.json
  src/
    index.ts           # serializable public contracts
    workflow.ts        # workflow-safe public execution export
    missions/contracts.ts  # versioned definition, mission and outcome types
    missions/validate.ts   # runtime input/identity/definition validation
    runtime/execute.ts     # admit, compose, execute, map outcome
    loop/generate.ts       # native generateText/TemporalLanguageModel integration
    context/assemble.ts    # instructions + bounded text input
    tools/registry.ts      # static typed capability bindings, schema and allowlist
    tools/dispatch.ts      # validated SDK tool wrappers, Activity bridge
    policy/limits.ts       # bounded execution envelope and deterministic counters
    telemetry/summary.ts   # replay-safe correlation and outcome summary
  test/
    fixtures/definitions.ts # researcher and arithmetic definitions
    fixtures/model.mjs      # conversation-driven synthetic model, Worker-side
    fixtures/tools.mjs      # guarded synthetic Activity implementations
    mission.workflow.ts     # fixture composition and Workflow entrypoint
    qualification.mjs       # isolated Worker/client, assertions and replay/restart
    ...                    # focused maintained tests as needed
```

Folders are ownership boundaries, not implementation quotas. Identity lives in missions; Temporal owns progress/history, so no custom execution-state or persistence implementation. Record future compaction, delegation, persistent instances and richer state in the package README, not active empty source modules. Export contracts from root and a workflow-safe `./workflow` entrypoint; keep Worker/client/plugin setup, model doubles and test workflows in the test harness. Use the existing @offscreen/config TS conventions and narrow build exports. No application/domain/commerce/cache/SQL imports, no production consumers in E1.

## File-level composition (E1)

The source names above are the preferred initial shape, not a file-count rule. Keep contracts pure and independent of Temporal and SDK runtime imports; `index.ts` exports contracts, `workflow.ts` exports the workflow-safe execution entrypoint. `runtime/execute.ts` is the only composition coordinator: validate the JSON input and resolve the static definition, derive effective tools, assemble text context, allocate mission-local limits, invoke `loop/generate.ts` once, and map the terminal result. The loop owns SDK translation, not admission, tool authority or domain behavior. Tools consume schema bindings and the deterministic budget; they do not import the loop or runtime. Policy depends only on contracts and deterministic values; telemetry cannot affect execution decisions. Pass trusted static capability definitions/dispatch bindings as workflow-local arguments, never serialized mission input. Keep fixture-specific names, content, model selection and Worker setup outside `src/`.

Use ESM (`type: module`), NodeNext compilation and explicit relative `.js` imports in TypeScript; match the existing config/base and TypeScript 5.9.3 convention. Root and `./workflow` exports target corresponding `dist` JS/declarations. Keep Worker/client and test fixture imports outside both production export closures. Use the P0/P1-tested Vercel, Temporal, AI SDK provider and Zod versions for direct dependencies where used; reconcile actual resolved peer dependencies and the monorepo lockfile before acceptance. Do not add a provider abstraction or custom orchestration package merely for hypothetical reuse.

## Concrete mission contract

The following shapes settle semantics; names may be mechanically reconciled at packet planning. Plain versioned JSON-compatible values cross the Workflow boundary, never closures, SDK model objects, provider credentials, or resource handles.

```ts
interface AgentDefinitionV1 {
  id: string;
  version: 1;
  instructions: string;
  toolNames: readonly string[];
}
interface MissionV1 {
  version: 1;
  missionId: string;
  definitionId: string;
  definitionVersion: 1;
  input: string;
  requestedTools: readonly string[];
  maxSteps: number;
}
type MissionOutcomeV1 =
  | { status: 'completed'; text: string; steps: number; toolCalls: number }
  | { status: 'limit-reached' | 'denied' | 'failed'; code: string;
      steps: number; toolCalls: number };
```

Trusted host installs immutable definitions and capability bindings keyed by identifier/version in the Workflow bundle; lookup by reference, reject unknown or mismatched identities before any effect. Workflow input is not a grant: requested tools must be a subset of both the selected definition and the host registry; reject duplicates, unknown names and invalid inputs rather than silently expanding scope. No untrusted caller/API entrypoint. One admitted mission per unique Workflow ID; host derives Workflow ID from mission identity with an E1-specific prefix and rejects duplicate start and reuse while Temporal retains that ID; generate a fresh globally unique mission ID for new runs. No permanent deduplication guarantee beyond retained history is claimed. Use actual Workflow execution identity for correlation. No persistent instance, public resume API or second source of truth.

Workflow-safe runtime composes instructions + text input, wraps only allowed registered tool schemas and calls the SDK loop once. No bespoke agent loop. Tool handlers are deterministic wrappers over an explicitly registered synthetic Activity; pass trusted mission/definition reference and tool name separately from validated model arguments. Activity independently verifies actual Workflow identity against the expected E1 Workflow ID derived from mission ID, static definition/version, effective allowed tool names supplied only by the trusted Workflow wrapper, registered read-only fixture capability and fixture arguments before dispatch. This is a local trusted-host fixture fence, not an authentication or tenant boundary; direct invocation from untrusted code is unsupported. No arbitrary string-to-function resolution, URL/file loading, hosted tools, streaming, provider routing, child Workflow, generic user-supplied executors or real effects. Unknown/malformed/denied tools cannot produce a successful mission or dispatch an unauthorized Activity; inspect SDK step/error results including invalid/unknown tool requests even when the SDK never calls the execute wrapper; record a sticky denial/failure and never repair or substitute an unknown tool. Treat inability to observe an invalid request or distinguish a terminal stop from unfinished tools as a material SDK mismatch. Do not rely on final text alone. Tests assert actual Activity counts. Model provider registered in the isolated Worker accepts only one synthetic model ID; all other model families/streaming rejected. No production provider imports or credential access. The model is not an authority.

Use `generateText`, `TemporalLanguageModel`, `tool`, `isStepCount` as in the successful P0/P1 specimen; SDK `maxRetries: 0`, model/tool Activity `maximumAttempts: 1`, 10s start-to-close, 30s Workflow execution timeout. Bound steps to 1–3 (same envelope as P0/P1), total tool dispatches to 2 per mission including parallel requests via deterministic reservation before dispatch, and reject over-limit requests. These are deliberately small fixture envelopes, not production defaults. Bound definition instructions and mission input to 4096 UTF-16 code units each, each validated serialized tool argument to 1024 units and fixture tool/model text to 4096 units before it becomes an Activity result; use bounded synthetic fixture responses, no arbitrary context ingestion. Return limit-reached when the step ceiling prevents a terminal answer, denied on capability/schema violations, failed on other ordinary execution failures. Distinguish successful terminal text from unfinished tool requests, empty answer and SDK errors. Preserve Temporal cancellation/timeout as terminal Workflow status, not a swallowed success or application retry; do not start further effects after observed cancellation. Terminal infrastructure failure remains visible in Temporal. No automatic restart of a failed mission. Synthetic tools are pure reads/calculation; real effect idempotency, uncertain send and durable financial custody are explicitly outside this scope and required before activation.

Identity, context, tool checks and outcome mapping must be deterministic and version-bound. Use Temporal history for replay; host owns Worker/client setup, namespace, task queue, deadlines and shutdown. Use explicit isolated dev experiment namespace, loopback endpoint, no default/release/game queues, no production Worker registration. Existing `packages/workflows` remains owner of production Workflow entrypoints and `apps/worker` of production composition; E1 uses only a test-local Workflow adapter calling the new package. Future production integration will require separate review. Lifecycle summary includes mission/definition reference, start/completion/failure correlation, step and tool counts; no external traces, raw prompt logging or billing facts. Temporal history contains synthetic data only.

### Deterministic fixture and result rules

The R6 `common.mjs` specimen uses an in-memory per-Workflow row to choose model responses; retain that specimen unchanged as historical evidence, but do not use that row as foundation execution state. The maintained synthetic model decides solely from the current SDK request (mission marker, structured tool-call/result messages and exact fixture result); after a recorded tool result, a fresh Worker must produce the same final answer without a prior process-local call counter. Tool fixtures are pure and verify the selected capability and allowed fixture argument independently. Test counters are observations only: collect receipts per Worker lifetime and reconcile completed Activity identities in Temporal history across restart; no process-local counter decides a response or establishes authority.

For a parallel tool request, reserve one mission-local slot synchronously before awaiting its Activity. A rejected request must not dispatch that capability; already-admitted allowed reads need not be undone. Persistently mark any denial/limit/error in the deterministic mission execution state for that run, so a later SDK text response cannot turn it into success. Define `steps` as completed SDK generation steps, `toolCalls` as admitted dispatch attempts, not a billing or physical provider count. Observe physical Activity invocations independently in qualification. Cancellation propagates ahead of ordinary result mapping. For non-cancelled results, recorded denial takes precedence over limit exhaustion, then ordinary failure, then terminal non-empty answer; no terminal answer at exhausted ceiling is limit-reached, otherwise failed. Use bounded stable reason codes, not raw provider exceptions or full prompts in outcomes. No requirement for a general workflow-state framework.

## E1 acceptance (grouped at integration/qualification)

- New workspace builds and typechecks with pinned dependencies and exports; existing workspace graph and application closure stay compatible. No existing package moves, domain consumer changes, paid dispatch or schema/migration changes.
- One maintained provider-free harness, two definitions on the same generic runtime and distinct static tools: historical researcher reads fixture text, arithmetic assistant calculates a bounded deterministic expression (fixed supported operation, no eval). P0 no tool and P1 tool result fed into subsequent model call; assert correct outputs and actual 1/0 and 2/1 model/tool counts respectively. Both definitions run without modifying generic runtime.
- Reject unknown definition/model/tool, forbidden requested tool, malformed args and over-limit input; show zero unauthorized tool effects. Test model-requested undeclared tool, step/tool exhaustion, ordinary model/tool failure, and bounded cancellation/timeout without subsequent successful dispatch. Preserve failure rather than returning a successful final answer. All tools synthetic and no live side effects.
- Replay recorded P1 history with the same Worker bundle/plugin, demonstrate resumed Workflow after an owned Worker restart at a recorded Activity boundary; no duplicate completed Activity dispatch and correct result. Do not claim exactly-once external effects or production crash recovery. If a material native SDK mismatch prevents a required guarantee, return to designer rather than invent second orchestration.
- Maintained tests and source/closure checks demonstrate no production consumer/exposure and no external provider route. All final claims gated on actual recorded results. Construction checks remain proportionate to current repo policy; broad runtime proofs run at designated acceptance boundary, not every task.

### Acceptance scheduling and owners

| Claim | Required positive / diagnostic negative | Boundary and owner |
| --- | --- | --- |
| Workspace and dependency compatibility | Existing flat and new grouped leaf discoverable, README-only excluded, duplicate name rejected; all four existing app build/runtime closures unchanged; new package build/typecheck and narrow exports; exact pnpm dependency/license/security reconciliation | Focused integration + final qualification; implementation coordinator, acceptance lead for wider affected builds |
| Generic mission and policy | Two definitions, P0/P1 outcomes and call counts; invalid identity/model/tool/schema, oversized input, parallel tool ceiling, no unauthorized capability effect or false success | Final maintained qualification, implementation coordinator builds fixtures and deterministic tests; acceptance lead executes live batch |
| Durable lifecycle | Replay and fresh Worker resume after recorded completed Activity, no duplicate completed Activity; failure, timeout/cancellation and no subsequent successful dispatch after observed cancellation | Final qualification, acceptance lead/owner using isolated dev Temporal; no release or default queues |
| Exposure and custody | Only synthetic model and tools in test host; no production consumer/export of fixture host, real provider/credentials/SQL/domain dispatch | Source/closure proof at final acceptance, any actual exposure blocked earlier; implementation coordinator and acceptance lead |

Source-only construction joins on the isolated design implementation branch need only assigned source gates. All rows are required before main integration; no new live provider or domain effect is authorized. Use the existing POC namespace helper after health/absence and ownership checks, fresh unique namespace/queues/IDs, loopback port-forward, sanitized credentials-free environment, bounded per-run outer timeout and clean owned Worker/forward shutdown. Retain logs/history receipt; no automatic deletion or shared-cluster fault injection. Restart only the owned fixture Worker. Exact maintained harness commands and test targets are fixed in the qualification packet after acceptance. No speculative second loop or source-only proof claimed as runtime proof.

## Cross-cutting considerations
Reasoning effort: mission chooses desired effort, model capability constrains it, provider translates wire representation, financial authority admits spending. Agent loop can consume model-selection and inference interfaces without owning their catalogs or transports. No Redis caching logic in core. Storage-neutral contracts only as justified by consumers; do not invent abstract persistence layers prematurely.

## R3/R4 runtime direction
See [current technology-selection dossier](technology-selection/README.md) and [initial research](AGENT-RUNTIME-RESEARCH.md). Vercel, OpenAI Agents and Strands were the primary experiment candidates; R9 proposes Vercel for E1 after all three passed P0/P1. The folders are responsibilities, not a custom implementation quota. SDK-provided loops, delegation, compaction and state machinery may shrink or eliminate folders. Temporal-native integration is promising but must pass custody and authorization experiments. Host owns Worker configuration; Workflow-safe orchestration and Activity-side effects must be separated. No agent framework owns Library authority, billing, or durable financial custody.

## R5 execution hypothesis
See [execution architecture comparison](technology-selection/EXECUTION-ARCHITECTURES.md). SDK loop in deterministic Workflow, effectful Activities outside it, one admitted mission per Workflow binding, custody-aware guarded inference and explicit child admission. This is a common candidate shape, not selected runtime or transaction contract.

## Historical research questions (later evolution unless required by E1)
- Can a framework provide loop/tool/message machinery without taking over our authority, durable custody and lifecycle semantics? Compare custom TS, suitable current agent SDKs/frameworks, and Temporal-centered/hybrid execution via official docs and specimens; R9 recommends Vercel for E1; other questions remain research.
- What is durable instance vs definition vs mission? What are the retention, identity and concurrency boundaries for persistent and temporary agents?
- Which effects need idempotency or uncertain-result hold rather than retry? How do grants and cost reservations survive crash and revocation?
- Which context/compaction/delegation mechanisms are necessary for a later real Storyteller outcome?
- What belongs in reusable AI invocation outside agents (including image/video)? Avoid overgeneralizing.
- Who owns durable execution truth between SQL and orchestration? Select independently of cache and document storage.

Later proof specimens: direct non-agent inference and agent sharing a route; fake model/tool loop with denied tool and crash after effect; child cannot exceed parent grant; versioned document reconstructs exact historical Markdown without Library concepts; Library cross-root access denial; telemetry failure cannot lose billing facts. These are investigation prompts, not frozen acceptance or executable tasks.
