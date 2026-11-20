import {
  storytellerGenerationPublishPath,
  storytellerGenerationPublishResponseSchema,
  storytellerTaskCustodyGenerationIdSchema,
  storytellerTaskCustodyHttpErrorSchema,
  type StorytellerGenerationPublishResponse,
} from '@offscreen/contracts/storyteller-task-custody';
import { z } from 'zod';

export type StorytellerPublicationClientConfig = {
  readonly origin: string;
  readonly controlToken: string;
  readonly timeoutMs: number;
};

export type StorytellerPublicationTransportErrorCode =
  | 'unavailable'
  | 'unauthorized'
  | 'invalid';

export class StorytellerPublicationTransportError extends Error {
  readonly code: StorytellerPublicationTransportErrorCode;

  constructor(
    code: StorytellerPublicationTransportErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'StorytellerPublicationTransportError';
    this.code = code;
  }
}

const timeoutMs = z.coerce
  .number()
  .int()
  .min(50)
  .max(10_000)
  .default(5000);

const controlTokenSchema = z.string().min(16).max(256);

function failConfig(fields: string): never {
  throw new Error(`Invalid storyteller publication client config: ${fields}`);
}

export function readStorytellerPublicationClientConfig(
  env: Record<string, string | undefined>,
): StorytellerPublicationClientConfig {
  const origin = env['GAME_AUTHORITY_ORIGIN'];
  const controlToken = env['GAME_AUTHORITY_CONTROL_TOKEN'];
  if (!origin || !controlTokenSchema.safeParse(controlToken).success) {
    failConfig('GAME_AUTHORITY_ORIGIN, GAME_AUTHORITY_CONTROL_TOKEN');
  }
  let url: URL;
  try {
    url = new URL(origin!);
  } catch {
    failConfig('GAME_AUTHORITY_ORIGIN');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    failConfig('GAME_AUTHORITY_ORIGIN');
  }
  const parsedTimeout = timeoutMs.safeParse(
    env['GAME_AUTHORITY_TIMEOUT_MS'] ?? 5000,
  );
  if (!parsedTimeout.success) failConfig('GAME_AUTHORITY_TIMEOUT_MS');
  return {
    origin: url.origin,
    controlToken: controlToken!,
    timeoutMs: parsedTimeout.data,
  };
}

export type StorytellerPublicationClient = {
  publish(generationId: string): Promise<StorytellerGenerationPublishResponse>;
};

function parseGenerationId(generationId: string) {
  const parsed = storytellerTaskCustodyGenerationIdSchema.safeParse(
    generationId,
  );
  if (!parsed.success) {
    throw new StorytellerPublicationTransportError('invalid', 'generation-id');
  }
  return parsed.data;
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new StorytellerPublicationTransportError('unavailable', 'invalid-json');
  }
}

function mapHttpError(payload: unknown): never {
  const parsed = storytellerTaskCustodyHttpErrorSchema.safeParse(payload);
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

async function callControl(
  config: StorytellerPublicationClientConfig,
  generationId: string,
): Promise<StorytellerGenerationPublishResponse> {
  const id = parseGenerationId(generationId);
  const headers: Record<string, string> = {
    accept: 'application/json',
    authorization: `Bearer ${config.controlToken}`,
  };
  let response: Response;
  try {
    response = await fetch(new URL(storytellerGenerationPublishPath(id), config.origin), {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(config.timeoutMs),
      headers,
    });
  } catch {
    throw new StorytellerPublicationTransportError('unavailable', 'transport');
  }
  const payload = await readResponsePayload(response);
  if (response.status !== 200) {
    mapHttpError(payload);
  }
  const parsed = storytellerGenerationPublishResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new StorytellerPublicationTransportError('unavailable', 'invalid-shape');
  }
  return parsed.data;
}

export function createStorytellerPublicationClient(
  config: StorytellerPublicationClientConfig,
): StorytellerPublicationClient {
  return {
    publish(generationId) {
      return callControl(config, generationId);
    },
  };
}