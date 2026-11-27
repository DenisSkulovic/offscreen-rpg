# AC05 | selected execution contract

## Capability contract

```ts
import type { ZodType } from 'zod';
export interface CapabilityBinding { readonly name: string; readonly description: string; readonly inputSchema: ZodType<unknown>; }
export interface SyntheticToolRequest {
  readonly missionId: string;
  readonly definitionId: string;
  readonly definitionVersion: 1;
  readonly effectiveToolNames: readonly string[];
  readonly toolName: string;
  readonly input: unknown;
}
export type DispatchSyntheticTool = (request: SyntheticToolRequest) => Promise<string>;
export function selectCapabilities(registry: readonly CapabilityBinding[], effectiveNames: readonly string[]): readonly CapabilityBinding[];
export function validateToolInput(schema: ZodType<unknown>, input: unknown): {ok:true; value:unknown} | {ok:false; code:'invalid-tool-input'|'tool-input-limit'};
```

`registry.ts` must remain workflow-safe but free of Temporal and AI SDK runtime imports (Zod runtime only as needed). Validate JSON primitives/arrays/plain objects recursively; reject undefined, functions, cycles, nonfinite numbers or non-JSON values. Measure serialization in UTF-16 code units. Only finite small fixture schemas, not arbitrary protected data; depth/count need not be generalized beyond bounded inputs. Registry errors use `invalid-registry`/`tool-not-allowed`; effective selection must be exact. Trusted host owns fixed registry descriptions; no auto-discovery.

## SDK tool wrapper

```ts
import type { ToolSet } from 'ai';
import type { Admission } from '../missions/validate.js';
import type { MissionLedger } from '../policy/limits.js';
export function createSdkTools(admission: Extract<Admission,{ok:true}>, selected: readonly CapabilityBinding[], ledger: MissionLedger, dispatch: DispatchSyntheticTool): ToolSet;
```

`dispatch` only comes from trusted test Workflow adapter; no function serialized. Use `isCancellation` from Temporal Workflow and `CancellationScope.current().consideredCancelled`/`cancelRequested` to preserve observed cancellation; never map cancellation to ordinary failure. Explicit `tool-input-limit` is denied input, `tool-limit` is execution ceiling. Throw errors with bounded stable codes, no raw args. AC06 observes step results for invalid calls SDK skipped; no tool repair. Already admitted pure reads need not be undone; do not admit subsequent dispatch after observed fault/cancel. Activity-side independent validation is AC07, not a second generic authorization API.
