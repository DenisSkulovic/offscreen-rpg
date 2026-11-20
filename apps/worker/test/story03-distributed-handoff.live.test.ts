/**
 * STORY03 T06: saved-result crash handoff with real control + executor workers.
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { Client, Connection } from '@temporalio/client';
import { eq, sql } from 'drizzle-orm';
import { applyMigrations } from '@offscreen/db/migrate';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import {
  storytellerAttempt,
  storytellerPublication,
} from '@offscreen/db/storyteller-schema';
import { prepareStorytellerTask } from '@offscreen/storyteller/tasks';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import {
  storytellerControlTaskQueue,
  storytellerDistributedWorkflowType,
  storytellerWorkflowId,
} from '@offscreen/workflows/contracts';
import { readExecutionWorkerConfig } from '../src/bootstrap/config.js';
import { startControlRuntime } from '../src/runtime/control.js';
import { startExecutionRuntime } from '../src/runtime/execution.js';

const databaseURL = process.env['DATABASE_TEST_URL'];
const pgEnabled =
  !!databaseURL && new URL(databaseURL).pathname === '/offscreen_auth_test';
const address = process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233';
const namespace = process.env['TEMPORAL_NAMESPACE'] ?? 'default';

const root = 'ab'.repeat(32);
const storyToken = 'boot03-integration-ga-story-01';
const executorToken = 'boot03-integration-ga-exec-03';
const controlToken = 'boot03-integration-ga-ctrl-02';
const storytellerKind = 'storyteller.profiled.v1';

type GameAuthorityChild = {
  origin: string;
  process: ChildProcess;
};

async function reserveLoopbackPort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
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
        else resolvePort(port);
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

async function spawnGameAuthorityChild(): Promise<GameAuthorityChild> {
  const gaRepoRoot = resolve(__dirname, '../../../game-authority');
  const port = await reserveLoopbackPort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['dist/src/bootstrap/main.js'], {
    cwd: gaRepoRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseURL,
      STORYTELLER_LIVE_ENABLED: 'false',
      GAME_AUTHORITY_HOST: '127.0.0.1',
      GAME_AUTHORITY_PORT: String(port),
      GAME_AUTHORITY_SERVICE_TOKEN: storyToken,
      GAME_AUTHORITY_CONTROL_TOKEN: controlToken,
      GAME_AUTHORITY_EXECUTOR_TOKEN: executorToken,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  await waitForGameAuthorityLive(origin);
  return { origin, process: child };
}

function openingTask(rootHash: string) {
  return prepareStorytellerTask({
    task: 'opening',
    source: { draftId: randomUUID(), draftRevision: 1 },
    profile: storytellerCatalogue.resolve({
      id: 'absurd-action-comedy',
      revision: 1,
    }),
    execution: { mode: 'scripted', version: 'offline-rehearsal.v1' },
    context: {
      premise: {
        title: '',
        premise: 'A traveler wakes beside an unfamiliar companion.',
        storytellingDirection: '',
      },
      current: null,
      selected: null,
      items: [],
      notes: [],
      evidence: [],
      canonicalKnowledge: {
        rootHash,
        rootRevision: 1,
        catalogue: [],
        catalogueTruncated: false,
        documents: [],
        documentSelection: {
          cueResolution: {
            requested: [],
            resolvedDocumentIds: [],
            unavailable: [],
            excludedDocumentIds: [],
            maxCandidates: 0,
          },
          requestedDocumentIds: [],
          loadedHandles: [],
          omitted: [],
          maxReads: 4 as const,
          maxBytes: 12 * 1024,
          usedReads: 0,
          usedBytes: 0,
        },
        libraries: [],
        librarySelection: {
          requestedTopics: [],
          unmatchedTopics: [],
          requestedHandles: [],
          loadedHandles: [],
          omitted: [],
          maxReads: 0,
          maxBytes: 0,
          usedReads: 0,
          usedBytes: 0,
        },
      },
    },
  });
}

async function insertUser(
  database: ReturnType<typeof createDatabase>,
  ownerId: string,
) {
  await database.db.execute(
    sql`insert into "user" (id, name, email, email_verified, created_at, updated_at)
        values (${ownerId}, ${'STORY03'}, ${`${ownerId}@example.test`}, true, now(), now())
        on conflict (id) do nothing`,
  );
}

async function seedGeneration(database: ReturnType<typeof createDatabase>) {
  const ownerId = `story03-${randomUUID()}`;
  const generationId = randomUUID();
  const task = openingTask(root);
  await insertUser(database, ownerId);
  await database.db.transaction(async (tx) => {
    await tx.insert(generation).values({
      id: generationId,
      ownerId,
      kind: storytellerKind,
      input: task,
    });
    await tx.insert(storytellerPublication).values({ generationId });
  });
  return { ownerId, generationId, task };
}

async function withAuthTestDatabase<T>(
  run: (database: ReturnType<typeof createDatabase>) => Promise<T>,
): Promise<T> {
  const config = readDatabaseConfig({ DATABASE_URL: databaseURL });
  await applyMigrations(
    config,
    resolve(__dirname, '../../../../packages/db/migrations'),
  );
  const database = createDatabase(config, () => {});
  try {
    return await run(database);
  } finally {
    await database.close();
  }
}

test(
  'STORY03 T06 positive: distributed workflow publishes exactly once after saved scripted result',
  { skip: !pgEnabled, timeout: 120_000 },
  async (t) => {
    await withAuthTestDatabase(async (database) => {
      const { generationId, task } = await seedGeneration(database);
      let ga: GameAuthorityChild | undefined;
      let connection: Connection | undefined;
      let control: Awaited<ReturnType<typeof startControlRuntime>> | undefined;
      let executor:
        | Awaited<ReturnType<typeof startExecutionRuntime>>
        | undefined;
      try {
        ga = await spawnGameAuthorityChild();
        const executorEnv = {
          TEMPORAL_ADDRESS: address,
          TEMPORAL_NAMESPACE: namespace,
          GAME_AUTHORITY_ORIGIN: ga.origin,
          GAME_AUTHORITY_EXECUTOR_TOKEN: executorToken,
        };
        const executionConfig = readExecutionWorkerConfig(executorEnv);
        connection = await Connection.connect({ address });
        const client = new Client({ connection, namespace });
        control = await startControlRuntime(database, { address, namespace });
        executor = await startExecutionRuntime(executionConfig);
        const handle = await client.workflow.start(
          storytellerDistributedWorkflowType,
          {
            taskQueue: storytellerControlTaskQueue,
            workflowId: storytellerWorkflowId(generationId),
            args: [generationId],
            workflowExecutionTimeout: '2 minutes',
          },
        );
        await handle.result();
        const [row] = await database.db
          .select()
          .from(generation)
          .where(eq(generation.id, generationId));
        assert.equal(row?.state, 'succeeded');
        assert.ok(row?.attemptId);
        assert.ok(row?.output);
        const [publication] = await database.db
          .select()
          .from(storytellerPublication)
          .where(eq(storytellerPublication.generationId, generationId));
        assert.equal(publication?.state, 'published');
        const attempts = await database.db
          .select({ id: storytellerAttempt.id })
          .from(storytellerAttempt)
          .where(eq(storytellerAttempt.generationId, generationId));
        assert.equal(attempts.length, 1);

      } catch (error) {
        if (
          error instanceof Error &&
          /ECONNREFUSED|connection refused/i.test(error.message)
        ) {
          t.skip(`local Temporal required at ${address}: ${error.message}`);
          return;
        }
        throw error;
      } finally {
        await executor?.stop();
        await control?.stop();
        await connection?.close();
        if (ga) {
          ga.process.kill();
          await once(ga.process, 'exit').catch(() => undefined);
        }
      }
    });
  },
);
