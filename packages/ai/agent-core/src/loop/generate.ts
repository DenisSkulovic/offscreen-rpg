import { generateText, isStepCount, type ToolSet } from 'ai';
import {
  ActivityCancellationType,
  CancellationScope,
  isCancellation,
} from '@temporalio/workflow';
import { TemporalLanguageModel } from '@temporalio/vercel-ai-sdk/workflow';
import {
  type MissionLedger,
  type Terminal,
} from '../policy/limits.js';

export interface GenerateMissionInput {
  modelId: string;
  instructions: string;
  prompt: string;
  tools: ToolSet;
  ledger: MissionLedger;
}

type ObservedCall = {
  toolCallId?: string;
  toolName?: string;
  invalid?: boolean;
  providerExecuted?: boolean;
};

type ObservedPart = { type?: string; toolCallId?: string };

type ObservedStep = {
  finishReason?: string;
  text?: string;
  toolCalls?: readonly ObservedCall[];
  toolResults?: readonly { toolCallId?: string }[];
  content?: readonly ObservedPart[];
};

const SUPPORTED_PARTS = new Set([
  'text',
  'reasoning',
  'tool-call',
  'tool-result',
  'tool-error',
]);

function sticky(ledger: MissionLedger): boolean {
  return (
    ledger.deniedCode !== undefined ||
    ledger.limitCode !== undefined ||
    ledger.failureCode !== undefined
  );
}

async function rethrowIfCancelled(error?: unknown): Promise<void> {
  const scope = CancellationScope.current();
  if (scope.consideredCancelled) {
    await scope.cancelRequested;
  }
  if (error !== undefined && isCancellation(error)) throw error;
}

function classifyStep(
  step: ObservedStep,
  ledger: MissionLedger,
  tools: ToolSet,
): void {
  ledger.recordStep();
  const calls = step.toolCalls ?? [];
  for (const call of calls) {
    const name = call.toolName;
    const known = typeof name === 'string' && Object.hasOwn(tools, name);
    if (!known || call.providerExecuted === true) {
      ledger.deny('tool-not-allowed');
    } else if (call.invalid === true) {
      ledger.deny('invalid-tool-input');
    }
  }
  if (ledger.deniedCode === undefined) {
    for (const part of step.content ?? []) {
      if (part.type === 'tool-error') ledger.fail('tool-failed');
    }
  }
  const settled = new Set<string>();
  for (const result of step.toolResults ?? []) {
    if (typeof result.toolCallId === 'string') settled.add(result.toolCallId);
  }
  for (const part of step.content ?? []) {
    if (
      (part.type === 'tool-result' || part.type === 'tool-error') &&
      typeof part.toolCallId === 'string'
    ) {
      settled.add(part.toolCallId);
    }
  }
  const missing = calls.some(
    (call) =>
      typeof call.toolCallId !== 'string' || !settled.has(call.toolCallId),
  );
  if (missing) {
    if (ledger.steps >= ledger.maxSteps) ledger.limit('step-limit');
    else ledger.fail('unfinished-tool-call');
  }
}

function terminalFrom(step: ObservedStep | undefined, fallback: string): Terminal {
  const calls = step?.toolCalls ?? [];
  const unsupported = (step?.content ?? []).some(
    (part) => typeof part.type !== 'string' || !SUPPORTED_PARTS.has(part.type),
  );
  return {
    finishReason: step?.finishReason ?? fallback,
    text: step?.text ?? '',
    hasUnfinishedCalls:
      unsupported ||
      calls.length > 0 ||
      step?.finishReason === 'tool-calls',
  };
}

/** One native generateText call. Cancellation is rethrown, never mapped. */
export async function generateMission(
  input: GenerateMissionInput,
): Promise<Terminal> {
  await rethrowIfCancelled();
  const model = new TemporalLanguageModel(input.modelId, {
    startToCloseTimeout: '10s',
    heartbeatTimeout: '2s',
    cancellationType: ActivityCancellationType.WAIT_CANCELLATION_COMPLETED,
    retry: { maximumAttempts: 1 },
  });
  try {
    const result = await generateText({
      model,
      instructions: input.instructions,
      prompt: input.prompt,
      tools: input.tools,
      maxRetries: 0,
      stopWhen: [isStepCount(input.ledger.maxSteps), () => sticky(input.ledger)],
      experimental_telemetry: { isEnabled: false },
      onStepFinish: async (step) => {
        await rethrowIfCancelled();
        classifyStep(step as ObservedStep, input.ledger, input.tools);
      },
    });
    await rethrowIfCancelled();
    const steps = result.steps as readonly ObservedStep[];
    if (steps.length !== input.ledger.steps && !sticky(input.ledger)) {
      input.ledger.fail('execution-failed');
    }
    const final = steps.length > 0 ? steps[steps.length - 1] : undefined;
    return terminalFrom(final, result.finishReason);
  } catch (error) {
    await rethrowIfCancelled(error);
    throw error;
  }
}
