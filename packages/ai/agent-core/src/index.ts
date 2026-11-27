export type {
  AgentDefinitionV1,
  MissionOutcomeV1,
  MissionV1,
} from './missions/contracts.js';

/** E1 Workflow identity derived from a mission id. AC04 validates the id. */
export function missionWorkflowId(missionId: string): string {
  return `agent-core-e1-${missionId}`;
}
