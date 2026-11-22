import {
  preparedWriterRoundWireIsSelfConsistent,
  writerRoundPrivateCustodyBodyByteLimit,
  writerRoundPrivateCustodyContractVersion,
  writerRoundPrivateCustodyVersionHeader,
  writerRoundPrivateHttpErrorSchema,
  writerRoundPrivateOutcomePath,
  writerRoundPrivatePreparePath,
  writerRoundPrivatePrepareRequestSchema,
  writerRoundPrivatePrepareResponseSchema,
  writerRoundPrivateStatusPath,
  writerRoundPrivateStatusResponseSchema,
  writerRoundPrivateSubmitOutcomeRequestSchema,
  writerRoundPrivateSubmitOutcomeResponseSchema,
  type WriterRoundPrivatePrepareResponse,
  type WriterRoundPrivateStatusResponse,
  type WriterRoundPrivateSubmitOutcomeRequest,
  type WriterRoundPrivateSubmitOutcomeResponse,
} from '@offscreen/contracts/writer-round-private-custody';
import { z } from 'zod';

export type WriterRoundPrivateClientConfig = {
  readonly origin: string;
  readonly executorToken: string;
  readonly timeoutMs: number;
};

export type WriterRoundPrivateTransportErrorCode =
  | 'unavailable'
  | 'unauthorized'
  | 'invalid'
  | 'conflict';

export class WriterRoundPrivateTransportError extends Error {
  readonly code: WriterRoundPrivateTransportErrorCode;

  constructor(code: WriterRoundPrivateTransportErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'WriterRoundPrivateTransportError';
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
  throw new Error(`Invalid writer round private client config: ${fields}`);
}

export function readWriterRoundPrivateClientConfig(
  env: Record<string, string | undefined>,
): WriterRoundPrivateClientConfig {
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

export type WriterRoundPrivateClient = {
  prepare(
    missionId: string,
    ordinal: number,
    input: {
      contextId: string;
      attemptId: string;
      expectedRevision: number;
    },
  ): Promise<WriterRoundPrivatePrepareResponse>;
  submitOutcome(
    missionId: string,
    ordinal: number,
    attemptId: string,
    body: Omit<WriterRoundPrivateSubmitOutcomeRequest, 'schemaVersion'>,
  ): Promise<WriterRoundPrivateSubmitOutcomeResponse>;
  getStatus(
    missionId: string,
    ordinal: number,
  ): Promise<WriterRoundPrivateStatusResponse>;
};

function assertBodyLimit(body: string) {
  if (Buffer.byteLength(body, 'utf8') > writerRoundPrivateCustodyBodyByteLimit) {
    throw new WriterRoundPrivateTransportError('invalid', 'oversized-body');
  }
}

function assertResponseVersion(response: Response) {
  const header = response.headers.get(writerRoundPrivateCustodyVersionHeader);
  if (header !== writerRoundPrivateCustodyContractVersion) {
    throw new WriterRoundPrivateTransportError('unavailable', 'version-mismatch');
  }
}

async function readResponsePayload(
  response: Response,
): Promise<{ text: string; parsed: unknown }> {
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > writerRoundPrivateCustodyBodyByteLimit) {
    throw new WriterRoundPrivateTransportError('invalid', 'oversized-body');
  }
  if (text.length === 0) return { text, parsed: undefined };
  try {
    return { text, parsed: JSON.parse(text) as unknown };
  } catch {
    throw new WriterRoundPrivateTransportError('unavailable', 'invalid-json');
  }
}

function mapHttpError(payload: unknown): never {
  const parsed = writerRoundPrivateHttpErrorSchema.safeParse(payload);
  if (parsed.success) {
    if (parsed.data.code === 'unauthorized') {
      throw new WriterRoundPrivateTransportError('unauthorized');
    }
    if (parsed.data.code === 'invalid') {
      throw new WriterRoundPrivateTransportError(
        'invalid',
        parsed.data.reason ?? 'invalid',
      );
    }
    if (parsed.data.code === 'conflict') {
      throw new WriterRoundPrivateTransportError(
        'conflict',
        parsed.data.reason ?? 'conflict',
      );
    }
    throw new WriterRoundPrivateTransportError('unavailable', parsed.data.code);
  }
  throw new WriterRoundPrivateTransportError('unavailable');
}

async function callExecutor<T>(
  config: WriterRoundPrivateClientConfig,
  fetchImpl: typeof fetch,
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
    response = await fetchImpl(new URL(request.path, config.origin), {
      method: request.method,
      redirect: 'error',
      signal: AbortSignal.timeout(config.timeoutMs),
      headers,
      ...(serialized === undefined ? {} : { body: serialized }),
    });
  } catch {
    throw new WriterRoundPrivateTransportError('unavailable', 'transport');
  }
  assertResponseVersion(response);
  const { parsed: payload } = await readResponsePayload(response);
  if (response.status !== 200) {
    mapHttpError(payload);
  }
  const parsed = request.schema.safeParse(payload);
  if (!parsed.success) {
    throw new WriterRoundPrivateTransportError('unavailable', 'invalid-shape');
  }
  return parsed.data;
}

export function assertPreparedWirePins(
  prepare: Extract<WriterRoundPrivatePrepareResponse, { status: 'ready' }>,
): void {
  if (!preparedWriterRoundWireIsSelfConsistent(prepare.wire)) {
    throw new WriterRoundPrivateTransportError('invalid', 'wire-pin-mismatch');
  }
  if (prepare.requestSha256 !== prepare.wire.sha256) {
    throw new WriterRoundPrivateTransportError('invalid', 'request-sha-mismatch');
  }
}

export function createWriterRoundPrivateClient(
  config: WriterRoundPrivateClientConfig,
  fetchImpl: typeof fetch = fetch,
): WriterRoundPrivateClient {
  return {
    prepare(missionId, ordinal, input) {
      const body = writerRoundPrivatePrepareRequestSchema.parse({
        schemaVersion: writerRoundPrivateCustodyContractVersion,
        contextId: input.contextId,
        attemptId: input.attemptId,
        expectedRevision: input.expectedRevision,
      });
      return callExecutor(config, fetchImpl, {
        method: 'POST',
        path: writerRoundPrivatePreparePath(missionId, ordinal),
        body,
        schema: writerRoundPrivatePrepareResponseSchema,
      });
    },
    submitOutcome(missionId, ordinal, attemptId, body) {
      const payload = writerRoundPrivateSubmitOutcomeRequestSchema.parse({
        schemaVersion: writerRoundPrivateCustodyContractVersion,
        ...body,
      });
      return callExecutor(config, fetchImpl, {
        method: 'PUT',
        path: writerRoundPrivateOutcomePath(missionId, ordinal, attemptId),
        body: payload,
        schema: writerRoundPrivateSubmitOutcomeResponseSchema,
      });
    },
    getStatus(missionId, ordinal) {
      return callExecutor(config, fetchImpl, {
        method: 'GET',
        path: writerRoundPrivateStatusPath(missionId, ordinal),
        schema: writerRoundPrivateStatusResponseSchema,
      });
    },
  };
}

export {
  writerRoundPrivateCustodyContractVersion,
  writerRoundPrivateCustodyVersionHeader,
};