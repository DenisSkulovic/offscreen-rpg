import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { StoryError } from '@offscreen/application/stories';
import {
  gameAuthorityActorIdSchema,
  gameAuthorityErrorSchema,
  gameAuthorityResolutionRequestSchema,
  gameAuthoritySeamVersion,
  gameAuthorityStoryIdSchema,
} from '@offscreen/contracts/game-authority';
import type { GameAuthoritySeam } from './application.js';

const BODY_LIMIT = 64 * 1024;

export type GameAuthorityServer = {
  origin: string;
  close(): Promise<void>;
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

function authorized(request: IncomingMessage, token: string) {
  const presented = header(request, 'authorization');
  if (!presented?.startsWith('Bearer ')) return false;
  return tokenMatches(presented.slice('Bearer '.length), token);
}

function send(
  response: ServerResponse,
  status: number,
  body: unknown,
) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-offscreen-game-authority-version': gameAuthoritySeamVersion,
    'content-length': Buffer.byteLength(payload),
  });
  response.end(payload);
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

async function readBody(request: IncomingMessage) {
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
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new StoryError('invalid');
  }
}

type Route =
  | { kind: 'health' }
  | { kind: 'snapshot'; storyId: string }
  | { kind: 'resolution'; storyId: string; operationId: string }
  | { kind: 'invalid' }
  | { kind: 'absent' };

function routeFor(method: string, pathname: string): Route {
  if (method === 'GET' && pathname === '/internal/v1/health/live') {
    return { kind: 'health' };
  }
  const parts = pathname.split('/').filter((part) => part.length > 0);
  if (parts[0] !== 'internal' || parts[1] !== 'v1' || parts[2] !== 'stories') {
    return { kind: 'absent' };
  }
  if (parts.length === 4 && method === 'GET') {
    const storyId = gameAuthorityStoryIdSchema.safeParse(parts[3]);
    return storyId.success
      ? { kind: 'snapshot', storyId: storyId.data }
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

export function startGameAuthorityServer(options: {
  seam: GameAuthoritySeam;
  token: string;
  timeoutMs: number;
  host?: string;
  port?: number;
}): Promise<GameAuthorityServer> {
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

async function handle(
  request: IncomingMessage,
  response: ServerResponse,
  options: { seam: GameAuthoritySeam; token: string; timeoutMs: number },
) {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const method = request.method ?? 'GET';
  const route = routeFor(method, url.pathname);
  if (route.kind === 'health') {
    send(response, 200, { status: 'ok' });
    return;
  }
  if (!authorized(request, options.token)) {
    sendError(response, 401, 'unauthorized');
    return;
  }
  if (route.kind === 'absent') {
    sendError(response, 404, 'not_found');
    return;
  }
  if (route.kind === 'invalid') {
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
    if (route.kind === 'snapshot') {
      const snapshot = await withTimeout(
        options.seam.read({ ownerId: actor.data, storyId: route.storyId }),
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
        storyId: route.storyId,
        operationId: route.operationId,
        body: body.data,
      }),
      options.timeoutMs,
    );
    send(response, 202, snapshot);
  } catch (error) {
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
