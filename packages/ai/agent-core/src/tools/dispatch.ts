import { tool, type ToolSet } from 'ai';
import { CancellationScope, isCancellation } from '@temporalio/workflow';
import type { Admission } from '../missions/validate.js';
import type { MissionLedger } from '../policy/limits.js';
import {
  validateToolInput,
  type CapabilityBinding,
  type DispatchSyntheticTool,
  type SyntheticToolRequest,
} from './registry.js';

const RESULT_LIMIT = 4096;

function stableError(code: string): Error {
  return new Error(code);
}

function cancellationObserved(error?: unknown): boolean {
  const scope = CancellationScope.current();
  return scope.consideredCancelled || (error !== undefined && isCancellation(error));
}

/**
 * SDK wrappers for an already selected capability list. Reservation happens
 * before the first await so a third parallel call cannot dispatch.
 */
export function createSdkTools(
  admission: Extract<Admission, { ok: true }>,
  selected: readonly CapabilityBinding[],
  ledger: MissionLedger,
  dispatch: DispatchSyntheticTool,
): ToolSet {
  const tools: ToolSet = Object.create(null);
  for (const binding of selected) {
    tools[binding.name] = tool({
      description: binding.description,
      inputSchema: binding.inputSchema,
      execute: async (input: unknown) => {
        if (cancellationObserved()) {
          throw stableError('cancelled');
        }
        const validated = validateToolInput(binding.inputSchema, input);
        if (!validated.ok) {
          ledger.deny(validated.code);
          throw stableError(validated.code);
        }
        if (!ledger.reserveTool()) {
          throw stableError(
            ledger.deniedCode ?? ledger.limitCode ?? ledger.failureCode ?? 'tool-limit',
          );
        }
        const request: SyntheticToolRequest = {
          missionId: admission.mission.missionId,
          definitionId: admission.definition.id,
          definitionVersion: 1,
          effectiveToolNames: admission.effectiveToolNames,
          toolName: binding.name,
          input: validated.value,
        };
        try {
          const result = await dispatch(request);
          if (cancellationObserved()) throw stableError('cancelled');
          if (typeof result !== 'string' || result.length > RESULT_LIMIT) {
            ledger.fail('tool-failed');
            throw stableError('tool-failed');
          }
          return result;
        } catch (error) {
          if (cancellationObserved(error)) throw error;
          ledger.fail('tool-failed');
          throw error instanceof Error ? error : stableError('tool-failed');
        }
      },
    });
  }
  return tools;
}
