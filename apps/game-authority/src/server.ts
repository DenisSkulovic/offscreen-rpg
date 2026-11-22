import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { StoryError } from '@offscreen/story-engine/stories';
import {
  gameAuthorityActorIdSchema,
  gameAuthorityErrorSchema,
  gameAuthorityResolutionRequestSchema,
  gameAuthoritySeamVersion,
  gameAuthorityStoryIdSchema,
} from '@offscreen/contracts/game-authority';
import { forkStorySchema, startStorySchema } from '@offscreen/contracts/stories';
import { z } from 'zod';
import {
  parseStorytellerTaskCustodyClaimRequest,
  parseStorytellerTaskCustodySaveResultRequest,
  routeStorytellerTaskCustody,
  storytellerTaskCustodyClaimResponseSchema,
  storytellerTaskCustodyContractVersion,
  storytellerTaskCustodyFetchResponseSchema,
  storytellerTaskCustodyHttpErrorSchema,
  storytellerTaskCustodyReadSavedResponseSchema,
  storytellerTaskCustodySaveResultResponseSchema,
  storytellerTaskCustodyVersionHeader,
} from '@offscreen/contracts/storyteller-task-custody';
import {
  storytellerGenerationPublishResponseSchema,
} from '@offscreen/contracts/storyteller-task-custody';
import {
  parseWriterRoundPrivatePrepareRequest,
  parseWriterRoundPrivateSubmitOutcomeRequest,
  routeWriterRoundPrivateCustody,
  writerRoundPrivateCustodyContractVersion,
  writerRoundPrivateCustodyVersionHeader,
  writerRoundPrivateHttpErrorSchema,
  writerRoundPrivatePrepareResponseSchema,
  writerRoundPrivateStatusResponseSchema,
  writerRoundPrivateSubmitOutcomeResponseSchema,
} from '@offscreen/contracts/writer-round-private-custody';
import { WriterRoundPrivateCustodyError } from '@offscreen/story-engine/storyteller/writer-round-private-custody';
import { WriterMissionCustodyError } from '@offscreen/story-engine/storyteller/writer-mission-custody';
import type { DocumentStore } from '@offscreen/documents';
import { handleBranchEvidence } from './branch-evidence.js';
import type {
  GameAuthoritySeam,
  StorytellerPublicationSeam,
  StorytellerTaskCustodySeam,
  WriterRoundPrivateSeam,
} from './application.js';
import { LaunchLedgerError } from './launch-ledger.js';

const BODY_LIMIT = 64 * 1024;

export type GameAuthorityServer = {
  origin: string;
  close(): Promise<void>;
};

type AuthRole = 'story' | 'executor' | 'control' | 'none';

export type GameAuthorityServerOptions = {
  seam: GameAuthoritySeam;
  token: string;
  executorToken?: string;
  controlToken?: string;
  custody?: StorytellerTaskCustodySeam;
  writerRounds?: WriterRoundPrivateSeam;
  publication?: StorytellerPublicationSeam;
  documentStore?: DocumentStore;
  timeoutMs: number;
  host?: string;
  port?: number;
};

function tokenMatches(presented: string, expected: string) {
  const left = createHash('sha256').update(presented).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

function header(request: IncomingMessage, name: string) {
  const value = request.headers[name];
  return typeof value === 'string' ? value : undefined;
}

function authorizedRole(
  request: IncomingMessage,
  tokens: { story: string; executor?: string; control?: string },
): AuthRole {
  const presented = header(request, 'authorization');
  if (!presented?.startsWith('Bearer ')) return 'none';
  const credential = presented.slice('Bearer '.length);
  if (tokenMatches(credential, tokens.story)) return 'story';
  if (tokens.control && tokenMatches(credential, tokens.control)) {
    return 'control';
  }
  if (tokens.executor && tokenMatches(credential, tokens.executor)) {
    return 'executor';
  }
  return 'none';
}

function send(
  response: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string>,
) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-offscreen-game-authority-version': gameAuthoritySeamVersion,
    ...extraHeaders,
    'content-length': Buffer.byteLength(payload),
  });
  response.end(payload);
}

function sendCustody(response: ServerResponse, status: number, body: unknown) {
  send(response, status, body, {
    [storytellerTaskCustodyVersionHeader]: storytellerTaskCustodyContractVersion,
  });
}

function sendWriterRoundPrivate(
  response: ServerResponse,
  status: number,
  body: unknown,
) {
  send(response, status, body, {
    [writerRoundPrivateCustodyVersionHeader]:
      writerRoundPrivateCustodyContractVersion,
  });
}

function sendWriterRoundPrivateHttpError(
  response: ServerResponse,
  status: number,
  code: 'invalid' | 'not_found' | 'conflict' | 'unavailable' | 'unauthorized',
  reason?: string,
) {
  sendWriterRoundPrivate(
    response,
    status,
    writerRoundPrivateHttpErrorSchema.parse({
      code,
      ...(reason ? { reason } : {}),
    }),
  );
}

function sendError(
  response: ServerResponse,
  status: number,
  code: 'invalid' | 'not_found' | 'conflict' | 'unavailable' | 'unauthorized',
  reason?: string,
) {
  send(
    response,
    status,
    gameAuthorityErrorSchema.parse({
      code,
      ...(reason ? { reason } : {}),
    }),
  );
}

function sendCustodyHttpError(
  response: ServerResponse,
  status: number,
  code: 'invalid' | 'not_found' | 'conflict' | 'unavailable' | 'unauthorized',
  reason?: string,
) {
  sendCustody(
    response,
    status,
    storytellerTaskCustodyHttpErrorSchema.parse({
      code,
      ...(reason ? { reason } : {}),
    }),
  );
}

async function readRawBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > BODY_LIMIT) {
      throw new StoryError('invalid');
    }
    chunks.push(buffer);
  }
  if (total === 0) return undefined;
  return Buffer.concat(chunks);
}

async function readBody(request: IncomingMessage) {
  const raw = await readRawBody(request);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw.toString('utf8')) as unknown;
  } catch {
    throw new StoryError('invalid');
  }
}

type Route =
  | { kind: 'health' }
  | { kind: 'snapshot'; storyId: string }
  | { kind: 'launch-put'; operationId: string }
  | { kind: 'launch-get'; operationId: string }
  | { kind: 'start'; storyId: string }
  | { kind: 'fork'; storyId: string; forkStoryId: string }
  | { kind: 'resolution'; storyId: string; operationId: string }
  | { kind: 'invalid' }
  | { kind: 'absent' };

export function routeFor(method: string, pathname: string): Route {
  if (method === 'GET' && pathname === '/internal/v1/health/live') {
    return { kind: 'health' };
  }
  const parts = pathname.split('/').filter((part) => part.length > 0);
  if (parts[0] !== 'internal' || parts[1] !== 'v1' || parts[2] !== 'stories') {
    return { kind: 'absent' };
  }
  if (parts.length === 5 && parts[3] === 'launch') {
    const operationId = z.uuid().safeParse(parts[4]);
    if (method === 'PUT' && operationId.success) {
      return { kind: 'launch-put', operationId: operationId.data };
    }
    if (method === 'GET' && operationId.success) {
      return { kind: 'launch-get', operationId: operationId.data };
    }
    return { kind: 'invalid' };
  }
  if (parts.length === 4 && method === 'GET') {
    const storyId = gameAuthorityStoryIdSchema.safeParse(parts[3]);
    return storyId.success
      ? { kind: 'snapshot', storyId: storyId.data }
      : { kind: 'invalid' };
  }
  if (parts.length === 5 && parts[4] === 'start' && method === 'PUT') {
    const storyId = gameAuthorityStoryIdSchema.safeParse(parts[3]);
    return storyId.success
      ? { kind: 'start', storyId: storyId.data }
      : { kind: 'invalid' };
  }
  if (
    parts.length === 6 &&
    parts[4] === 'forks' &&
    method === 'PUT'
  ) {
    const storyId = gameAuthorityStoryIdSchema.safeParse(parts[3]);
    const forkStoryId = gameAuthorityStoryIdSchema.safeParse(parts[5]);
    return storyId.success && forkStoryId.success
      ? {
          kind: 'fork',
          storyId: storyId.data,
          forkStoryId: forkStoryId.data,
        }
      : { kind: 'invalid' };
  }
  if (
    parts.length === 6 &&
    parts[4] === 'resolutions' &&
    method === 'PUT'
  ) {
    const storyId = gameAuthorityStoryIdSchema.safeParse(parts[3]);
    const operationId = gameAuthorityStoryIdSchema.safeParse(parts[5]);
    return storyId.success && operationId.success
      ? {
          kind: 'resolution',
          storyId: storyId.data,
          operationId: operationId.data,
        }
      : { kind: 'invalid' };
  }
  return { kind: 'absent' };
}

async function withTimeout<T>(work: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settled = work.then(
    (value) => value,
    (error: unknown) => {
      throw error;
    },
  );
  settled.catch(() => undefined);
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new StoryError('unavailable')), timeoutMs);
  });
  try {
    return await Promise.race([settled, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function startGameAuthorityServer(
  options: GameAuthorityServerOptions,
): Promise<GameAuthorityServer> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 0;
  const server = createServer((request, response) => {
    void handle(request, response, options).catch(() => {
      if (!response.headersSent) {
        sendError(response, 503, 'unavailable');
      }
    });
  });
  server.requestTimeout = options.timeoutMs + 1000;
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      const bound =
        address && typeof address === 'object' ? address.port : port;
      resolve({
        origin: `http://${host}:${bound}`,
        async close() {
          if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
          }
          await new Promise<void>((done, fail) => {
            server.close((error) => (error ? fail(error) : done()));
          });
        },
      });
    });
  });
}

async function handlePublish(
  request: IncomingMessage,
  response: ServerResponse,
  route: { generationId: string },
  options: GameAuthorityServerOptions,
) {
  const publication = options.publication;
  if (!publication) {
    sendCustodyHttpError(response, 503, 'unavailable');
    return;
  }
  try {
    const raw = await readRawBody(request);
    if (raw !== undefined && raw.length > 0) {
      try {
        const parsed = JSON.parse(raw.toString('utf8')) as unknown;
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          Object.keys(parsed as Record<string, unknown>).length > 0
        ) {
          sendCustodyHttpError(response, 400, 'invalid');
          return;
        }
      } catch {
        sendCustodyHttpError(response, 400, 'invalid');
        return;
      }
    }
    const outcome = await withTimeout(
      publication.publishSavedGeneration(route.generationId),
      options.timeoutMs,
    );
    if (
      outcome.status === 'refused' &&
      outcome.reason === 'unknown-generation'
    ) {
      sendCustodyHttpError(response, 404, 'not_found');
      return;
    }
    sendCustody(
      response,
      200,
      storytellerGenerationPublishResponseSchema.parse(outcome),
    );
  } catch (error) {
    if (error instanceof StoryError) {
      sendCustodyHttpError(
        response,
        { invalid: 400, not_found: 404, conflict: 409, unavailable: 503 }[
          error.code
        ],
        error.code,
        error.reason,
      );
      return;
    }
    sendCustodyHttpError(response, 503, 'unavailable');
  }
}

async function handleWriterRoundPrivate(
  request: IncomingMessage,
  response: ServerResponse,
  route: Exclude<
    ReturnType<typeof routeWriterRoundPrivateCustody>,
    { kind: 'absent' | 'invalid' }
  >,
  options: GameAuthorityServerOptions,
) {
  const writerRounds = options.writerRounds;
  if (!writerRounds) {
    sendWriterRoundPrivateHttpError(response, 503, 'unavailable');
    return;
  }
  try {
    if (route.kind === 'status') {
      const outcome = await withTimeout(
        writerRounds.getStatus({
          missionId: route.missionId,
          ordinal: route.ordinal,
        }),
        options.timeoutMs,
      );
      sendWriterRoundPrivate(
        response,
        200,
        writerRoundPrivateStatusResponseSchema.parse(outcome),
      );
      return;
    }
    const raw = await readRawBody(request);
    if (route.kind === 'prepare') {
      const parsed = parseWriterRoundPrivatePrepareRequest(raw ?? '');
      if (!parsed.ok) {
        sendWriterRoundPrivateHttpError(response, 400, 'invalid', parsed.reason);
        return;
      }
      const outcome = await withTimeout(
        writerRounds.prepareRound({
          missionId: route.missionId,
          ordinal: route.ordinal,
          contextId: parsed.value.contextId,
          attemptId: parsed.value.attemptId,
          expectedRevision: parsed.value.expectedRevision,
        }),
        options.timeoutMs,
      );
      sendWriterRoundPrivate(
        response,
        200,
        writerRoundPrivatePrepareResponseSchema.parse(outcome),
      );
      return;
    }
    const parsed = parseWriterRoundPrivateSubmitOutcomeRequest(raw ?? '');
    if (!parsed.ok) {
      sendWriterRoundPrivateHttpError(response, 400, 'invalid', parsed.reason);
      return;
    }
    const outcome = await withTimeout(
      writerRounds.submitOutcome({
        missionId: route.missionId,
        ordinal: route.ordinal,
        attemptId: route.attemptId,
        body: parsed.value,
      }),
      options.timeoutMs,
    );
    sendWriterRoundPrivate(
      response,
      200,
      writerRoundPrivateSubmitOutcomeResponseSchema.parse(outcome),
    );
  } catch (error) {
    if (error instanceof WriterRoundPrivateCustodyError) {
      sendWriterRoundPrivateHttpError(response, 409, 'conflict');
      return;
    }
    if (error instanceof WriterMissionCustodyError) {
      sendWriterRoundPrivateHttpError(response, 409, 'conflict', error.code);
      return;
    }
    if (error instanceof StoryError) {
      sendWriterRoundPrivateHttpError(
        response,
        { invalid: 400, not_found: 404, conflict: 409, unavailable: 503 }[
          error.code
        ],
        error.code,
        error.reason,
      );
      return;
    }
    sendWriterRoundPrivateHttpError(response, 503, 'unavailable');
  }
}

async function handleCustody(
  request: IncomingMessage,
  response: ServerResponse,
  route: Exclude<
    ReturnType<typeof routeStorytellerTaskCustody>,
    { kind: 'absent' | 'invalid' | 'publish' | 'evidence' }
  >,
  options: GameAuthorityServerOptions,
) {
  const custody = options.custody;
  if (!custody) {
    sendCustodyHttpError(response, 503, 'unavailable');
    return;
  }
  try {
    if (route.kind === 'task') {
      const outcome = await withTimeout(
        custody.fetchCommittedGeneration(route.generationId),
        options.timeoutMs,
      );
      sendCustody(
        response,
        200,
        storytellerTaskCustodyFetchResponseSchema.parse(outcome),
      );
      return;
    }
    if (route.kind === 'read-saved') {
      const outcome = await withTimeout(
        custody.readValidatedResult(route.generationId),
        options.timeoutMs,
      );
      sendCustody(
        response,
        200,
        storytellerTaskCustodyReadSavedResponseSchema.parse(outcome),
      );
      return;
    }
    const raw = await readRawBody(request);
    if (route.kind === 'claim') {
      const parsed = parseStorytellerTaskCustodyClaimRequest(raw ?? '');
      if (!parsed.ok) {
        sendCustodyHttpError(response, 400, 'invalid', parsed.reason);
        return;
      }
      const outcome = await withTimeout(
        custody.claimGeneration({
          generationId: route.generationId,
          pinnedRoot: parsed.value.pinnedRoot,
        }),
        options.timeoutMs,
      );
      sendCustody(
        response,
        200,
        storytellerTaskCustodyClaimResponseSchema.parse(outcome),
      );
      return;
    }
    const parsed = parseStorytellerTaskCustodySaveResultRequest(raw ?? '');
    if (!parsed.ok) {
      sendCustodyHttpError(response, 400, 'invalid', parsed.reason);
      return;
    }
    const outcome = await withTimeout(
      custody.saveValidatedResult({
        generationId: route.generationId,
        pinnedRoot: parsed.value.pinnedRoot,
        resultHash: parsed.value.resultHash,
        result: parsed.value.result,
      }),
      options.timeoutMs,
    );
    sendCustody(
      response,
      200,
      storytellerTaskCustodySaveResultResponseSchema.parse(outcome),
    );
  } catch (error) {
    if (error instanceof StoryError) {
      sendCustodyHttpError(
        response,
        { invalid: 400, not_found: 404, conflict: 409, unavailable: 503 }[
          error.code
        ],
        error.code,
        error.reason,
      );
      return;
    }
    sendCustodyHttpError(response, 503, 'unavailable');
  }
}

async function handle(
  request: IncomingMessage,
  response: ServerResponse,
  options: GameAuthorityServerOptions,
) {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const method = request.method ?? 'GET';
  const storyRoute = routeFor(method, url.pathname);
  if (storyRoute.kind === 'health') {
    send(response, 200, { status: 'ok' });
    return;
  }

  const authTokens = {
    story: options.token,
    ...(options.executorToken === undefined
      ? {}
      : { executor: options.executorToken }),
    ...(options.controlToken === undefined
      ? {}
      : { control: options.controlToken }),
  };

  const writerRoundRoute = routeWriterRoundPrivateCustody(method, url.pathname);
  if (writerRoundRoute.kind !== 'absent') {
    const role = authorizedRole(request, authTokens);
    if (role !== 'executor') {
      sendWriterRoundPrivateHttpError(response, 401, 'unauthorized');
      return;
    }
    if (writerRoundRoute.kind === 'invalid') {
      sendWriterRoundPrivateHttpError(response, 400, 'invalid');
      return;
    }
    await handleWriterRoundPrivate(request, response, writerRoundRoute, options);
    return;
  }

  const custodyRoute = routeStorytellerTaskCustody(method, url.pathname);
  if (custodyRoute.kind === 'publish') {
    const role = authorizedRole(request, authTokens);
    if (role !== 'control') {
      sendCustodyHttpError(response, 401, 'unauthorized');
      return;
    }
    await handlePublish(request, response, custodyRoute, options);
    return;
  }
  if (custodyRoute.kind !== 'absent') {
    const role = authorizedRole(request, authTokens);
    if (role !== 'executor') {
      sendCustodyHttpError(response, 401, 'unauthorized');
      return;
    }
    if (custodyRoute.kind === 'invalid') {
      sendCustodyHttpError(response, 400, 'invalid');
      return;
    }
    if (custodyRoute.kind === 'evidence') {
      await handleBranchEvidence(
        request,
        response,
        custodyRoute.generationId,
        options,
        {
          withTimeout,
          readRawBody,
          sendCustody,
          sendCustodyHttpError,
        },
      );
      return;
    }
    await handleCustody(request, response, custodyRoute, options);
    return;
  }

  const role = authorizedRole(request, authTokens);
  if (role !== 'story') {
    sendError(response, 401, 'unauthorized');
    return;
  }
  if (storyRoute.kind === 'absent') {
    sendError(response, 404, 'not_found');
    return;
  }
  if (storyRoute.kind === 'invalid') {
    sendError(response, 400, 'invalid');
    return;
  }
  const actor = gameAuthorityActorIdSchema.safeParse(
    header(request, 'x-offscreen-actor-id'),
  );
  if (!actor.success) {
    sendError(response, 401, 'unauthorized');
    return;
  }
  try {
    if (storyRoute.kind === 'launch-get') {
      const status = await withTimeout(
        options.seam.getLaunch({
          ownerId: actor.data,
          operationId: storyRoute.operationId,
        }),
        options.timeoutMs,
      );
      send(response, 200, status);
      return;
    }
    if (storyRoute.kind === 'launch-put') {
      const body = await readBody(request);
      const status = await withTimeout(
        options.seam.putLaunch({
          ownerId: actor.data,
          operationId: storyRoute.operationId,
          body,
        }),
        options.timeoutMs,
      );
      send(response, 200, status);
      return;
    }
    if (storyRoute.kind === 'snapshot') {
      const snapshot = await withTimeout(
        options.seam.read({ ownerId: actor.data, storyId: storyRoute.storyId }),
        options.timeoutMs,
      );
      send(response, 200, snapshot);
      return;
    }
    if (storyRoute.kind === 'start') {
      const body = startStorySchema.safeParse(await readBody(request));
      if (!body.success) {
        sendError(response, 400, 'invalid');
        return;
      }
      const snapshot = await withTimeout(
        options.seam.startFromCandidate({
          ownerId: actor.data,
          storyId: storyRoute.storyId,
          candidateId: body.data.candidateId,
          expectedDraftRevision: body.data.expectedDraftRevision,
          ...(body.data.campaign !== undefined
            ? { campaign: body.data.campaign }
            : {}),
        }),
        options.timeoutMs,
      );
      send(response, 200, snapshot);
      return;
    }
    if (storyRoute.kind === 'fork') {
      const body = forkStorySchema.safeParse(await readBody(request));
      if (!body.success) {
        sendError(response, 400, 'invalid');
        return;
      }
      const snapshot = await withTimeout(
        options.seam.fork({
          ownerId: actor.data,
          sourceStoryId: storyRoute.storyId,
          forkStoryId: storyRoute.forkStoryId,
          body: body.data,
        }),
        options.timeoutMs,
      );
      send(response, 200, snapshot);
      return;
    }
    const body = gameAuthorityResolutionRequestSchema.safeParse(
      await readBody(request),
    );
    if (!body.success) {
      sendError(response, 400, 'invalid');
      return;
    }
    const snapshot = await withTimeout(
      options.seam.admitResolution({
        ownerId: actor.data,
        storyId: storyRoute.storyId,
        operationId: storyRoute.operationId,
        body: body.data,
      }),
      options.timeoutMs,
    );
    send(response, 202, snapshot);
  } catch (error) {
    if (
      error instanceof StoryError &&
      error.code === 'invalid' &&
      error.reason === 'not-admitted'
    ) {
      sendError(response, 403, 'unauthorized', 'not-admitted');
      return;
    }
    if (error instanceof LaunchLedgerError) {
      sendError(
        response,
        {
          launch_invalid: 400,
          launch_not_found: 404,
          launch_conflict: 409,
        }[error.code],
        error.code === 'launch_conflict'
          ? 'conflict'
          : error.code === 'launch_not_found'
            ? 'not_found'
            : 'invalid',
      );
      return;
    }
    if (error instanceof StoryError) {
      sendError(
        response,
        { invalid: 400, not_found: 404, conflict: 409, unavailable: 503 }[
          error.code
        ],
        error.code,
        error.reason,
      );
      return;
    }
    sendError(response, 503, 'unavailable');
  }
}