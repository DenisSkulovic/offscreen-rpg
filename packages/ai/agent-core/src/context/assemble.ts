import type { AgentDefinitionV1, MissionV1 } from '../missions/contracts.js';

/** Bounded text context. No files, URLs, or extra fields. */
export function assembleContext(
  definition: AgentDefinitionV1,
  mission: MissionV1,
): { instructions: string; prompt: string } {
  return { instructions: definition.instructions, prompt: mission.input };
}
