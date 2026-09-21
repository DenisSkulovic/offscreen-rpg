import type { StorytellerTask } from '@offscreen/storyteller/tasks';
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
