import { ApplicationFailure } from '@temporalio/client';
import type {
  WriterSceneDistributedControlActivities,
  WriterSceneRoundFinalizeResult,
  WriterSceneRoundMissionState,
} from '@offscreen/workflows/contracts';
import type { WriterSceneRoundControlClient } from '../custody/writer-scene-round-control-client';
import { StorytellerPublicationTransportError } from '../custody/storyteller-publication-client';

function mapTransportError(error: unknown): never {
  if (error instanceof StorytellerPublicationTransportError) {
    if (error.code === 'unavailable') {
      throw ApplicationFailure.retryable(error.message, 'WriterSceneControlUnavailable');
    }
    throw ApplicationFailure.nonRetryable(error.code, 'WriterSceneControlTransport');
  }
  throw error;
}

function isExecutionPlan(
  value: Awaited<ReturnType<WriterSceneRoundControlClient['plan']>>,
): value is {
  missionId: string;
  contextId: string;
  ordinal: number;
  expectedRevision: number;
  model: string;
  maxModelRounds: number;
} {
  if ('status' in value) {
    return false;
  }
  return typeof value.maxModelRounds === 'number' && value.maxModelRounds > 0;
}

export function createWriterSceneDistributedControlActivities(
  client: WriterSceneRoundControlClient,
): WriterSceneDistributedControlActivities {
  return {
    async planWriterSceneRound(missionId) {
      let plan;
      try {
        plan = await client.plan(missionId);
      } catch (error) {
        mapTransportError(error);
      }
      if (!isExecutionPlan(plan)) {
        throw ApplicationFailure.nonRetryable(
          plan.reason ?? 'plan-held',
          'WriterScenePlanHeld',
        );
      }
      return plan;
    },

    async readWriterSceneRoundMissionState(missionId) {
      try {
        const state = await client.readMissionState(missionId);
        return state.reason === undefined
          ? { status: state.status }
          : { status: state.status, reason: state.reason };
      } catch (error) {
        mapTransportError(error);
      }
    },

    async finalizeWriterSceneRound(missionId) {
      try {
        const finalized = await client.finalize(missionId);
        if (finalized.status === 'needs-next-round') {
          return {
            status: finalized.status,
            nextOrdinal: finalized.nextOrdinal,
            nextRevision: finalized.nextRevision,
          };
        }
        return finalized.reason === undefined
          ? { status: finalized.status }
          : { status: finalized.status, reason: finalized.reason };
      } catch (error) {
        mapTransportError(error);
      }
    },
  };
}