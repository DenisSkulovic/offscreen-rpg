import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import {
  createServer as createHttpServer,
  request as httpRequest,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { betterAuth } from 'better-auth';
import { testUtils } from 'better-auth/plugins';
import {
  createDatabase,
  readDatabaseConfig,
  type Database,
} from '@offscreen/db';
import { applyMigrations } from '@offscreen/db/migrate';
import { createApp } from '@offscreen/api/app';
import type { ChamberStorytellerControl } from '@offscreen/application/developer-tools';
import { authOptions } from '@offscreen/api/auth';
import { LocalDocumentStore, type DocumentStore } from '@offscreen/documents';
import type { RulePackageReference } from '@offscreen/documents';
import { requireCookie } from './require.js';

const databaseURL = process.env['DATABASE_TEST_URL'];
if (!databaseURL || new URL(databaseURL).pathname !== '/offscreen_auth_test') {
  throw new Error(
    'DATABASE_TEST_URL must target the disposable offscreen_auth_test database.',
  );
}

export const STORY03_CAUSAL_GA_SERVICE_TOKEN = 'boot03-integration-ga-story-01';
export const STORY03_CAUSAL_GA_CONTROL_TOKEN = 'boot03-integration-ga-ctrl-02';
export const STORY03_CAUSAL_GA_EXECUTOR_TOKEN = 'boot03-integration-ga-exec-03';
export const STORY03_CAUSAL_RELAY_TASK_QUEUE = 'story03-t09';

const defaultRuleSource = fileURLToPath(
  new URL('../../../../../content/rules/srd-5.2.1-subset', import.meta.url),
);
const workerRepoRoot = fileURLToPath(
  new URL('../../../../../apps/worker', import.meta.url),
);
const gaRepoRoot = fileURLToPath(
  new URL('../../../../../apps/game-authority', import.meta.url),
);

export type Story03CausalMultiprocessContext = {
  database: Database;
  origin: string;
  apiOrigin: string;
  cookie: string;
  otherCookie: string;
  ownerId: string;
  otherUser: { id: string };
  documentRoot: string;
  documentStore: DocumentStore;
  defaultRules: RulePackageReference;
  gameAuthorityOrigin: string;
  killGameAuthority: () => Promise<void>;
  restartDistributedWorkers: (options?: { spawnExecutor?: boolean }) => Promise<void>;
  stopExecutorOnly: () => Promise<void>;
  spawnExecutorOnly: () => Promise<void>;
  workerStderrTail: (role: 'relay' | 'control' | 'executor') => string;
  controlPublishProxy?: Story03ControlPublishProxyStats;
  executorResultProxy?: Story03ExecutorResultProxyStats;
  releaseHeldExecutorSaveResponse?: () => void;
  dropHeldExecutorSaveResponse?: () => void;
};

export type Story03ControlPublishProxyStats = {
  droppedCompletedPublishResponseCount: number;
  publishPostCount: number;
};

export type Story03ExecutorResultProxyStats = {
  heldCompletedSaveResponseCount: number;
  savePutCount: number;
};

type PipedChild = {
  child: ChildProcess;
  tail: () => string;
};

async function reserveLoopbackPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port =
        address && typeof address === 'object' ? address.port : undefined;
      if (!port) {
        server.close(() =>
          reject(new Error('Failed to reserve an ephemeral loopback port')),
        );
        return;
      }
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

async function waitForGameAuthorityLive(origin: string) {
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      const response = await fetch(`${origin}/internal/v1/health/live`);
      if (response.ok) return;
    } catch {
      /* starting */
    }
    await delay(100);
  }
  throw new Error('Game Authority did not become live on loopback');
}

function spawnPipedChild(
  entry: string,
  env: Record<string, string>,
): PipedChild {
  const stderrChunks: Buffer[] = [];
  const child = spawn(process.execPath, [entry], {
    cwd: workerRepoRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    stderrChunks.push(chunk);
  });
  child.stdout?.on('data', (chunk: Buffer) => {
    stderrChunks.push(chunk);
  });
  return {
    child,
    tail: () =>
      Buffer.concat(stderrChunks).toString('utf8').slice(-6000),
  };
}

async function killPipedChild(piped: PipedChild | undefined) {
  if (!piped || piped.child.exitCode !== null || piped.child.killed) return;
  piped.child.kill();
  await once(piped.child, 'exit').catch(() => undefined);
}

async function release(steps: ReadonlyArray<() => void | Promise<void>>) {
  const failures: unknown[] = [];
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length === 0) return;
  if (failures.length === 1) throw failures[0];
  throw new AggregateError(failures, 'STORY03 causal multiprocess cleanup failed');
}

function temporalEnv(): { address: string; namespace: string } {
  return {
    address: process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233',
    namespace: process.env['TEMPORAL_NAMESPACE'] ?? 'default',
  };
}

function isStorytellerGenerationPublishPost(
  method: string | undefined,
  pathname: string,
): boolean {
  return (
    method === 'POST' &&
    /^\/internal\/v1\/storyteller-generations\/[^/]+\/publish$/.test(pathname)
  );
}

function isStorytellerGenerationResultPut(
  method: string | undefined,
  pathname: string,
): boolean {
  return (
    method === 'PUT' &&
    /^\/internal\/v1\/storyteller-generations\/[^/]+\/result$/.test(pathname)
  );
}

function storytellerSaveResultGenerationId(pathname: string): string | undefined {
  const match = pathname.match(
    /^\/internal\/v1\/storyteller-generations\/([^/]+)\/result$/,
  );
  return match?.[1];
}

type ControlPublishProxy = {
  origin: string;
  stats: Story03ControlPublishProxyStats;
  close: () => Promise<void>;
};

/**
 * Loopback reverse proxy so the control worker can exercise transport loss on
 * an otherwise successful Game Authority publish commit.
 */
function storytellerPublishGenerationId(pathname: string): string | undefined {
  const match = pathname.match(
    /^\/internal\/v1\/storyteller-generations\/([^/]+)\/publish$/,
  );
  return match?.[1];
}

async function startControlGameAuthorityPublishProxy(options: {
  upstreamOrigin: string;
  dropFirstCompletedPublishResponseWhen?: (generationId: string) => boolean;
}): Promise<ControlPublishProxy> {
  const upstream = new URL(options.upstreamOrigin);
  const stats: Story03ControlPublishProxyStats = {
    droppedCompletedPublishResponseCount: 0,
    publishPostCount: 0,
  };
  const droppedGenerationIds = new Set<string>();

  const server = createHttpServer(
    (clientRequest: IncomingMessage, clientResponse: ServerResponse) => {
      const requestUrl = new URL(
        clientRequest.url ?? '/',
        options.upstreamOrigin,
      );
      const isPublish = isStorytellerGenerationPublishPost(
        clientRequest.method,
        requestUrl.pathname,
      );

      const proxyRequest = httpRequest(
        {
          hostname: upstream.hostname,
          port: upstream.port,
          path: clientRequest.url,
          method: clientRequest.method,
          headers: {
            ...clientRequest.headers,
            host: upstream.host,
          },
        },
        (proxyResponse) => {
          const bodyChunks: Buffer[] = [];
          proxyResponse.on('data', (chunk: Buffer) => {
            bodyChunks.push(chunk);
          });
          proxyResponse.on('end', () => {
            const body = Buffer.concat(bodyChunks);
            const publishGenerationId = isPublish
              ? storytellerPublishGenerationId(requestUrl.pathname)
              : undefined;
            if (isPublish) stats.publishPostCount += 1;

            let dropAck = false;
            if (
              isPublish &&
              publishGenerationId &&
              !droppedGenerationIds.has(publishGenerationId) &&
              proxyResponse.statusCode === 200 &&
              options.dropFirstCompletedPublishResponseWhen?.(publishGenerationId)
            ) {
              try {
                const payload = JSON.parse(body.toString('utf8')) as {
                  status?: string;
                };
                if (payload.status === 'published') {
                  dropAck = true;
                  droppedGenerationIds.add(publishGenerationId);
                  stats.droppedCompletedPublishResponseCount += 1;
                }
              } catch {
                /* forward */
              }
            }

            if (dropAck) {
              clientResponse.socket?.destroy();
              return;
            }

            clientResponse.writeHead(
              proxyResponse.statusCode ?? 502,
              proxyResponse.headers,
            );
            clientResponse.end(body);
          });
          proxyResponse.on('error', () => {
            clientResponse.destroy();
          });
        },
      );

      proxyRequest.on('error', () => {
        clientResponse.destroy();
      });
      clientRequest.on('error', () => {
        proxyRequest.destroy();
      });
      clientRequest.pipe(proxyRequest);
    },
  );

  const proxyPort = await reserveLoopbackPort();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(proxyPort, '127.0.0.1', () => resolve());
  });

  return {
    origin: `http://127.0.0.1:${proxyPort}`,
    stats,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

type ExecutorResultProxy = {
  origin: string;
  stats: Story03ExecutorResultProxyStats;
  releaseHeldSaveResponse: () => void;
  dropHeldSaveResponse: () => void;
  close: () => Promise<void>;
};

const EXECUTOR_RESULT_PROXY_MAX_HOLD_MS = 90_000;

/**
 * Loopback reverse proxy so the executor worker can exercise transport loss on
 * an otherwise successful Game Authority save commit.
 */
async function startExecutorGameAuthorityResultProxy(options: {
  upstreamOrigin: string;
  holdFirstCompletedSaveResponseWhen?: (generationId: string) => boolean;
}): Promise<ExecutorResultProxy> {
  const upstream = new URL(options.upstreamOrigin);
  const stats: Story03ExecutorResultProxyStats = {
    heldCompletedSaveResponseCount: 0,
    savePutCount: 0,
  };
  const heldGenerationIds = new Set<string>();
  let heldResponse:
    | {
        clientResponse: ServerResponse;
        statusCode: number;
        headers: import('node:http').OutgoingHttpHeaders;
        body: Buffer;
        holdTimer: ReturnType<typeof setTimeout>;
      }
    | undefined;

  const clearHeld = (drop: boolean) => {
    if (!heldResponse) return;
    clearTimeout(heldResponse.holdTimer);
    if (drop) {
      heldResponse.clientResponse.socket?.destroy();
    } else if (!heldResponse.clientResponse.writableEnded) {
      heldResponse.clientResponse.writeHead(
        heldResponse.statusCode,
        heldResponse.headers,
      );
      heldResponse.clientResponse.end(heldResponse.body);
    }
    heldResponse = undefined;
  };

  const server = createHttpServer(
    (clientRequest: IncomingMessage, clientResponse: ServerResponse) => {
      const requestUrl = new URL(
        clientRequest.url ?? '/',
        options.upstreamOrigin,
      );
      const isSave = isStorytellerGenerationResultPut(
        clientRequest.method,
        requestUrl.pathname,
      );
      const saveGenerationId = isSave
        ? storytellerSaveResultGenerationId(requestUrl.pathname)
        : undefined;

      const proxyRequest = httpRequest(
        {
          hostname: upstream.hostname,
          port: upstream.port,
          path: clientRequest.url,
          method: clientRequest.method,
          headers: {
            ...clientRequest.headers,
            host: upstream.host,
          },
        },
        (proxyResponse) => {
          const bodyChunks: Buffer[] = [];
          proxyResponse.on('data', (chunk: Buffer) => {
            bodyChunks.push(chunk);
          });
          proxyResponse.on('end', () => {
            const body = Buffer.concat(bodyChunks);
            if (isSave && saveGenerationId) stats.savePutCount += 1;

            let holdAck = false;
            if (
              isSave &&
              saveGenerationId &&
              !heldGenerationIds.has(saveGenerationId) &&
              proxyResponse.statusCode === 200 &&
              options.holdFirstCompletedSaveResponseWhen?.(saveGenerationId)
            ) {
              try {
                const payload = JSON.parse(body.toString('utf8')) as {
                  status?: string;
                };
                if (payload.status === 'saved') {
                  holdAck = true;
                  heldGenerationIds.add(saveGenerationId);
                  stats.heldCompletedSaveResponseCount += 1;
                }
              } catch {
                /* forward */
              }
            }

            if (holdAck) {
              const holdTimer = setTimeout(() => {
                clearHeld(true);
              }, EXECUTOR_RESULT_PROXY_MAX_HOLD_MS);
              heldResponse = {
                clientResponse,
                statusCode: proxyResponse.statusCode ?? 502,
                headers: proxyResponse.headers,
                body,
                holdTimer,
              };
              clientResponse.on('close', () => {
                if (heldResponse?.clientResponse === clientResponse) {
                  clearTimeout(holdTimer);
                  heldResponse = undefined;
                }
              });
              return;
            }

            clientResponse.writeHead(
              proxyResponse.statusCode ?? 502,
              proxyResponse.headers,
            );
            clientResponse.end(body);
          });
          proxyResponse.on('error', () => {
            clientResponse.destroy();
          });
        },
      );

      proxyRequest.on('error', () => {
        clientResponse.destroy();
      });
      clientRequest.on('error', () => {
        proxyRequest.destroy();
      });
      clientRequest.pipe(proxyRequest);
    },
  );

  const proxyPort = await reserveLoopbackPort();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(proxyPort, '127.0.0.1', () => resolve());
  });

  return {
    origin: `http://127.0.0.1:${proxyPort}`,
    stats,
    releaseHeldSaveResponse: () => clearHeld(false),
    dropHeldSaveResponse: () => clearHeld(true),
    close: () =>
      new Promise<void>((resolve, reject) => {
        clearHeld(true);
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

/**
 * Nest + Game Authority + relay/control/(optional) executor as separate OS
 * processes. Document store tier: local filesystem under `documentRoot`.
 */
export async function withStory03CausalMultiprocessHarness(
  run: (context: Story03CausalMultiprocessContext) => Promise<void>,
  options: {
    documentRoot: string;
    defaultRules: RulePackageReference;
    chamberStorytellerControl?: ChamberStorytellerControl;
    skipGameAuthority?: boolean;
    spawnExecutor?: boolean;
    controlPublishProxy?: {
      dropFirstCompletedPublishResponseWhen?: (generationId: string) => boolean;
    };
    executorResultProxy?: {
      holdFirstCompletedSaveResponseWhen?: (generationId: string) => boolean;
    };
  },
) {
  const previousAuthorityEnv = {
    GAME_AUTHORITY_MODE: process.env['GAME_AUTHORITY_MODE'],
    GAME_AUTHORITY_ORIGIN: process.env['GAME_AUTHORITY_ORIGIN'],
    GAME_AUTHORITY_SERVICE_TOKEN: process.env['GAME_AUTHORITY_SERVICE_TOKEN'],
    STORYTELLER_DISTRIBUTED_V1: process.env['STORYTELLER_DISTRIBUTED_V1'],
    OFFSCREEN_DOCUMENT_ROOT: process.env['OFFSCREEN_DOCUMENT_ROOT'],
  };
  process.env['STORYTELLER_DISTRIBUTED_V1'] = 'true';
  process.env['OFFSCREEN_DOCUMENT_ROOT'] = options.documentRoot;

  const config = readDatabaseConfig({ DATABASE_URL: databaseURL });
  await applyMigrations(
    config,
    fileURLToPath(
      new URL('../../../../../packages/db/migrations', import.meta.url),
    ),
  );
  const database = createDatabase(config, () => {});
  const documentStore = new LocalDocumentStore(options.documentRoot);
  const apiPort = await reserveLoopbackPort();
  const apiOrigin = `http://127.0.0.1:${apiPort}`;
  const gaPort = await reserveLoopbackPort();
  const gameAuthorityOrigin = `http://127.0.0.1:${gaPort}`;

  let gameAuthorityProcess: ChildProcess | undefined;
  const startGameAuthority = async () => {
    if (gameAuthorityProcess) return;
    gameAuthorityProcess = spawn(
      process.execPath,
      ['dist/src/bootstrap/main.js'],
      {
        cwd: gaRepoRoot,
        env: {
          ...process.env,
          DATABASE_URL: databaseURL,
          STORYTELLER_LIVE_ENABLED: 'false',
          GAME_AUTHORITY_HOST: '127.0.0.1',
          GAME_AUTHORITY_PORT: String(gaPort),
          GAME_AUTHORITY_SERVICE_TOKEN: STORY03_CAUSAL_GA_SERVICE_TOKEN,
          GAME_AUTHORITY_CONTROL_TOKEN: STORY03_CAUSAL_GA_CONTROL_TOKEN,
          GAME_AUTHORITY_EXECUTOR_TOKEN: STORY03_CAUSAL_GA_EXECUTOR_TOKEN,
          OFFSCREEN_DOCUMENT_ROOT: options.documentRoot,
          OFFSCREEN_DEFAULT_RULE_SOURCE: defaultRuleSource,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      },
    );
    await waitForGameAuthorityLive(gameAuthorityOrigin);
  };
  if (!options.skipGameAuthority) {
    await startGameAuthority();
  }

  let controlPublishProxy: ControlPublishProxy | undefined;
  if (options.controlPublishProxy && gameAuthorityOrigin) {
    const proxyOptions: Parameters<
      typeof startControlGameAuthorityPublishProxy
    >[0] = { upstreamOrigin: gameAuthorityOrigin };
    if (options.controlPublishProxy.dropFirstCompletedPublishResponseWhen) {
      proxyOptions.dropFirstCompletedPublishResponseWhen =
        options.controlPublishProxy.dropFirstCompletedPublishResponseWhen;
    }
    controlPublishProxy = await startControlGameAuthorityPublishProxy(
      proxyOptions,
    );
  }
  const controlGameAuthorityOrigin =
    controlPublishProxy?.origin ?? gameAuthorityOrigin;

  let executorResultProxy: ExecutorResultProxy | undefined;
  if (options.executorResultProxy && gameAuthorityOrigin) {
    const proxyOptions: Parameters<
      typeof startExecutorGameAuthorityResultProxy
    >[0] = { upstreamOrigin: gameAuthorityOrigin };
    if (options.executorResultProxy.holdFirstCompletedSaveResponseWhen) {
      proxyOptions.holdFirstCompletedSaveResponseWhen =
        options.executorResultProxy.holdFirstCompletedSaveResponseWhen;
    }
    executorResultProxy = await startExecutorGameAuthorityResultProxy(
      proxyOptions,
    );
  }
  const executorGameAuthorityOrigin =
    executorResultProxy?.origin ?? gameAuthorityOrigin;

  process.env['GAME_AUTHORITY_MODE'] = 'distributed';
  process.env['GAME_AUTHORITY_ORIGIN'] = gameAuthorityOrigin;
  process.env['GAME_AUTHORITY_SERVICE_TOKEN'] = STORY03_CAUSAL_GA_SERVICE_TOKEN;

  const utilities = testUtils();
  const strictUtilities = {
    ...utilities,
    init(context: Parameters<typeof utilities.init>[0]) {
      const result = utilities.init(context);
      return { ...result, options: result.options ?? {} };
    },
  };
  const auth = betterAuth({
    ...authOptions(database, {
      origin: apiOrigin,
      secret: 'integration-only-not-a-runtime-secret-1234',
      githubClientId: 'test-client',
      githubClientSecret: 'test-secret',
      pocOpenAccess: false,
    }),
    plugins: [strictUtilities],
  });
  const app = await createApp(database, auth, apiOrigin, {
    developerTools: true,
    databaseConfig: config,
    documentStore,
    defaultRules: options.defaultRules,
    ...(options.chamberStorytellerControl
      ? { chamberStorytellerControl: options.chamberStorytellerControl }
      : {}),
  });
  const helpers = (await auth.$context).test;
  const user = await helpers.saveUser(
    helpers.createUser({ name: 'STORY03 causal actor A' }),
  );
  const otherUser = await helpers.saveUser(helpers.createUser());

  let relay: PipedChild | undefined;
  let control: PipedChild | undefined;
  let executor: PipedChild | undefined;

  const spawnWorkers = async (spawnExecutor: boolean) => {
    const { address, namespace } = temporalEnv();
    relay = spawnPipedChild('dist/src/bootstrap/main.js', {
      DATABASE_URL: databaseURL!,
      TEMPORAL_ADDRESS: address,
      TEMPORAL_NAMESPACE: namespace,
      TEMPORAL_TASK_QUEUE: STORY03_CAUSAL_RELAY_TASK_QUEUE,
      STORYTELLER_LIVE_ENABLED: 'false',
    });
    control = spawnPipedChild('dist/src/bootstrap/control-main.js', {
      TEMPORAL_ADDRESS: address,
      TEMPORAL_NAMESPACE: namespace,
      GAME_AUTHORITY_ORIGIN: controlGameAuthorityOrigin,
      GAME_AUTHORITY_CONTROL_TOKEN: STORY03_CAUSAL_GA_CONTROL_TOKEN,
    });
    if (spawnExecutor) {
      executor = spawnPipedChild('dist/src/bootstrap/executor-main.js', {
        TEMPORAL_ADDRESS: address,
        TEMPORAL_NAMESPACE: namespace,
        GAME_AUTHORITY_ORIGIN: executorGameAuthorityOrigin,
        GAME_AUTHORITY_EXECUTOR_TOKEN: STORY03_CAUSAL_GA_EXECUTOR_TOKEN,
      });
    }
    await delay(500);
  };

  const stopWorkers = async () => {
    await killPipedChild(executor);
    executor = undefined;
    await killPipedChild(control);
    control = undefined;
    await killPipedChild(relay);
    relay = undefined;
  };

  const restartDistributedWorkers = async (
    workerOptions: { spawnExecutor?: boolean } = {},
  ) => {
    await stopWorkers();
    await spawnWorkers(workerOptions.spawnExecutor ?? options.spawnExecutor ?? true);
  };

  const stopExecutorOnly = async () => {
    await killPipedChild(executor);
    executor = undefined;
  };

  const spawnExecutorOnly = async () => {
    if (executor) return;
    const { address, namespace } = temporalEnv();
    executor = spawnPipedChild('dist/src/bootstrap/executor-main.js', {
      TEMPORAL_ADDRESS: address,
      TEMPORAL_NAMESPACE: namespace,
      GAME_AUTHORITY_ORIGIN: executorGameAuthorityOrigin,
      GAME_AUTHORITY_EXECUTOR_TOKEN: STORY03_CAUSAL_GA_EXECUTOR_TOKEN,
    });
    await delay(300);
  };

  const killGameAuthority = async () => {
    if (!gameAuthorityProcess) return;
    gameAuthorityProcess.kill();
    await once(gameAuthorityProcess, 'exit').catch(() => undefined);
    gameAuthorityProcess = undefined;
  };

  try {
    await app.listen(apiPort, '127.0.0.1');
    await spawnWorkers(options.spawnExecutor ?? true);
    const login = await helpers.login({ userId: user.id });
    const cookie = requireCookie(login.headers);
    const otherLogin = await helpers.login({ userId: otherUser.id });
    const otherCookie = requireCookie(otherLogin.headers);
    assert.ok(gameAuthorityProcess || options.skipGameAuthority);
    await run({
      database,
      origin: apiOrigin,
      apiOrigin,
      cookie,
      otherCookie,
      ownerId: user.id,
      otherUser,
      documentRoot: options.documentRoot,
      documentStore,
      defaultRules: options.defaultRules,
      gameAuthorityOrigin,
      killGameAuthority,
      restartDistributedWorkers,
      stopExecutorOnly,
      spawnExecutorOnly,
      workerStderrTail(role) {
        if (role === 'relay') return relay?.tail() ?? '';
        if (role === 'control') return control?.tail() ?? '';
        return executor?.tail() ?? '';
      },
      ...(controlPublishProxy
        ? { controlPublishProxy: controlPublishProxy.stats }
        : {}),
      ...(executorResultProxy
        ? {
            executorResultProxy: executorResultProxy.stats,
            releaseHeldExecutorSaveResponse:
              executorResultProxy.releaseHeldSaveResponse,
            dropHeldExecutorSaveResponse:
              executorResultProxy.dropHeldSaveResponse,
          }
        : {}),
    });
  } finally {
    await release([
      stopWorkers,
      async () => {
        if (controlPublishProxy) await controlPublishProxy.close();
      },
      async () => {
        if (executorResultProxy) await executorResultProxy.close();
      },
      killGameAuthority,
      async () => {
        await database.db.$client.query(
          'DELETE FROM draft_opening WHERE draft_id IN (SELECT id FROM story_draft WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM outbox WHERE operation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM outbox WHERE operation_id IN (SELECT p.id FROM story_passage p JOIN story s ON s.id = p.story_id WHERE s.owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story_resolution WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story_scene_checkpoint WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story_passage WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story_control WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story_item WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story_document_commit WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM world_obligation WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story WHERE owner_id = $1',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_usage_allocation WHERE attempt_id IN (SELECT a.id FROM storyteller_attempt a JOIN generation g ON g.id = a.generation_id WHERE g.owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_attempt WHERE generation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_operation WHERE generation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_retry WHERE generation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_publication WHERE generation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_memory_exploration WHERE generation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_execution_stage WHERE generation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_prompt_provenance WHERE generation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_dispatch_review_decision WHERE attempt_id IN (SELECT r.attempt_id FROM storyteller_dispatch_review r JOIN generation g ON g.id = r.generation_id WHERE g.owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_dispatch_review WHERE generation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_context_capture_rearm WHERE capture_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_context_capture WHERE capture_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM generation WHERE owner_id = $1',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story_draft WHERE owner_id = $1',
          [user.id],
        );
      },
      async () => {
        await helpers.deleteUser(otherUser.id);
        await helpers.deleteUser(user.id);
      },
      async () => {
        await app.close();
      },
      async () => {
        await database.close();
      },
      async () => {
        if (previousAuthorityEnv.GAME_AUTHORITY_MODE === undefined) {
          delete process.env['GAME_AUTHORITY_MODE'];
        } else {
          process.env['GAME_AUTHORITY_MODE'] =
            previousAuthorityEnv.GAME_AUTHORITY_MODE;
        }
        if (previousAuthorityEnv.GAME_AUTHORITY_ORIGIN === undefined) {
          delete process.env['GAME_AUTHORITY_ORIGIN'];
        } else {
          process.env['GAME_AUTHORITY_ORIGIN'] =
            previousAuthorityEnv.GAME_AUTHORITY_ORIGIN;
        }
        if (previousAuthorityEnv.GAME_AUTHORITY_SERVICE_TOKEN === undefined) {
          delete process.env['GAME_AUTHORITY_SERVICE_TOKEN'];
        } else {
          process.env['GAME_AUTHORITY_SERVICE_TOKEN'] =
            previousAuthorityEnv.GAME_AUTHORITY_SERVICE_TOKEN;
        }
        if (previousAuthorityEnv.STORYTELLER_DISTRIBUTED_V1 === undefined) {
          delete process.env['STORYTELLER_DISTRIBUTED_V1'];
        } else {
          process.env['STORYTELLER_DISTRIBUTED_V1'] =
            previousAuthorityEnv.STORYTELLER_DISTRIBUTED_V1;
        }
        if (previousAuthorityEnv.OFFSCREEN_DOCUMENT_ROOT === undefined) {
          delete process.env['OFFSCREEN_DOCUMENT_ROOT'];
        } else {
          process.env['OFFSCREEN_DOCUMENT_ROOT'] =
            previousAuthorityEnv.OFFSCREEN_DOCUMENT_ROOT;
        }
      },
    ]);
  }
}