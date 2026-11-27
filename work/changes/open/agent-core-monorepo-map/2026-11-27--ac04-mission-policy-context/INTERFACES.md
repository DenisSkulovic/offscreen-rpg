# AC04 | selected execution contract

## Admission and context

```ts
// validate.ts, internal; use AgentDefinitionV1/MissionV1 from contracts.ts
export type Admission = { ok: true; mission: MissionV1; definition: AgentDefinitionV1; effectiveToolNames: readonly string[] } | { ok: false; code: string };
export function admitMission(raw: unknown, actualWorkflowId: string, definitions: readonly AgentDefinitionV1[], registeredToolNames: readonly string[]): Admission;
// assemble.ts
export function assembleContext(definition: AgentDefinitionV1, mission: MissionV1): { instructions: string; prompt: string };
```

UUID v4 lower-case standard 8-4-4-4-12 form (`randomUUID` host); definition ID `[a-z][a-z0-9-]{0,63}`; tool identifier `[A-Za-z][A-Za-z0-9_]{0,63}`. Enforce exact six mission fields plus `definitionVersion` (seven total: version, missionId, definitionId, definitionVersion, input, requestedTools, maxSteps), text <=4096 UTF-16 code units, nonempty trimmed instructions/input, requested list <=16, no duplicates. This finite fixture envelope is internal E1 hardening, not a future production default. Validate trusted registry name uniqueness and all definition tool lists (<=16), identities/version and instructions; deny inconsistent configuration without effect. Code vocabulary: `invalid-mission`, `workflow-id-mismatch`, `unknown-definition`, `invalid-definition`, `tool-not-allowed`, `invalid-tool-list`, `input-limit`, `step-limit`. Return `input-limit`/`step-limit` as admission denial when malformed/exceeds accepted input, not as execution-limit status. `effectiveToolNames` is a new copy of requested names, no privilege expansion. Do not mutate input, definition or registry.

## Mission ledger and outcome

```ts
export type Terminal = { finishReason: string; text: string; hasUnfinishedCalls: boolean };
export interface MissionLedger {
  readonly maxSteps: number;
  readonly steps: number;
  readonly toolCalls: number;
  readonly deniedCode: string | undefined;
  readonly limitCode: string | undefined;
  readonly failureCode: string | undefined;
  recordStep(): void;
  deny(code: string): void;
  limit(code: string): void;
  fail(code: string): void;
  reserveTool(): boolean;
}
export function createMissionLedger(maxSteps: number): MissionLedger;
export function resolveOutcome(ledger: MissionLedger, terminal?: Terminal): MissionOutcomeV1;
```

Only valid maxSteps admitted. `recordStep` increments per completed step; >maxSteps records `step-limit` (should be unreachable). `reserveTool` must refuse existing faults without altering category; if >=2 record `tool-limit` then false, otherwise increment and true. First code of each category sticks. Terminal is only successful for finishReason `stop`, non-whitespace text <=4096, no unresolved calls and no recorded fault. Limit if explicit limit or ceiling with absent/empty/unfinished terminal response; explicit nonnormal length/content-filter/error/interrupted failure remains failed (`nonterminal-model-output`), unless earlier higher-priority fault; no text alone. `resolveOutcome` is pure mapping, never catches Temporal cancellation; runtime checks that first. Stable fallback codes `missing-terminal-output`, `nonterminal-model-output`, `step-limit`, `output-limit`, `execution-failed`. `toolCalls` counts admitted attempts not external billing. Telemetry never decides outcomes.
