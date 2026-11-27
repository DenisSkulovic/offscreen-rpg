# AC06 | selected execution contract

## Native loop

```ts
export interface GenerateMissionInput { modelId: string; instructions: string; prompt: string; tools: ToolSet; ledger: MissionLedger; }
export async function generateMission(input: GenerateMissionInput): Promise<Terminal>;
```

`onStepEnd` receives completed step; record invalid/unknown/unallowed/providerExecuted tool calls as `tool-not-allowed` or `invalid-tool-input` (use actual `toolCall.invalid`, toolName and selected dictionary own property); `content` with `type:'tool-error'` records `tool-failed` unless denial already covers it. On each completed step compare each tool call ID to returned tool result or error; missing result => `unfinished-tool-call` failure if before ceiling, otherwise terminal unfinished limit. Final normal stop must have no unresolved call or unsupported output and <=4096 UTF-16 text. A normal stop with tool calls but all resolved is not a final answer unless supported normal terminal text and no pending calls; E1 require terminal step no tool calls (conservative). `finishReason` `length`, `content-filter`, `error`, `interrupted`, other nonnormal values cannot be success. Step count computed from onStepEnd events; final results count is assertion, not second increment. `stopWhen` fault predicate returns true for any sticky category, so no further planned generation after completed denied/faulted step. On parallel calls in same SDK step, previously admitted reads may finish; no new allowed dispatch after observed fault/cancel. No new SDK repair, provider-executed tool, steering, MCP or network route.

Use `ActivityCancellationType.WAIT_CANCELLATION_COMPLETED` from workflow package if exposed by pinned SDK; explicit heartbeat 2s (native plugin sends every half timeout) and fixture abort-aware delays. Do not weaken cancellation to a swallowed error. `CancellationScope.current().consideredCancelled` check before/after native loop and wrappers; if true await current `cancelRequested` (rejects with actual cancellation). `isCancellation` rethrow original. If SDK wraps cancellation so it cannot be observed, use scope signal check; actual unsupported native mismatch is planner stop. No provider timeout retries, no external effects.

## Runtime entrypoint

```ts
export interface ExecutionBindings {
  readonly definitions: readonly AgentDefinitionV1[];
  readonly capabilities: readonly CapabilityBinding[];
  readonly modelId: string; // trusted fixed host binding, not mission input
  readonly dispatch: DispatchSyntheticTool;
}
export async function executeMission(raw: unknown, bindings: ExecutionBindings): Promise<MissionOutcomeV1>;
```

Workflow ID derives from validated mission ID via AC03 helper; check actual workflowInfo. Registry validation before effects; root public package does not export host. Use Workflow logging (replay-safe), never log text/tool args/model payload. No feature flags, global singleton, custom scheduler or persistent state. Keep canonical E1 boundary unchanged. If trusted host config malformed, denied `invalid-definition`/`invalid-registry`, zero effects. Fixture host rejects unknown model ID. Model/Activity exceptions bounded failure; cancellation remains native terminal state. AC08 adapter imports workflow-safe export only.
