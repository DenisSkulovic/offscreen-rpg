import {
  writerSceneRoundFinalizePath,
  writerSceneRoundFinalizeResultSchema,
  writerSceneRoundHttpErrorSchema,
  writerSceneRoundPlanPath,
  writerSceneRoundPlanResponseSchema,
  writerSceneRoundStatePath,
  writerSceneRoundMissionStateSchema,
  writerSceneRoundControlContractVersion,
  writerSceneRoundControlVersionHeader,
  type WriterSceneRoundExecutionPlan,
  type WriterSceneRoundFinalizeResult,
  type WriterSceneRoundMissionState,
} from '@offscreen/contracts/writer-scene-round-control';
import { z } from 'zod';
import type { StorytellerPublicationClientConfig } from './storyteller-publication-client';
import { StorytellerPublicationTransportError } from './storyteller-publication-client';

export type WriterSceneRoundControlClient = {
  plan(missionId: string): Promise<
    WriterSceneRoundExecutionPlan | { status: 'held'; reason: string }
  >;
  readMissionState(missionId: string): Promise<WriterSceneRoundMissionState>;
  finalize(missionId: string): Promise<WriterSceneRoundFinalizeResult>;
};

const missionIdSchema = z.uuid();

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new StorytellerPublicationTransportError('unavailable', 'invalid-json');
  }
}

function mapHttpError(payload: unknown): never {
  const parsed = writerSceneRoundHttpErrorSchema.safeParse(payload);
  if (parsed.success) {
    if (parsed.data.code === 'unauthorized') {
      throw new StorytellerPublicationTransportError('unauthorized');
    }
    if (parsed.data.code === 'invalid') {
      throw new StorytellerPublicationTransportError('invalid', parsed.data.reason);
    }
    throw new StorytellerPublicationTransportError('unavailable', parsed.data.code);
  }
  throw new StorytellerPublicationTransportError('unavailable');
}

async function callControl<T>(
  config: StorytellerPublicationClientConfig,
  path: string,
  method: 'GET' | 'POST',
  schema: z.ZodType<T>,
): Promise<T> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    authorization: `Bearer ${config.controlToken}`,
    [writerSceneRoundControlVersionHeader]: writerSceneRoundControlContractVersion,
  };
  let response: Response;
  try {
    response = await fetch(new URL(path, config.origin), {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(config.timeoutMs),
      headers,
    });
  } catch {
    throw new StorytellerPublicationTransportError('unavailable');
  }
  const payload = await readPayload(response);
  if (response.status === 401) {
    throw new StorytellerPublicationTransportError('unauthorized');
  }
  if (response.status >= 400) {
    mapHttpError(payload);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new StorytellerPublicationTransportError('unavailable', 'invalid-shape');
  }
  return parsed.data;
}

export function createWriterSceneRoundControlClient(
  config: StorytellerPublicationClientConfig,
): WriterSceneRoundControlClient {
  return {
    async plan(missionId) {
      missionIdSchema.parse(missionId);
      return callControl(
        config,
        writerSceneRoundPlanPath(missionId),
        'POST',
        writerSceneRoundPlanResponseSchema,
      );
    },
    async readMissionState(missionId) {
      missionIdSchema.parse(missionId);
      return callControl(
        config,
        writerSceneRoundStatePath(missionId),
        'GET',
        writerSceneRoundMissionStateSchema,
      );
    },
    async finalize(missionId) {
      missionIdSchema.parse(missionId);
      return callControl(
        config,
        writerSceneRoundFinalizePath(missionId),
        'POST',
        writerSceneRoundFinalizeResultSchema,
      );
    },
  };
}