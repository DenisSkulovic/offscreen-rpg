/** Serializable Agent Core mission values. No SDK or Worker imports. */

export interface AgentDefinitionV1 {
  id: string;
  version: 1;
  instructions: string;
  toolNames: readonly string[];
}

export interface MissionV1 {
  version: 1;
  missionId: string;
  definitionId: string;
  definitionVersion: 1;
  input: string;
  requestedTools: readonly string[];
  maxSteps: number;
}

export type MissionOutcomeV1 =
  | {
      status: 'completed';
      text: string;
      steps: number;
      toolCalls: number;
    }
  | {
      status: 'limit-reached' | 'denied' | 'failed';
      code: string;
      steps: number;
      toolCalls: number;
    };
