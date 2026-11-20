import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import type { Database } from '@offscreen/db';
import type { StorytellerRuntimeOptions } from '@offscreen/application/storyteller';
import { startStorytellerDistributedLiveStack } from '@offscreen/worker/runtime/storyteller-distributed-live';

const INTEGRATION_GA_EXECUTOR_TOKEN =
  'boot03-integration-ga-exec-03';
const INTEGRATION_GA_SERVICE_TOKEN = 'boot03-integration-ga-story-01';
const INTEGRATION_GA_CONTROL_TOKEN = 'boot03-integration-ga-ctrl-02';

type GameAuthorityChild = {
  origin: string;
  process: ChildProcess;
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

async function startLoopbackGameAuthorityChild(
  databaseUrl: string,
): Promise<GameAuthorityChild> {
  const gaRepoRoot = fileURLToPath(
    new URL('../../../../../apps/game-authority', import.meta.url),
  );
  const port = await reserveLoopbackPort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['dist/src/bootstrap/main.js'], {
    cwd: gaRepoRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      STORYTELLER_LIVE_ENABLED: 'false',
      GAME_AUTHORITY_HOST: '127.0.0.1',
      GAME_AUTHORITY_PORT: String(port),
      GAME_AUTHORITY_SERVICE_TOKEN: INTEGRATION_GA_SERVICE_TOKEN,
      GAME_AUTHORITY_CONTROL_TOKEN: INTEGRATION_GA_CONTROL_TOKEN,
      GAME_AUTHORITY_EXECUTOR_TOKEN: INTEGRATION_GA_EXECUTOR_TOKEN,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  await waitForGameAuthorityLive(origin);
  return { origin, process: child };
}

export type StorytellerDistributedLiveWorkers = {
  stop(): Promise<void>;
};

/**
 * STORY03 T06: two Temporal worker processes plus relay for named live suites.
 * Keeps `STORYTELLER_LIVE_ENABLED=false`; uses scripted executor custody via GA.
 */
export async function startStorytellerDistributedLiveWorkers(
  database: Database,
  options: {
    storytellerRuntime?: StorytellerRuntimeOptions;
    temporalAddress?: string;
    relayTaskQueue?: string;
  } = {},
): Promise<StorytellerDistributedLiveWorkers> {
  const databaseUrl = process.env['DATABASE_TEST_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_TEST_URL is required for distributed storyteller live workers');
  }
  const address = options.temporalAddress ?? process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233';
  const namespace = process.env['TEMPORAL_NAMESPACE'] ?? 'default';
  const relayTaskQueue = options.relayTaskQueue ?? 'browser-integration';
  const ga = await startLoopbackGameAuthorityChild(databaseUrl);
  process.env['STORYTELLER_LIVE_ENABLED'] = 'false';
  process.env['STORYTELLER_DISTRIBUTED_V1'] = 'true';
  process.env['GAME_AUTHORITY_ORIGIN'] = ga.origin;
  process.env['GAME_AUTHORITY_EXECUTOR_TOKEN'] = INTEGRATION_GA_EXECUTOR_TOKEN;
  const stack = await startStorytellerDistributedLiveStack(
    database,
    {
      relay: { address, namespace, taskQueue: relayTaskQueue },
      temporal: { address, namespace },
      executorEnv: {
        TEMPORAL_ADDRESS: address,
        TEMPORAL_NAMESPACE: namespace,
        GAME_AUTHORITY_ORIGIN: ga.origin,
        GAME_AUTHORITY_EXECUTOR_TOKEN: INTEGRATION_GA_EXECUTOR_TOKEN,
      },
      ...(options.storytellerRuntime
        ? { storytellerOptions: options.storytellerRuntime }
        : {}),
    },
    () => {},
  );
  return {
    async stop() {
      await stack.stop();
      ga.process.kill();
      await once(ga.process, 'exit').catch(() => undefined);
    },
  };
}