import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { betterAuth } from 'better-auth';
import { testUtils } from 'better-auth/plugins';
import {
  createDatabase,
  readDatabaseConfig,
  type Database,
} from '@offscreen/db';
import { applyMigrations } from '@offscreen/db/migrate';
import { startRuntime } from '@offscreen/worker/runtime';
import { createApp } from '@offscreen/api/app';
import type { ChamberStorytellerControl } from '@offscreen/application/developer-tools';
import type { StorytellerRuntimeOptions } from '@offscreen/application/storyteller';
import { authOptions } from '@offscreen/api/auth';
import { requireCookie } from './require.js';
import type { AppIntegration } from './app-integration.js';

const databaseURL = process.env['DATABASE_TEST_URL'];
if (!databaseURL || new URL(databaseURL).pathname !== '/offscreen_auth_test') {
  throw new Error(
    'DATABASE_TEST_URL must target the disposable offscreen_auth_test database.',
  );
}

export const BOOT03_GA_SERVICE_TOKEN = 'boot03-integration-ga-story-01';
const BOOT03_GA_CONTROL_TOKEN = 'boot03-integration-ga-ctrl-02';
const BOOT03_GA_EXECUTOR_TOKEN = 'boot03-integration-ga-exec-03';

const defaultRuleSource = fileURLToPath(
  new URL('../../../../../content/rules/srd-5.2.1-subset', import.meta.url),
);

export type Boot03DistributedAppIntegration = AppIntegration & {
  /** Loopback origin of the separately spawned Game Authority process. */
  gameAuthorityOrigin: string;
  gameAuthorityProcess: ChildProcess;
  /** Document CAS root shared with Game Authority for imported-start staging. */
  documentRoot: string;
  /** Second Game Authority process, when the race proof asked for one. */
  peerGameAuthorityOrigin?: string;
  apiOrigin: string;
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
  throw new AggregateError(failures, 'Boot03 distributed integration cleanup failed');
}

/**
 * Optional two-process stack: Nest (in-process) + private Game Authority child.
 * Used only for BOOT03 imported-start distributed admission proofs.
 */
export async function withBoot03DistributedAppIntegration(
  run: (context: Boot03DistributedAppIntegration) => Promise<void>,
  options: {
    chamberStorytellerControl?: ChamberStorytellerControl;
    storytellerRuntime?: StorytellerRuntimeOptions;
    documentRoot: string;
    /** When set, Nest uses this token instead of the GA service token (negative). */
    nestServiceTokenOverride?: string;
    /** When true, Game Authority is not started (GA-down negative). */
    skipGameAuthority?: boolean;
    /** Extra environment for every Game Authority child. S3 mode belongs here. */
    gameAuthorityEnv?: Record<string, string>;
    /** Start a second Game Authority process on the same database and store. */
    peerGameAuthority?: boolean;
  },
) {
  const previousAuthorityEnv = {
    GAME_AUTHORITY_MODE: process.env['GAME_AUTHORITY_MODE'],
    GAME_AUTHORITY_ORIGIN: process.env['GAME_AUTHORITY_ORIGIN'],
    GAME_AUTHORITY_SERVICE_TOKEN: process.env['GAME_AUTHORITY_SERVICE_TOKEN'],
  };
  const config = readDatabaseConfig({ DATABASE_URL: databaseURL });
  await applyMigrations(
    config,
    fileURLToPath(
      new URL('../../../../../packages/db/migrations', import.meta.url),
    ),
  );
  const database = createDatabase(config, () => {});
  const apiPort = await reserveLoopbackPort();
  const apiOrigin = `http://127.0.0.1:${apiPort}`;
  const gaPort = await reserveLoopbackPort();
  const gameAuthorityOrigin = `http://127.0.0.1:${gaPort}`;
  const gaRepoRoot = fileURLToPath(
    new URL('../../../../../apps/game-authority', import.meta.url),
  );
  const spawnGameAuthority = (port: number) =>
    spawn(process.execPath, ['dist/src/bootstrap/main.js'], {
      cwd: gaRepoRoot,
      env: {
        ...process.env,
        DATABASE_URL: databaseURL,
        STORYTELLER_LIVE_ENABLED: 'false',
        GAME_AUTHORITY_HOST: '127.0.0.1',
        GAME_AUTHORITY_PORT: String(port),
        GAME_AUTHORITY_SERVICE_TOKEN: BOOT03_GA_SERVICE_TOKEN,
        GAME_AUTHORITY_CONTROL_TOKEN: BOOT03_GA_CONTROL_TOKEN,
        GAME_AUTHORITY_EXECUTOR_TOKEN: BOOT03_GA_EXECUTOR_TOKEN,
        OFFSCREEN_DOCUMENT_ROOT: options.documentRoot,
        OFFSCREEN_DEFAULT_RULE_SOURCE: defaultRuleSource,
        ...options.gameAuthorityEnv,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
  let gameAuthorityProcess: ChildProcess | undefined;
  let peerGameAuthorityProcess: ChildProcess | undefined;
  let peerGameAuthorityOrigin: string | undefined;
  if (!options.skipGameAuthority) {
    gameAuthorityProcess = spawnGameAuthority(gaPort);
    await waitForGameAuthorityLive(gameAuthorityOrigin);
    if (options.peerGameAuthority) {
      const peerPort = await reserveLoopbackPort();
      peerGameAuthorityOrigin = `http://127.0.0.1:${peerPort}`;
      peerGameAuthorityProcess = spawnGameAuthority(peerPort);
      await waitForGameAuthorityLive(peerGameAuthorityOrigin);
    }
  }
  process.env['GAME_AUTHORITY_MODE'] = 'distributed';
  process.env['GAME_AUTHORITY_ORIGIN'] = gameAuthorityOrigin;
  process.env['GAME_AUTHORITY_SERVICE_TOKEN'] =
    options.nestServiceTokenOverride ?? BOOT03_GA_SERVICE_TOKEN;
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
    ...(options.chamberStorytellerControl
      ? { chamberStorytellerControl: options.chamberStorytellerControl }
      : {}),
  });
  const helpers = (await auth.$context).test;
  const user = await helpers.saveUser(
    helpers.createUser({ name: 'Boot03 Distributed Reader' }),
  );
  const otherUser = await helpers.saveUser(helpers.createUser());
  let runtime: Awaited<ReturnType<typeof startRuntime>> | undefined;
  const stopWorker = async () => {
    await runtime?.stop();
    runtime = undefined;
  };
  const restartWorker = async () => {
    await stopWorker();
    runtime = await startRuntime(
      database,
      {
        address: process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233',
        namespace: 'default',
        taskQueue: 'browser-integration',
      },
      () => {},
      options.storytellerRuntime,
    );
  };
  try {
    await app.listen(apiPort, '127.0.0.1');
    const login = await helpers.login({ userId: user.id });
    const cookie = requireCookie(login.headers);
    const otherLogin = await helpers.login({ userId: otherUser.id });
    const otherCookie = requireCookie(otherLogin.headers);
    assert.ok(gameAuthorityProcess || options.skipGameAuthority);
    await run({
      database,
      origin: apiOrigin,
      apiOrigin,
      auth,
      helpers: {
        login: (args: { userId: string }) => helpers.login(args),
      },
      user,
      otherUser,
      ownerId: user.id,
      cookie,
      otherCookie,
      restartWorker,
      stopWorker,
      workerTaskQueue: 'browser-integration',
      workerErrors: [],
      gameAuthorityOrigin,
      gameAuthorityProcess: gameAuthorityProcess ?? (null as unknown as ChildProcess),
      documentRoot: options.documentRoot,
      ...(peerGameAuthorityOrigin ? { peerGameAuthorityOrigin } : {}),
    });
  } finally {
    await release([
      async () => {
        await runtime?.stop();
      },
      async () => {
        if (gameAuthorityProcess) {
          gameAuthorityProcess.kill();
          await once(gameAuthorityProcess, 'exit').catch(() => undefined);
        }
        if (peerGameAuthorityProcess) {
          peerGameAuthorityProcess.kill();
          await once(peerGameAuthorityProcess, 'exit').catch(() => undefined);
        }
      },
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
      },
    ]);
  }
}