import {
  hashStorytellerTaskCustodyResult,
  pinnedStorytellerRootSchema,
  storytellerTaskCustodyBodyByteLimit,
  storytellerTaskCustodyClaimRequestSchema,
  storytellerTaskCustodyClaimResponseSchema,
  storytellerTaskCustodyClaimPath,
  storytellerTaskCustodyContractVersion,
  storytellerTaskCustodyEvidencePath,
  storytellerTaskCustodyEvidenceRequestSchema,
  storytellerTaskCustodyEvidenceResponseSchema,
  storytellerTaskCustodyFetchResponseSchema,
  storytellerTaskCustodyGenerationIdSchema,
  storytellerTaskCustodyHttpErrorSchema,
  storytellerTaskCustodyReadSavedPath,
  storytellerTaskCustodyReadSavedResponseSchema,
  storytellerTaskCustodyResultHashSchema,
  storytellerTaskCustodySaveResultPath,
  storytellerTaskCustodySaveResultRequestSchema,
  storytellerTaskCustodySaveResultResponseSchema,
  storytellerTaskCustodyTaskPath,
  storytellerTaskCustodyVersionHeader,
  type StorytellerTaskCustodyClaimResponse,
  type StorytellerTaskCustodyEvidenceResponse,
  type StorytellerTaskCustodyFetchResponse,
  type StorytellerTaskCustodyReadSavedResponse,
  type StorytellerTaskCustodySaveResultResponse,
} from '@offscreen/game-authority-protocol/storyteller-task-custody';
import { z } from 'zod';

export type StorytellerTaskCustodyClientConfig = {
  readonly origin: string;
  readonly executorToken: string;
  readonly timeoutMs: number;
};

export type StorytellerTaskCustodyTransportErrorCode =
  | 'unavailable'
  | 'unauthorized'
  | 'invalid';

export class StorytellerTaskCustodyTransportError extends Error {
  readonly code: StorytellerTaskCustodyTransportErrorCode;

  constructor(
    code: StorytellerTaskCustodyTransportErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'StorytellerTaskCustodyTransportError';
    this.code = code;
  }
}

const timeoutMs = z.coerce
  .number()
  .int()
  .min(50)
  .max(10_000)
  .default(5000);

const executorTokenSchema = z.string().min(16).max(256);

function failConfig(fields: string): never {
  throw new Error(`Invalid storyteller task custody client config: ${fields}`);
}

export function readStorytellerTaskCustodyClientConfig(
  env: Record<string, string | undefined>,
): StorytellerTaskCustodyClientConfig {
  const origin = env['GAME_AUTHORITY_ORIGIN'];
  const executorToken = env['GAME_AUTHORITY_EXECUTOR_TOKEN'];
  if (!origin || !executorTokenSchema.safeParse(executorToken).success) {
    failConfig('GAME_AUTHORITY_ORIGIN, GAME_AUTHORITY_EXECUTOR_TOKEN');
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
    executorToken: executorToken!,
    timeoutMs: parsedTimeout.data,
  };
}

export type StorytellerTaskCustodyClient = {
  fetchTask(
    generationId: string,
  ): Promise<StorytellerTaskCustodyFetchResponse>;
  claim(
    generationId: string,
    pinnedRoot: string | null,
  ): Promise<StorytellerTaskCustodyClaimResponse>;
  save(
    generationId: string,
    pinnedRoot: string | null,
    resultHash: string,
    result: unknown,
  ): Promise<StorytellerTaskCustodySaveResultResponse>;
  readSaved(
    generationId: string,
  ): Promise<StorytellerTaskCustodyReadSavedResponse>;
  readEvidence(
    generationId: string,
    input: {
      storyId: string;
      rootHash: string;
      rootRevision: number;
      handles: string[];
    },
  ): Promise<StorytellerTaskCustodyEvidenceResponse>;
};

function assertBodyLimit(body: string) {
  if (Buffer.byteLength(body, 'utf8') > storytellerTaskCustodyBodyByteLimit) {
    throw new StorytellerTaskCustodyTransportError('invalid', 'oversized-body');
  }
}

function parseGenerationId(generationId: string) {
  const parsed = storytellerTaskCustodyGenerationIdSchema.safeParse(
    generationId,
  );
  if (!parsed.success) {
    throw new StorytellerTaskCustodyTransportError('invalid', 'generation-id');
  }
  return parsed.data;
}

function parsePinnedRoot(pinnedRoot: string | null) {
  const parsed = pinnedStorytellerRootSchema.safeParse(pinnedRoot);
  if (!parsed.success) {
    throw new StorytellerTaskCustodyTransportError('invalid', 'pinned-root');
  }
  return parsed.data;
}

function parseResultHash(resultHash: string) {
  const parsed = storytellerTaskCustodyResultHashSchema.safeParse(resultHash);
  if (!parsed.success) {
    throw new StorytellerTaskCustodyTransportError('invalid', 'result-hash');
  }
  return parsed.data;
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new StorytellerTaskCustodyTransportError('unavailable', 'invalid-json');
  }
}

function mapHttpError(payload: unknown): never {
  const parsed = storytellerTaskCustodyHttpErrorSchema.safeParse(payload);
  if (parsed.success) {
    if (parsed.data.code === 'unauthorized') {
      throw new StorytellerTaskCustodyTransportError('unauthorized');
    }
    if (parsed.data.code === 'invalid') {
      throw new StorytellerTaskCustodyTransportError('invalid', parsed.data.reason);
    }
    throw new StorytellerTaskCustodyTransportError('unavailable', parsed.data.code);
  }
  throw new StorytellerTaskCustodyTransportError('unavailable');
}

async function callExecutor<T>(
  config: StorytellerTaskCustodyClientConfig,
  request: {
    method: 'GET' | 'PUT' | 'POST';
    path: string;
    body?: unknown;
    schema: z.ZodType<T>;
  },
): Promise<T> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    authorization: `Bearer ${config.executorToken}`,
  };
  let serialized: string | undefined;
  if (request.body !== undefined) {
    headers['content-type'] = 'application/json';
    serialized = JSON.stringify(request.body);
    assertBodyLimit(serialized);
  }
  let response: Response;
  try {
    response = await fetch(new URL(request.path, config.origin), {
      method: request.method,
      redirect: 'error',
      signal: AbortSignal.timeout(config.timeoutMs),
      headers,
      ...(serialized === undefined ? {} : { body: serialized }),
    });
  } catch {
    throw new StorytellerTaskCustodyTransportError('unavailable', 'transport');
  }
  const payload = await readResponsePayload(response);
  if (response.status !== 200) {
    mapHttpError(payload);
  }
  const parsed = request.schema.safeParse(payload);
  if (!parsed.success) {
    throw new StorytellerTaskCustodyTransportError('unavailable', 'invalid-shape');
  }
  return parsed.data;
}

export function createStorytellerTaskCustodyClient(
  config: StorytellerTaskCustodyClientConfig,
): StorytellerTaskCustodyClient {
  return {
    fetchTask(generationId) {
      const id = parseGenerationId(generationId);
      return callExecutor(config, {
        method: 'GET',
        path: storytellerTaskCustodyTaskPath(id),
        schema: storytellerTaskCustodyFetchResponseSchema,
      });
    },
    claim(generationId, pinnedRoot) {
      const id = parseGenerationId(generationId);
      const root = parsePinnedRoot(pinnedRoot);
      const body = storytellerTaskCustodyClaimRequestSchema.parse({
        schemaVersion: storytellerTaskCustodyContractVersion,
        pinnedRoot: root,
      });
      return callExecutor(config, {
        method: 'PUT',
        path: storytellerTaskCustodyClaimPath(id),
        body,
        schema: storytellerTaskCustodyClaimResponseSchema,
      });
    },
    save(generationId, pinnedRoot, resultHash, result) {
      const id = parseGenerationId(generationId);
      const root = parsePinnedRoot(pinnedRoot);
      const hash = parseResultHash(resultHash);
      const body = storytellerTaskCustodySaveResultRequestSchema.parse({
        schemaVersion: storytellerTaskCustodyContractVersion,
        pinnedRoot: root,
        resultHash: hash,
        result,
      });
      return callExecutor(config, {
        method: 'PUT',
        path: storytellerTaskCustodySaveResultPath(id),
        body,
        schema: storytellerTaskCustodySaveResultResponseSchema,
      });
    },
    readSaved(generationId) {
      const id = parseGenerationId(generationId);
      return callExecutor(config, {
        method: 'GET',
        path: storytellerTaskCustodyReadSavedPath(id),
        schema: storytellerTaskCustodyReadSavedResponseSchema,
      });
    },
    readEvidence(generationId, input) {
      const id = parseGenerationId(generationId);
      const body = storytellerTaskCustodyEvidenceRequestSchema.parse({
        schemaVersion: storytellerTaskCustodyContractVersion,
        storyId: input.storyId,
        rootHash: input.rootHash,
        rootRevision: input.rootRevision,
        handles: input.handles,
      });
      return callExecutor(config, {
        method: 'POST',
        path: storytellerTaskCustodyEvidencePath(id),
        body,
        schema: storytellerTaskCustodyEvidenceResponseSchema,
      });
    },
  };
}

export { hashStorytellerTaskCustodyResult, storytellerTaskCustodyVersionHeader };