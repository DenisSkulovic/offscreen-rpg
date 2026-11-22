/**
 * WR10B T04: disposable SQL + GA lab mode + relay/control/executor Temporal stack.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Database } from '@offscreen/db';
import { LocalDocumentStore } from '@offscreen/documents';
import type { StorytellerRuntimeOptions } from '@offscreen/story-engine/storyteller';
import { startStorytellerDistributedLiveStack } from '@offscreen/worker/runtime/storyteller-distributed-live';

const OFFSCREEN_WRITER_EXECUTION_MODE_ENV = 'OFFSCREEN_WRITER_EXECUTION_MODE';
const WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB = 'scripted-offline-lab';

// Compiled module lives at tools/api-integration/dist/test/helpers/.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../../..');

export const WR10B_GA_STORY_TOKEN =
  'wr10b-integration-ga-storysvc-01';
export const WR10B_GA_CONTROL_TOKEN =
  'wr10b-integration-ga-control-02';
export const WR10B_GA_EXECUTOR_TOKEN =
  'wr10b-integration-ga-executor-03';

const defaultRuleSource = join(
  repoRoot,
  'content/rules/srd-5.2.1-subset',
);

export type Wr10bTemporalLabStack = {
  gaOrigin: string;
  documentStore: LocalDocumentStore;
  stop(): Promise<void>;
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

export async function startWr10bTemporalLabStack(
  database: Database,
  connectionString: string,
  documentRoot: string,
  options: {
    temporalAddress?: string;
    temporalNamespace?: string;
    relayTaskQueue?: string;
    gameAuthorityEnv?: Record<string, string>;
    executorEnv?: Record<string, string>;
    storytellerRuntime?: StorytellerRuntimeOptions;
  } = {},
): Promise<Wr10bTemporalLabStack & { gaProcess: ChildProcess }> {
  const address = options.temporalAddress ?? process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233';
  const namespace = options.temporalNamespace ?? process.env['TEMPORAL_NAMESPACE'] ?? 'default';
  const relayTaskQueue = options.relayTaskQueue ?? 'wr10b-integration-relay';
  const gaRepoRoot = join(repoRoot, 'apps/game-authority');
  const gaPort = await reserveLoopbackPort();
  const gaOrigin = `http://127.0.0.1:${gaPort}`;
  const documentStore = new LocalDocumentStore(documentRoot);
  const gaProcess = spawn(process.execPath, ['dist/src/bootstrap/main.js'], {
    cwd: gaRepoRoot,
    env: {
      ...process.env,
      DATABASE_URL: connectionString,
      STORYTELLER_LIVE_ENABLED: 'false',
      GAME_AUTHORITY_HOST: '127.0.0.1',
      GAME_AUTHORITY_PORT: String(gaPort),
      GAME_AUTHORITY_SERVICE_TOKEN: WR10B_GA_STORY_TOKEN,
      GAME_AUTHORITY_CONTROL_TOKEN: WR10B_GA_CONTROL_TOKEN,
      GAME_AUTHORITY_EXECUTOR_TOKEN: WR10B_GA_EXECUTOR_TOKEN,
      OFFSCREEN_DOCUMENT_ROOT: documentRoot,
      OFFSCREEN_DEFAULT_RULE_SOURCE: defaultRuleSource,
      [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]: WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
      ...options.gameAuthorityEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  await waitForGameAuthorityLive(gaOrigin);

  const stack = await startStorytellerDistributedLiveStack(
    database,
    {
      relay: { address, namespace, taskQueue: relayTaskQueue },
      controlEnv: {
        TEMPORAL_ADDRESS: address,
        TEMPORAL_NAMESPACE: namespace,
        GAME_AUTHORITY_ORIGIN: gaOrigin,
        GAME_AUTHORITY_CONTROL_TOKEN: WR10B_GA_CONTROL_TOKEN,
      },
      executorEnv: {
        TEMPORAL_ADDRESS: address,
        TEMPORAL_NAMESPACE: namespace,
        GAME_AUTHORITY_ORIGIN: gaOrigin,
        GAME_AUTHORITY_EXECUTOR_TOKEN: WR10B_GA_EXECUTOR_TOKEN,
        [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]: WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
        ...options.executorEnv,
      },
      ...(options.storytellerRuntime
        ? { storytellerOptions: options.storytellerRuntime }
        : { storytellerOptions: { documentStore } }),
    },
    () => {},
  );

  return {
    gaOrigin,
    documentStore,
    gaProcess,
    async stop() {
      await stack.stop();
      gaProcess.kill();
      await once(gaProcess, 'exit').catch(() => undefined);
    },
  };
}