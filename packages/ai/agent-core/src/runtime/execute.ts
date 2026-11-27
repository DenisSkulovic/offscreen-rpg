import {
  CancellationScope,
  isCancellation,
  log,
  workflowInfo,
} from '@temporalio/workflow';
import { assembleContext } from '../context/assemble.js';
import { generateMission } from '../loop/generate.js';
import type { MissionOutcomeV1 } from '../missions/contracts.js';
import type { AgentDefinitionV1 } from '../missions/contracts.js';
import { admitMission } from '../missions/validate.js';
import { createMissionLedger, resolveOutcome } from '../policy/limits.js';
import { createSdkTools } from '../tools/dispatch.js';
import {
  selectCapabilities,
  type CapabilityBinding,
  type DispatchSyntheticTool,
} from '../tools/registry.js';
import { summarizeMission } from '../telemetry/summary.js';

export interface ExecutionBindings {
  readonly definitions: readonly AgentDefinitionV1[];
  readonly capabilities: readonly CapabilityBinding[];
  readonly modelId: string;
  readonly dispatch: DispatchSyntheticTool;
}

function denied(code: string): MissionOutcomeV1 {
  return { status: 'denied', code, steps: 0, toolCalls: 0 };
}

function safeLog(event: string, summary: ReturnType<typeof summarizeMission>): void {
  try {
    log.info(event, summary);
  } catch {
    // Logging must not change the mission result.
  }
}

async function rethrowCancellation(error?: unknown): Promise<void> {
  const scope = CancellationScope.current();
  if (scope.consideredCancelled) await scope.cancelRequested;
  if (error !== undefined && isCancellation(error)) throw error;
}

/** Workflow entry. One admission, one native loop, no restart. */
export async function executeMission(
  raw: unknown,
  bindings: ExecutionBindings,
): Promise<MissionOutcomeV1> {
  const workflowId = workflowInfo().workflowId;
  try {
    log.info('mission-start', { workflowId });
  } catch {
    // Logging must not change the mission result.
  }
  if (typeof bindings.modelId !== 'string' || bindings.modelId.length === 0) {
    const outcome = denied('invalid-definition');
    safeLog('mission-terminal', summarizeMission(workflowId, outcome));
    return outcome;
  }
  if (typeof bindings.dispatch !== 'function') {
    const outcome = denied('invalid-registry');
    safeLog('mission-terminal', summarizeMission(workflowId, outcome));
    return outcome;
  }
  let registered: string[];
  try {
    registered = bindings.capabilities.map((binding) => binding.name);
  } catch {
    const outcome = denied('invalid-registry');
    safeLog('mission-terminal', summarizeMission(workflowId, outcome));
    return outcome;
  }
  const admission = admitMission(
    raw,
    workflowId,
    bindings.definitions,
    registered,
  );
  if (!admission.ok) {
    const outcome = denied(admission.code);
    safeLog('mission-terminal', summarizeMission(workflowId, outcome));
    return outcome;
  }
  let selected;
  try {
    selected = selectCapabilities(
      bindings.capabilities,
      admission.effectiveToolNames,
    );
  } catch (error) {
    await rethrowCancellation(error);
    const code =
      error instanceof Error &&
      (error.message === 'invalid-registry' || error.message === 'tool-not-allowed')
        ? error.message
        : 'invalid-registry';
    const outcome = denied(code);
    safeLog('mission-terminal', summarizeMission(workflowId, outcome));
    return outcome;
  }
  const ledger = createMissionLedger(admission.mission.maxSteps);
  const context = assembleContext(admission.definition, admission.mission);
  const tools = createSdkTools(admission, selected, ledger, bindings.dispatch);
  try {
    const terminal = await generateMission({
      modelId: bindings.modelId,
      instructions: context.instructions,
      prompt: context.prompt,
      tools,
      ledger,
    });
    const outcome = resolveOutcome(ledger, terminal);
    safeLog('mission-terminal', summarizeMission(workflowId, outcome));
    return outcome;
  } catch (error) {
    await rethrowCancellation(error);
    if (
      ledger.deniedCode === undefined &&
      ledger.limitCode === undefined &&
      ledger.failureCode === undefined
    ) {
      ledger.fail('execution-failed');
    }
    const outcome = resolveOutcome(ledger);
    safeLog('mission-terminal', summarizeMission(workflowId, outcome));
    return outcome;
  }
}
