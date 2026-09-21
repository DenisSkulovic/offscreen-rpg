import { z } from 'zod';
import {
  capturedProviderRequestSchema,
  creativeDirectionSetSchema,
  type CapturedProviderRequest,
  type CreativeDirectionSet,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import { inspectOpenRouterRequest } from '@offscreen/storyteller/providers/openrouter';
import type { MemoryExplorationSnapshot } from './memory-exploration';
import { prepareMemoryEvidenceContext } from './memory-exploration-controller';

/** Pure structural preview. It has no transport, credentials or retry capability. */
export function inspectMemoryExplorationProviderRequest(
  task: StorytellerTask,
  snapshot: MemoryExplorationSnapshot,
  round: number,
) {
  if (task.execution.mode !== 'provider') {
    throw new Error('Provider preview requires a provider task');
  }
  const recipe = task.resources.recipe;
  if (recipe.version !== 'memory-exploration.v1') {
    throw new Error('Provider preview requires an exploration recipe');
  }
  const prepared = prepareMemoryEvidenceContext(task, snapshot, round);
  const inspection = inspectOpenRouterRequest(task, prepared.request);
  const userMessage = JSON.parse(prepared.request.messages[1].content) as {
    memoryExploration: { evidencePack: unknown };
  };
  return {
    format: 'offscreen.memory-provider-request-preview.v1' as const,
    transportPerformed: false as const,
    providerChargeMicrousd: '0' as const,
    round,
    canRequestContext:
      round <=
      recipe.maxModelRounds - recipe.finalAnswerReserveRounds,
    capturedRequestBytes: prepared.capturedRequestBytes,
    boundedRequestBytes: prepared.boundedRequestBytes,
    evidence: {
      selected: prepared.selected,
      omitted: prepared.omitted,
      packetBytes: Buffer.byteLength(
        JSON.stringify(userMessage.memoryExploration.evidencePack),
        'utf8',
      ),
    },
    inspection,
  };
}

function jsonObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function withGeneratedTokenLimit(task: StorytellerTask, limit: number) {
  return {
    ...task,
    resources: {
      ...task.resources,
      envelope: { ...task.resources.envelope, maxGeneratedTokens: limit },
    },
  } as StorytellerTask;
}

function composeSeparateIdeationRequests(input: {
  inlineRequest: CapturedProviderRequest;
  creativeDirections: CreativeDirectionSet;
}) {
  const inlineRequest = capturedProviderRequestSchema.parse(
    input.inlineRequest,
  );
  const creativeDirections = creativeDirectionSetSchema.parse(
    input.creativeDirections,
  );
  const inlineUser = jsonObject(
    JSON.parse(inlineRequest.messages[1].content),
    'Storyteller user message',
  );
  const inlineOutput = jsonObject(
    inlineRequest.outputSchema,
    'Inline output schema',
  );
  const inlineProperties = jsonObject(
    inlineOutput.properties,
    'Inline output schema properties',
  );
  if (!inlineProperties.result || !inlineProperties.evidenceUse) {
    throw new Error('Inline output schema lacks final result fields');
  }

  const ideation = capturedProviderRequestSchema.parse({
    messages: [
      {
        role: 'system',
        content: `${inlineRequest.messages[0].content}\n\nThis is a separately metered private ideation round. Return only a concise creative direction set grounded in evidence packet item IDs. Do not produce the player-facing result or hidden reasoning.`,
      },
      inlineRequest.messages[1],
    ],
    outputSchema: z.toJSONSchema(creativeDirectionSetSchema),
  });
  const final = capturedProviderRequestSchema.parse({
    messages: [
      {
        role: 'system',
        content: `${inlineRequest.messages[0].content}\n\nA prior private ideation round supplied creativeIdeation below. Compose the final result from its selected direction when one exists. Do not regenerate or repeat the direction set.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          ...inlineUser,
          creativeIdeation: creativeDirections,
        }),
      },
    ],
    outputSchema: {
      type: 'object',
      properties: {
        result: inlineProperties.result,
        evidenceUse: inlineProperties.evidenceUse,
      },
      required: ['result', 'evidenceUse'],
      additionalProperties: false,
    },
  });
  return { ideation, final };
}

/**
 * Exact, credential-free structural comparison. It measures retransmission and
 * schema overhead, not narrative quality; a separate round still needs a live
 * forked taste comparison before it can justify its extra call.
 */
export function compareCreativeIdeationOrchestration(input: {
  task: StorytellerTask;
  snapshot: MemoryExplorationSnapshot;
  round: number;
  creativeDirections: CreativeDirectionSet;
  ideationGeneratedTokens: number;
}) {
  if (input.task.execution.mode !== 'provider') {
    throw new Error('Creative orchestration comparison requires a provider task');
  }
  if (
    !Number.isInteger(input.ideationGeneratedTokens) ||
    input.ideationGeneratedTokens < 1 ||
    input.ideationGeneratedTokens >=
      input.task.resources.envelope.maxGeneratedTokens
  ) {
    throw new Error(
      'Ideation token allowance must leave positive final-composition capacity',
    );
  }
  const prepared = prepareMemoryEvidenceContext(
    input.task,
    input.snapshot,
    input.round,
  );
  const separate = composeSeparateIdeationRequests({
    inlineRequest: prepared.request,
    creativeDirections: input.creativeDirections,
  });
  const finalGeneratedTokens =
    input.task.resources.envelope.maxGeneratedTokens -
    input.ideationGeneratedTokens;
  const inline = inspectOpenRouterRequest(input.task, prepared.request);
  const ideation = inspectOpenRouterRequest(
    withGeneratedTokenLimit(input.task, input.ideationGeneratedTokens),
    separate.ideation,
  );
  const final = inspectOpenRouterRequest(
    withGeneratedTokenLimit(input.task, finalGeneratedTokens),
    separate.final,
  );
  const separateBytes =
    ideation.capturedRequestBytes + final.capturedRequestBytes;

  return {
    format: 'offscreen.creative-ideation-orchestration-comparison.v1' as const,
    transportPerformed: false as const,
    providerChargeMicrousd: '0' as const,
    scope: 'structural-only' as const,
    inline: {
      modelRounds: 1,
      generatedTokenAllowance:
        input.task.resources.envelope.maxGeneratedTokens,
      capturedRequestBytes: inline.capturedRequestBytes,
      inspection: inline,
    },
    separate: {
      modelRounds: 2,
      generatedTokenAllowance:
        input.ideationGeneratedTokens + finalGeneratedTokens,
      capturedRequestBytes: separateBytes,
      retransmissionDeltaBytes:
        separateBytes - inline.capturedRequestBytes,
      ideation,
      final,
    },
  };
}
